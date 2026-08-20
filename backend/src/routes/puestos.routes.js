import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const puestosRouter = Router();

puestosRouter.get('/', async (req, res) => {
  const { eventoId } = req.query;
  if (!eventoId) return res.status(400).json({ error: 'eventoId es requerido' });
  const puestos = await prisma.puesto.findMany({ where: { eventoId } });
  res.json(puestos);
});

// Reemplaza el mapa completo del evento (equivalente a guardarPuestos del frontend).
puestosRouter.put('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const { eventoId, puestos } = req.body;

  await prisma.$transaction([
    prisma.puesto.deleteMany({ where: { eventoId } }),
    prisma.puesto.createMany({
      data: puestos.map((p) => ({ ...p, eventoId, id: undefined })),
    }),
  ]);

  const actualizado = await prisma.puesto.findMany({ where: { eventoId } });
  res.json(actualizado);
});
