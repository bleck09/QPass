import { createHash, createHmac, timingSafeEqual } from 'crypto';

/* ----------------------------------------------------------------------------
 * Firma de URLs de /uploads: sin esto, cualquiera con el link de un archivo
 * (foto de perfil, comprobante de pago, carnet...) podía verlo para siempre sin
 * loguearse — el único freno era que el nombre es un UUID impredecible. Ahora
 * cada vez que una URL "/uploads/..." sale en una respuesta (ver
 * FirmarImagenesInterceptor) se le agrega "?exp=...&firma=..." con un
 * vencimiento corto; el estático de main.ts rechaza cualquier pedido cuya firma
 * no corresponda o ya haya vencido.
 *
 * Quien pide la firma sigue siendo, indirectamente, quien ya pasó el guard de
 * autenticación de la RUTA que devolvió esos datos (o, para rutas @Publico
 * como la landing pública del evento, cualquier visitante — igual que antes,
 * ahí no hace falta login para ver la portada del evento).
 *
 * TTL corto (30 min): alcanza para que se vea la página donde salió el link;
 * si el usuario la deja abierta más tiempo y la imagen no estaba ya cacheada
 * por el navegador, un refresco de los datos (nueva llamada al backend) trae
 * una URL fresca.
 * -------------------------------------------------------------------------- */

const TTL_MS = 30 * 60 * 1000; // 30 minutos

// No reusar JWT_SECRET tal cual como clave HMAC (higiene: cada firma, su propia
// clave derivada) — igual sirve el mismo secreto de entorno como semilla.
const claveFirma = () =>
  createHash('sha256')
    .update(`${process.env.JWT_SECRET || ''}:firma-uploads`)
    .digest();

const firmarComponentes = (ruta: string, exp: number): string =>
  createHmac('sha256', claveFirma()).update(`${ruta}:${exp}`).digest('hex');

// ruta: SIEMPRE la ruta completa tal como se guarda en la BD, ej. "/uploads/comprobantes/xxx.jpg".
export const firmarUrlUpload = (ruta: string): string => {
  const exp = Date.now() + TTL_MS;
  return `${ruta}?exp=${exp}&firma=${firmarComponentes(ruta, exp)}`;
};

export const verificarFirmaUpload = (
  ruta: string,
  exp: string | undefined,
  firma: string | undefined,
): boolean => {
  if (!exp || !firma) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || Date.now() > expNum) return false;

  const esperada = firmarComponentes(ruta, expNum);
  const bufA = Buffer.from(firma);
  const bufB = Buffer.from(esperada);
  // Longitud distinta => timingSafeEqual tira; ya sabemos que no coincide.
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};
