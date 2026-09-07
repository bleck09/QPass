/* ============================================================================
 * src/modules/dashboard/dashboard-cliente.service.ts
 *
 * Agregados del tablero de evento para el Cliente organizador (spec §2).
 * SOLO agregados: sin nombres/documentos/fotos de asistentes, sin comprobantes,
 * sin rankings nominales de personal, sin transacción por transacción.
 * ========================================================================= */

import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioJwt } from '../../common/decorators/usuario-actual.decorator';

@Injectable()
export class DashboardClienteService {
  constructor(private readonly prisma: PrismaService) {}

  /** Eventos donde el actor es el cliente organizador. */
  async eventos(actor: UsuarioJwt) {
    return this.prisma.evento.findMany({
      where: { clienteId: actor.id },
      orderBy: { fecha: 'desc' },
      select: {
        id: true,
        nombre: true,
        lugar: true,
        fecha: true,
        fechaFin: true,
        estado: true,
        archivadoEn: true,
        publicadoEn: true,
        imagen: true,
      },
    });
  }

  async resumen(actor: UsuarioJwt, eventoId: string) {
    const ev = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      include: { resumen: true },
    });
    if (!ev || ev.clienteId !== actor.id) {
      throw new ForbiddenException('Ese evento no es tuyo');
    }

    const [
      tickets,
      qr,
      landing,
      mapa,
      categorias,
      confirmadasPorCat,
      recaudado,
      reservadasPendientes,
      personasDentro,
      asistieron,
      confirmadasTotal,
      consumo,
      ventasPorPuesto,
      puestos,
    ] = await Promise.all([
      this.prisma.categoriaTicket.count({ where: { eventoId } }),
      this.prisma.codigoQr.count({ where: { eventoId } }),
      this.prisma.landingConfig.findUnique({ where: { eventoId } }),
      this.prisma.puesto.count({ where: { eventoId } }),
      this.prisma.categoriaTicket.findMany({
        where: { eventoId },
        select: {
          id: true,
          nombre: true,
          cantidad: true,
          cantidadVendida: true,
          precio: true,
        },
      }),
      this.prisma.entrada.groupBy({
        by: ['categoriaTicketId'],
        where: { eventoId, compra: { estado: 'confirmado' } },
        _count: { _all: true },
      }),
      this.prisma.compra.aggregate({
        _sum: { montoTotal: true },
        where: { eventoId, estado: 'confirmado' },
      }),
      this.prisma.compra.count({ where: { eventoId, estado: 'pendiente' } }),
      this.prisma.entrada.count({
        where: { eventoId, estadoIngreso: 'ingresado' },
      }),
      this.prisma.entrada.count({
        where: { eventoId, estadoIngreso: { in: ['ingresado', 'salio'] } },
      }),
      this.prisma.entrada.count({
        where: { eventoId, compra: { estado: 'confirmado' } },
      }),
      this.prisma.transaccion.groupBy({
        by: ['tipo'],
        _sum: { monto: true },
        where: { eventoId, tipo: { in: ['consumo', 'reverso_consumo'] } },
      }),
      this.prisma.venta.groupBy({
        by: ['puestoId'],
        where: { puesto: { eventoId }, anuladaEn: null },
        _sum: { montoTotal: true },
        _count: { _all: true },
      }),
      this.prisma.puesto.findMany({
        where: { eventoId },
        select: { id: true, nombre: true },
      }),
    ]);

    const confirmadasMap = new Map(
      confirmadasPorCat.map((c) => [c.categoriaTicketId, c._count._all]),
    );
    const porCategoria = categorias.map((c) => {
      const confirmadas = confirmadasMap.get(c.id) ?? 0;
      const precio = Number(c.precio);
      return {
        nombre: c.nombre,
        cupo: c.cantidad,
        confirmadas,
        reservadas: c.cantidadVendida,
        disponibles: Math.max(0, c.cantidad - c.cantidadVendida),
        precio,
        ingreso: confirmadas * precio,
      };
    });
    const cupoTotal = categorias.reduce((s, c) => s + c.cantidad, 0);
    const reservadasTotal = categorias.reduce(
      (s, c) => s + c.cantidadVendida,
      0,
    );

    const nombrePuesto = new Map(puestos.map((p) => [p.id, p.nombre]));
    const topPuestos = ventasPorPuesto
      .map((v) => ({
        nombre: nombrePuesto.get(v.puestoId) ?? 'Puesto',
        ingresos: Number(v._sum.montoTotal ?? 0),
        ventas: v._count._all,
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 8);

    const diasRestantes = Math.ceil(
      (new Date(ev.fecha).getTime() - Date.now()) / 86_400_000,
    );

    // Evento archivado con foto de cierre (spec 5.7): los totales salen del
    // snapshot congelado, no de las tablas vivas. porCategoria/topPuestos se
    // dejan en vivo (no están en el snapshot; cambian poco tras archivar).
    const snap = ev.resumen;
    const confirmadas = snap ? snap.entradasVendidas : confirmadasTotal;
    const recaudadoTotal = snap
      ? Number(snap.recaudado)
      : Number(recaudado._sum.montoTotal ?? 0);
    const asistentes = snap ? snap.asistentes : asistieron;
    const consumoTipo = (tipo: string) =>
      Number(consumo.find((t) => t.tipo === tipo)?._sum.monto ?? 0);
    const consumoTotal = snap
      ? Number(snap.consumido)
      : consumoTipo('consumo') - consumoTipo('reverso_consumo');

    return {
      evento: {
        id: ev.id,
        nombre: ev.nombre,
        fecha: ev.fecha,
        fechaFin: ev.fechaFin,
        estado: ev.estado,
        archivadoEn: ev.archivadoEn,
        publicado: ev.publicadoEn != null,
        diasRestantes,
      },
      congeladoEn: snap ? snap.generadoEn : null,
      preparacion: {
        tickets: tickets > 0,
        qr: qr > 0,
        landing: !!landing,
        mapa: mapa > 0,
        listoParaPublicar: tickets > 0 && qr > 0 && !!landing && mapa > 0,
      },
      venta: {
        cupoTotal,
        confirmadasTotal: confirmadas,
        reservadasTotal,
        reservadasPendientes,
        ocupacion: cupoTotal ? confirmadas / cupoTotal : 0,
        recaudado: recaudadoTotal,
        porCategoria,
      },
      operacion: {
        personasDentro,
        asistieron: asistentes,
        tasaAsistencia: confirmadas ? asistentes / confirmadas : 0,
        consumoTotal,
        consumoPromedio: asistentes ? consumoTotal / asistentes : 0,
        topPuestos,
      },
    };
  }
}
