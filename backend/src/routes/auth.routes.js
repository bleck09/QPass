import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export const authRouter = Router();

const MINUTOS_VALIDEZ_CODIGO = 15;
const generarCodigo6Digitos = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

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

// --- RECUPERAR CONTRASEÑA (código de 6 dígitos) ---
// No hay servicio de correo: el código se devuelve en la respuesta para poder probarlo.
// En producción esto se reemplazaría por un envío real y la respuesta no lo incluiría.

authRouter.post('/recuperar/solicitar', async (req, res) => {
  const { email } = req.body;
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return res.status(404).json({ error: 'No existe ninguna cuenta con ese correo' });

  const codigo = generarCodigo6Digitos();
  await prisma.$transaction([
    // Solo el último código emitido es válido.
    prisma.codigoRecuperacion.updateMany({ where: { usuarioId: usuario.id, usado: false }, data: { usado: true } }),
    prisma.codigoRecuperacion.create({
      data: { usuarioId: usuario.id, codigo, expiraEn: new Date(Date.now() + MINUTOS_VALIDEZ_CODIGO * 60 * 1000) },
    }),
  ]);

  res.status(201).json({ codigoDemo: codigo }); // ver nota arriba: no hay envío de correo real
});

const codigoValido = (email) => async (codigo) => {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return null;
  const registro = await prisma.codigoRecuperacion.findFirst({
    where: { usuarioId: usuario.id, codigo, usado: false, expiraEn: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  return registro ? { usuario, registro } : null;
};

authRouter.post('/recuperar/verificar', async (req, res) => {
  const { email, codigo } = req.body;
  const resultado = await codigoValido(email)(codigo);
  if (!resultado) return res.status(400).json({ error: 'Código incorrecto o vencido' });
  res.json({ valido: true });
});

authRouter.post('/recuperar/restablecer', async (req, res) => {
  const { email, codigo, passwordNueva } = req.body;
  if (!passwordNueva || passwordNueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  const resultado = await codigoValido(email)(codigo);
  if (!resultado) return res.status(400).json({ error: 'Código incorrecto o vencido' });
  const { usuario, registro } = resultado;

  const passwordHash = await bcrypt.hash(passwordNueva, 10);
  await prisma.$transaction([
    prisma.usuario.update({ where: { id: usuario.id }, data: { passwordHash } }),
    prisma.codigoRecuperacion.update({ where: { id: registro.id }, data: { usado: true } }),
    prisma.cambioPassword.create({ data: { usuarioId: usuario.id, origen: 'recuperacion' } }),
  ]);

  res.status(204).end();
});
