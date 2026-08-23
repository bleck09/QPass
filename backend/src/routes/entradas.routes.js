import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const entradasRouter = Router();

const CODIGO_ACTIVO = { codigosQr: { where: { anulado: false }, take: 1 } };
// El saldo vive en Usuario, no en Entrada — se incluye así para que las pantallas de
// escaneo (Recargador/Ayudante/Devolución) puedan mostrarlo sin una segunda llamada.
// La foto también viene de acá: Entrada.foto nunca se escribe en ningún flujo (compra,
// aprobación, etc.), así que la única "foto de perfil" real que existe es la que el usuario
// carga en su Perfil — solo aplica a titulares con cuenta, los invitados no tienen una.
const CON_SALDO = { usuario: { select: { id: true, saldo: true, foto: true } } };

// Una compra pendiente o rechazada no es un asistente real todavía: no debe aparecer para
// escanear, recargar, cobrar, ni vincular manilla en ninguna pantalla operativa.
const SOLO_CONFIRMADAS = { compra: { estado: 'confirmado' } };

entradasRouter.get('/', requireAuth, async (req, res) => {
  const { eventoId, estadoIngreso } = req.query;
  if (!eventoId) return res.status(400).json({ error: 'eventoId es requerido' });
  const entradas = await prisma.entrada.findMany({
    where: { eventoId, estadoIngreso: estadoIngreso || undefined, ...SOLO_CONFIRMADAS },
    include: { categoriaTicket: true, ...CODIGO_ACTIVO, ...CON_SALDO },
  });
  res.json(entradas.map(({ codigosQr, ...e }) => ({ ...e, codigoQrVinculado: codigosQr[0] || null })));
});

// Resuelve la Entrada dueña de una pulsera/QR físico escaneado (Recargador, Ayudante, Devolución, Supervisor).
entradasRouter.get('/buscar/:codigo', requireAuth, async (req, res) => {
  const codigoQr = await prisma.codigoQr.findUnique({
    where: { codigo: req.params.codigo },
    include: { entrada: { include: { categoriaTicket: true, compra: { select: { estado: true } }, ...CON_SALDO } } },
  });
  if (!codigoQr || codigoQr.anulado || !codigoQr.entrada || codigoQr.entrada.compra?.estado !== 'confirmado') {
    return res.status(404).json({ error: 'Código no vinculado a ninguna entrada activa' });
  }
  const { compra, ...entrada } = codigoQr.entrada;
  res.json({ ...entrada, codigoQrVinculado: { id: codigoQr.id, codigo: codigoQr.codigo } });
});

entradasRouter.get('/:id', requireAuth, async (req, res) => {
  const entrada = await prisma.entrada.findUnique({
    where: { id: req.params.id },
    include: { categoriaTicket: true, ...CODIGO_ACTIVO, ...CON_SALDO },
  });
  if (!entrada) return res.status(404).json({ error: 'Entrada no encontrada' });
  const { codigosQr, ...resto } = entrada;
  res.json({ ...resto, codigoQrVinculado: codigosQr[0] || null });
});

