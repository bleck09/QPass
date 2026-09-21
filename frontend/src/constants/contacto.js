// Datos de contacto públicos de QPass (landing y footer).
//
// OJO: hoy son valores de EJEMPLO, no direcciones que funcionen. Reemplazalos
// por los reales antes de publicar el sitio — están acá, en un solo lugar,
// justamente para que sea un cambio de una línea y no haya que buscarlos
// repartidos por los componentes.
export const CONTACTO = {
  correo: 'contacto@qpass.com',
  whatsapp: '+591 700 00000',
  whatsappUrl: 'https://wa.me/59170000000',
  ciudad: 'Cochabamba, Bolivia',
};

// Motivos del formulario de Contáctanos. Las secciones de Organizadores y
// Asistentes de la landing preseleccionan uno al llevar al formulario, por eso
// viven acá y no dentro de ContactoSection.
export const MOTIVOS_CONTACTO = {
  organizar: 'Quiero organizar un evento',
  negocio: 'Tengo un negocio y quiero vender adentro',
  consulta: 'Consulta sobre mi entrada o mi saldo',
  otro: 'Otro',
};
