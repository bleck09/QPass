import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const comprasRouter = Router();

const generarPassword = () => crypto.randomBytes(6).toString('base64url');

// Compra un lote de entradas: la primera marcada isTitular=true queda ligada a la cuenta
// del comprador; el resto son invitados sin cuenta (reciben cuenta al aprobarse la compra).
// Reserva el cupo de cada categoría de forma atómica (WHERE cantidadVendida+N <= cantidad)
// para que dos compras simultáneas no vendan la misma última entrada.
comprasRouter.post('/', requireAuth, async (req, res) => {
  const { eventoId, entradas, comprobanteUrl, comprobanteNombreArchivo } = req.body;
  if (!Array.isArray(entradas) || entradas.length === 0) {
    return res.status(400).json({ error: 'Agrega al menos una entrada' });
  }

  const categorias = await prisma.categoriaTicket.findMany({
    where: { id: { in: entradas.map(e => e.categoriaTicketId) } },
  });
  const precioDe = (categoriaTicketId) => categorias.find(c => c.id === categoriaTicketId)?.precio ?? 0;
  const montoTotal = entradas.reduce((suma, e) => suma + Number(precioDe(e.categoriaTicketId)), 0);

  const cantidadPorCategoria = new Map();
  entradas.forEach(e => cantidadPorCategoria.set(e.categoriaTicketId, (cantidadPorCategoria.get(e.categoriaTicketId) || 0) + 1));

  const resultado = await prisma.$transaction(async (tx) => {
    for (const [categoriaTicketId, cantidad] of cantidadPorCategoria) {
      const filasActualizadas = await tx.$executeRaw`
        UPDATE categorias_ticket
        SET "cantidadVendida" = "cantidadVendida" + ${cantidad}
        WHERE id = ${categoriaTicketId} AND "cantidadVendida" + ${cantidad} <= cantidad
      `;
      if (filasActualizadas === 0) {
        const cat = categorias.find(c => c.id === categoriaTicketId);
        throw new Error(`No queda stock suficiente de "${cat?.nombre || categoriaTicketId}"`);
      }
    }

    return tx.compra.create({
      data: {
        eventoId,
        compradorId: req.usuario.id,
        montoTotal,
        comprobanteUrl,
        comprobanteNombreArchivo,
        entradas: {
          create: entradas.map(e => ({
            eventoId,
            categoriaTicketId: e.categoriaTicketId,
            isTitular: !!e.isTitular,
            nombre: e.nombre,
            correo: e.correo,
            celular: e.celular,
            usuarioId: e.isTitular ? req.usuario.id : undefined,
          })),
        },
      },
      include: { entradas: true },
    });
  }).catch(err => ({ error: err.message }));

  if (resultado.error) return res.status(409).json({ error: resultado.error });
  res.status(201).json(resultado);
});

comprasRouter.get('/mias', requireAuth, async (req, res) => {
  const compras = await prisma.compra.findMany({
    where: { compradorId: req.usuario.id },
    include: {
      entradas: { include: { categoriaTicket: true, codigosQr: { where: { anulado: false } } } },
      evento: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(compras);
});

comprasRouter.get('/', requireAuth, requireRol('Admin', 'Cliente'), async (req, res) => {
  const { eventoId } = req.query;
  const compras = await prisma.compra.findMany({
    where: eventoId ? { eventoId } : undefined,
    include: {
      entradas: { include: { categoriaTicket: true } },
      comprador: { select: { id: true, nombre: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(compras);
});

// Mientras la compra sigue pendiente, el comprador puede corregir nombre/correo/celular.
comprasRouter.patch('/:id/entradas', requireAuth, async (req, res) => {
  const compra = await prisma.compra.findUnique({ where: { id: req.params.id } });
  if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
  if (compra.compradorId !== req.usuario.id) return res.status(403).json({ error: 'No autorizado' });
  if (compra.estado !== 'pendiente') return res.status(409).json({ error: 'La compra ya fue resuelta; usa un reporte de datos' });

  const { entradas } = req.body;
  await Promise.all(entradas.map(e => prisma.entrada.update({
    where: { id: e.id },
    data: { nombre: e.nombre, correo: e.correo, celular: e.celular },
  })));

  const actualizada = await prisma.compra.findUnique({ where: { id: req.params.id }, include: { entradas: true } });
  res.json(actualizada);
});

// Crea (o vincula, si el correo ya tiene cuenta) un Usuario por cada entrada sin cuenta.
// Las contraseñas generadas se devuelven solo en esta respuesta (no se persisten en texto
// plano en ningún lado) porque no hay servicio de correo para "enviarlas" de verdad.
comprasRouter.post('/:id/aprobar', requireAuth, requireRol('Admin'), async (req, res) => {
  const compra = await prisma.compra.findUnique({ where: { id: req.params.id }, include: { entradas: true } });
  if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
  if (compra.estado !== 'pendiente') return res.status(409).json({ error: 'Esta compra ya fue resuelta' });

  const passwordsGeneradas = {};

  await prisma.$transaction(async (tx) => {
    for (const entrada of compra.entradas) {
      if (entrada.usuarioId) continue; // titular: ya llega con cuenta

      let usuario = await tx.usuario.findUnique({ where: { email: entrada.correo } });
      if (!usuario) {
        const password = generarPassword();
        const passwordHash = await bcrypt.hash(password, 10);
        usuario = await tx.usuario.create({
          data: { nombre: entrada.nombre, email: entrada.correo, celular: entrada.celular, passwordHash, rol: 'UsuarioNormal' },
        });
        passwordsGeneradas[entrada.id] = password;
      }
      await tx.entrada.update({ where: { id: entrada.id }, data: { usuarioId: usuario.id } });
    }

    await tx.compra.update({
      where: { id: compra.id },
      data: { estado: 'confirmado', resueltoPorId: req.usuario.id, resueltoEn: new Date() },
    });
  });

  const actualizada = await prisma.compra.findUnique({ where: { id: compra.id }, include: { entradas: true } });
  res.json({ ...actualizada, passwordsGeneradas });
});

// Libera el cupo reservado de cada categoría.
comprasRouter.post('/:id/rechazar', requireAuth, requireRol('Admin'), async (req, res) => {
  const { motivoRechazo } = req.body;
  const compra = await prisma.compra.findUnique({ where: { id: req.params.id }, include: { entradas: true } });
  if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
  if (compra.estado !== 'pendiente') return res.status(409).json({ error: 'Esta compra ya fue resuelta' });

  const cantidadPorCategoria = new Map();
  compra.entradas.forEach(e => {
    if (!e.categoriaTicketId) return;
    cantidadPorCategoria.set(e.categoriaTicketId, (cantidadPorCategoria.get(e.categoriaTicketId) || 0) + 1);
  });

  await prisma.$transaction([
    ...[...cantidadPorCategoria.entries()].map(([categoriaTicketId, cantidad]) =>
      prisma.categoriaTicket.update({ where: { id: categoriaTicketId }, data: { cantidadVendida: { decrement: cantidad } } })
    ),
    prisma.compra.update({
      where: { id: compra.id },
      data: { estado: 'rechazado', motivoRechazo, resueltoPorId: req.usuario.id, resueltoEn: new Date() },
    }),
  ]);

  const actualizada = await prisma.compra.findUnique({ where: { id: compra.id }, include: { entradas: true } });
  res.json(actualizada);
});
