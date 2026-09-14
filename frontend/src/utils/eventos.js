// 'YYYY-MM-DD' en el calendario LOCAL del navegador (nunca UTC) — así un
// evento/jornada nocturno que cruza medianoche cuenta en ambos días tal como
// se ve. Compartido por CalendarioEventos.jsx (grilla de días) y cualquier
// pantalla que necesite ubicar una fecha en ese mismo calendario (ej. el mini
// calendario de "días de la jornada" en AdminJornadas.jsx) — no duplicar.
export const diaLocalISO = (fecha) => {
  const d = new Date(fecha);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// Evento vence cuando fechaFin ya pasó.
export const esVigente = (evento) => new Date(evento.fechaFin) >= new Date();

// Estado "de cara al operador", derivado de fechas + flags del backend:
//  - archivado  : Evento.archivadoEn != null  -> cierre definitivo, solo lectura
//  - finalizado : Evento.estado === 'finalizado' (cron/cierre manual), o ya pasó fechaFin
//  - en_curso   : ya empezó (ahora >= fecha) y todavía no terminó
//  - proximo    : todavía no empieza
export const ESTADO_EVENTO = {
  proximo:    { label: 'Próximo',    clase: 'ev-proximo' },
  en_curso:   { label: 'En curso',   clase: 'ev-en-curso' },
  finalizado: { label: 'Finalizado', clase: 'ev-finalizado' },
  archivado:  { label: 'Archivado',  clase: 'ev-archivado' },
};

// Estado de stock de una categoría de ticket, para el badge de la landing:
//   disponible  -> queda buena parte del cupo
//   stock_bajo  -> quedan muy pocas (<= 15% del cupo)
//   agotado     -> sin disponibles
// Devuelve null si la categoría no trae datos de cupo (ej. datos de demo).
const STOCK_BAJO_RATIO = 0.15;
export const ESTADO_STOCK = {
  disponible: { label: 'Disponible', clase: 'stk-disponible' },
  stock_bajo: { label: 'Stock bajo', clase: 'stk-bajo' },
  agotado:    { label: 'Agotado',    clase: 'stk-agotado' },
};

export function estadoStock(cat) {
  if (!cat || cat.cantidad == null) return null;
  const disponibles = cat.disponibles ?? (cat.cantidad - (cat.cantidadVendida ?? 0));
  if (disponibles <= 0) return 'agotado';
  if (cat.cantidad > 0 && disponibles / cat.cantidad <= STOCK_BAJO_RATIO) return 'stock_bajo';
  return 'disponible';
}

export function estadoEvento(evento) {
  if (!evento) return 'proximo';
  if (evento.archivadoEn) return 'archivado';
  const ahora = Date.now();
  if (evento.estado === 'finalizado' || ahora > new Date(evento.fechaFin).getTime()) {
    return 'finalizado';
  }
  if (ahora >= new Date(evento.fecha).getTime()) return 'en_curso';
  return 'proximo';
}

// Filtros de estado para el <Buscador> de selección de evento (mismo set en todos los roles).
export const FILTROS_ESTADO_EVENTO = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'activos', texto: 'Activos' },
  { valor: 'en_curso', texto: 'En curso' },
  { valor: 'finalizados', texto: 'Finalizados' },
];

// Filtra una lista de eventos por texto (nombre / lugar) y por estado operativo.
//   activos      -> proximo | en_curso
//   en_curso     -> en_curso
//   finalizados  -> finalizado | archivado
export function filtrarEventos(eventos, busqueda = '', filtro = 'todos') {
  const q = busqueda.trim().toLowerCase();
  return (eventos || []).filter((ev) => {
    const est = estadoEvento(ev);
    const coincideFiltro =
      filtro === 'todos' ||
      (filtro === 'activos' && (est === 'en_curso' || est === 'proximo')) ||
      (filtro === 'en_curso' && est === 'en_curso') ||
      (filtro === 'finalizados' && (est === 'finalizado' || est === 'archivado'));
    const coincideBusqueda =
      !q ||
      ev.nombre.toLowerCase().includes(q) ||
      (ev.lugar || '').toLowerCase().includes(q);
    return coincideFiltro && coincideBusqueda;
  });
}

