import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const eventosRouter = Router();

eventosRouter.get('/', async (req, res) => {
  const eventos = await prisma.evento.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(eventos);
});

eventosRouter.get('/:id', async (req, res) => {
  const evento = await prisma.evento.findUnique({ where: { id: req.params.id } });
  if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json(evento);
});

eventosRouter.post('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const { nombre, lugar, fecha, imagen } = req.body;
  const evento = await prisma.evento.create({ data: { nombre, lugar, fecha, imagen } });
  res.status(201).json(evento);
});
