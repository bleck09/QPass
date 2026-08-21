import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const incidenciasRouter = Router();

incidenciasRouter.get('/', requireAuth, requireRol('Admin', 'Recargador', 'Cliente'), async (req, res) => {
  const { estado, eventoId } = req.query;
  const where = req.usuario.rol === 'Recargador' ? { recargadorId: req.usuario.id } : {};
  if (estado) where.estado = estado;
  if (eventoId) where.eventoId = eventoId;
  const incidencias = await prisma.incidenciaRecarga.findMany({
    where,
    include: {
      entrada: { select: { nombre: true, documento: true, foto: true } },
      recargador: { select: { nombre: true } },
      resueltoPor: { select: { nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(incidencias);
});

// Reporte de un Recargador: la recarga confirmada no coincidió con lo que el participante pedía.
incidenciasRouter.post('/', requireAuth, requireRol('Recargador'), async (req, res) => {
  const { entradaId, montoEntregado, montoSolicitado, nota } = req.body;
  const entrada = await prisma.entrada.findUnique({ where: { id: entradaId } });
  if (!entrada) return res.status(404).json({ error: 'Entrada no encontrada' });

  const incidencia = await prisma.incidenciaRecarga.create({
    data: {
      eventoId: entrada.eventoId, entradaId, montoEntregado, montoSolicitado, nota,
      recargadorId: req.usuario.id,
    },
  });
  res.status(201).json(incidencia);
});

// Admin decide cuánto acreditar de más: aplica un ajuste (Transaccion) y cierra el caso.
incidenciasRouter.post('/:id/resolver', requireAuth, requireRol('Admin'), async (req, res) => {
  const { ajusteAplicado } = req.body;
  const valor = Number(ajusteAplicado);
  if (Number.isNaN(valor) || valor < 0) return res.status(400).json({ error: 'Monto inválido' });

  const incidencia = await prisma.incidenciaRecarga.findUnique({ where: { id: req.params.id } });
  if (!incidencia) return res.status(404).json({ error: 'Incidencia no encontrada' });

  const resultado = await prisma.$transaction(async (tx) => {
    if (valor > 0) {
      const entrada = await tx.entrada.findUnique({ where: { id: incidencia.entradaId } });
      const usuario = await tx.usuario.findUnique({ where: { id: entrada.usuarioId } });
      const saldoResultante = Number(usuario.saldo) + valor;
      await tx.usuario.update({ where: { id: usuario.id }, data: { saldo: saldoResultante } });
      await tx.transaccion.create({
        data: {
          eventoId: incidencia.eventoId, tipo: 'ajuste', monto: valor, saldoResultante,
          usuarioId: usuario.id, entradaId: entrada.id, operadorId: req.usuario.id,
        },
      });
    }
    return tx.incidenciaRecarga.update({
      where: { id: incidencia.id },
      data: { estado: 'resuelto', ajusteAplicado: valor, resueltoPorId: req.usuario.id, resueltoEn: new Date() },
    });
  });

  res.json(resultado);
});
