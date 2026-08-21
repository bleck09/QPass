import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRol } from '../middleware/auth.js';

export const solicitudesEventoRouter = Router();

// Cliente ve solo las suyas; Admin ve todas (opcionalmente filtradas por estado).
solicitudesEventoRouter.get('/', requireAuth, requireRol('Admin', 'Cliente'), async (req, res) => {
  const { estado } = req.query;
  const where = req.usuario.rol === 'Cliente' ? { clienteId: req.usuario.id } : {};
  if (estado) where.estado = estado;
  const solicitudes = await prisma.solicitudEvento.findMany({
    where,
    include: { cliente: { select: { id: true, nombre: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(solicitudes);
});

solicitudesEventoRouter.get('/:id', requireAuth, requireRol('Admin', 'Cliente'), async (req, res) => {
  const solicitud = await prisma.solicitudEvento.findUnique({ where: { id: req.params.id } });
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
  if (req.usuario.rol === 'Cliente' && solicitud.clienteId !== req.usuario.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  res.json(solicitud);
});

// El Cliente propone un evento ANTES de que exista. Si Admin la rechaza, puede editarla y
// reenviarla (PATCH) o crear una nueva.
solicitudesEventoRouter.post('/', requireAuth, requireRol('Cliente'), async (req, res) => {
  const {
    nombreEvento, lugar, fecha, fechaFin, descripcion,
    colorPrimario, colorBoton, colorFondo, colorTextoTitulo, colorTextoP,
    imagenPortada, mapaLugar, actividades, cronograma,
  } = req.body;
  const solicitud = await prisma.solicitudEvento.create({
    data: {
      clienteId: req.usuario.id, nombreEvento, lugar, descripcion,
      fecha: new Date(fecha), fechaFin: new Date(fechaFin || fecha),
      colorPrimario, colorBoton, colorFondo, colorTextoTitulo, colorTextoP,
      imagenPortada, mapaLugar, actividades, cronograma,
    },
  });
  res.status(201).json(solicitud);
});

// Mientras siga pendiente, el Cliente puede editarla.
solicitudesEventoRouter.patch('/:id', requireAuth, requireRol('Cliente'), async (req, res) => {
  const solicitud = await prisma.solicitudEvento.findUnique({ where: { id: req.params.id } });
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
  if (solicitud.clienteId !== req.usuario.id) return res.status(403).json({ error: 'No autorizado' });
  if (solicitud.estado !== 'pendiente') return res.status(409).json({ error: 'Esta solicitud ya fue resuelta' });

  const {
    nombreEvento, lugar, fecha, fechaFin, descripcion,
    colorPrimario, colorBoton, colorFondo, colorTextoTitulo, colorTextoP,
    imagenPortada, mapaLugar, actividades, cronograma,
  } = req.body;
  const actualizada = await prisma.solicitudEvento.update({
    where: { id: req.params.id },
    data: {
      nombreEvento, lugar, descripcion, colorPrimario, colorBoton, colorFondo, colorTextoTitulo, colorTextoP,
      imagenPortada, mapaLugar, actividades, cronograma,
      fecha: fecha ? new Date(fecha) : undefined,
      fechaFin: fechaFin ? new Date(fechaFin) : undefined,
    },
  });
  res.json(actualizada);
});

// Aprueba: crea el Evento + LandingConfig copiando los datos de la solicitud, y asigna
// automáticamente al Cliente como organizador (Asignacion) de ese evento.
solicitudesEventoRouter.post('/:id/aprobar', requireAuth, requireRol('Admin'), async (req, res) => {
  const solicitud = await prisma.solicitudEvento.findUnique({ where: { id: req.params.id } });
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
  if (solicitud.estado !== 'pendiente') return res.status(409).json({ error: 'Esta solicitud ya fue resuelta' });

  const evento = await prisma.$transaction(async (tx) => {
    const nuevoEvento = await tx.evento.create({
      data: {
        nombre: solicitud.nombreEvento, lugar: solicitud.lugar,
        fecha: solicitud.fecha, fechaFin: solicitud.fechaFin,
        imagen: solicitud.imagenPortada, creadoPorId: req.usuario.id,
      },
    });
    await tx.landingConfig.create({
      data: {
        eventoId: nuevoEvento.id, titulo: solicitud.nombreEvento, informacion: solicitud.descripcion,
        imagen: solicitud.imagenPortada, colorPrimario: solicitud.colorPrimario, colorBoton: solicitud.colorBoton,
        colorFondo: solicitud.colorFondo, colorTextoTitulo: solicitud.colorTextoTitulo, colorTextoP: solicitud.colorTextoP,
        actividades: solicitud.actividades, cronograma: solicitud.cronograma,
      },
    });
    await tx.asignacion.upsert({
      where: { eventoId_usuarioId: { eventoId: nuevoEvento.id, usuarioId: solicitud.clienteId } },
      update: { rol: 'Cliente' },
      create: { eventoId: nuevoEvento.id, usuarioId: solicitud.clienteId, rol: 'Cliente' },
    });
    await tx.solicitudEvento.update({
      where: { id: solicitud.id },
      data: { estado: 'aprobado', eventoId: nuevoEvento.id, resueltoPorId: req.usuario.id, resueltoEn: new Date() },
    });
    return nuevoEvento;
  });

  res.status(201).json(evento);
});

solicitudesEventoRouter.post('/:id/rechazar', requireAuth, requireRol('Admin'), async (req, res) => {
  const { motivoRechazo } = req.body;
  const solicitud = await prisma.solicitudEvento.findUnique({ where: { id: req.params.id } });
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
  if (solicitud.estado !== 'pendiente') return res.status(409).json({ error: 'Esta solicitud ya fue resuelta' });

  const actualizada = await prisma.solicitudEvento.update({
    where: { id: solicitud.id },
    data: { estado: 'rechazado', motivoRechazo, resueltoPorId: req.usuario.id, resueltoEn: new Date() },
  });
  res.json(actualizada);
});
