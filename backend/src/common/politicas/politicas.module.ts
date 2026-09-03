/* ============================================================================
 * src/common/politicas/politicas.module.ts
 * @Global() (como PrismaModule): cualquier service inyecta EventoPolicy en su
 * constructor sin importar este módulo. Solo se registra una vez en AppModule.
 * ========================================================================= */

import { Global, Module } from '@nestjs/common';
import { EventoPolicy } from './evento-policy.service';

@Global()
@Module({
  providers: [EventoPolicy],
  exports: [EventoPolicy],
})
export class PoliticasModule {}
