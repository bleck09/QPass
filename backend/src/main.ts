/* ============================================================================
 * src/main.ts
 * Bootstrap: body parser, estático de /uploads, CORS, ValidationPipe global.
 * Nada más — el resto se configura en AppModule (C2).
 * ========================================================================= */

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { json, Request, Response, NextFunction } from 'express';
import type { Readable } from 'stream';
import { AppModule } from './app.module';
import { VariablesEntorno } from './config/env.validation';
import { BUCKET_UPLOADS, clienteS3, keyDesdeRuta } from './modules/uploads/s3.client';
import { verificarFirmaUpload } from './modules/uploads/firma-uploads';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });
  const config = app.get<ConfigService<VariablesEntorno, true>>(ConfigService);

  // Las imágenes ahora se suben como archivo real a POST /uploads (multipart) y
  // solo su URL viaja en el body normal — ya no base64. 2mb sigue siendo generoso
  // para el resto de los payloads (listas, configuración de la landing, etc).
  // Delante hay dos proxies (Traefik de Dokploy -> nginx del frontend): se
  // confía en esos 2 saltos para que req.ip sea la IP real del cliente (la usa
  // el rate limiting, ver LimitePeticionesGuard) y no la del nginx.
  app.set('trust proxy', 2);

  // Cabeceras de seguridad estándar. CORP en same-site y no en el default
  // same-origin: en desarrollo el front (otro puerto de localhost) carga las
  // imágenes de /uploads directo del backend.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

  app.use(json({ limit: '2mb' }));

  // Sirve los archivos subidos (fotos, comprobantes, logos...). Los objetos viven
  // en el bucket de MinIO/S3 (contenedor aparte, ver docker-compose.yml); acá se
  // streamean pasando por el backend para no exponer el bucket ni tocar CORS.
  //
  // Antes de servir CUALQUIER archivo se exige la firma que FirmarImagenesInterceptor
  // le agregó a la URL cuando salió en una respuesta de la API — sin eso, cualquiera
  // con el link (aunque fuera un UUID impredecible) podía verlo para siempre sin
  // loguearse. Ver modules/uploads/firma-uploads.ts.
  app.use(
    '/uploads',
    (req: Request, res: Response, next: NextFunction) => {
      // Sin este chequeo de método, esto también interceptaba el POST /uploads
      // de subida (mismo prefijo, sin /api/ que nginx ya le sacó) y lo rechazaba
      // porque una subida nueva nunca trae ?exp=&firma= — esos son de descarga.
      // Solo GET/HEAD sirven un archivo; todo lo demás sigue de largo al router.
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      const rutaCompleta = `/uploads${req.path}`;
      const { exp, firma } = req.query;
      if (!verificarFirmaUpload(rutaCompleta, exp as string, firma as string)) {
        res.status(403).json({ error: 'Enlace de imagen inválido o vencido.' });
        return;
      }

      clienteS3()
        .send(
          new GetObjectCommand({
            Bucket: BUCKET_UPLOADS,
            Key: keyDesdeRuta(req.path),
            // Si el navegador ya tiene el archivo, el bucket contesta 304 (cae en
            // el .catch de abajo) y no se transfiere el cuerpo.
            IfNoneMatch: req.headers['if-none-match'],
          }),
        )
        .then((objeto) => {
          if (objeto.ContentType) res.setHeader('Content-Type', objeto.ContentType);
          if (objeto.ContentLength != null) {
            res.setHeader('Content-Length', String(objeto.ContentLength));
          }
          if (objeto.ETag) res.setHeader('ETag', objeto.ETag);
          // Caché larga e `immutable`: el contenido de una key NUNCA cambia (cada
          // subida genera un UUID nuevo, ver uploads.controller.ts) y la URL ahora
          // es estable dentro de su ventana de firma (ver firma-uploads.ts), así
          // que el navegador puede reusarla sin volver a pedirla. Sigue siendo
          // `private`: es contenido de un solo usuario, no lo guardan los proxies.
          res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');

          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          (objeto.Body as Readable).pipe(res);
        })
        .catch((error: { name?: string; $metadata?: { httpStatusCode?: number } }) => {
          if (error?.$metadata?.httpStatusCode === 304) {
            res.status(304).end();
            return;
          }
          if (
            error?.name === 'NoSuchKey' ||
            error?.$metadata?.httpStatusCode === 404
          ) {
            res.status(404).json({ error: 'Imagen no encontrada.' });
            return;
          }
          next(error);
        });
    },
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
