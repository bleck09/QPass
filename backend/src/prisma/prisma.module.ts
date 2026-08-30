/* ============================================================================
 * src/prisma/prisma.module.ts
 * @Global() para no importar PrismaModule en cada módulo de /modules — cada
 * servicio solo inyecta PrismaService en su constructor. Ver C5.
 * ========================================================================= */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
