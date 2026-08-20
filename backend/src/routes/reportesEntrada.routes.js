import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const reportesEntradaRouter = Router();

reportesEntradaRouter.get('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const { estado } = req.query;
  const reportes = await prisma.reporteEntrada.findMany({
    where: estado ? { estado } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  res.json(reportes);
});

// Usuario Normal reporta un dato mal puesto en una entrada ya aprobada (no se edita directo).
reportesEntradaRouter.post('/', requireAuth, async (req, res) => {
  const { compraId, entradaId, campo, descripcion } = req.body;
  const reporte = await prisma.reporteEntrada.create({
    data: { compraId, entradaId, campo, descripcion },
  });
  res.status(201).json(reporte);
});

reportesEntradaRouter.post('/:id/corregir', requireAuth, requireRol('Admin'), async (req, res) => {
  const { valorCorregido } = req.body;
  if (!valorCorregido?.trim()) return res.status(400).json({ error: 'El valor corregido es requerido' });

  const reporte = await prisma.reporteEntrada.findUnique({ where: { id: req.params.id } });
  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });

  const campoEntrada = reporte.campo; // 'nombre' | 'correo' | 'celular' — mismo nombre en Entrada
  const [, actualizado] = await prisma.$transaction([
    prisma.entrada.update({ where: { id: reporte.entradaId }, data: { [campoEntrada]: valorCorregido.trim() } }),
    prisma.reporteEntrada.update({
      where: { id: reporte.id },
      data: { estado: 'resuelto', valorCorregido: valorCorregido.trim(), resueltoPorId: req.usuario.id, resueltoEn: new Date() },
    }),
  ]);

  res.json(actualizado);
});
