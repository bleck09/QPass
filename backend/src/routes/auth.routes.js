import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export const authRouter = Router();

authRouter.post('/registro', async (req, res) => {
  const { nombre, apellidoPaterno, apellidoMaterno, email, password, ci, celular, fechaNacimiento, rol } = req.body;
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return res.status(409).json({ error: 'El email ya está registrado' });

  const passwordHash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      email,
      passwordHash,
      ci,
      celular,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
      rol: rol || 'UsuarioNormal',
    },
  });

  res.status(201).json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valido = await bcrypt.compare(password, usuario.passwordHash);
  if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign(
    { id: usuario.id, rol: usuario.rol, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, foto: usuario.foto },
  });
});
