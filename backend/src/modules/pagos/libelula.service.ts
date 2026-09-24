/* ============================================================================
 * src/modules/pagos/libelula.service.ts
 *
 * Cliente HTTP de la pasarela de pagos Libélula (grupo Todotix). Implementa
 * los servicios de la "Guía de integración para empresas" (ver
 * "Libelula guia.pdf" en la raíz del repo):
 *   - REGISTRAR DEUDA: genera el link de pago para una Compra.
 *   - CONSULTAR DEUDAS POR IDENTIFICADOR: verificación server-to-server de
 *     que una deuda quedó pagada (nunca se confía solo en el webhook, ver
 *     pagos.controller.ts).
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LineaDetalleDeuda {
  concepto: string;
  cantidad: number;
  costo_unitario: number;
}

export interface DatosRegistrarDeuda {
  identificadorDeuda: string;
  emailCliente: string;
  descripcion: string;
  nombreCliente?: string;
  apellidoCliente?: string;
  ci?: string;
  lineas: LineaDetalleDeuda[];
}

export interface RespuestaRegistrarDeuda {
  error: boolean;
  mensaje: string;
  idTransaccion?: string;
  urlPasarelaPagos?: string;
  codigoRecaudacion?: string;
}

export interface RespuestaConsultarDeuda {
  encontrada: boolean;
  pagado: boolean;
  formaPago?: string;
  codigoRecaudacion?: string;
  fechaPago?: string;
}

@Injectable()
export class LibelulaService {
  private readonly logger = new Logger('Libelula');

  constructor(private readonly config: ConfigService) {}

  /** true solo si hay appkey configurado; si no, el canal queda deshabilitado. */
  get habilitado(): boolean {
    return !!this.config.get<string>('LIBELULA_APPKEY');
  }

  private get appkey(): string {
    return this.config.get<string>('LIBELULA_APPKEY') ?? '';
  }

  private get baseUrl(): string {
    return this.config.get<string>('LIBELULA_API_URL')!;
  }

  async registrarDeuda(datos: DatosRegistrarDeuda): Promise<RespuestaRegistrarDeuda> {
    const callbackUrl = this.config.get<string>('LIBELULA_CALLBACK_URL');
    const urlRetorno = this.config.get<string>('LIBELULA_URL_RETORNO');

    const body = {
      appkey: this.appkey,
      email_cliente: datos.emailCliente,
      identificador_deuda: datos.identificadorDeuda,
      descripcion: datos.descripcion,
      callback_url: callbackUrl,
      url_retorno: urlRetorno,
      nombre_cliente: datos.nombreCliente,
      apellido_cliente: datos.apellidoCliente,
      ci: datos.ci,
      lineas_detalle_deuda: datos.lineas,
    };

    try {
      const respuesta = await this.post<{
        error?: boolean;
        mensaje?: string;
        id_transaccion?: string;
        url_pasarela_pagos?: string;
        codigo_recaudacion?: string;
      }>('/rest/deuda/registrar', body);
      return {
        error: !!respuesta.error,
        mensaje: respuesta.mensaje ?? '',
        idTransaccion: respuesta.id_transaccion,
        urlPasarelaPagos: respuesta.url_pasarela_pagos,
        codigoRecaudacion: respuesta.codigo_recaudacion,
      };
    } catch (e) {
      this.logger.error(
        `Fallo registrando deuda ${datos.identificadorDeuda} en Libélula`,
        e instanceof Error ? e.stack : String(e),
      );
      return { error: true, mensaje: 'No se pudo contactar a Libélula' };
    }
  }

  /**
   * Verificación server-to-server: se llama SIEMPRE antes de confirmar una
   * Compra por el webhook, para no confiar únicamente en el callback (que
   * Libélula no firma — ver pagos.controller.ts).
   */
  async consultarDeudaPorIdentificador(
    identificador: string,
  ): Promise<RespuestaConsultarDeuda> {
    try {
      const respuesta = await this.post<{
        datos?: {
          pagado?: boolean;
          forma_pago?: string;
          codigo_recaudacion?: string;
          fecha_pago?: string;
        };
      }>('/rest/deuda/consultar_deudas/por_identificador', {
        appkey: this.appkey,
        identificador,
      });
      const datos = respuesta.datos;
      if (!datos) return { encontrada: false, pagado: false };
      return {
        encontrada: true,
        pagado: !!datos.pagado,
        formaPago: datos.forma_pago,
        codigoRecaudacion: datos.codigo_recaudacion,
        fechaPago: datos.fecha_pago,
      };
    } catch (e) {
      this.logger.error(
        `Fallo consultando deuda ${identificador} en Libélula`,
        e instanceof Error ? e.stack : String(e),
      );
      return { encontrada: false, pagado: false };
    }
  }

  /** Pagos confirmados en un rango de fechas — usado por la reconciliación. */
  async consultarPagos(
    fechaInicial: string,
    fechaFinal: string,
  ): Promise<
    Array<{ identificador: string; codigoRecaudacion: string; formaPago: string }>
  > {
    try {
      const respuesta = await this.post<{
        datos?: Array<Record<string, unknown>>;
      }>('/rest/deuda/consultar_pagos', {
        appkey: this.appkey,
        fecha_inicial: fechaInicial,
        fecha_final: fechaFinal,
      });
      const datos = respuesta.datos ?? [];
      return datos.map((d) => ({
        identificador: String(d.identificador ?? ''),
        codigoRecaudacion: String(d.codigo_recaudacion ?? ''),
        formaPago: String(d.forma_pago ?? ''),
      }));
    } catch (e) {
      this.logger.error(
        'Fallo consultando pagos en Libélula',
        e instanceof Error ? e.stack : String(e),
      );
      return [];
    }
  }

  private async post<T>(ruta: string, body: Record<string, unknown>): Promise<T> {
    const respuesta = await fetch(`${this.baseUrl}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    return (await respuesta.json()) as T;
  }
}
