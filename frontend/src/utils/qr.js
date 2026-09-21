// Imagen de un código QR a partir de su texto. Única para toda la app
// (ModalQr, Mis Entradas, Mi Saldo, pago de la compra...).
export const qrDe = (texto) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(texto)}`;