// Evento.imagen es opcional — Admin puede crear un evento sin subir ninguna. Sin esto, cualquier
// <img>/backgroundImage con evento.imagen vacío se ve rota/en blanco.
export const IMAGEN_EVENTO_PLACEHOLDER = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
export const imagenEvento = (evento) => evento?.imagen || IMAGEN_EVENTO_PLACEHOLDER;

// Nombre visible de una jornada (DiaEvento): su nombre propio, o "Día N" por su orden.
// `indice` (0-based) es el respaldo cuando la jornada no trae `orden`.
export const nombreJornada = (dia, indice = 0) =>
  dia?.nombre || `Día ${dia?.orden ?? indice + 1}`;

// ¿Vale la pena mostrar la jornada al público? Sí si tiene nombre propio o no es
// la primera noche — en un evento de una sola jornada sería ruido redundante.
export const mostrarJornada = (dia) => !!dia && (!!dia.nombre || (dia.orden ?? 1) > 1);

// Igual que nombreJornada, pero con el año al lado ("Martes 15 (2026)"): el
// nombre de la jornada (propio o "Día N") nunca trae fecha completa, así que
// al separar por noches en la compra conviene aclarar de qué año se trata.
export const nombreJornadaConAnio = (dia, indice = 0) => {
  const nombre = nombreJornada(dia, indice);
  const anio = dia?.inicio ? new Date(dia.inicio).getFullYear() : null;
  return anio ? `${nombre} (${anio})` : nombre;
};

// Pastillas de filtro por jornada a partir de una lista de entradas/participantes
// (cada ítem con `.diaEvento` y/o `.diaEventoId`). Devuelve [] si el evento tiene
// 0 o 1 jornadas (entonces el filtro no aporta).
export function opcionesJornada(items) {
  const porId = new Map();
  for (const it of items || []) {
    const id = it.diaEventoId ?? it.diaEvento?.id ?? null;
    if (id == null) continue;
    if (!porId.has(id)) porId.set(id, { dia: it.diaEvento, id, conteo: 0 });
    porId.get(id).conteo += 1;
  }
  if (porId.size <= 1) return [];
  const jornadas = [...porId.values()].sort(
    (a, b) => (a.dia?.orden ?? 0) - (b.dia?.orden ?? 0),
  );
  return [
    { valor: 'todas', texto: 'Todas' },
    ...jornadas.map((j) => ({
      valor: j.id,
      texto: nombreJornada(j.dia),
      conteo: j.conteo,
    })),
  ];
}

// Agrupa una lista en secciones por jornada, en el orden de las jornadas
// (`dia.orden`). `obtenerDiaEvento(item)` debe devolver el `DiaEvento` del
// ítem (o null/undefined si no tiene). Igual que `opcionesJornada`, devuelve
// `[]` cuando hay 0 o 1 jornada distinta — ahí agrupar no aporta nada y el
// llamador debe seguir mostrando la lista plana de siempre.
// Uso: comprador armando su carrito/grilla de categorías (UsuarioNormal.jsx).
export function agruparPorJornada(items, obtenerDiaEvento) {
  const porId = new Map();
  for (const item of items || []) {
    const dia = obtenerDiaEvento(item) || null;
    const id = dia?.id ?? null;
    if (!porId.has(id)) porId.set(id, { dia, items: [] });
    porId.get(id).items.push(item);
  }
  if (porId.size <= 1) return [];
  return [...porId.values()].sort((a, b) => (a.dia?.orden ?? 0) - (b.dia?.orden ?? 0));
}

// evento.fecha ahora es un DateTime real (no un string ya formateado), así que hay que
// formatearlo para mostrarlo en la UI.
export const formatearFecha = (fechaISO, conHora = true) => {
  if (!fechaISO) return '';
  const fecha = new Date(fechaISO);
  const opciones = conHora
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return fecha.toLocaleString('es-BO', opciones);
};
