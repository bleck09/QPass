/* ============================================================================
 * src/main.ts
 * Bootstrap: body parser, estático de /uploads, CORS, ValidationPipe global.
 * Nada más — el resto se configura en AppModule (C2).
 * ========================================================================= */

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, static as expressStatic, Request, Response, NextFunction } from 'express';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { VariablesEntorno } from './config/env.validation';
import { directorioUploads } from './modules/uploads/uploads-dir';
import { verificarFirmaUpload } from './modules/uploads/firma-uploads';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get<ConfigService<VariablesEntorno, true>>(ConfigService);

  // Las imágenes ahora se suben como archivo real a POST /uploads (multipart) y
  // solo su URL viaja en el body normal — ya no base64. 2mb sigue siendo generoso
  // para el resto de los payloads (listas, configuración de la landing, etc).
  app.use(json({ limit: '2mb' }));

  // Sirve los archivos subidos (fotos, comprobantes, logos...). El directorio vive
  // en un volumen de Docker (ver docker-compose.yml) para sobrevivir a un redeploy.
  //
  // Antes de servir CUALQUIER archivo se exige la firma que FirmarImagenesInterceptor
  // le agregó a la URL cuando salió en una respuesta de la API — sin eso, cualquiera
  // con el link (aunque fuera un UUID impredecible) podía verlo para siempre sin
  // loguearse. Ver modules/uploads/firma-uploads.ts.
  const dirUploads = directorioUploads();
  mkdirSync(dirUploads, { recursive: true });
  app.use(
    '/uploads',
    (req: Request, res: Response, next: NextFunction) => {
      const rutaCompleta = `/uploads${req.path}`;
      const { exp, firma } = req.query;
      if (!verificarFirmaUpload(rutaCompleta, exp as string, firma as string)) {
        res.status(403).json({ error: 'Enlace de imagen inválido o vencido.' });
        return;
      }
      next();
    },
    // maxAge corto: la URL trae su propia firma con vencimiento (30 min, ver
    // firma-uploads.ts), no tiene sentido cachearla más tiempo que eso.
    expressStatic(dirUploads, { maxAge: '30m' }),
  );

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
  // 0.0.0.0: necesario dentro de un contenedor para aceptar tráfico externo.
  await app.listen(puerto, '0.0.0.0');
  Logger.log(`QPass API (NestJS) escuchando en http://localhost:${puerto}`, 'Bootstrap');
}

void bootstrap();
