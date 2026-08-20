import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const comprasRouter = Router();

const generarPassword = () => crypto.randomBytes(6).toString('base64url');

// Compra un lote de entradas: la primera marcada isTitular=true queda ligada a la cuenta
// del comprador; el resto son invitados sin cuenta (reciben password al aprobarse).
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

  const compra = await prisma.compra.create({
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

  res.status(201).json(compra);
});

comprasRouter.get('/mias', requireAuth, async (req, res) => {
  const compras = await prisma.compra.findMany({
    where: { compradorId: req.usuario.id },
    include: { entradas: true, evento: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(compras);
});

comprasRouter.get('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const { eventoId } = req.query;
  const compras = await prisma.compra.findMany({
    where: eventoId ? { eventoId } : undefined,
    include: { entradas: true, comprador: { select: { id: true, nombre: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(compras);
});

// Mientras la compra sigue pendiente, el comprador puede corregir nombre/correo/celular.
comprasRouter.patch('/:id/entradas', requireAuth, async (req, res) => {
  const compra = await prisma.compra.findUnique({ where: { id: req.params.id } });
  if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
  if (compra.compradorId !== req.usuario.id) return res.status(403).json({ error: 'No autorizado' });
  if (compra.estado !== 'pendiente') return res.status(409).json({ error: 'La compra ya fue aprobada; usa un reporte de datos' });

  const { entradas } = req.body;
  await Promise.all(entradas.map(e => prisma.entrada.update({
    where: { id: e.id },
    data: { nombre: e.nombre, correo: e.correo, celular: e.celular },
  })));

  const actualizada = await prisma.compra.findUnique({ where: { id: req.params.id }, include: { entradas: true } });
  res.json(actualizada);
});

comprasRouter.post('/:id/aprobar', requireAuth, requireRol('Admin'), async (req, res) => {
  const compra = await prisma.compra.findUnique({ where: { id: req.params.id }, include: { entradas: true } });
  if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });

  await prisma.$transaction([
    ...compra.entradas
      .filter(e => !e.isTitular)
      .map(e => prisma.entrada.update({ where: { id: e.id }, data: { passwordTemporal: generarPassword() } })),
    prisma.compra.update({ where: { id: compra.id }, data: { estado: 'confirmado' } }),
  ]);

  const actualizada = await prisma.compra.findUnique({ where: { id: compra.id }, include: { entradas: true } });
  res.json(actualizada);
});
