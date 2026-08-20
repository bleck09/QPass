import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const ventasRouter = Router();

ventasRouter.get('/', requireAuth, async (req, res) => {
  const { puestoId, entradaId } = req.query;
  const ventas = await prisma.venta.findMany({
    where: { puestoId, entradaId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(ventas);
});

// Cobro de un Ayudante en su puesto contra el saldo de la pulsera del cliente (Entrada).
ventasRouter.post('/', requireAuth, requireRol('Ayudante'), async (req, res) => {
  const { puestoId, entradaId, items } = req.body; // items: [{ productoId, cantidad }]
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Agrega al menos un producto' });
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const entrada = await tx.entrada.findUnique({ where: { id: entradaId } });
    if (!entrada) throw new Error('Entrada no encontrada');

    const productos = await tx.producto.findMany({ where: { id: { in: items.map(i => i.productoId) } } });
    const lineas = items.map(i => {
      const producto = productos.find(p => p.id === i.productoId);
      return { productoId: i.productoId, nombreProducto: producto.nombre, precioUnitario: producto.precio, cantidad: i.cantidad };
    });
    const montoTotal = lineas.reduce((suma, l) => suma + Number(l.precioUnitario) * l.cantidad, 0);

    if (montoTotal > Number(entrada.saldo)) throw new Error('Saldo insuficiente para esta venta');
    const saldoResultante = Number(entrada.saldo) - montoTotal;

    await tx.entrada.update({ where: { id: entradaId }, data: { saldo: saldoResultante } });
    const transaccion = await tx.transaccion.create({
      data: { tipo: 'consumo', monto: montoTotal, saldoResultante, entradaId, operadorId: req.usuario.id },
    });

    return tx.venta.create({
      data: {
        puestoId, entradaId, montoTotal, transaccionId: transaccion.id,
        ayudanteId: req.usuario.id,
        items: { create: lineas },
      },
      include: { items: true },
    });
  }).catch(err => ({ error: err.message }));

  if (resultado.error) return res.status(400).json({ error: resultado.error });
  res.status(201).json(resultado);
});
