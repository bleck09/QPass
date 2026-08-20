import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const codigosQrRouter = Router();

codigosQrRouter.get('/', requireAuth, async (req, res) => {
  const { eventoId } = req.query;
  if (!eventoId) return res.status(400).json({ error: 'eventoId es requerido' });
  const codigos = await prisma.codigoQr.findMany({ where: { eventoId }, orderBy: { numero: 'asc' } });
  res.json(codigos);
});

// Genera `cantidad` códigos únicos nuevos para el evento (se suman a los ya generados).
codigosQrRouter.post('/generar', requireAuth, requireRol('Admin'), async (req, res) => {
  const { eventoId, cantidad } = req.body;

  const ultimo = await prisma.codigoQr.findFirst({ where: { eventoId }, orderBy: { numero: 'desc' } });
  const siguienteNumero = (ultimo?.numero ?? 0) + 1;

  const nuevos = Array.from({ length: cantidad }, (_, i) => {
    const numero = siguienteNumero + i;
    return {
      eventoId,
      numero,
      codigo: `QP-${eventoId}-${String(numero).padStart(6, '0')}`,
    };
  });

  await prisma.codigoQr.createMany({ data: nuevos });
  res.status(201).json(nuevos);
});

// Borra todos los códigos generados de un evento (no reinicia la numeración).
codigosQrRouter.delete('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const { eventoId } = req.query;
  await prisma.codigoQr.deleteMany({ where: { eventoId } });
  res.status(204).end();
});
