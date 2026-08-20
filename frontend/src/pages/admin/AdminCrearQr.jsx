import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FaCalendarAlt, FaQrcode, FaBoxes, FaPlus, FaTrash, FaPrint
} from 'react-icons/fa';
import { leerEventos } from '../../data/eventosAdmin';
import { leerQrDelEvento, generarQr, vaciarQrDelEvento } from '../../data/codigosQr';
import './AdminCrearQr.css';

export default function AdminCrearQr() {
  const location = useLocation();
  const eventosDisponibles = useMemo(() => leerEventos(), []);

  const [eventoId, setEventoId] = useState(location.state?.eventoId || eventosDisponibles[0]?.id);
  const [qrDelEvento, setQrDelEvento] = useState(() => leerQrDelEvento(eventoId));
  const [cantidad, setCantidad] = useState('50');

  const eventoActual = eventosDisponibles.find(ev => ev.id === eventoId);

  const cambiarEvento = (nuevoId) => {
    setEventoId(nuevoId);
    setQrDelEvento(leerQrDelEvento(nuevoId));
  };

  const handleGenerar = (e) => {
    e.preventDefault();
    const n = Number(cantidad);
    if (!n || n < 1) return;
    setQrDelEvento(generarQr(eventoId, n));
  };

  const handleVaciar = () => {
    if (!window.confirm('¿Borrar todos los códigos QR generados para este evento?')) return;
    setQrDelEvento(vaciarQrDelEvento(eventoId));
  };

  return (
    <div className="pi-adqr-container">

      <div className="pi-adqr-header no-imprimir">
        <div>
          <h2><FaQrcode color="var(--indigo-profundo)" /> Generar Códigos QR</h2>
          <p>Genera una cantidad de códigos QR únicos para el evento y descárgalos en PDF (simulado, sin backend real).</p>
        </div>
        <div className="pi-adqr-selector-evento">
          <FaCalendarAlt />
          <select value={eventoId} onChange={(e) => cambiarEvento(e.target.value)}>
            {eventosDisponibles.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pi-adqr-kpi-grid no-imprimir">
        <div className="pi-adqr-kpi-card">
          <FaQrcode color="var(--indigo-profundo)" size={20} />
          <span className="numero">{qrDelEvento.codigos.length}</span>
          <span className="label">Códigos generados</span>
        </div>
      </div>

      <div className="pi-adqr-card no-imprimir">
        <h3 className="pi-adqr-subtitulo">Generar nuevos códigos</h3>
        <form onSubmit={handleGenerar} className="pi-adqr-form">
          <div className="pi-adqr-input-group">
            <label>Cantidad a generar</label>
            <div className="pi-adqr-input-wrapper">
              <FaBoxes className="pi-adqr-input-icon" />
              <input
                type="number"
                min="1"
                max="2000"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="Ej: 50"
                required
              />
            </div>
          </div>
          <button type="submit" className="pi-adqr-btn-add">
            <FaPlus /> Generar Códigos
          </button>
        </form>
      </div>

      <div className="pi-adqr-card">
        <div className="pi-adqr-card-header no-imprimir">
          <h3 className="pi-adqr-subtitulo">
            Códigos de {eventoActual?.nombre || 'este evento'}
          </h3>
          {qrDelEvento.codigos.length > 0 && (
            <div className="pi-adqr-acciones-lista">
              <button className="pi-adqr-btn-imprimir" onClick={() => window.print()}>
                <FaPrint /> Descargar PDF
              </button>
              <button className="pi-adqr-btn-vaciar" onClick={handleVaciar}>
                <FaTrash /> Vaciar
              </button>
            </div>
          )}
        </div>

        {qrDelEvento.codigos.length === 0 ? (
          <p className="pi-adqr-empty no-imprimir">Aún no se generaron códigos QR para este evento.</p>
        ) : (
          <div className="pi-adqr-grid">
            {qrDelEvento.codigos.map(qr => (
              <div key={qr.id} className="pi-adqr-tarjeta">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qr.codigo)}`}
                  alt={qr.codigo}
                />
                <span className="pi-adqr-codigo">{qr.codigo}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
