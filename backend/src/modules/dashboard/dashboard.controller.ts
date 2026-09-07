import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

/**
 * Tablero ADMIN GENERAL (todo el sistema). Espeja api/index.js -> dashboard.
 * Todo agregado en la BD (groupBy/aggregate), nunca trae filas al front.
 * Sin rango de fechas todavía: v1 es sobre todo el histórico (spec fase 2).
 */
@Controller('dashboard/admin')
@Roles('Admin')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** Fila de acción: casos pendientes + antigüedad del más viejo (spec 1.1). */
  @Get('pendientes')
  pendientes() {
    return this.dashboardService.pendientes();
  }

  /** KPIs del sistema (spec 1.2). ?desde=&hasta= (ISO) acotan lo que es del periodo. */
  @Get('kpis')
  kpis(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.dashboardService.kpis(desde, hasta);
  }

  /** Estado de todos los eventos, una fila por evento (spec W6). */
  @Get('eventos')
  eventos() {
    return this.dashboardService.eventos();
  }

  /** Alertas por reglas duras del sistema (spec W7). */
  @Get('alertas')
  alertas() {
    return this.dashboardService.alertas();
  }

  /** Embudo del ciclo de vida de un evento (spec W3). */
  @Get('embudo')
  embudo() {
    return this.dashboardService.embudo();
  }

  /** Operación en vivo de los eventos en curso hoy (spec 1.4). Se pollea cada 30 s. */
  @Get('vivo')
  vivo() {
    return this.dashboardService.vivo();
  }

  /** Arqueo de caja por operador: descuadres (spec 5.2). */
  @Get('cortes-caja')
  cortesCaja() {
    return this.dashboardService.cortesCaja();
  }

  /** W1 — recaudación por entradas por día (línea). */
  @Get('recaudacion-diaria')
  recaudacionDiaria(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.dashboardService.recaudacionDiaria(desde, hasta);
  }

  /** W2 — recaudación por evento, top 10 (barras). */
  @Get('por-evento')
  porEvento(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.dashboardService.recaudacionPorEvento(desde, hasta);
  }

  /** W4 — estado de compras por día (barras apiladas). */
  @Get('compras-diarias')
  comprasDiarias(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.dashboardService.comprasDiarias(desde, hasta);
  }

  /** W5 — incidencias de recarga por recargador (barras). */
  @Get('incidencias-por-recargador')
  incidenciasPorRecargador() {
    return this.dashboardService.incidenciasPorRecargador();
  }
}
