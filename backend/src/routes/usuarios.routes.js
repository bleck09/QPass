import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const usuariosRouter = Router();

const SELECT_PUBLICO = {
  id: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true,
  email: true, rol: true, ci: true, celular: true, foto: true,
};

usuariosRouter.get('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const { rol } = req.query;
  const usuarios = await prisma.usuario.findMany({
    where: rol ? { rol } : undefined,
    select: SELECT_PUBLICO,
  });
  res.json(usuarios);
});

usuariosRouter.get('/:id', requireAuth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(req.params.id) },
    select: SELECT_PUBLICO,
  });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(usuario);
});

usuariosRouter.patch('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (req.usuario.id !== id && req.usuario.rol !== 'Admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const { celular, ciudad, biografia, fechaNacimiento, foto } = req.body;
  const usuario = await prisma.usuario.update({
    where: { id },
    data: { celular, ciudad, biografia, foto, fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined },
    select: SELECT_PUBLICO,
  });
  res.json(usuario);
});

usuariosRouter.delete('/:id', requireAuth, requireRol('Admin'), async (req, res) => {
  await prisma.usuario.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});
