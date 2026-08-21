import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const transaccionesRouter = Router();

transaccionesRouter.get('/', requireAuth, async (req, res) => {
  const { usuarioId, entradaId, eventoId, tipo } = req.query;
  if (!usuarioId && !entradaId && !eventoId) {
    return res.status(400).json({ error: 'usuarioId, entradaId o eventoId es requerido' });
  }
  const transacciones = await prisma.transaccion.findMany({
    where: {
      usuarioId: usuarioId ? Number(usuarioId) : undefined,
      entradaId: entradaId || undefined,
      eventoId: eventoId || undefined,
      tipo: tipo || undefined,
    },
    include: {
      operador: { select: { id: true, nombre: true } },
      entrada: { select: { id: true, nombre: true, documento: true, foto: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(transacciones);
});

// Recarga de saldo a la billetera personal (Usuario.saldo) del dueño de la Entrada escaneada.
transaccionesRouter.post('/recarga', requireAuth, requireRol('Recargador', 'Admin'), async (req, res) => {
  const { entradaId, monto } = req.body;
  const valor = Number(monto);
  if (!valor || valor <= 0) return res.status(400).json({ error: 'Monto inválido' });

  const resultado = await prisma.$transaction(async (tx) => {
    const entrada = await tx.entrada.findUnique({ where: { id: entradaId } });
    if (!entrada) throw new Error('Entrada no encontrada');
    if (!entrada.usuarioId) throw new Error('Esta entrada todavía no tiene una cuenta vinculada');

    const usuario = await tx.usuario.findUnique({ where: { id: entrada.usuarioId } });
    const saldoResultante = Number(usuario.saldo) + valor;

    const usuarioActualizado = await tx.usuario.update({
      where: { id: usuario.id },
      data: { saldo: saldoResultante },
      select: { id: true, nombre: true, email: true, rol: true, saldo: true },
    });
    const transaccion = await tx.transaccion.create({
      data: {
        eventoId: entrada.eventoId, tipo: 'recarga', monto: valor, saldoResultante,
        usuarioId: usuario.id, entradaId, operadorId: req.usuario.id,
      },
    });
    return { usuario: usuarioActualizado, transaccion };
  }).catch(err => ({ error: err.message }));

  if (resultado.error) return res.status(400).json({ error: resultado.error });
  res.status(201).json(resultado);
});

// Retiro de saldo de la billetera personal de un Usuario (asistente o dueño de negocio — ambos
// son Usuario). entradaId es solo contexto opcional (qué manilla se escaneó, si aplica).
transaccionesRouter.post('/devolucion', requireAuth, requireRol('Devolucion', 'Admin'), async (req, res) => {
  const { usuarioId, entradaId, monto, fotoCarnetUrl, eventoId } = req.body;
  const valor = Number(monto);
  if (!valor || valor <= 0) return res.status(400).json({ error: 'Monto inválido' });
  if (!usuarioId) return res.status(400).json({ error: 'usuarioId es requerido' });
  if (!eventoId) return res.status(400).json({ error: 'eventoId es requerido' });
  if (!fotoCarnetUrl) return res.status(400).json({ error: 'La foto del carnet de quien retira es obligatoria' });

  const resultado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id: Number(usuarioId) } });
    if (!usuario) throw new Error('Usuario no encontrado');
    if (valor > Number(usuario.saldo)) throw new Error('Saldo insuficiente para el retiro');

    const saldoResultante = Number(usuario.saldo) - valor;
    await tx.usuario.update({ where: { id: usuario.id }, data: { saldo: saldoResultante } });

    return tx.transaccion.create({
      data: {
        eventoId, tipo: 'devolucion', monto: valor, saldoResultante, fotoCarnetUrl,
        usuarioId: usuario.id, entradaId: entradaId || undefined, operadorId: req.usuario.id,
      },
    });
  }).catch(err => ({ error: err.message }));

  if (resultado.error) return res.status(400).json({ error: resultado.error });
  res.status(201).json(resultado);
});
