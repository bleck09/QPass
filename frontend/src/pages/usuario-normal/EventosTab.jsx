import { useNavigate } from 'react-router-dom';
import { FaHistory, FaCoins, FaCalendarTimes } from 'react-icons/fa';
import EventosDestacados from '../../components/EventosDestacados.jsx';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import Insignia from '../../components/Insignia.jsx';
import Card from '../../components/Card.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import { imagenEvento } from '../../utils/eventos.js';
import './EventosTab.css';

/** Pestaña "Eventos": cartelera para elegir a qué evento comprar + eventos pasados. */
export default function EventosTab({
  proximosEventos, eventosPasados, cargandoEventos, errorEventos, recargarEventos, saldoPorEvento,
}) {
  const navigate = useNavigate();

  return (
    <div className="pi-usr-eventos">
      {errorEventos ? (
        <Card>
          <EstadoError onReintentar={recargarEventos} titulo="No se pudo cargar la cartelera" />
        </Card>
      ) : cargandoEventos ? (
        <Card>
          <EstadoCarga filas={3} etiqueta="Cargando cartelera…" />
        </Card>
      ) : proximosEventos.length === 0 ? (
        // Sin eventos la cartelera no dibuja nada: antes quedaba un panel oscuro vacío.
        <Card>
          <EstadoVacio
            icono={FaCalendarTimes}
            titulo="No hay eventos en cartelera por ahora"
            mensaje="Cuando se publique un evento nuevo lo vas a ver acá para comprar tus entradas."
          />
        </Card>
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
        <Card as="section" className="pi-evp">
          <h3 className="pi-evp-titulo">
            <FaHistory aria-hidden="true" /> Eventos pasados
            <Insignia tono="neutro">{eventosPasados.length}</Insignia>
          </h3>
          {/* Tarjetas de evento: SIEMPRE EventoCard + GrillaEventos (§6). Si te
              quedó saldo ahí, la tarjeta lleva a retirarlo; si no, al evento. */}
          <GrillaEventos eventos={eventosPasados} gridClassName="pi-evp-grid">
            {(ev) => {
              const saldoAhi = saldoPorEvento.get(ev.id);
              return (
                <EventoCard
                  key={ev.id}
                  evento={{ ...ev, imagen: imagenEvento(ev) }}
                  estado={false}
                  badges={<Insignia tono="neutro" solida>Realizado</Insignia>}
                  meta={saldoAhi > 0 ? <><FaCoins aria-hidden="true" /> Te quedan {saldoAhi} pts</> : null}
                  cta={saldoAhi > 0 ? 'Retirar saldo' : 'Ver evento'}
                  onClick={() => navigate(saldoAhi > 0 ? '/usuarionormal/saldo' : `/evento/${ev.id}`)}
                />
              );
            }}
          </GrillaEventos>
        </Card>
      )}
    </div>
  );
}
