/* ============================================================================
 * src/lib/api/endpoints.ts
 * TODAS las rutas del backend NestJS en un solo lugar (Anexo B B5).
 * Si el backend cambia una ruta, este es el ÚNICO archivo que se toca.
 * Espeja src/modules/ del backend (frontend-v2 <-> backend-nest).
 * ========================================================================= */

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTRO: '/auth/registro',
    RECUPERAR_SOLICITAR: '/auth/recuperar/solicitar',
    RECUPERAR_VERIFICAR: '/auth/recuperar/verificar',
    RECUPERAR_RESTABLECER: '/auth/recuperar/restablecer',
  },
  USUARIOS: {
    LISTAR: '/usuarios',
    DETALLE: (id: number) => `/usuarios/${id}`,
    ACTUALIZAR: (id: number) => `/usuarios/${id}`,
    ELIMINAR: (id: number) => `/usuarios/${id}`,
    PASSWORD: (id: number) => `/usuarios/${id}/password`,
    CAMBIOS_PASSWORD: (id: number) => `/usuarios/${id}/cambios-password`,
  },
  EVENTOS: {
    LISTAR: '/eventos',
    CREAR: '/eventos',
    DETALLE: (id: string) => `/eventos/${id}`,
    ACTUALIZAR: (id: string) => `/eventos/${id}`,
    CERRAR: (id: string) => `/eventos/${id}/cerrar`,
  },
  ASIGNACIONES: {
    LISTAR: '/asignaciones',
    CREAR: '/asignaciones',
    ELIMINAR: (id: string) => `/asignaciones/${id}`,
  },
  SOLICITUDES_EVENTO: {
    LISTAR: '/solicitudes-evento',
    CREAR: '/solicitudes-evento',
    DETALLE: (id: string) => `/solicitudes-evento/${id}`,
    ACTUALIZAR: (id: string) => `/solicitudes-evento/${id}`,
    APROBAR: (id: string) => `/solicitudes-evento/${id}/aprobar`,
    RECHAZAR: (id: string) => `/solicitudes-evento/${id}/rechazar`,
  },
  CATEGORIAS_TICKET: {
    LISTAR: '/categorias-ticket',
    CREAR: '/categorias-ticket',
    ELIMINAR: (id: string) => `/categorias-ticket/${id}`,
  },
  COMPRAS: {
    CREAR: '/compras',
    MIAS: '/compras/mias',
    LISTAR: '/compras',
    CORREGIR_ENTRADAS: (id: string) => `/compras/${id}/entradas`,
    APROBAR: (id: string) => `/compras/${id}/aprobar`,
    RECHAZAR: (id: string) => `/compras/${id}/rechazar`,
  },
  ENTRADAS: {
    LISTAR: '/entradas',
    DETALLE: (id: string) => `/entradas/${id}`,
    BUSCAR_POR_CODIGO: (codigo: string) =>
      `/entradas/buscar/${encodeURIComponent(codigo)}`,
    REGISTROS: (id: string) => `/entradas/${id}/registros`,
    VINCULAR_QR: (id: string) => `/entradas/${id}/vincular-qr`,
    ANULAR_QR: (id: string) => `/entradas/${id}/anular-qr`,
    INGRESO: (id: string) => `/entradas/${id}/ingreso`,
    SALIDA: (id: string) => `/entradas/${id}/salida`,
  },
  CODIGOS_QR: {
    LISTAR: '/codigos-qr',
    BUSCAR_POR_CODIGO: (codigo: string) =>
      `/codigos-qr/buscar/${encodeURIComponent(codigo)}`,
    GENERAR: '/codigos-qr/generar',
    ELIMINAR_NO_VINCULADOS: '/codigos-qr',
  },
  TRANSACCIONES: {
    LISTAR: '/transacciones',
    RECARGA: '/transacciones/recarga',
    DEVOLUCION: '/transacciones/devolucion',
  },
  INCIDENCIAS: {
    LISTAR: '/incidencias',
    CREAR: '/incidencias',
    RESOLVER: (id: string) => `/incidencias/${id}/resolver`,
  },
  REPORTES_ENTRADA: {
    LISTAR: '/reportes-entrada',
    CREAR: '/reportes-entrada',
    CORREGIR: (id: string) => `/reportes-entrada/${id}/corregir`,
  },
  PUESTOS: {
    LISTAR: '/puestos',
    CREAR: '/puestos',
    ACTUALIZAR: (id: string) => `/puestos/${id}`,
  },
  PRODUCTOS: {
    LISTAR: '/productos',
    CREAR: '/productos',
    ELIMINAR: (id: string) => `/productos/${id}`,
  },
  PUESTO_AYUDANTES: {
    LISTAR: '/puesto-ayudantes',
    CREAR: '/puesto-ayudantes',
    ELIMINAR: (id: string) => `/puesto-ayudantes/${id}`,
  },
  VENTAS: {
    LISTAR: '/ventas',
    CREAR: '/ventas',
  },
  LANDING_CONFIG: {
    DETALLE: (eventoId: string) => `/landing-config/${eventoId}`,
    GUARDAR: (eventoId: string) => `/landing-config/${eventoId}`,
  },
} as const;
