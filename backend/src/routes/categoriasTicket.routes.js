import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const categoriasTicketRouter = Router();

categoriasTicketRouter.get('/', async (req, res) => {
  const { eventoId } = req.query;
  if (!eventoId) return res.status(400).json({ error: 'eventoId es requerido' });
  const categorias = await prisma.categoriaTicket.findMany({ where: { eventoId } });
  res.json(categorias);
});

categoriasTicketRouter.post('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const { eventoId, nombre, descripcion, cantidad, precio } = req.body;
  const categoria = await prisma.categoriaTicket.create({
    data: { eventoId, nombre, descripcion, cantidad: Number(cantidad), precio: Number(precio) },
  });
  res.status(201).json(categoria);
});

categoriasTicketRouter.delete('/:id', requireAuth, requireRol('Admin'), async (req, res) => {
  const categoria = await prisma.categoriaTicket.findUnique({ where: { id: req.params.id } });
  if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada' });
  if (categoria.cantidadVendida > 0) {
    return res.status(409).json({ error: 'No se puede eliminar: ya tiene entradas vendidas' });
  }
  await prisma.categoriaTicket.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
