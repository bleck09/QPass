import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const propuestaLandingRouter = Router();

propuestaLandingRouter.get('/:eventoId', requireAuth, requireRol('Admin', 'Cliente'), async (req, res) => {
  const propuesta = await prisma.propuestaLanding.findUnique({ where: { eventoId: req.params.eventoId } });
  if (!propuesta) return res.status(404).json({ error: 'Aún no hay propuesta para este evento' });
  res.json(propuesta);
});

// El Cliente (organizador) envía/actualiza su propuesta para que Admin arme la landing.
propuestaLandingRouter.put('/:eventoId', requireAuth, requireRol('Cliente'), async (req, res) => {
  const { nombreEvento, descripcion, colorPrimario, colorFondo, colorTextoTitulo, colorTextoP, imagenPortada, mapaLugar, actividades, cronograma } = req.body;
  const data = { nombreEvento, descripcion, colorPrimario, colorFondo, colorTextoTitulo, colorTextoP, imagenPortada, mapaLugar, actividades, cronograma };
  const propuesta = await prisma.propuestaLanding.upsert({
    where: { eventoId: req.params.eventoId },
    update: data,
    create: { eventoId: req.params.eventoId, ...data },
  });
  res.json(propuesta);
});
