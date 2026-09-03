/* ============================================================================
 * src/app.module.ts
 * Importa todos los módulos de /modules y registra la infraestructura global
 * (guards, filtro de errores, interceptor de idempotencia). Sin lógica.
 * ========================================================================= */

import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { HealthController } from './health.controller';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { PoliticasModule } from './common/politicas/politicas.module';
import { MailModule } from './mail/mail.module';
import { JobsModule } from './jobs/jobs.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ExcepcionHttpFilter } from './common/filters/excepcion-http.filter';
import { IdempotenciaInterceptor } from './common/interceptors/idempotencia.interceptor';

import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { AsignacionesModule } from './modules/asignaciones/asignaciones.module';
import { SolicitudesEventoModule } from './modules/solicitudes-evento/solicitudes-evento.module';
import { CategoriasTicketModule } from './modules/categorias-ticket/categorias-ticket.module';
import { ComprasModule } from './modules/compras/compras.module';
import { EntradasModule } from './modules/entradas/entradas.module';
import { CodigosQrModule } from './modules/codigos-qr/codigos-qr.module';
import { TransaccionesModule } from './modules/transacciones/transacciones.module';
import { IncidenciasRecargaModule } from './modules/incidencias-recarga/incidencias-recarga.module';
import { ReportesEntradaModule } from './modules/reportes-entrada/reportes-entrada.module';
import { PuestosModule } from './modules/puestos/puestos.module';
import { ProductosModule } from './modules/productos/productos.module';
import { PuestoAyudantesModule } from './modules/puesto-ayudantes/puesto-ayudantes.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { LandingConfigModule } from './modules/landing-config/landing-config.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PoliticasModule,
    MailModule,
    JobsModule,

    AuthModule,
    UsuariosModule,
    EventosModule,
    AsignacionesModule,
    SolicitudesEventoModule,
    CategoriasTicketModule,
    ComprasModule,
    EntradasModule,
    CodigosQrModule,
    TransaccionesModule,
    IncidenciasRecargaModule,
    ReportesEntradaModule,
    PuestosModule,
    ProductosModule,
    PuestoAyudantesModule,
    VentasModule,
    LandingConfigModule,
  ],
  controllers: [HealthController],
  providers: [
    // El orden importa: JwtAuthGuard corre antes que RolesGuard.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: ExcepcionHttpFilter },
    { provide: APP_INTERCEPTOR, useClass: IdempotenciaInterceptor },
  ],
})
export class AppModule {}
