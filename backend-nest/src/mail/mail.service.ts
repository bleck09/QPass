import { Injectable, Logger } from '@nestjs/common';

export interface CorreoAEnviar {
  para: string;
  asunto: string;
  cuerpo: string;
}

/**
 * Integración con el proveedor de correo. HOY es un stub: solo loguea, no
 * envía nada — igual que el backend Express, que devolvía códigos/contraseñas
 * en la respuesta porque "no hay servicio de correo". Cuando exista SMTP real,
 * este es el único archivo que cambia; el resto del backend ya llama a
 * `mail.enviar(...)` (vía cola BullMQ, ver C11).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');

  async enviar(correo: CorreoAEnviar): Promise<void> {
    this.logger.log(
      `[STUB] Correo NO enviado -> ${correo.para} | ${correo.asunto}`,
    );
  }
}
