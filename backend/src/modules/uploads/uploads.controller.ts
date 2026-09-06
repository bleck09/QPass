import {
  BadRequestException,
  Controller,
  HttpException,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { BUCKET_UPLOADS, clienteS3 } from './s3.client';
import { LIMITE_TOTAL_BYTES, tamanioBucket } from './tamanio-uploads';

/* ----------------------------------------------------------------------------
 * Sube una imagen (comprobante, foto de perfil, logo de puesto, portada de
 * evento...) al almacenamiento de objetos (MinIO / S3, ver s3.client.ts) — antes
 * estas imágenes viajaban en base64 dentro del body de cada formulario, después
 * pasaron a un archivo en un volumen del backend, y ahora a un bucket aparte.
 * El formulario sigue guardando solo la URL que devuelve este endpoint.
 *
 * Requiere sesión (JwtAuthGuard global), pero ningún rol en particular: lo usan
 * Cliente/UsuarioNormal (comprobante), Admin (portada/landing), UsuarioNegocio
 * (logo/producto), Supervisor/Devolucion (foto de verificación) y cualquiera
 * editando su propio perfil.
 * -------------------------------------------------------------------------- */

// Una carpeta por tipo de imagen: organiza el bucket y evita que "carpeta" venga
// con algo tipo "../../etc" — cualquier valor fuera de esta lista cae en "general".
const CARPETAS_VALIDAS = new Set([
  'perfiles',
  'comprobantes',
  'eventos',
  'landing',
  'solicitudes-evento',
  'puestos',
  'productos',
  'carnets',
  'ingresos',
]);

const carpetaSegura = (valor: unknown): string =>
  typeof valor === 'string' && CARPETAS_VALIDAS.has(valor) ? valor : 'general';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: MAX_BYTES },
      // El archivo se retiene en memoria (máx 8 MB) y se sube al bucket desde el
      // handler — no se escribe nada en disco.
      storage: memoryStorage(),
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('El archivo debe ser una imagen.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async subir(
    @UploadedFile() archivo: Express.Multer.File,
    @Query('carpeta') carpeta: string,
  ) {
    if (!archivo) throw new BadRequestException('Falta el archivo ("archivo").');

    if ((await tamanioBucket()) >= LIMITE_TOTAL_BYTES) {
      throw new HttpException(
        'Se alcanzó el límite de almacenamiento de imágenes (10 GB). Avisá al administrador.',
        507, // Insufficient Storage
      );
    }

    // Key única (no el nombre original, para no pisar archivos ni filtrar nombres
    // reales). La carpeta es el prefijo del objeto: "perfiles/<uuid>.jpg".
    const key = `${carpetaSegura(carpeta)}/${randomUUID()}${extname(
      archivo.originalname,
    ).toLowerCase()}`;

    await clienteS3().send(
      new PutObjectCommand({
        Bucket: BUCKET_UPLOADS,
        Key: key,
        Body: archivo.buffer,
        ContentType: archivo.mimetype,
        ContentLength: archivo.size,
      }),
    );

    return { url: `/uploads/${key}` };
  }
}
