import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface CorreoAEnviar {
  para: string;
  asunto: string;
  cuerpo: string;
}

/**
 * Integración con el proveedor de correo (SMTP vía nodemailer).
 * Si no hay SMTP_HOST configurado, cae al modo stub (solo loguea) para no
 * romper entornos locales sin credenciales.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger('Mail');
  private transporte: nodemailer.Transporter | null = null;
  private remitente = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn(
        'SMTP_HOST no configurado: los correos solo se logueearán (modo stub).',
      );
      return;
    }

    this.remitente =
      this.config.get<string>('SMTP_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      host;

    this.transporte = nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT'),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  /**
   * Devuelve true solo si el correo salió de verdad por SMTP. Un fallo (o el
   * modo stub sin SMTP_HOST) nunca tira excepción — se loguea y se devuelve
   * false, para que el llamador decida (ej. auth.service usa esto para saber
   * si todavía debe mostrar el código en pantalla como respaldo).
   */
  async enviar(correo: CorreoAEnviar): Promise<boolean> {
    if (!this.transporte) {
      this.logger.log(`[STUB] Correo NO enviado -> ${correo.para} | ${correo.asunto}`);
      return false;
    }

    try {
      await this.transporte.sendMail({
        from: this.remitente,
        to: correo.para,
        subject: correo.asunto,
        html: correo.cuerpo,
      });
      this.logger.log(`Correo enviado -> ${correo.para} | ${correo.asunto}`);
      return true;
    } catch (error) {
      // Un correo caído no debe tumbar la operación de negocio que lo dispara
      // (aprobar/rechazar una compra, etc.) — solo se loguea el error.
      this.logger.error(
        `Fallo al enviar correo -> ${correo.para} | ${correo.asunto}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
