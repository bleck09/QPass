// Motivos por los que un Supervisor cambia la manilla de una entrada.
// Quedan guardados en CodigoQr.motivoAnulacion de la manilla que se reemplaza,
// para poder auditar después cuántas se perdieron, cuántas fallaron, etc.
export const MOTIVOS_CAMBIO_MANILLA = [
  'Perdida',
  'Dañada',
  'No la lee el escáner',
  'Entregada por error',
  'Otro',
];

// El único que pide detalle escrito: sin esto "Otro" no dice nada al auditar.
export const MOTIVO_OTRO = 'Otro';
