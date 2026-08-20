import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const puestosRouter = Router();

puestosRouter.get('/', async (req, res) => {
  const { eventoId, negocioId } = req.query;
  if (!eventoId) return res.status(400).json({ error: 'eventoId es requerido' });
  const puestos = await prisma.puesto.findMany({
    where: { eventoId, negocioId: negocioId ? Number(negocioId) : undefined },
    include: { productos: true, ayudantes: { include: { ayudante: true } } },
  });
  res.json(puestos);
});

puestosRouter.post('/', requireAuth, requireRol('UsuarioNegocio', 'Admin'), async (req, res) => {
  const { eventoId, nombre, descripcion, logo } = req.body;
  const negocioId = req.usuario.rol === 'UsuarioNegocio' ? req.usuario.id : req.body.negocioId;
  const puesto = await prisma.puesto.create({
    data: { eventoId, negocioId, nombre, descripcion, logo },
  });
  res.status(201).json(puesto);
});

// Datos del puesto (nombre/logo) o su posición en el mapa (x/y/ancho/alto/estadoActivo).
puestosRouter.patch('/:id', requireAuth, requireRol('UsuarioNegocio', 'Admin'), async (req, res) => {
  const { nombre, descripcion, logo, categoria, x, y, ancho, alto, estadoActivo } = req.body;
  const puesto = await prisma.puesto.update({
    where: { id: req.params.id },
    data: { nombre, descripcion, logo, categoria, x, y, ancho, alto, estadoActivo },
  });
  res.json(puesto);
});
