import { apiGet, apiPost, apiPatch, apiPut, apiDelete, qs } from './client.js';

export const auth = {
  login: (email, password) => apiPost('/auth/login', { email, password }),
  registro: (datos) => apiPost('/auth/registro', datos),
  recuperarSolicitar: (email) => apiPost('/auth/recuperar/solicitar', { email }),
  recuperarVerificar: (email, codigo) => apiPost('/auth/recuperar/verificar', { email, codigo }),
  recuperarRestablecer: (email, codigo, passwordNueva) => apiPost('/auth/recuperar/restablecer', { email, codigo, passwordNueva }),
};

export const usuarios = {
  listar: (params) => apiGet(`/usuarios${qs(params)}`),
  obtener: (id) => apiGet(`/usuarios/${id}`),
  actualizar: (id, datos) => apiPatch(`/usuarios/${id}`, datos),
  cambiarPassword: (id, passwordActual, passwordNueva) => apiPost(`/usuarios/${id}/password`, { passwordActual, passwordNueva }),
  historialPassword: (id) => apiGet(`/usuarios/${id}/cambios-password`),
  eliminar: (id) => apiDelete(`/usuarios/${id}`),
};

export const eventos = {
  listar: () => apiGet('/eventos'),
  obtener: (id) => apiGet(`/eventos/${id}`),
  crear: (datos) => apiPost('/eventos', datos),
  actualizar: (id, datos) => apiPatch(`/eventos/${id}`, datos),
  cerrar: (id) => apiPost(`/eventos/${id}/cerrar`),
  archivar: (id) => apiPost(`/eventos/${id}/archivar`),
  desarchivar: (id) => apiPost(`/eventos/${id}/desarchivar`),
  // Solo los eventos donde Admin asignó a este usuario con este rol (Supervisor, Recargador,
  // Devolucion, UsuarioNegocio): evita que un operador vea/opere eventos que no le tocan.
  misAsignados: async (usuarioId, rol) => {
    const [todos, asignados] = await Promise.all([
      apiGet('/eventos'),
      apiGet(`/asignaciones${qs({ usuarioId, rol })}`),
    ]);
    const idsAsignados = new Set(asignados.map(a => a.eventoId));
    return todos.filter(ev => idsAsignados.has(ev.id));
  },
};

export const asignaciones = {
  listar: (params) => apiGet(`/asignaciones${qs(params)}`),
  asignar: (datos) => apiPost('/asignaciones', datos),
  quitar: (id) => apiDelete(`/asignaciones/${id}`),
};

export const categoriasTicket = {
  listar: (eventoId) => apiGet(`/categorias-ticket${qs({ eventoId })}`),
  crear: (datos) => apiPost('/categorias-ticket', datos),
  eliminar: (id) => apiDelete(`/categorias-ticket/${id}`),
};

export const compras = {
  crear: (datos) => apiPost('/compras', datos),
  mias: () => apiGet('/compras/mias'),
  listar: (params) => apiGet(`/compras${qs(params)}`),
  corregirEntradas: (id, entradas) => apiPatch(`/compras/${id}/entradas`, { entradas }),
  aprobar: (id) => apiPost(`/compras/${id}/aprobar`),
  rechazar: (id, motivoRechazo) => apiPost(`/compras/${id}/rechazar`, { motivoRechazo }),
};

export const entradas = {
  listar: (params) => apiGet(`/entradas${qs(params)}`),
  // Entradas a nombre del usuario logueado (titular o invitado), aunque la compra
  // la haya hecho otra persona.
  mias: () => apiGet('/entradas/mias'),
  obtener: (id) => apiGet(`/entradas/${id}`),
  buscarPorCodigo: (codigo) => apiGet(`/entradas/buscar/${encodeURIComponent(codigo)}`),
  registros: (id) => apiGet(`/entradas/${id}/registros`),
  vincularQr: (id, codigoQrId) => apiPost(`/entradas/${id}/vincular-qr`, { codigoQrId }),
  anularQr: (id, motivo) => apiPost(`/entradas/${id}/anular-qr`, { motivo }),
  ingreso: (id, foto) => apiPost(`/entradas/${id}/ingreso`, { foto }),
  salida: (id, foto) => apiPost(`/entradas/${id}/salida`, { foto }),
};

export const codigosQr = {
  listar: (params) => apiGet(`/codigos-qr${qs(params)}`),
  buscarPorCodigo: (codigo) => apiGet(`/codigos-qr/buscar/${encodeURIComponent(codigo)}`),
  generar: (datos) => apiPost('/codigos-qr/generar', datos),
  eliminarNoVinculados: (eventoId) => apiDelete(`/codigos-qr${qs({ eventoId })}`),
};

export const transacciones = {
  listar: (params) => apiGet(`/transacciones${qs(params)}`),
  recarga: (datos) => apiPost('/transacciones/recarga', datos),
  devolucion: (datos) => apiPost('/transacciones/devolucion', datos),
};

export const incidencias = {
  listar: (params) => apiGet(`/incidencias${qs(params)}`),
  crear: (datos) => apiPost('/incidencias', datos),
  resolver: (id, ajusteAplicado) => apiPost(`/incidencias/${id}/resolver`, { ajusteAplicado }),
};

export const reportesEntrada = {
  listar: (params) => apiGet(`/reportes-entrada${qs(params)}`),
  crear: (datos) => apiPost('/reportes-entrada', datos),
  corregir: (id, valorCorregido) => apiPost(`/reportes-entrada/${id}/corregir`, { valorCorregido }),
};

export const puestos = {
  listar: (params) => apiGet(`/puestos${qs(params)}`),
  crear: (datos) => apiPost('/puestos', datos),
  actualizar: (id, datos) => apiPatch(`/puestos/${id}`, datos),
};

export const productos = {
  listar: (puestoId) => apiGet(`/productos${qs({ puestoId })}`),
  crear: (datos) => apiPost('/productos', datos),
  eliminar: (id) => apiDelete(`/productos/${id}`),
};

export const puestoAyudantes = {
  listar: (params) => apiGet(`/puesto-ayudantes${qs(params)}`),
  asignar: (datos) => apiPost('/puesto-ayudantes', datos),
  quitar: (id) => apiDelete(`/puesto-ayudantes/${id}`),
};

export const ventas = {
  listar: (params) => apiGet(`/ventas${qs(params)}`),
  crear: (datos) => apiPost('/ventas', datos),
};

export const landingConfig = {
  obtener: (eventoId) => apiGet(`/landing-config/${eventoId}`),
  guardar: (eventoId, datos) => apiPut(`/landing-config/${eventoId}`, datos),
};

export const solicitudesEvento = {
  listar: (params) => apiGet(`/solicitudes-evento${qs(params)}`),
  obtener: (id) => apiGet(`/solicitudes-evento/${id}`),
  crear: (datos) => apiPost('/solicitudes-evento', datos),
  actualizar: (id, datos) => apiPatch(`/solicitudes-evento/${id}`, datos),
  aprobar: (id) => apiPost(`/solicitudes-evento/${id}/aprobar`),
  rechazar: (id, motivoRechazo) => apiPost(`/solicitudes-evento/${id}/rechazar`, { motivoRechazo }),
};

const api = {
  auth, usuarios, eventos, asignaciones, categoriasTicket, compras, entradas,
  codigosQr, transacciones, incidencias, reportesEntrada, puestos, productos,
  puestoAyudantes, ventas, landingConfig, solicitudesEvento,
};

export default api;
