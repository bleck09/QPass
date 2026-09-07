import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardNegocioController } from './dashboard-negocio.controller';
import { DashboardNegocioService } from './dashboard-negocio.service';
import { DashboardClienteController } from './dashboard-cliente.controller';
import { DashboardClienteService } from './dashboard-cliente.service';

@Module({
  controllers: [
    DashboardController,
    DashboardNegocioController,
    DashboardClienteController,
  ],
  providers: [
    DashboardService,
    DashboardNegocioService,
    DashboardClienteService,
  ],
})
export class DashboardModule {}
