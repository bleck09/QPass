import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const reportesEntradaRouter = Router();

// Admin/Cliente ven todos los reportes; cualquier otro usuario solo ve los de sus propias compras.
reportesEntradaRouter.get('/', requireAuth, async (req, res) => {
  const { estado, eventoId } = req.query;
  const vePropios = !['Admin', 'Cliente'].includes(req.usuario.rol);
  const reportes = await prisma.reporteEntrada.findMany({
    where: {
      estado: estado || undefined,
      eventoId: eventoId || undefined,
      entrada: vePropios ? { compra: { compradorId: req.usuario.id } } : undefined,
    },
    include: {
      entrada: {
        select: {
          nombre: true, correo: true, celular: true,
          compra: { select: { comprador: { select: { nombre: true, email: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reportes);
});

// Usuario Normal reporta un dato mal puesto en una entrada ya aprobada (no se edita directo).
reportesEntradaRouter.post('/', requireAuth, async (req, res) => {
  const { compraId, entradaId, campo, descripcion } = req.body;
  const entrada = await prisma.entrada.findUnique({ where: { id: entradaId } });
  if (!entrada) return res.status(404).json({ error: 'Entrada no encontrada' });

  const reporte = await prisma.reporteEntrada.create({
    data: { eventoId: entrada.eventoId, compraId, entradaId, campo, descripcion },
  });
  res.status(201).json(reporte);
});

// Si el dato es el correo, también corrige Usuario.email de esa misma cuenta — pero solo
// mientras esa persona nunca inició sesión (primerLoginEn null); después queda bloqueado.
reportesEntradaRouter.post('/:id/corregir', requireAuth, requireRol('Admin'), async (req, res) => {
  const { valorCorregido } = req.body;
  if (!valorCorregido?.trim()) return res.status(400).json({ error: 'El valor corregido es requerido' });
  const valor = valorCorregido.trim();

  const reporte = await prisma.reporteEntrada.findUnique({ where: { id: req.params.id } });
  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });

  const campoEntrada = reporte.campo; // 'nombre' | 'correo' | 'celular' — mismo nombre en Entrada
  const entrada = await prisma.entrada.findUnique({ where: { id: reporte.entradaId } });

  const operaciones = [
    prisma.entrada.update({ where: { id: reporte.entradaId }, data: { [campoEntrada]: valor } }),
    prisma.reporteEntrada.update({
      where: { id: reporte.id },
      data: { estado: 'resuelto', valorCorregido: valor, resueltoPorId: req.usuario.id, resueltoEn: new Date() },
    }),
  ];

  if (campoEntrada === 'correo' && entrada.usuarioId) {
    const usuario = await prisma.usuario.findUnique({ where: { id: entrada.usuarioId } });
    if (usuario && !usuario.primerLoginEn) {
      operaciones.push(prisma.usuario.update({ where: { id: usuario.id }, data: { email: valor } }));
    }
  }

  const [, actualizado] = await prisma.$transaction(operaciones);
  res.json(actualizado);
});
