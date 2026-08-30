/* ============================================================================
 * src/main.ts
 * Bootstrap: body parser (10mb por las imágenes base64), CORS, ValidationPipe
 * global. Nada más — el resto se configura en AppModule (C2).
 * ========================================================================= */

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { VariablesEntorno } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get<ConfigService<VariablesEntorno, true>>(ConfigService);

  // Límite generoso: varias rutas reciben imágenes en base64 en el body
  // (fotos de perfil, comprobantes, carnets, logos).
  app.use(json({ limit: '10mb' }));

  const origen = config.get('CORS_ORIGEN', { infer: true });
  app.enableCors({
    origin: !origen || origen === '*' ? true : origen.split(',').map((o) => o.trim()),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: descarta props no declaradas en el DTO (como hacía Express al
      // desestructurar). NO forbidNonWhitelisted: el frontend real de este repo
      // no se construyó contra estos DTOs y no debe cambiar (regla C0).
      whitelist: true,
      transform: true,
    }),
  );

  // Sin prefijo global: el frontend llama /auth, /eventos, ... sin /api.
  const puerto = config.get('PORT', { infer: true });
  await app.listen(puerto);
  Logger.log(`QPass API (NestJS) escuchando en http://localhost:${puerto}`, 'Bootstrap');
}

void bootstrap();
