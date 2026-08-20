import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const productosRouter = Router();

productosRouter.get('/', async (req, res) => {
  const { puestoId } = req.query;
  if (!puestoId) return res.status(400).json({ error: 'puestoId es requerido' });
  const productos = await prisma.producto.findMany({ where: { puestoId } });
  res.json(productos);
});

productosRouter.post('/', requireAuth, requireRol('UsuarioNegocio', 'Admin'), async (req, res) => {
  const { puestoId, nombre, precio, imagen } = req.body;
  const producto = await prisma.producto.create({
    data: { puestoId, nombre, precio: Number(precio), imagen },
  });
  res.status(201).json(producto);
});

productosRouter.delete('/:id', requireAuth, requireRol('UsuarioNegocio', 'Admin'), async (req, res) => {
  await prisma.producto.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
