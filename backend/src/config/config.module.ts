import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { validarEnv } from './env.validation';

/* --------------------------------------------------------------------------
 * Configuración global. Envuelve @nestjs/config con la validación zod de
 * env.validation.ts. Cualquier módulo inyecta ConfigService sin importar nada.
 * ----------------------------------------------------------------------- */

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validarEnv,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}

export { ConfigService };
