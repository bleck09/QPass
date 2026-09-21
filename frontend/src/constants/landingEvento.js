import {
  FaTicketAlt, FaChartLine, FaExchangeAlt, FaStore, FaQrcode, FaWallet, FaMusic,
  FaHamburger, FaGlassCheers, FaParking, FaStar, FaFirstAid, FaWifi, FaChild,
  FaCamera, FaBus, FaShieldAlt,
} from 'react-icons/fa';

// Datos compartidos entre el editor de la página del evento
// (admin/AdminConfigurarPagina.jsx) y la página pública (publico/App.jsx):
// si un ícono se puede elegir en el editor, la página pública tiene que
// saber dibujarlo. Por eso viven en un solo lugar.

/** Íconos elegibles para las actividades destacadas. La clave es lo que se guarda en BD. */
export const ICONOS_ACTIVIDAD = {
  ticket: { Icono: FaTicketAlt, etiqueta: 'Entrada' },
  qrcode: { Icono: FaQrcode, etiqueta: 'Código QR' },
  wallet: { Icono: FaWallet, etiqueta: 'Pagos / saldo' },
  sync: { Icono: FaExchangeAlt, etiqueta: 'Devolución' },
  store: { Icono: FaStore, etiqueta: 'Puestos' },
  music: { Icono: FaMusic, etiqueta: 'Música' },
  food: { Icono: FaHamburger, etiqueta: 'Comida' },
  drink: { Icono: FaGlassCheers, etiqueta: 'Bar / bebidas' },
  vip: { Icono: FaStar, etiqueta: 'Zona VIP' },
  parking: { Icono: FaParking, etiqueta: 'Estacionamiento' },
  firstaid: { Icono: FaFirstAid, etiqueta: 'Primeros auxilios' },
  security: { Icono: FaShieldAlt, etiqueta: 'Seguridad' },
  wifi: { Icono: FaWifi, etiqueta: 'Wi-Fi' },
  kids: { Icono: FaChild, etiqueta: 'Zona niños' },
  photo: { Icono: FaCamera, etiqueta: 'Fotos' },
  bus: { Icono: FaBus, etiqueta: 'Transporte' },
  chart: { Icono: FaChartLine, etiqueta: 'Estadísticas' },
};

/** Ícono de una actividad; si la clave no existe (dato viejo), el QR. */
export const iconoActividad = (clave) => (ICONOS_ACTIVIDAD[clave] ?? ICONOS_ACTIVIDAD.qrcode).Icono;

// Se muestran cuando el organizador no cargó actividades propias: hablan de
// lo que el ASISTENTE tiene en cualquier evento QPass (antes decían
// "Recaudación diaria" o "Auditoría continua", textos de operador).
export const ACTIVIDADES_POR_DEFECTO = [
  { icono: 'qrcode', titulo: 'Acceso con QR', descripcion: 'Entrás en segundos mostrando tu manilla o tu QR.' },
  { icono: 'wallet', titulo: 'Pagos sin efectivo', descripcion: 'Recargás saldo y pagás con tu manilla en cada puesto.' },
  { icono: 'sync', titulo: 'Devolución de saldo', descripcion: 'Lo que no gastes se devuelve después del evento.' },
  { icono: 'store', titulo: 'Puestos conectados', descripcion: 'Comida, bebida y más, todos cobrando con QPass.' },
];

/**
 * Paletas listas para la página del evento. Cada una ya pasa el contraste
 * mínimo entre textos y fondo (ver utils/contraste.js). Son DATOS del
 * evento (lo que eligió el organizador), no colores de la interfaz de QPass.
 */
