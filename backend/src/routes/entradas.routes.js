import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const entradasRouter = Router();

entradasRouter.get('/', requireAuth, async (req, res) => {
  const { eventoId, estadoIngreso } = req.query;
  if (!eventoId) return res.status(400).json({ error: 'eventoId es requerido' });
  const entradas = await prisma.entrada.findMany({
    where: { eventoId, estadoIngreso: estadoIngreso || undefined },
    include: { codigoQrVinculado: true, categoriaTicket: true },
  });
  res.json(entradas);
});

entradasRouter.get('/:id', requireAuth, async (req, res) => {
  const entrada = await prisma.entrada.findUnique({
    where: { id: req.params.id },
    include: { codigoQrVinculado: true, categoriaTicket: true },
  });
  if (!entrada) return res.status(404).json({ error: 'Entrada no encontrada' });
  res.json(entrada);
});

// Vincula una pulsera/QR física del pool a esta entrada (Gestión de Entrega).
entradasRouter.post('/:id/vincular-qr', requireAuth, async (req, res) => {
  const { codigoQrId } = req.body;
  const entrada = await prisma.entrada.update({
    where: { id: req.params.id },
    data: { codigoQrVinculado: { connect: { id: codigoQrId } } },
    include: { codigoQrVinculado: true },
  });
  res.json(entrada);
});

entradasRouter.post('/:id/desvincular-qr', requireAuth, async (req, res) => {
  const entrada = await prisma.entrada.update({
    where: { id: req.params.id },
    data: { codigoQrVinculado: { disconnect: true } },
  });
  res.json(entrada);
});

// Control de acceso (Supervisor): primer ingreso, o alternar adentro/afuera.
entradasRouter.post('/:id/ingreso', requireAuth, async (req, res) => {
  const { hora, foto } = req.body;
  const entrada = await prisma.entrada.update({
    where: { id: req.params.id },
    data: { estadoIngreso: 'ingresado', horaIngreso: hora, fotoIngreso: foto ?? undefined },
  });
  res.json(entrada);
});

entradasRouter.post('/:id/salida', requireAuth, async (req, res) => {
  const { hora, foto } = req.body;
  const actual = await prisma.entrada.findUnique({ where: { id: req.params.id } });
  if (!actual) return res.status(404).json({ error: 'Entrada no encontrada' });
  if (!actual.fotoIngreso && !foto) {
    return res.status(400).json({ error: 'Foto de seguridad obligatoria antes de registrar la salida' });
  }

  const entrada = await prisma.entrada.update({
    where: { id: req.params.id },
    data: { estadoIngreso: 'salio', horaSalida: hora, fotoIngreso: actual.fotoIngreso ?? foto },
  });
  res.json(entrada);
});
