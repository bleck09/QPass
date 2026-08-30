/* ============================================================================
 * src/prisma/prisma.service.ts
 * Única instancia de PrismaClient de todo el proyecto. Ningún otro archivo
 * crea `new PrismaClient()`. Equivalente backend de lib/api/client.js. Ver C5.
 * ========================================================================= */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