export const PALETAS_LANDING = [
  { nombre: 'Noche cian', colorPrimario: '#00B4D8', colorBoton: '#FFFFFF', colorFondo: '#0B1120', colorTextoTitulo: '#FFFFFF', colorTextoP: '#94A3B8' },
  { nombre: 'Neón fiesta', colorPrimario: '#FF3CAC', colorBoton: '#FF3CAC', colorFondo: '#14041F', colorTextoTitulo: '#FFFFFF', colorTextoP: '#C9B6D9' },
  { nombre: 'Atardecer', colorPrimario: '#FF8A3D', colorBoton: '#FFD166', colorFondo: '#1F0F0A', colorTextoTitulo: '#FFF4E6', colorTextoP: '#D9B8A0' },
  { nombre: 'Bosque', colorPrimario: '#2ECC71', colorBoton: '#2ECC71', colorFondo: '#0B1A12', colorTextoTitulo: '#F0FFF4', colorTextoP: '#9CC5AE' },
  { nombre: 'Gala dorada', colorPrimario: '#D4AF37', colorBoton: '#D4AF37', colorFondo: '#0D0D0D', colorTextoTitulo: '#FFFFFF', colorTextoP: '#B3B3B3' },
  { nombre: 'Día claro', colorPrimario: '#1A2B6B', colorBoton: '#1A2B6B', colorFondo: '#F5F7FB', colorTextoTitulo: '#0A0E27', colorTextoP: '#5E6773' },
  { nombre: 'Carnaval', colorPrimario: '#FFC300', colorBoton: '#FFC300', colorFondo: '#1A0B2E', colorTextoTitulo: '#FFFFFF', colorTextoP: '#C7B8E0' },
  { nombre: 'Electrónica', colorPrimario: '#B6FF3B', colorBoton: '#B6FF3B', colorFondo: '#0A0A0A', colorTextoTitulo: '#FFFFFF', colorTextoP: '#A3A3A3' },
  { nombre: 'Océano', colorPrimario: '#38BDF8', colorBoton: '#38BDF8', colorFondo: '#06182B', colorTextoTitulo: '#E6F4FF', colorTextoP: '#9DB8D1' },
  { nombre: 'Lavanda', colorPrimario: '#A78BFA', colorBoton: '#A78BFA', colorFondo: '#120F24', colorTextoTitulo: '#F5F3FF', colorTextoP: '#B8B0D9' },
  { nombre: 'Rock', colorPrimario: '#EF4444', colorBoton: '#EF4444', colorFondo: '#0F0A0A', colorTextoTitulo: '#FFFFFF', colorTextoP: '#B5A8A8' },
  { nombre: 'Tropical', colorPrimario: '#FF6B6B', colorBoton: '#FFE66D', colorFondo: '#0F2A2A', colorTextoTitulo: '#F7FFF7', colorTextoP: '#A8D5C8' },
  { nombre: 'Rosa claro', colorPrimario: '#C2255C', colorBoton: '#C2255C', colorFondo: '#FFF5F8', colorTextoTitulo: '#3B0A1E', colorTextoP: '#7A4A5C' },
  { nombre: 'Arena', colorPrimario: '#9A4A08', colorBoton: '#9A4A08', colorFondo: '#FBF6EE', colorTextoTitulo: '#2A1A0A', colorTextoP: '#6B5744' },
];

// ---------------------------------------------------------------------------
// Ajuste de la imagen del encabezado (LandingConfig.imagenAjuste).
// Mismos rangos que valida el backend (landing-config.service.ts).
// ---------------------------------------------------------------------------
export const AJUSTE_IMAGEN_DEFECTO = { x: 50, y: 50, zoom: 100, oscurecer: 0, desenfoque: 0 };

export const RANGOS_AJUSTE_IMAGEN = {
  zoom: { min: 100, max: 200, paso: 5, unidad: '%' },
  oscurecer: { min: 0, max: 80, paso: 5, unidad: '%' },
  desenfoque: { min: 0, max: 8, paso: 1, unidad: 'px' },
};

/** Ajuste completo y dentro de rango (sirve para datos viejos o vacíos). */
export function normalizarAjusteImagen(ajuste) {
  const a = { ...AJUSTE_IMAGEN_DEFECTO, ...(ajuste || {}) };
  const acotar = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));
  return {
    x: acotar(a.x, 0, 100),
    y: acotar(a.y, 0, 100),
    zoom: acotar(a.zoom, 100, 200),
    oscurecer: acotar(a.oscurecer, 0, 80),
    desenfoque: acotar(a.desenfoque, 0, 8),
  };
}

export const esAjusteDefecto = (ajuste) => {
  const a = normalizarAjusteImagen(ajuste);
  return Object.keys(AJUSTE_IMAGEN_DEFECTO).every((k) => a[k] === AJUSTE_IMAGEN_DEFECTO[k]);
};

/**
 * Estilos de la foto del encabezado a partir del ajuste. Se usa igual en la
 * página pública y en la vista previa del editor, así se ven idénticas.
 *  - imagen: encuadre (punto focal), zoom centrado en ese punto y desenfoque.
 *  - velo:   capa del color de fondo encima, para oscurecer.
 * El desenfoque agranda un poco la imagen para que no se vea el borde borroso.
 */
export function estilosImagenHero(ajuste, colorFondo) {
  const a = normalizarAjusteImagen(ajuste);
  const escala = a.zoom / 100 + (a.desenfoque ? 0.04 : 0);
  return {
    imagen: {
      objectPosition: `${a.x}% ${a.y}%`,
      backgroundPosition: `${a.x}% ${a.y}%`,
      transformOrigin: `${a.x}% ${a.y}%`,
      transform: escala !== 1 ? `scale(${escala})` : undefined,
      filter: a.desenfoque ? `blur(${a.desenfoque}px)` : undefined,
    },
    velo: a.oscurecer
      ? { background: `color-mix(in srgb, ${colorFondo} ${a.oscurecer}%, transparent)` }
      : null,
  };
}
