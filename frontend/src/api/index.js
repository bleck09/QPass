import { apiGet, apiPost, apiPatch, apiPut, apiDelete, apiUpload, qs } from './client.js';

export const uploads = {
  // Sube una imagen real (File/Blob) y devuelve { url }: la ruta pública guardada en
  // la BD ("/uploads/<carpeta>/<archivo>"), ya no el base64 de antes. "carpeta" agrupa
  // el volumen por tipo (perfiles, comprobantes, eventos...) — ver uploads.controller.ts.
  subir: (archivo, carpeta) => {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name || 'imagen.jpg');
    return apiUpload(`/uploads${qs({ carpeta })}`, formData);
  },
};

export const auth = {
  login: (email, password) => apiPost('/auth/login', { email, password }),
  registro: (datos) => apiPost('/auth/registro', datos),
  emailDisponible: (email) => apiGet(`/auth/email-disponible${qs({ email })}`),
  enviarCodigoRegistro: (email) => apiPost('/auth/registro/enviar-codigo', { email }),
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
  // Solo eventos publicados — para la landing pública y el selector del comprador.
  listar: () => apiGet('/eventos'),
  // TODOS los eventos (publicados o en borrador) — solo para el panel de Admin.
  listarTodos: () => apiGet('/eventos/todos'),
  obtener: (id) => apiGet(`/eventos/${id}`),
  // Igual que obtener(), pero sin filtrar por publicado — para pantallas de
  // Admin (Mapa.jsx) que necesitan un evento puntual aunque esté en borrador.
  obtenerAdmin: (id) => apiGet(`/eventos/${id}/admin`),
  crear: (datos) => apiPost('/eventos', datos),
  actualizar: (id, datos) => apiPatch(`/eventos/${id}`, datos),
  // Borrado real (no archivar): solo un borrador sin ninguna compra registrada.
  eliminar: (id) => apiDelete(`/eventos/${id}`),
  cerrar: (id) => apiPost(`/eventos/${id}/cerrar`),
  archivar: (id) => apiPost(`/eventos/${id}/archivar`),
  desarchivar: (id) => apiPost(`/eventos/${id}/desarchivar`),
  // Qué le falta a un evento en borrador para poder publicarse (tickets, QR, página).
  progreso: (id) => apiGet(`/eventos/${id}/progreso`),
  publicar: (id) => apiPost(`/eventos/${id}/publicar`),
  despublicar: (id) => apiPost(`/eventos/${id}/despublicar`),
  // Contorno del recinto (Mapa.jsx, modo Contorno): array [[lat,lng], ...]; [] lo borra.
  actualizarContorno: (id, contorno) => apiPatch(`/eventos/${id}/contorno`, { contorno }),
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

export const diasEvento = {
  listar: (eventoId) => apiGet(`/dias-evento${qs({ eventoId })}`),
  crear: (datos) => apiPost('/dias-evento', datos),
  actualizar: (id, datos) => apiPatch(`/dias-evento/${id}`, datos),
  eliminar: (id) => apiDelete(`/dias-evento/${id}`),
};

export const billeterasEvento = {
  mias: () => apiGet('/billeteras-evento/mias'),
  porEvento: (eventoId) => apiGet(`/billeteras-evento${qs({ eventoId })}`),
};

export const codigosRetiroNegocio = {
  mio: (eventoId) => apiGet(`/codigos-retiro-negocio/mio${qs({ eventoId })}`),
  buscar: (codigo) => apiGet(`/codigos-retiro-negocio/buscar/${encodeURIComponent(codigo)}`),
};

export const categoriasTicket = {
  listar: (eventoId) => apiGet(`/categorias-ticket${qs({ eventoId })}`),
  crear: (datos) => apiPost('/categorias-ticket', datos),
  // nombre/beneficios/cantidad/precio — el backend rechaza bajar la cantidad
  // por debajo de lo ya vendido/reservado.
  actualizar: (id, datos) => apiPatch(`/categorias-ticket/${id}`, datos),
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
  // `params` = { contexto, puestoId }: solo sirven para ubicar al falso si la
  // manilla escaneada es una copia (el backend responde MANILLA_FALSA).
  buscarPorCodigo: (codigo, params) => apiGet(`/entradas/buscar/${encodeURIComponent(codigo)}${qs(params)}`),
  buscarBasico: (codigo) => apiGet(`/entradas/buscar-basico/${encodeURIComponent(codigo)}`),
  registros: (id) => apiGet(`/entradas/${id}/registros`),
  // `motivo` solo aplica cuando la entrada YA tenia una manilla: queda como
  // motivoAnulacion de la que se reemplaza.
  vincularQr: (id, codigoQrId, motivo) =>
    apiPost(`/entradas/${id}/vincular-qr`, { codigoQrId, motivo }),
  anularQr: (id, motivo) => apiPost(`/entradas/${id}/anular-qr`, { motivo }),
  ingreso: (id, foto, eventoId, codigoQr) => apiPost(`/entradas/${id}/ingreso`, { foto, eventoId, codigoQr }),
  salida: (id, foto, eventoId, codigoQr) => apiPost(`/entradas/${id}/salida`, { foto, eventoId, codigoQr }),
  // El dueño real llegó y su manilla ya figuraba adentro (alguien entró con una copia).
  verificarDuplicado: (id, datos) => apiPost(`/entradas/${id}/verificar-duplicado`, datos),
};

// Manillas duplicadas: "Personas por encontrar" + alertas (polling cada 10 s).
export const casosDuplicado = {
  listar: (params) => apiGet(`/casos-duplicado${qs(params)}`),
  alertas: (params) => apiGet(`/casos-duplicado/alertas${qs(params)}`),
  recuperar: (id, sancion) => apiPost(`/casos-duplicado/${id}/recuperar`, { sancion }),
};

export const codigosQr = {
  listar: (params) => apiGet(`/codigos-qr${qs(params)}`),
  buscarPorCodigo: (codigo) => apiGet(`/codigos-qr/buscar/${encodeURIComponent(codigo)}`),
  // Quién entregó / cambió cada manilla del evento (Gestión de Entrega).
  historial: (eventoId) => apiGet(`/codigos-qr/historial${qs({ eventoId })}`),
  // "Mis manillas": los cambios de manilla de las entradas del usuario logueado.
  historialMias: () => apiGet('/codigos-qr/historial/mias'),
  generar: (datos) => apiPost('/codigos-qr/generar', datos),
  eliminarNoVinculados: (eventoId) => apiDelete(`/codigos-qr${qs({ eventoId })}`),
};

export const transacciones = {
  listar: (params) => apiGet(`/transacciones${qs(params)}`),
  recarga: (datos) => apiPost('/transacciones/recarga', datos),
  devolucion: (datos) => apiPost('/transacciones/devolucion', datos),
  // Solo Admin: crédito nuevo en el ledger (nunca edita movimientos viejos).
  ajusteManual: (datos) => apiPost('/transacciones/ajuste-manual', datos),
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

// Catálogo del negocio: puestos base + productos base, definidos una vez y
// reutilizados entre eventos.
export const puestosBase = {
  listar: () => apiGet('/puestos-base'),
  obtener: (id) => apiGet(`/puestos-base/${id}`),
  crear: (datos) => apiPost('/puestos-base', datos),
  actualizar: (id, datos) => apiPatch(`/puestos-base/${id}`, datos),
  archivar: (id) => apiPost(`/puestos-base/${id}/archivar`),
  crearProducto: (puestoBaseId, datos) => apiPost(`/puestos-base/${puestoBaseId}/productos`, datos),
  actualizarProducto: (id, datos) => apiPatch(`/puestos-base/productos/${id}`, datos),
  eliminarProducto: (id) => apiDelete(`/puestos-base/productos/${id}`),
};

export const puestos = {
  listar: (params) => apiGet(`/puestos${qs(params)}`),
  mios: () => apiGet('/puestos/mios'),
  // Activa un puesto base del catálogo en un evento: { eventoId, puestoBaseId }.
  crear: (datos) => apiPost('/puestos', datos),
  actualizar: (id, datos) => apiPatch(`/puestos/${id}`, datos),
  desactivar: (id) => apiDelete(`/puestos/${id}`),
};

// Cuadros del plano que NO son un negocio: Entrada/Baños/Escenario/Recargador/
// Supervisor/Otro. A diferencia de `puestos`, el Admin los crea y borra directo.
export const elementosMapa = {
  listar: (eventoId) => apiGet(`/elementos-mapa${qs({ eventoId })}`),
  crear: (datos) => apiPost('/elementos-mapa', datos),
  actualizar: (id, datos) => apiPatch(`/elementos-mapa/${id}`, datos),
  eliminar: (id) => apiDelete(`/elementos-mapa/${id}`),
};

export const productos = {
  // Catálogo del puesto (base + estado del evento) aplanado.
  listar: (puestoId) => apiGet(`/productos${qs({ puestoId })}`),
  // Ajusta activo/stock/precio de un producto para ese evento.
  actualizarEstado: (datos) => apiPatch('/productos/estado', datos),
};

export const puestoAyudantes = {
  listar: (params) => apiGet(`/puesto-ayudantes${qs(params)}`),
  misAyudantes: () => apiGet('/puesto-ayudantes/mis-ayudantes'),
  asignar: (datos) => apiPost('/puesto-ayudantes', datos),
  quitar: (id) => apiDelete(`/puesto-ayudantes/${id}`),
  editarAyudante: (id, datos) => apiPatch(`/puesto-ayudantes/ayudante/${id}`, datos),
  resetPassword: (id, datos) => apiPost(`/puesto-ayudantes/ayudante/${id}/reset-password`, datos),
  desvincular: (id) => apiPost(`/puesto-ayudantes/ayudante/${id}/desvincular`),
};

export const ventas = {
  listar: (params) => apiGet(`/ventas${qs(params)}`),
  crear: (datos) => apiPost('/ventas', datos),
  anular: (id, motivo) => apiPost(`/ventas/${id}/anular`, { motivo }),
};

// Aviso de un Ayudante al Usuario Negocio: producto sin stock / por agotarse.
export const avisosStock = {
  crear: (datos) => apiPost('/avisos-stock', datos),
  listar: () => apiGet('/avisos-stock'),
  marcarVisto: (id) => apiPatch(`/avisos-stock/${id}/visto`),
  marcarTodosVistos: () => apiPost('/avisos-stock/marcar-vistos'),
};

export const landingConfig = {
  obtener: (eventoId) => apiGet(`/landing-config/${eventoId}`),
  guardar: (eventoId, datos) => apiPut(`/landing-config/${eventoId}`, datos),
};

export const auditoria = {
  listar: (params) => apiGet(`/auditoria${qs(params)}`),
};

export const solicitudesEvento = {
  listar: (params) => apiGet(`/solicitudes-evento${qs(params)}`),
  obtener: (id) => apiGet(`/solicitudes-evento/${id}`),
  crear: (datos) => apiPost('/solicitudes-evento', datos),
  actualizar: (id, datos) => apiPatch(`/solicitudes-evento/${id}`, datos),
  aprobar: (id) => apiPost(`/solicitudes-evento/${id}/aprobar`),
  rechazar: (id, motivoRechazo) => apiPost(`/solicitudes-evento/${id}/rechazar`, { motivoRechazo }),
};

// Arqueo de caja de un operador con efectivo (Recargador / Devolucion), §5.2.
export const cortesCaja = {
  actual: (params) => apiGet(`/cortes-caja/actual${qs(params)}`),
  listar: (params) => apiGet(`/cortes-caja${qs(params)}`),
  abrir: (datos) => apiPost('/cortes-caja/abrir', datos),
  cerrar: (id, datos) => apiPost(`/cortes-caja/${id}/cerrar`, datos),
};

export const dashboard = {
  // Tablero ADMIN GENERAL (todo el sistema). Espeja backend dashboard.controller.
  adminPendientes: () => apiGet('/dashboard/admin/pendientes'),
  adminKpis: (rango) => apiGet(`/dashboard/admin/kpis${qs(rango)}`),
  adminEventos: () => apiGet('/dashboard/admin/eventos'),
  adminAlertas: () => apiGet('/dashboard/admin/alertas'),
  adminEmbudo: () => apiGet('/dashboard/admin/embudo'),
  adminVivo: () => apiGet('/dashboard/admin/vivo'),
  adminCortesCaja: () => apiGet('/dashboard/admin/cortes-caja'),
  // Gráficos históricos (W1/W2/W4/W5).
  adminRecaudacionDiaria: (rango) => apiGet(`/dashboard/admin/recaudacion-diaria${qs(rango)}`),
  adminPorEvento: (rango) => apiGet(`/dashboard/admin/por-evento${qs(rango)}`),
  adminComprasDiarias: (rango) => apiGet(`/dashboard/admin/compras-diarias${qs(rango)}`),
  adminIncidenciasRecargador: () => apiGet('/dashboard/admin/incidencias-por-recargador'),
  // Tablero del Usuario Negocio: sus puestos/ventas en un evento (negocioId sale del token).
  negocio: (eventoId, rango) => apiGet(`/dashboard/negocio${qs({ eventoId, ...rango })}`),
  // Tablero del Cliente organizador: sus eventos + resumen agregado por evento.
  clienteEventos: () => apiGet('/dashboard/cliente/eventos'),
  clienteEvento: (id) => apiGet(`/dashboard/cliente/evento/${id}`),
};

const api = {
  auth, usuarios, eventos, asignaciones, diasEvento, billeterasEvento, codigosRetiroNegocio, categoriasTicket, compras, entradas,
  codigosQr, transacciones, incidencias, reportesEntrada, puestosBase, puestos, elementosMapa, productos,
  puestoAyudantes, ventas, avisosStock, landingConfig, solicitudesEvento, cortesCaja,
  auditoria, dashboard, casosDuplicado,
};

export default api;
