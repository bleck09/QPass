import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const usuariosRouter = Router();

usuariosRouter.get('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, email: true, rol: true, extraInfo: true, foto: true, recaudado: true },
  });
  res.json(usuarios);
});

usuariosRouter.get('/:id', requireAuth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(req.params.id) },
    select: { id: true, nombre: true, email: true, rol: true, extraInfo: true, foto: true, recaudado: true },
  });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(usuario);
});
