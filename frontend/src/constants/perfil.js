// Opciones de sexo y tipo de documento — espejo de los enums Sexo/TipoDocumento
// en backend/prisma/schema.prisma. Ambos campos son opcionales.
export const OPCIONES_SEXO = [
  { valor: 'masculino', texto: 'Masculino' },
  { valor: 'femenino', texto: 'Femenino' },
  { valor: 'otro', texto: 'Otro' },
  { valor: 'prefiero_no_decir', texto: 'Prefiero no decir' },
];

export const OPCIONES_TIPO_DOCUMENTO = [
  { valor: 'ci', texto: 'Cédula de identidad (C.I.)' },
  { valor: 'pasaporte', texto: 'Pasaporte' },
  { valor: 'otro', texto: 'Otro documento' },
];
