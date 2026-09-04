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
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { directorioUploads } from './uploads-dir';
import { LIMITE_TOTAL_BYTES, tamanioDirectorio } from './tamanio-uploads';

/* ----------------------------------------------------------------------------
 * Sube una imagen (comprobante, foto de perfil, logo de puesto, portada de
 * evento...) y la guarda como archivo real en el volumen — antes estas imágenes
 * viajaban en base64 dentro del body de cada formulario y se guardaban así en
 * la BD. Ahora el formulario solo guarda la URL que devuelve este endpoint.
 *
 * Requiere sesión (JwtAuthGuard global), pero ningún rol en particular: lo usan
 * Cliente/UsuarioNormal (comprobante), Admin (portada/landing), UsuarioNegocio
 * (logo/producto), Supervisor/Devolucion (foto de verificación) y cualquiera
 * editando su propio perfil.
 * -------------------------------------------------------------------------- */

// Una carpeta por tipo de imagen: organiza el volumen y evita que "carpeta" venga
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
      storage: diskStorage({
        destination: (
          req: Request,
          _file: Express.Multer.File,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          const dirRaiz = directorioUploads();
          if (tamanioDirectorio(dirRaiz) >= LIMITE_TOTAL_BYTES) {
            cb(
              new HttpException(
                'Se alcanzó el límite de almacenamiento de imágenes (10 GB). Avisá al administrador.',
                507, // Insufficient Storage
              ),
              '',
            );
            return;
          }
          const dir = join(dirRaiz, carpetaSegura(req.query.carpeta));
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        // Nombre único (no el original, para no pisar archivos ni filtrar nombres reales).
        filename: (
          _req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
    }),
  )
  subir(@UploadedFile() archivo: Express.Multer.File, @Query('carpeta') carpeta: string) {
    if (!archivo) throw new BadRequestException('Falta el archivo ("archivo").');
    return { url: `/uploads/${carpetaSegura(carpeta)}/${archivo.filename}` };
  }
}
