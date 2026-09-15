/* ============================================================================
 * src/jobs/cron/limpiar-huerfanos-uploads.cron.ts
 *
 * Subir una imagen NUEVA (foto de perfil, portada de evento, comprobante...)
 * nunca borra la vieja (ver uploads.controller.ts: cada subida es un objeto
 * con una key al azar) — ni tampoco se borra el objeto cuando se elimina la
 * fila que lo tenía (evento, usuario, compra...). Esos archivos quedan
 * huérfanos en el bucket para siempre, ocupando espacio contra el tope de
 * 10 GB (LIMITE_TOTAL_BYTES en tamanio-uploads.ts).
 *
 * Este cron corre una vez por semana: junta TODAS las URLs todavía referenciadas
 * por alguna fila de la base (las 12 columnas que guardan rutas /uploads/..., una
 * por cada carpeta válida de uploads.controller.ts) y borra del bucket cualquier
 * objeto que no esté en ese conjunto.
 *
 * Deliberadamente NO se cuentan como "referencia viva":
 *   - RegistroAuditoria.antes/despues: son snapshots históricos armados a mano
 *     (nunca copian estas columnas completas hoy, y aunque lo hicieran, un log
 *     de auditoría documenta el pasado, no debería anclar el storage para
 *     siempre).
 *   - SolicitudIdempotente.respuesta: caché transitorio de 48h (ver
 *     limpiar-idempotencia.cron.ts) del mismo dato que ya vive en su columna
 *     real (ej. Transaccion.fotoCarnetUrl) — ignorarlo no genera falsos huérfanos.
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { PrismaService } from '../../prisma/prisma.service';
import { BUCKET_UPLOADS, clienteS3 } from '../../modules/uploads/s3.client';

// El valor guardado en la BD puede traer la firma temporal que le agrega
// FirmarImagenesInterceptor (?exp=...&firma=...) — se descarta antes de
// comparar, igual que hace ese mismo interceptor al recibir una URL ya firmada.
// Y es la URL completa ("/uploads/perfiles/xxx.jpg"), no el key de S3
// ("perfiles/xxx.jpg" sin el prefijo de ruta) — hay que sacarle el "/uploads/".
const keyDesdeUrlGuardada = (url: string): string =>
  url.split('?')[0].replace(/^\/?uploads\//, '');

// Margen de seguridad: `POST /uploads` (que sube el archivo) y "guardar el
// formulario" (que recién ahí escribe la URL en una columna) son DOS pasos
// separados — puede pasar un rato entre uno y el otro (usuario lento, se
// distrae, cierra la pestaña antes del segundo paso). Sin este margen, un
// archivo recién subido y todavía sin guardar en ningún lado parecería
// huérfano y se borraría antes de que el usuario llegue a guardarlo. 48h le
// sobra a cualquier formulario real.
const GRACIA_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class LimpiarHuerfanosUploadsCron {
  private readonly logger = new Logger('LimpiarHuerfanosUploadsCron');

  constructor(private readonly prisma: PrismaService) {}

  // Domingo 4 AM: una vez por semana alcanza de sobra (esto no es urgente,
  // solo junta basura) y a esa hora es más difícil pisar un evento en curso.
  @Cron('0 4 * * 0')
  async ejecutar() {
    try {
      const [referenciadas, objetos] = await Promise.all([
        this.urlsReferenciadas(),
        this.listarTodosLosObjetos(),
      ]);

      const ahora = Date.now();
      const huerfanos = objetos
        .filter((o) => !referenciadas.has(o.key))
        .filter((o) => ahora - o.subidoEn.getTime() > GRACIA_MS)
        .map((o) => o.key);
      if (huerfanos.length === 0) {
        this.logger.log('Sin huérfanos: todo lo que hay en el bucket está referenciado.');
        return;
      }

      // Uno por uno (DeleteObjectCommand), no el borrado múltiple en lote
      // (DeleteObjectsCommand): esa API exige un header Content-MD5 sobre el
      // XML del pedido que este MinIO rechaza ("Missing required header for
      // this request: Content-Md5") — DeleteObject individual no lo necesita
      // y es igual de confiable, solo un poco más lento (aceptable: corre una
      // vez por semana, sin apuro).
      let borrados = 0;
      for (const key of huerfanos) {
        try {
          await clienteS3().send(new DeleteObjectCommand({ Bucket: BUCKET_UPLOADS, Key: key }));
          borrados++;
        } catch (err) {
          this.logger.error(`No se pudo borrar "${key}": ${(err as Error).message}`);
        }
      }
      this.logger.log(
        `Limpieza de huérfanos: ${borrados} de ${huerfanos.length} archivo(s) borrado(s) del bucket.`,
      );
    } catch (err) {
      // Nunca debe tirar abajo el proceso del backend por un problema de red
      // con el bucket — se reintenta solo la semana siguiente.
      this.logger.error(`Falló la limpieza de huérfanos: ${(err as Error).message}`);
    }
  }

  /**
   * Junta las URLs vivas de las 12 columnas que guardan rutas /uploads/...
   * (Usuario.foto, Compra.comprobanteUrl, Evento.imagen, LandingConfig.imagen,
   * SolicitudEvento.imagenPortada/mapaLugar, PuestoBase.logo,
   * ProductoBase.imagen, Transaccion.fotoCarnetUrl/fotoRostroUrl,
   * Entrada.foto, RegistroIngreso.foto), como keys de S3 ya normalizadas.
   */
  private async urlsReferenciadas(): Promise<Set<string>> {
    const [
      usuarios,
      compras,
      eventos,
      landing,
      solicitudes,
      puestos,
      productos,
      transacciones,
      entradas,
      registros,
    ] = await Promise.all([
      this.prisma.usuario.findMany({ where: { foto: { not: null } }, select: { foto: true } }),
      this.prisma.compra.findMany({ where: { comprobanteUrl: { not: null } }, select: { comprobanteUrl: true } }),
      this.prisma.evento.findMany({ where: { imagen: { not: null } }, select: { imagen: true } }),
      this.prisma.landingConfig.findMany({ where: { imagen: { not: null } }, select: { imagen: true } }),
      this.prisma.solicitudEvento.findMany({
        where: { OR: [{ imagenPortada: { not: null } }, { mapaLugar: { not: null } }] },
        select: { imagenPortada: true, mapaLugar: true },
      }),
      this.prisma.puestoBase.findMany({ where: { logo: { not: null } }, select: { logo: true } }),
      this.prisma.productoBase.findMany({ where: { imagen: { not: null } }, select: { imagen: true } }),
      this.prisma.transaccion.findMany({
        where: { OR: [{ fotoCarnetUrl: { not: null } }, { fotoRostroUrl: { not: null } }] },
        select: { fotoCarnetUrl: true, fotoRostroUrl: true },
      }),
      this.prisma.entrada.findMany({ where: { foto: { not: null } }, select: { foto: true } }),
      this.prisma.registroIngreso.findMany({ where: { foto: { not: null } }, select: { foto: true } }),
    ]);

    const set = new Set<string>();
    const agregar = (valor: string | null | undefined) => {
      if (valor) set.add(keyDesdeUrlGuardada(valor));
    };

    usuarios.forEach((u) => agregar(u.foto));
    compras.forEach((c) => agregar(c.comprobanteUrl));
    eventos.forEach((e) => agregar(e.imagen));
    landing.forEach((l) => agregar(l.imagen));
    solicitudes.forEach((s) => {
      agregar(s.imagenPortada);
      agregar(s.mapaLugar);
    });
    puestos.forEach((p) => agregar(p.logo));
    productos.forEach((p) => agregar(p.imagen));
    transacciones.forEach((t) => {
      agregar(t.fotoCarnetUrl);
      agregar(t.fotoRostroUrl);
    });
    entradas.forEach((e) => agregar(e.foto));
    registros.forEach((r) => agregar(r.foto));

    return set;
  }

  /** Todas las keys que hoy existen en el bucket, con su fecha de subida (pagina de a 1000). */
  private async listarTodosLosObjetos(): Promise<{ key: string; subidoEn: Date }[]> {
    const objetos: { key: string; subidoEn: Date }[] = [];
    let token: string | undefined;
    do {
      const respuesta = await clienteS3().send(
        new ListObjectsV2Command({ Bucket: BUCKET_UPLOADS, ContinuationToken: token }),
      );
      for (const objeto of respuesta.Contents ?? []) {
        if (objeto.Key && objeto.LastModified) {
          objetos.push({ key: objeto.Key, subidoEn: objeto.LastModified });
        }
      }
      token = respuesta.IsTruncated ? respuesta.NextContinuationToken : undefined;
    } while (token);
    return objetos;
  }
}
