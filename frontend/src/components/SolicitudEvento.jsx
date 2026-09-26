import {
  FaCalendarAlt, FaMapMarkerAlt, FaUsers, FaClock, FaListUl, FaImage, FaEye,
  FaPaperPlane, FaSearch, FaPen, FaCheck, FaTimes, FaGlobeAmericas, FaPalette,
} from 'react-icons/fa';
import { Panel } from './Tablero.jsx';
import FotoZoom from './FotoZoom.jsx';
import { EstadoVacio } from './EstadosAsync.jsx';
import VistaPreviaPagina from '../pages/admin/VistaPreviaPagina.jsx';
import { formatearFecha } from '../utils/eventos.js';
import {
  duracionEvento, haceCuanto, filasCronograma, filasActividades, configPreviaDe,
} from '../constants/solicitudesEvento.js';
import './SolicitudEvento.css';

/*
  Piezas para MOSTRAR una solicitud de evento (no para editarla). Las usan
  la revisión de Admin (AdminSolicitudesEvento) y el detalle del cliente
  (Cliente.jsx), así los dos ven la propuesta exactamente igual.

  Todas van dentro de un <Tablero> (son <Panel>): span = columnas.
*/

/* ---------- Seguimiento de la aprobación ----------
  Enviada -> En revisión (o Cambios pedidos) -> Aprobada (o Rechazada) -> Publicada
  Cada paso: 'hecho' | 'actual' | 'atencion' (el cliente tiene que hacer algo)
  | 'error' | 'pendiente'. compacto: sin descripciones (tarjetas de la lista). */
function pasosDe(s) {
  const publicado = s.evento?.publicadoEn;
  const pasos = [
    { id: 'enviada', icono: FaPaperPlane, titulo: 'Enviada', estado: 'hecho', detalle: formatearFecha(s.createdAt, false) },
  ];
  if (s.estado === 'cambios_solicitados') {
    pasos.push({ id: 'revision', icono: FaPen, titulo: 'Te pidieron cambios', estado: 'atencion', detalle: 'Corregila y reenviala' });
  } else {
    pasos.push({
      id: 'revision', icono: FaSearch, titulo: 'En revisión',
      estado: s.estado === 'pendiente' ? 'actual' : 'hecho',
      detalle: s.estado === 'pendiente'
        ? (s.reenviadaEn ? `Reenviada ${haceCuanto(s.reenviadaEn)}` : 'El Administrador la está revisando')
        : 'Revisada',
    });
  }
  if (s.estado === 'rechazado') {
    pasos.push({ id: 'decision', icono: FaTimes, titulo: 'Rechazada', estado: 'error', detalle: s.resueltoEn ? formatearFecha(s.resueltoEn, false) : '' });
    return pasos;
  }
  pasos.push({
    id: 'decision', icono: FaCheck, titulo: 'Aprobada',
    estado: s.estado === 'aprobado' ? 'hecho' : 'pendiente',
    detalle: s.estado === 'aprobado' && s.resueltoEn ? formatearFecha(s.resueltoEn, false) : 'Se crea tu evento',
  });
  pasos.push({
    id: 'publicada', icono: FaGlobeAmericas, titulo: 'Evento publicado',
    estado: publicado ? 'hecho' : s.estado === 'aprobado' ? 'actual' : 'pendiente',
    detalle: publicado ? formatearFecha(publicado, false) : s.estado === 'aprobado' ? 'Preparando la venta de entradas' : 'Página y entradas a la venta',
  });
  return pasos;
}

