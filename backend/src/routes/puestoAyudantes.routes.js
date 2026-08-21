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

// Un ayudante queda atado al ÚNICO negocio de su primera asignación (Usuario.negocioAsignadoId).
puestoAyudantesRouter.post('/', requireAuth, requireRol('UsuarioNegocio', 'Admin'), async (req, res) => {
  const { puestoId, ayudanteId, turno } = req.body;
  const puesto = await prisma.puesto.findUnique({ where: { id: puestoId } });
  if (!puesto) return res.status(404).json({ error: 'Puesto no encontrado' });
  if (req.usuario.rol === 'UsuarioNegocio' && puesto.negocioId !== req.usuario.id) {
    return res.status(403).json({ error: 'Ese puesto no es tuyo' });
  }

  const ayudante = await prisma.usuario.findUnique({ where: { id: Number(ayudanteId) } });
  if (!ayudante) return res.status(404).json({ error: 'Ayudante no encontrado' });
  if (ayudante.negocioAsignadoId && ayudante.negocioAsignadoId !== puesto.negocioId) {
    return res.status(409).json({ error: 'Este ayudante ya pertenece a otro negocio' });
  }

  const [asignacion] = await prisma.$transaction([
    prisma.puestoAyudante.upsert({
      where: { puestoId_ayudanteId: { puestoId, ayudanteId: Number(ayudanteId) } },
      update: { turno: turno || 'Día' },
      create: { puestoId, ayudanteId: Number(ayudanteId), turno: turno || 'Día', creadoPorId: puesto.negocioId },
    }),
    ...(ayudante.negocioAsignadoId
      ? []
      : [prisma.usuario.update({ where: { id: ayudante.id }, data: { negocioAsignadoId: puesto.negocioId } })]),
  ]);

  res.status(201).json(asignacion);
});

puestoAyudantesRouter.delete('/:id', requireAuth, requireRol('UsuarioNegocio', 'Admin'), async (req, res) => {
  await prisma.puestoAyudante.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
