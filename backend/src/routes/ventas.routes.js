import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const ventasRouter = Router();

ventasRouter.get('/', requireAuth, async (req, res) => {
  const { puestoId, entradaId, eventoId } = req.query;
  const ventas = await prisma.venta.findMany({
    where: { puestoId, entradaId, puesto: eventoId ? { eventoId } : undefined },
    include: {
      items: true,
      puesto: { select: { id: true, nombre: true, negocioId: true } },
      entrada: { select: { id: true, nombre: true, documento: true, foto: true } },
      ayudante: { select: { id: true, nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(ventas);
});

// Cobro de un Ayudante en su puesto: parte doble en Transaccion (mismo ventaId) — debita al
// dueño de la Entrada escaneada y acredita, sin pasos intermedios, al dueño del Puesto/negocio.
ventasRouter.post('/', requireAuth, requireRol('Ayudante'), async (req, res) => {
  const { puestoId, entradaId, items } = req.body; // items: [{ productoId, cantidad }]
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Agrega al menos un producto' });
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const entrada = await tx.entrada.findUnique({ where: { id: entradaId } });
    if (!entrada) throw new Error('Entrada no encontrada');
    if (!entrada.usuarioId) throw new Error('Esta entrada todavía no tiene una cuenta vinculada');

    const puesto = await tx.puesto.findUnique({ where: { id: puestoId } });
    if (!puesto) throw new Error('Puesto no encontrado');

    const productos = await tx.producto.findMany({ where: { id: { in: items.map(i => i.productoId) } } });
    const lineas = items.map(i => {
      const producto = productos.find(p => p.id === i.productoId);
      return { productoId: i.productoId, nombreProducto: producto.nombre, precioUnitario: producto.precio, cantidad: i.cantidad };
    });
    const montoTotal = lineas.reduce((suma, l) => suma + Number(l.precioUnitario) * l.cantidad, 0);

    const comprador = await tx.usuario.findUnique({ where: { id: entrada.usuarioId } });
    if (montoTotal > Number(comprador.saldo)) throw new Error('Saldo insuficiente para esta venta');
    const saldoCompradorResultante = Number(comprador.saldo) - montoTotal;

    const negocio = await tx.usuario.findUnique({ where: { id: puesto.negocioId } });
    const saldoNegocioResultante = Number(negocio.saldo) + montoTotal;

    await tx.usuario.update({ where: { id: comprador.id }, data: { saldo: saldoCompradorResultante } });
    await tx.usuario.update({ where: { id: negocio.id }, data: { saldo: saldoNegocioResultante } });

    const venta = await tx.venta.create({
      data: { puestoId, entradaId, montoTotal, ayudanteId: req.usuario.id, items: { create: lineas } },
      include: { items: true },
    });

    await tx.transaccion.createMany({
      data: [
        {
          eventoId: entrada.eventoId, tipo: 'consumo', monto: montoTotal, saldoResultante: saldoCompradorResultante,
          usuarioId: comprador.id, entradaId, ventaId: venta.id, operadorId: req.usuario.id,
        },
        {
          eventoId: entrada.eventoId, tipo: 'venta', monto: montoTotal, saldoResultante: saldoNegocioResultante,
          usuarioId: negocio.id, entradaId, ventaId: venta.id, operadorId: req.usuario.id,
        },
      ],
    });

    return venta;
  }).catch(err => ({ error: err.message }));

  if (resultado.error) return res.status(400).json({ error: resultado.error });
  res.status(201).json(resultado);
});
