import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const entradasRouter = Router();

entradasRouter.get('/', requireAuth, async (req, res) => {
  const { eventoId } = req.query;
  if (!eventoId) return res.status(400).json({ error: 'eventoId es requerido' });
  const entradas = await prisma.entrada.findMany({
    where: { eventoId },
    include: { codigoQrVinculado: true },
  });
  res.json(entradas);
});

entradasRouter.post('/:id/vincular-qr', requireAuth, async (req, res) => {
  const { codigoQrId } = req.body;
  const entrada = await prisma.entrada.update({
    where: { id: Number(req.params.id) },
    data: { vinculadoEn: new Date(), codigoQrVinculado: { connect: { id: codigoQrId } } },
    include: { codigoQrVinculado: true },
  });
  res.json(entrada);
});

entradasRouter.post('/:id/desvincular-qr', requireAuth, async (req, res) => {
  const entrada = await prisma.entrada.update({
    where: { id: Number(req.params.id) },
    data: { vinculadoEn: null, codigoQrVinculado: { disconnect: true } },
  });
  res.json(entrada);
});
