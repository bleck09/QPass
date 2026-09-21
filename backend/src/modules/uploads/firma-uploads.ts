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
 *
 * El vencimiento se redondea a ventanas fijas del reloj (ver firmarUrlUpload):
 * dentro de una misma ventana, un archivo siempre recibe la MISMA URL, que es
 * lo que permite que el navegador la cachee en vez de volver a descargar cada
 * imagen en cada refresco de datos.
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
// El vencimiento NO es "ahora + TTL" sino el próximo múltiplo exacto de TTL_MS del
// reloj (14:30, 15:00, 15:30...): así todas las respuestas de la misma ventana
// firman la MISMA URL y el navegador puede servirla de su caché en vez de volver a
// bajar cada foto en cada refresco de datos (ver Cache-Control en main.ts). El
// precio es que un enlace vive entre TTL_MS y 2×TTL_MS según cuándo se emitió.
export const firmarUrlUpload = (ruta: string): string => {
  const exp = (Math.floor(Date.now() / TTL_MS) + 1) * TTL_MS;
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