entradasRouter.get('/:id/registros', requireAuth, async (req, res) => {
  const registros = await prisma.registroIngreso.findMany({
    where: { entradaId: req.params.id },
    include: { registradoPor: { select: { id: true, nombre: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(registros);
});

// Vincula una pulsera/QR física del pool (sin asignar) a esta entrada. Si la entrada ya tenía
// otro código activo (ej. "cambiar manilla"), ese anterior se anula primero para que no queden
// dos códigos activos apuntando a la misma persona.
entradasRouter.post('/:id/vincular-qr', requireAuth, async (req, res) => {
  const { codigoQrId } = req.body;
  const entradaActual = await prisma.entrada.findUnique({ where: { id: req.params.id }, include: { compra: true } });
  if (!entradaActual) return res.status(404).json({ error: 'Entrada no encontrada' });
  if (entradaActual.compra?.estado !== 'confirmado') {
    return res.status(409).json({ error: 'Esta compra todavía no está aprobada' });
  }

  const codigoQr = await prisma.codigoQr.findUnique({ where: { id: codigoQrId } });
  if (!codigoQr) return res.status(404).json({ error: 'Código no encontrado' });
  if (codigoQr.entradaId) return res.status(409).json({ error: 'Ese código ya está vinculado a otra entrada' });

  const anteriorActivo = await prisma.codigoQr.findFirst({ where: { entradaId: req.params.id, anulado: false } });

  await prisma.$transaction([
    ...(anteriorActivo
      ? [prisma.codigoQr.update({
          where: { id: anteriorActivo.id },
          data: { anulado: true, motivoAnulacion: 'Reemplazada al vincular una nueva', anuladoPorId: req.usuario.id, anuladoEn: new Date() },
        })]
      : []),
    prisma.codigoQr.update({
      where: { id: codigoQrId },
      data: { entradaId: req.params.id, asignadoPorId: req.usuario.id, asignadoEn: new Date() },
    }),
  ]);

  const entrada = await prisma.entrada.findUnique({
    where: { id: req.params.id },
    include: { categoriaTicket: true, ...CODIGO_ACTIVO },
  });
  const { codigosQr, ...resto } = entrada;
  res.json({ ...resto, codigoQrVinculado: codigosQr[0] || null });
});

// Manilla perdida/dañada: anula el código activo (el saldo no se mueve, vive en Usuario.saldo).
// Para reemplazarla, el cliente llama después a vincular-qr con un código nuevo del pool.
entradasRouter.post('/:id/anular-qr', requireAuth, async (req, res) => {
  const { motivo } = req.body;
  const activo = await prisma.codigoQr.findFirst({ where: { entradaId: req.params.id, anulado: false } });
  if (!activo) return res.status(404).json({ error: 'Esta entrada no tiene un código vinculado' });

  await prisma.codigoQr.update({
    where: { id: activo.id },
    data: { anulado: true, motivoAnulacion: motivo || null, anuladoPorId: req.usuario.id, anuladoEn: new Date() },
  });
  res.status(204).end();
});

// Control de acceso (Supervisor): la foto solo es obligatoria en el PRIMER registro de la
// entrada (identifica quién retiró la manilla); en los siguientes ingresos/salidas de esa
// misma persona ya no hace falta volver a tomarla.
const registrarMovimiento = async (req, res, tipo) => {
  const { foto } = req.body;
  const entradaActual = await prisma.entrada.findUnique({ where: { id: req.params.id } });
  if (!entradaActual) return res.status(404).json({ error: 'Entrada no encontrada' });

  // Evita salidas sin haber ingresado antes, e ingresos/salidas duplicados consecutivos
  // (ej. dos "salida" seguidas sin un ingreso en el medio).
  if (tipo === 'salida' && entradaActual.estadoIngreso !== 'ingresado') {
    return res.status(409).json({ error: 'Esta entrada no está adentro — no se puede registrar una salida' });
  }
  if (tipo === 'ingreso' && entradaActual.estadoIngreso === 'ingresado') {
    return res.status(409).json({ error: 'Esta entrada ya está registrada como ingresada' });
  }

  const yaTieneRegistro = await prisma.registroIngreso.findFirst({ where: { entradaId: req.params.id } });
  if (!yaTieneRegistro && !foto) {
    return res.status(400).json({ error: 'Foto de seguridad obligatoria en el primer ingreso' });
  }

  const [, entrada] = await prisma.$transaction([
    prisma.registroIngreso.create({
      data: { entradaId: req.params.id, tipo, foto: foto || undefined, registradoPorId: req.usuario.id },
    }),
    prisma.entrada.update({
      where: { id: req.params.id },
      data: { estadoIngreso: tipo === 'ingreso' ? 'ingresado' : 'salio' },
      include: { categoriaTicket: true, ...CODIGO_ACTIVO, ...CON_SALDO },
    }),
  ]);
  const { codigosQr, ...resto } = entrada;
  res.json({ ...resto, codigoQrVinculado: codigosQr[0] || null });
};

entradasRouter.post('/:id/ingreso', requireAuth, (req, res) => registrarMovimiento(req, res, 'ingreso'));
entradasRouter.post('/:id/salida', requireAuth, (req, res) => registrarMovimiento(req, res, 'salida'));
