import {
  FaQrcode, FaCalendarAlt, FaMapMarkerAlt, FaMobileAlt, FaClock, FaArrowRight,
} from 'react-icons/fa';
import { iconoActividad, estilosImagenHero } from '../../constants/landingEvento.js';
import './VistaPreviaPagina.css';

const fechaCorta = (iso) => iso
  ? new Date(iso).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' })
  : null;

/**
 * Maqueta en vivo de la página pública del evento (publico/App.jsx) para el
 * editor de Admin. No es la página real: reproduce su estructura (hero con
 * foto, datos, cronograma y actividades) con los colores y textos que se
 * están editando, para ver el resultado sin guardar.
 *
 * `resaltar`: sección que se está editando ('colores' | 'textos' |
 * 'actividades' | 'cronograma'); esa zona de la maqueta se marca.
 * Se adapta sola al ancho (container queries), así el modo "celular" es
 * simplemente un marco más angosto.
 */
export default function VistaPreviaPagina({ config, evento, resaltar }) {
  const imagen = config.imagen || evento?.imagen;
  const cuando = fechaCorta(evento?.fecha);
  const marca = (seccion) => (resaltar === seccion ? ' es-resaltada' : '');
  // Mismo cálculo que la página pública: encuadre, zoom, desenfoque y oscurecido.
  const estilosHero = estilosImagenHero(config.imagenAjuste, config.colorFondo);

  return (
    <div
      className={`pi-prev${marca('colores')}`}
      style={{
        '--p-primario': config.colorPrimario,
        '--p-boton': config.colorBoton,
        '--p-fondo': config.colorFondo,
        '--p-titulo': config.colorTextoTitulo,
        '--p-texto': config.colorTextoP,
      }}
    >
      <div className="pi-prev__nav">
        <span className="pi-prev__logo"><FaQrcode aria-hidden="true" /> QPass</span>
        <span className="pi-prev__links" aria-hidden="true"><i /><i /><i /></span>
        <span className="pi-prev__btn pi-prev__btn--chico">Comprar entrada</span>
      </div>

      <div className="pi-prev__hero">
        {imagen && (
          <div className="pi-prev__hero-foto">
            <img className="pi-prev__hero-img" src={imagen} alt="" width="800" height="450" style={estilosHero.imagen} />
          </div>
        )}
        {estilosHero.velo && <div className="pi-prev__hero-oscurecer" style={estilosHero.velo} />}
        <div className="pi-prev__hero-velo" />

        <div className={`pi-prev__hero-txt${marca('textos')}`}>
          <span className="pi-prev__estado"><i /> Próximo</span>
          <strong className="pi-prev__titulo">{evento?.nombre || 'Nombre del evento'}</strong>
          <p className={`pi-prev__info${config.informacion ? '' : ' vacio'}`}>
            {config.informacion || 'Acá va la descripción del evento: escribila en "Textos e imagen".'}
          </p>
          <ul className="pi-prev__datos">
            {cuando && <li><FaCalendarAlt aria-hidden="true" /> {cuando}</li>}
            {evento?.lugar && <li><FaMapMarkerAlt aria-hidden="true" /> {evento.lugar}</li>}
            <li>
              {evento?.tipoManilla === 'digital' ? <FaMobileAlt aria-hidden="true" /> : <FaQrcode aria-hidden="true" />}
              {evento?.tipoManilla === 'digital' ? ' QR en el celular' : ' Manilla física'}
            </li>
          </ul>
          <span className="pi-prev__btn">Comprar entradas <FaArrowRight aria-hidden="true" /></span>
        </div>

        <div className={`pi-prev__crono${marca('cronograma')}${config.cronograma.length === 0 ? ' pi-prev__crono--oculto' : ''}`}>
          <span className="pi-prev__panel-tit"><FaClock aria-hidden="true" /> Cronograma</span>
          {config.cronograma.length === 0 ? (
            <span className="pi-prev__vacio">Vacío: este bloque no se muestra en la página.</span>
          ) : (
            <ol>
              {config.cronograma.slice(0, 4).map((item, i) => (
                <li key={i}>
                  <b>{item.hora || '--:--'}</b>
                  <span>{item.actividad || '…'}</span>
                </li>
              ))}
            </ol>
          )}
          {config.cronograma.length > 4 && (
            <span className="pi-prev__mas">+{config.cronograma.length - 4} más</span>
          )}
        </div>
      </div>

      <div className={`pi-prev__seccion${marca('actividades')}`}>
        <strong className="pi-prev__seccion-tit">Servicios del evento</strong>
        {config.actividades.length === 0 ? (
          <span className="pi-prev__vacio">Vacío: en la página se muestran las 4 actividades por defecto de QPass.</span>
        ) : (
          <div className="pi-prev__actividades">
            {config.actividades.map((act, i) => {
              const Icono = iconoActividad(act.icono);
              return (
                <div key={i} className="pi-prev__actividad">
                  <span className="pi-prev__actividad-ic"><Icono aria-hidden="true" /></span>
                  <b>{act.titulo || 'Título'}</b>
                  <span>{act.descripcion || 'Descripción'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
