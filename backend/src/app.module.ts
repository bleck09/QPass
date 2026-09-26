/* ============================================================================
 * src/app.module.ts
 * Importa todos los módulos de /modules y registra la infraestructura global
 * (guards, filtro de errores, interceptor de idempotencia). Sin lógica.
 * ========================================================================= */

import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { HealthController } from './health.controller';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { PoliticasModule } from './common/politicas/politicas.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { MailModule } from './mail/mail.module';
import { JobsModule } from './jobs/jobs.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LimitePeticionesGuard } from './common/guards/limite-peticiones.guard';
import { ExcepcionHttpFilter } from './common/filters/excepcion-http.filter';
import { IdempotenciaInterceptor } from './common/interceptors/idempotencia.interceptor';
import { FirmarImagenesInterceptor } from './common/interceptors/firmar-imagenes.interceptor';

import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { AsignacionesModule } from './modules/asignaciones/asignaciones.module';
import { SolicitudesEventoModule } from './modules/solicitudes-evento/solicitudes-evento.module';
import { DiasEventoModule } from './modules/dias-evento/dias-evento.module';
import { BilleterasEventoModule } from './modules/billeteras-evento/billeteras-evento.module';
import { CodigosRetiroNegocioModule } from './modules/codigos-retiro-negocio/codigos-retiro-negocio.module';
import { CategoriasTicketModule } from './modules/categorias-ticket/categorias-ticket.module';
import { ComprasModule } from './modules/compras/compras.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { EntradasModule } from './modules/entradas/entradas.module';
import { CodigosQrModule } from './modules/codigos-qr/codigos-qr.module';
import { TransaccionesModule } from './modules/transacciones/transacciones.module';
import { IncidenciasRecargaModule } from './modules/incidencias-recarga/incidencias-recarga.module';
import { ReportesEntradaModule } from './modules/reportes-entrada/reportes-entrada.module';
import { PuestosModule } from './modules/puestos/puestos.module';
import { ElementosMapaModule } from './modules/elementos-mapa/elementos-mapa.module';
import { PuestosBaseModule } from './modules/puestos-base/puestos-base.module';
import { ProductosModule } from './modules/productos/productos.module';
import { PuestoAyudantesModule } from './modules/puesto-ayudantes/puesto-ayudantes.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { LandingConfigModule } from './modules/landing-config/landing-config.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CorteCajaModule } from './modules/corte-caja/corte-caja.module';
import { AvisosStockModule } from './modules/avisos-stock/avisos-stock.module';
import { CasosDuplicadoModule } from './modules/casos-duplicado/casos-duplicado.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PoliticasModule,
    AuditoriaModule,
    MailModule,
    JobsModule,
    // Límite por defecto para TODA la API: 600 requests/minuto por usuario (o
    // por IP si es anónimo) — holgado para uso normal y escáneres de puerta,
    // corta scripts que martillan. Las rutas sensibles (auth, compras) bajan
    // su propio límite con @Throttle. Ver LimitePeticionesGuard.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 600 }],
      errorMessage: 'Demasiados intentos. Esperá un momento y volvé a probar.',
    }),

    AuthModule,
    UsuariosModule,
    EventosModule,
    AsignacionesModule,
    SolicitudesEventoModule,
    DiasEventoModule,
    BilleterasEventoModule,
    CodigosRetiroNegocioModule,
    CategoriasTicketModule,
    ComprasModule,
    PagosModule,
    EntradasModule,
    CodigosQrModule,
    TransaccionesModule,
    IncidenciasRecargaModule,
    ReportesEntradaModule,
    PuestosModule,
    ElementosMapaModule,
    PuestosBaseModule,
    ProductosModule,
    PuestoAyudantesModule,
    VentasModule,
    LandingConfigModule,
    UploadsModule,
    DashboardModule,
    CorteCajaModule,
    AvisosStockModule,
    CasosDuplicadoModule,
  ],
  controllers: [HealthController],
  providers: [
    // El orden importa: JwtAuthGuard corre antes que RolesGuard, y el límite de
    // peticiones al final (necesita req.user para contar por usuario).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: LimitePeticionesGuard },
    { provide: APP_FILTER, useClass: ExcepcionHttpFilter },
    // FirmarImagenesInterceptor va ANTES que IdempotenciaInterceptor a propósito:
    // los interceptores se anidan en el orden del array (el primero es el más
    // externo), así que esto firma la respuesta tanto si viene fresca del
    // handler como si viene del caché de idempotencia — nunca deja pasar una
    // firma vieja guardada de una request anterior.
    { provide: APP_INTERCEPTOR, useClass: FirmarImagenesInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotenciaInterceptor },
  ],
})
export class AppModule {}
