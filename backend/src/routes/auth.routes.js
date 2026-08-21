import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export const authRouter = Router();

// Si viene un Bearer token válido, lo decodifica (sin exigirlo): permite que Admin/Usuario
// Negocio creen otras cuentas desde este mismo endpoint y quede auditado quién la creó.
const usuarioOpcional = (req) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

authRouter.post('/registro', async (req, res) => {
  const { nombre, apellidoPaterno, apellidoMaterno, email, password, ci, celular, fechaNacimiento, rol } = req.body;
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return res.status(409).json({ error: 'El email ya está registrado' });

  const creador = usuarioOpcional(req);
  const rolNuevo = rol || 'UsuarioNormal';
  // Un Ayudante queda atado al ÚNICO Usuario Negocio que lo creó (Usuario.negocioAsignadoId).
  const negocioAsignadoId = rolNuevo === 'Ayudante' && creador?.rol === 'UsuarioNegocio' ? creador.id : undefined;

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
      rol: rolNuevo,
      creadoPorId: creador?.id,
      negocioAsignadoId,
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

  // Primer login: a partir de aquí ReporteEntrada ya no puede corregir el correo de esta cuenta.
  if (!usuario.primerLoginEn) {
    await prisma.usuario.update({ where: { id: usuario.id }, data: { primerLoginEn: new Date() } });
  }

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
