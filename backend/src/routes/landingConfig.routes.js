import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const landingConfigRouter = Router();

landingConfigRouter.get('/:eventoId', async (req, res) => {
  const config = await prisma.landingConfig.findUnique({ where: { eventoId: req.params.eventoId } });
  if (!config) return res.status(404).json({ error: 'Este evento no tiene landing configurada' });
  res.json(config);
});

landingConfigRouter.put('/:eventoId', requireAuth, requireRol('Admin'), async (req, res) => {
  const { titulo, informacion, imagen, colorPrimario, colorBoton, colorFondo, colorTextoTitulo, colorTextoP, actividades, cronograma } = req.body;
  const data = { titulo, informacion, imagen, colorPrimario, colorBoton, colorFondo, colorTextoTitulo, colorTextoP, actividades, cronograma };
  const config = await prisma.landingConfig.upsert({
    where: { eventoId: req.params.eventoId },
    update: data,
    create: { eventoId: req.params.eventoId, ...data },
  });
  res.json(config);
});
