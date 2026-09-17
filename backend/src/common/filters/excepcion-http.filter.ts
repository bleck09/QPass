/* ============================================================================
 * src/common/filters/excepcion-http.filter.ts
 * Traduce CUALQUIER excepción (HttpException de Nest, error de Prisma, error
 * nuestro) a UN solo formato de body. Ver C9.
 *
 * DESVIACIÓN DOCUMENTADA respecto al Anexo C: el Anexo emite { status, mensaje }
 * (el ApiError del "Anexo B"). El frontend REAL de este repo
 * (frontend/src/api/client.js) lee `data?.error`, así que para NO tocar el
 * frontend (regla C0) el body de error es { error: "<mensaje humano>" },
 * idéntico al que devolvía el backend Express anterior.
 * ========================================================================= */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class ExcepcionHttpFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(excepcion: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, error, codigo, detalle } = this.resolver(excepcion);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Se loguea completo en el servidor; al cliente solo va el mensaje humano.
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        excepcion instanceof Error ? excepcion.stack : String(excepcion),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status}: ${error}`);
    }

    // `codigo`/`detalle` solo viajan cuando la excepción los trae (ej.
    // ManillaFalsaException); el resto sigue respondiendo { error } a secas.
    response.status(status).json(codigo ? { error, codigo, detalle } : { error });
  }

  private resolver(excepcion: unknown): {
    status: number;
    error: string;
    codigo?: string;
    detalle?: unknown;
  } {
    if (excepcion instanceof HttpException) {
      const respuesta = excepcion.getResponse();
      if (typeof respuesta === 'string') {
        return { status: excepcion.getStatus(), error: respuesta };
      }
      const cuerpo = respuesta as Record<string, unknown>;
      return {
        status: excepcion.getStatus(),
        error: this.extraerMensaje(cuerpo?.['message']) ?? 'Ocurrió un error.',
        codigo: typeof cuerpo?.['codigo'] === 'string' ? cuerpo['codigo'] : undefined,
        detalle: cuerpo?.['detalle'],
      };
    }

    if (excepcion instanceof Prisma.PrismaClientKnownRequestError) {
      return this.desdePrisma(excepcion);
    }

    if (excepcion instanceof Prisma.PrismaClientValidationError) {
      return { status: HttpStatus.BAD_REQUEST, error: 'Datos inválidos para esta operación.' };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Error interno del servidor',
    };
  }

  private desdePrisma(
    excepcion: Prisma.PrismaClientKnownRequestError,
  ): { status: number; error: string } {
    switch (excepcion.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          error: 'Ya existe un registro con ese valor; no se puede duplicar.',
        };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, error: 'Recurso no encontrado.' };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          error: 'La operación viola una relación con otro registro.',
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'No se pudo completar la operación.',
        };
    }
  }

  private extraerMensaje(mensaje: unknown): string | undefined {
    if (!mensaje) return undefined;
    if (Array.isArray(mensaje)) return mensaje.join(' · ');
    return String(mensaje);
  }
}
