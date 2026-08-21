import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const usuariosRouter = Router();

const SELECT_PUBLICO = {
  id: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true,
  email: true, rol: true, ci: true, celular: true, foto: true,
  ciudad: true, biografia: true, fechaNacimiento: true, createdAt: true,
  saldo: true, negocioAsignadoId: true,
};

usuariosRouter.get('/', requireAuth, requireRol('Admin', 'Cliente', 'Devolucion'), async (req, res) => {
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

usuariosRouter.post('/:id/password', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (req.usuario.id !== id) return res.status(403).json({ error: 'No autorizado' });

  const { passwordActual, passwordNueva } = req.body;
  if (!passwordActual || !passwordNueva) return res.status(400).json({ error: 'Completa ambas contraseñas' });
  if (passwordNueva.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  const valido = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!valido) return res.status(401).json({ error: 'La contraseña actual no es correcta' });

  const passwordHash = await bcrypt.hash(passwordNueva, 10);
  await prisma.usuario.update({ where: { id }, data: { passwordHash } });
  res.status(204).end();
});

usuariosRouter.delete('/:id', requireAuth, requireRol('Admin'), async (req, res) => {
  await prisma.usuario.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});
