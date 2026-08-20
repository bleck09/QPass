import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const asignacionesRouter = Router();

asignacionesRouter.get('/', requireAuth, async (req, res) => {
  const { eventoId } = req.query;
  const asignaciones = await prisma.asignacion.findMany({
    where: eventoId ? { eventoId } : undefined,
    include: { usuario: { select: { id: true, nombre: true, email: true, foto: true } } },
  });
  res.json(asignaciones);
});

// Upsert: si el usuario ya está asignado a ese evento, actualiza el rol en vez de duplicar.
asignacionesRouter.post('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const { eventoId, usuarioId, rol } = req.body;
  const asignacion = await prisma.asignacion.upsert({
    where: { eventoId_usuarioId: { eventoId, usuarioId } },
    update: { rol },
    create: { eventoId, usuarioId, rol },
  });
  res.status(201).json(asignacion);
});

asignacionesRouter.delete('/:id', requireAuth, requireRol('Admin'), async (req, res) => {
  await prisma.asignacion.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
