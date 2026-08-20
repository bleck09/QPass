import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const transaccionesRouter = Router();

transaccionesRouter.get('/', requireAuth, async (req, res) => {
  const { entradaId, negocioUsuarioId } = req.query;
  if (!entradaId && !negocioUsuarioId) {
    return res.status(400).json({ error: 'entradaId o negocioUsuarioId es requerido' });
  }
  const transacciones = await prisma.transaccion.findMany({
    where: { entradaId, negocioUsuarioId: negocioUsuarioId ? Number(negocioUsuarioId) : undefined },
    orderBy: { createdAt: 'desc' },
  });
  res.json(transacciones);
});

// Recarga de saldo a la billetera de una Entrada (pulsera QR), hecha por un Recargador.
transaccionesRouter.post('/recarga', requireAuth, requireRol('Recargador', 'Admin'), async (req, res) => {
  const { entradaId, monto } = req.body;
  const valor = Number(monto);
  if (!valor || valor <= 0) return res.status(400).json({ error: 'Monto inválido' });

  const [entrada, transaccion] = await prisma.$transaction(async (tx) => {
    const actual = await tx.entrada.findUnique({ where: { id: entradaId } });
    if (!actual) throw new Error('Entrada no encontrada');
    const saldoResultante = Number(actual.saldo) + valor;

    const entradaActualizada = await tx.entrada.update({ where: { id: entradaId }, data: { saldo: saldoResultante } });
    const nuevaTransaccion = await tx.transaccion.create({
      data: { tipo: 'recarga', monto: valor, saldoResultante, entradaId, operadorId: req.usuario.id },
    });
    return [entradaActualizada, nuevaTransaccion];
  });

  res.status(201).json({ entrada, transaccion });
});

// Retiro de saldo: de la billetera de una Entrada (asistente) o de un Usuario Negocio.
transaccionesRouter.post('/devolucion', requireAuth, requireRol('Devolucion', 'Admin'), async (req, res) => {
  const { entradaId, negocioUsuarioId, monto, fotoCarnetUrl } = req.body;
  const valor = Number(monto);
  if (!valor || valor <= 0) return res.status(400).json({ error: 'Monto inválido' });
  if (!entradaId && !negocioUsuarioId) return res.status(400).json({ error: 'entradaId o negocioUsuarioId es requerido' });
  if (!fotoCarnetUrl) return res.status(400).json({ error: 'La foto del carnet de quien retira es obligatoria' });

  const resultado = await prisma.$transaction(async (tx) => {
    let saldoDisponible;
    if (entradaId) {
      const actual = await tx.entrada.findUnique({ where: { id: entradaId } });
      if (!actual) throw new Error('Entrada no encontrada');
      saldoDisponible = Number(actual.saldo);
    } else {
      const recaudado = await tx.venta.aggregate({
        _sum: { montoTotal: true },
        where: { puesto: { negocioId: Number(negocioUsuarioId) } },
      });
      const devuelto = await tx.transaccion.aggregate({
        _sum: { monto: true },
        where: { negocioUsuarioId: Number(negocioUsuarioId), tipo: 'devolucion' },
      });
      saldoDisponible = Number(recaudado._sum.montoTotal ?? 0) - Number(devuelto._sum.monto ?? 0);
    }

    if (valor > saldoDisponible) throw new Error('Saldo insuficiente para el retiro');
    const saldoResultante = saldoDisponible - valor;

    if (entradaId) {
      await tx.entrada.update({ where: { id: entradaId }, data: { saldo: saldoResultante } });
    }

    return tx.transaccion.create({
      data: {
        tipo: 'devolucion', monto: valor, saldoResultante, fotoCarnetUrl,
        entradaId: entradaId || undefined,
        negocioUsuarioId: negocioUsuarioId ? Number(negocioUsuarioId) : undefined,
        operadorId: req.usuario.id,
      },
    });
  }).catch(err => ({ error: err.message }));

  if (resultado.error) return res.status(400).json({ error: resultado.error });
  res.status(201).json(resultado);
});
