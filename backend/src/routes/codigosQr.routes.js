import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const codigosQrRouter = Router();

// Sin 0/O/1/I para no confundir al leer un código a mano.
const CARACTERES_ALEATORIOS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LARGO_ALEATORIO = 12;

const generarParteAleatoria = () => {
  let parte = '';
  for (let i = 0; i < LARGO_ALEATORIO; i++) {
    parte += CARACTERES_ALEATORIOS[Math.floor(Math.random() * CARACTERES_ALEATORIOS.length)];
  }
  return parte;
};

codigosQrRouter.get('/', requireAuth, async (req, res) => {
  const { eventoId, disponibles } = req.query;
  if (!eventoId) return res.status(400).json({ error: 'eventoId es requerido' });
  const codigos = await prisma.codigoQr.findMany({
    where: { eventoId, entradaId: disponibles === 'true' ? null : undefined },
    orderBy: { numero: 'asc' },
  });
  res.json(codigos);
});

// Genera `cantidad` códigos únicos nuevos para el evento (se suman a los ya generados).
// prefijo: 1 a 3 letras elegidas por el Admin; el resto es aleatorio y no se repite (codigo es @unique en la BD).
codigosQrRouter.post('/generar', requireAuth, requireRol('Admin'), async (req, res) => {
  const { eventoId, cantidad, prefijo } = req.body;
  const prefijoNormalizado = String(prefijo || 'QP').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'QP';

  const ultimo = await prisma.codigoQr.findFirst({ where: { eventoId }, orderBy: { numero: 'desc' } });
  const siguienteNumero = (ultimo?.numero ?? 0) + 1;

  const creados = [];
  let numero = siguienteNumero;
  const MAX_INTENTOS = cantidad * 5 + 20;
  for (let intento = 0; creados.length < cantidad && intento < MAX_INTENTOS; intento++) {
    const codigo = `${prefijoNormalizado}-${generarParteAleatoria()}`;
    try {
      const creado = await prisma.codigoQr.create({ data: { eventoId, numero, codigo } });
      creados.push(creado);
      numero += 1;
    } catch (err) {
      if (err.code !== 'P2002') throw err; // choque de código único: se reintenta con otro aleatorio
    }
  }

  res.status(201).json(creados);
});

// Borra solo los códigos aún sin vincular a una entrada (no reinicia la numeración).
codigosQrRouter.delete('/', requireAuth, requireRol('Admin'), async (req, res) => {
  const { eventoId } = req.query;
  await prisma.codigoQr.deleteMany({ where: { eventoId, entradaId: null } });
  res.status(204).end();
});
