import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const eventosRouter = Router();

eventosRouter.get('/', async (req, res) => {
  const [eventos, preciosMin] = await Promise.all([
    prisma.evento.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.categoriaTicket.groupBy({ by: ['eventoId'], _min: { precio: true } }),
  ]);
  const precioPorEvento = new Map(preciosMin.map(p => [p.eventoId, Number(p._min.precio)]));
  res.json(eventos.map(e => ({ ...e, precioDesde: precioPorEvento.get(e.id) ?? null })));
});

eventosRouter.get('/:id', async (req, res) => {
  const evento = await prisma.evento.findUnique({ where: { id: req.params.id } });
  if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json(evento);
});

eventosRouter.post('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const { nombre, lugar, fecha, fechaFin, imagen, qrPrefijo, qrAncho, qrAlto } = req.body;
  const evento = await prisma.evento.create({
    data: {
      nombre, lugar, imagen, qrPrefijo,
      fecha: new Date(fecha),
      fechaFin: new Date(fechaFin || fecha),
      qrAncho: qrAncho ? Number(qrAncho) : undefined,
      qrAlto: qrAlto ? Number(qrAlto) : undefined,
      creadoPorId: req.usuario.id,
    },
  });
  res.status(201).json(evento);
});

eventosRouter.patch('/:id', requireAuth, requireRol('Admin'), async (req, res) => {
  const { nombre, lugar, fecha, fechaFin, imagen, estado, qrPrefijo, qrAncho, qrAlto } = req.body;
  const evento = await prisma.evento.update({
    where: { id: req.params.id },
    data: {
      nombre, lugar, imagen, estado, qrPrefijo,
      fecha: fecha ? new Date(fecha) : undefined,
      fechaFin: fechaFin ? new Date(fechaFin) : undefined,
      qrAncho: qrAncho !== undefined ? Number(qrAncho) : undefined,
      qrAlto: qrAlto !== undefined ? Number(qrAlto) : undefined,
    },
  });
  res.json(evento);
});