export function SeguimientoSolicitud({ solicitud, compacto = false }) {
  const pasos = pasosDe(solicitud);
  return (
    <ol className={`qp-seguimiento${compacto ? ' qp-seguimiento--compacto' : ''}`} aria-label="Seguimiento de la solicitud">
      {pasos.map((p) => {
        const Icono = p.icono;
        return (
          <li key={p.id} className={`qp-seguimiento__paso qp-seguimiento__paso--${p.estado}`} aria-current={p.estado === 'actual' || p.estado === 'atencion' ? 'step' : undefined}>
            <span className="qp-seguimiento__marca" aria-hidden="true"><Icono /></span>
            <span className="qp-seguimiento__txt">
              <strong>{p.titulo}</strong>
              {!compacto && p.detalle && <span>{p.detalle}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Paneles de la propuesta ---------- */

export function PanelPropuesta({ solicitud: s, span = 8 }) {
  return (
    <Panel span={span} icono={FaCalendarAlt} titulo="La propuesta">
      <dl className="qp-sol-datos">
        <div><dt><FaCalendarAlt aria-hidden="true" /> Empieza</dt><dd>{formatearFecha(s.fecha)}</dd></div>
        <div><dt><FaClock aria-hidden="true" /> Termina</dt><dd>{formatearFecha(s.fechaFin)}</dd><dd className="qp-sol-datos__extra">dura {duracionEvento(s.fecha, s.fechaFin)}</dd></div>
        <div><dt><FaMapMarkerAlt aria-hidden="true" /> Lugar</dt><dd>{s.lugar}</dd></div>
        <div><dt><FaUsers aria-hidden="true" /> Asistentes estimados</dt><dd>{s.aforoEstimado ? s.aforoEstimado.toLocaleString('es-BO') : <span className="qp-sol-datos__extra">sin indicar</span>}</dd></div>
      </dl>
      <div className="qp-sol-bloque">
        <h4>Descripción</h4>
        <p className="qp-sol-descripcion">{s.descripcion || 'Sin descripción.'}</p>
      </div>
      <div className="qp-sol-imagenes">
        <figure>
          <figcaption><FaImage aria-hidden="true" /> Portada</figcaption>
          {s.imagenPortada
            ? <FotoZoom src={s.imagenPortada} alt={`Portada de ${s.nombreEvento}`} className="qp-sol-img" />
            : <div className="qp-sol-img qp-sol-img--vacia">Sin portada</div>}
        </figure>
        <figure>
          <figcaption><FaMapMarkerAlt aria-hidden="true" /> Mapa del lugar</figcaption>
          {s.mapaLugar
            ? <FotoZoom src={s.mapaLugar} alt={`Mapa del lugar de ${s.nombreEvento}`} className="qp-sol-img" />
            : <div className="qp-sol-img qp-sol-img--vacia">Sin mapa (opcional)</div>}
        </figure>
      </div>
    </Panel>
  );
}

export function PanelCronograma({ solicitud, span = 4 }) {
  const filas = filasCronograma(solicitud);
  return (
    <Panel span={span} icono={FaClock} titulo="Cronograma">
      {filas.length === 0 ? (
        <EstadoVacio compacto icono={FaClock} titulo="Sin cronograma." />
      ) : (
        <ol className="qp-sol-cronograma">
          {filas.map((c, i) => <li key={i}><time>{c.hora || '—'}</time><span>{c.actividad}</span></li>)}
        </ol>
      )}
    </Panel>
  );
}

export function PanelActividades({ solicitud, span = 4 }) {
  const filas = filasActividades(solicitud);
  return (
    <Panel span={span} icono={FaListUl} titulo="Actividades">
      {filas.length === 0 ? (
        <EstadoVacio compacto icono={FaListUl} titulo="Sin actividades." />
      ) : (
        <ul className="qp-sol-actividades">
          {filas.map((a, i) => <li key={i}><strong>{a.titulo}</strong>{a.descripcion && <p>{a.descripcion}</p>}</li>)}
        </ul>
      )}
    </Panel>
  );
}

const COLORES = [
  { campo: 'colorPrimario', etiqueta: 'Principal' },
  { campo: 'colorBoton', etiqueta: 'Texto del botón' },
  { campo: 'colorFondo', etiqueta: 'Fondo' },
  { campo: 'colorTextoTitulo', etiqueta: 'Título' },
  { campo: 'colorTextoP', etiqueta: 'Párrafos' },
];

export function PanelColores({ solicitud, span = 4 }) {
  return (
    <Panel span={span} icono={FaPalette} titulo="Colores de la página">
      <ul className="qp-sol-colores">
        {COLORES.map(({ campo, etiqueta }) => (
          <li key={campo}>
            <span className="qp-sol-colores__muestra" style={{ background: solicitud[campo] }} aria-hidden="true" />
            <span>{etiqueta}</span>
            <code>{String(solicitud[campo] || '').toUpperCase()}</code>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function PanelVistaPrevia({ solicitud: s, subtitulo }) {
  return (
    <Panel span={12} icono={FaEye} titulo="Así se vería la página del evento" subtitulo={subtitulo}>
      <div className="qp-sol-previa">
        <VistaPreviaPagina config={configPreviaDe(s)} evento={{ nombre: s.nombreEvento, lugar: s.lugar, fecha: s.fecha }} />
      </div>
    </Panel>
  );
}
