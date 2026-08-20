import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const puestoAyudantesRouter = Router();

// Un ayudante puede estar asignado a varios puestos a la vez.
puestoAyudantesRouter.get('/', requireAuth, async (req, res) => {
  const { puestoId, ayudanteId } = req.query;
  const asignaciones = await prisma.puestoAyudante.findMany({
    where: { puestoId, ayudanteId: ayudanteId ? Number(ayudanteId) : undefined },
    include: { ayudante: { select: { id: true, nombre: true, email: true, foto: true } }, puesto: true },
  });
  res.json(asignaciones);
});

puestoAyudantesRouter.post('/', requireAuth, requireRol('UsuarioNegocio', 'Admin'), async (req, res) => {
  const { puestoId, ayudanteId, turno } = req.body;
  const asignacion = await prisma.puestoAyudante.upsert({
    where: { puestoId_ayudanteId: { puestoId, ayudanteId: Number(ayudanteId) } },
    update: { turno: turno || 'Día' },
    create: { puestoId, ayudanteId: Number(ayudanteId), turno: turno || 'Día' },
  });
  res.status(201).json(asignacion);
});

puestoAyudantesRouter.delete('/:id', requireAuth, requireRol('UsuarioNegocio', 'Admin'), async (req, res) => {
  await prisma.puestoAyudante.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
