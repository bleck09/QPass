import { useNavigate } from 'react-router-dom';
import { FaHistory, FaCoins, FaMapMarkerAlt, FaCalendarAlt, FaCalendarTimes, FaArrowRight } from 'react-icons/fa';
import EventosDestacados from '../../components/EventosDestacados.jsx';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import Insignia from '../../components/Insignia.jsx';
import Boton from '../../components/Boton.jsx';
import { formatearFecha, imagenEvento } from '../../utils/eventos.js';
import './EventosTab.css';

/** Pestaña "Eventos": cartelera para elegir a qué evento comprar + eventos pasados. */
export default function EventosTab({
  proximosEventos, eventosPasados, cargandoEventos, errorEventos, recargarEventos, saldoPorEvento,
}) {
  const navigate = useNavigate();

  return (
    <div className="pi-usr-eventos">
      {errorEventos ? (
        <div className="pi-usr-card">
          <EstadoError onReintentar={recargarEventos} titulo="No se pudo cargar la cartelera" />
        </div>
      ) : cargandoEventos ? (
        <div className="pi-usr-card">
          <EstadoCarga filas={3} etiqueta="Cargando cartelera…" />
        </div>
      ) : proximosEventos.length === 0 ? (
        // Sin eventos la cartelera no dibuja nada: antes quedaba un panel oscuro vacío.
        <div className="pi-usr-card">
          <EstadoVacio
            icono={FaCalendarTimes}
            titulo="No hay eventos en cartelera por ahora"
            mensaje="Cuando se publique un evento nuevo lo vas a ver acá para comprar tus entradas."
          />
        </div>
      ) : (
        <div className="pi-usr-eventos-panel">
          <EventosDestacados
            id="cartelera-usuario"
            compacto
            eventos={proximosEventos}
            saldoPorEvento={saldoPorEvento}
            textoCta="Comprar entradas"
            onVerEvento={(evento) => navigate('/usuarionormal/comprar', { state: { evento } })}
          />
        </div>
      )}

      {eventosPasados.length > 0 && (
        <section className="pi-usr-card pi-evp">
          <h3 className="pi-evp-titulo">
            <FaHistory aria-hidden="true" /> Eventos pasados
            <Insignia tono="neutro">{eventosPasados.length}</Insignia>
          </h3>
          <ul className="pi-evp-grid">
            {eventosPasados.map((ev, i) => {
              const saldoAhi = saldoPorEvento.get(ev.id);
              return (
                <li key={ev.id} className="pi-evp-card" style={{ '--i': i }}>
                  <div className="pi-evp-img">
                    <img src={imagenEvento(ev)} alt="" width="320" height="140" loading="lazy" />
                    <Insignia tono="neutro" solida className="pi-evp-estado">Realizado</Insignia>
                  </div>
                  <div className="pi-evp-info">
                    <strong>{ev.nombre}</strong>
                    <span><FaMapMarkerAlt aria-hidden="true" /> {ev.lugar}</span>
                    <span><FaCalendarAlt aria-hidden="true" /> {formatearFecha(ev.fecha)}</span>
                    {saldoAhi > 0 && (
                      <div className="pi-evp-saldo">
                        <Insignia tono="warn" icono={FaCoins}>Te quedan {saldoAhi} pts</Insignia>
                        <Boton variante="fantasma" tamano="sm" iconoDerecha={FaArrowRight} onClick={() => navigate('/usuarionormal/saldo')}>
                          Retirar
                        </Boton>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
