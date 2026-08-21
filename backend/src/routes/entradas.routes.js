import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const entradasRouter = Router();

const CODIGO_ACTIVO = { codigosQr: { where: { anulado: false }, take: 1 } };
// El saldo vive en Usuario, no en Entrada — se incluye así para que las pantallas de
// escaneo (Recargador/Ayudante/Devolución) puedan mostrarlo sin una segunda llamada.
const CON_SALDO = { usuario: { select: { id: true, saldo: true } } };

entradasRouter.get('/', requireAuth, async (req, res) => {
  const { eventoId, estadoIngreso } = req.query;
  if (!eventoId) return res.status(400).json({ error: 'eventoId es requerido' });
  const entradas = await prisma.entrada.findMany({
    where: { eventoId, estadoIngreso: estadoIngreso || undefined },
    include: { categoriaTicket: true, ...CODIGO_ACTIVO, ...CON_SALDO },
  });
  res.json(entradas.map(({ codigosQr, ...e }) => ({ ...e, codigoQrVinculado: codigosQr[0] || null })));
});

// Resuelve la Entrada dueña de una pulsera/QR físico escaneado (Recargador, Ayudante, Devolución, Supervisor).
entradasRouter.get('/buscar/:codigo', requireAuth, async (req, res) => {
  const codigoQr = await prisma.codigoQr.findUnique({
    where: { codigo: req.params.codigo },
    include: { entrada: { include: { categoriaTicket: true, ...CON_SALDO } } },
  });
  if (!codigoQr || codigoQr.anulado || !codigoQr.entrada) {
    return res.status(404).json({ error: 'Código no vinculado a ninguna entrada activa' });
  }
  res.json({ ...codigoQr.entrada, codigoQrVinculado: { id: codigoQr.id, codigo: codigoQr.codigo } });
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

// Vincula una pulsera/QR física del pool (sin asignar) a esta entrada.
entradasRouter.post('/:id/vincular-qr', requireAuth, async (req, res) => {
  const { codigoQrId } = req.body;
  const codigoQr = await prisma.codigoQr.findUnique({ where: { id: codigoQrId } });
  if (!codigoQr) return res.status(404).json({ error: 'Código no encontrado' });
  if (codigoQr.entradaId) return res.status(409).json({ error: 'Ese código ya está vinculado a otra entrada' });

  await prisma.codigoQr.update({
    where: { id: codigoQrId },
    data: { entradaId: req.params.id, asignadoPorId: req.usuario.id, asignadoEn: new Date() },
  });

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

// Control de acceso (Supervisor): cada escaneo queda en el historial, siempre con foto.
entradasRouter.post('/:id/ingreso', requireAuth, async (req, res) => {
  const { foto } = req.body;
  if (!foto) return res.status(400).json({ error: 'Foto de seguridad obligatoria' });

  const [, entrada] = await prisma.$transaction([
    prisma.registroIngreso.create({
      data: { entradaId: req.params.id, tipo: 'ingreso', foto, registradoPorId: req.usuario.id },
    }),
    prisma.entrada.update({ where: { id: req.params.id }, data: { estadoIngreso: 'ingresado' } }),
  ]);
  res.json(entrada);
});

entradasRouter.post('/:id/salida', requireAuth, async (req, res) => {
  const { foto } = req.body;
  if (!foto) return res.status(400).json({ error: 'Foto de seguridad obligatoria' });

  const [, entrada] = await prisma.$transaction([
    prisma.registroIngreso.create({
      data: { entradaId: req.params.id, tipo: 'salida', foto, registradoPorId: req.usuario.id },
    }),
    prisma.entrada.update({ where: { id: req.params.id }, data: { estadoIngreso: 'salio' } }),
  ]);
  res.json(entrada);
});
