import { useEffect, useMemo, useState } from 'react';
import {
  FaMapMarkerAlt, FaSearch, FaArrowLeft, FaLink, FaCheckCircle, FaQrcode, FaTimes,
  FaUsers, FaHourglassHalf
} from 'react-icons/fa';
import api from '../../api/index.js';
import { formatearFecha } from '../../utils/eventos.js';
import './GestionEntrega.css';

export default function GestionEntrega() {
  const [eventos, setEventos] = useState([]);

  const [eventoIdDetalle, setEventoIdDetalle] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [codigosDisponibles, setCodigosDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  const [participanteVinculando, setParticipanteVinculando] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [codigoEscaneado, setCodigoEscaneado] = useState(null);

  useEffect(() => { api.eventos.listar().then(setEventos); }, []);

  const eventoDetalle = eventos.find(ev => ev.id === eventoIdDetalle) || null;

  const refrescarEvento = (eventoId) => {
    api.entradas.listar({ eventoId }).then(setParticipantes);
    api.codigosQr.listar({ eventoId, disponibles: true }).then(setCodigosDisponibles);
  };

  const abrirEvento = (ev) => {
    setEventoIdDetalle(ev.id);
    refrescarEvento(ev.id);
    setBusqueda('');
  };

  const volverALista = () => {
    setEventoIdDetalle(null);
    setParticipantes([]);
  };

  const participantesFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase();
    return participantes.filter(p => p.nombre.toLowerCase().includes(termino));
  }, [participantes, busqueda]);

  const stats = useMemo(() => {
    const total = participantes.length;
    const entregados = participantes.filter(p => p.codigoQrVinculado).length;
    const faltan = total - entregados;
    return { total, entregados, faltan };
  }, [participantes]);

  const abrirVincular = (participante) => {
    setParticipanteVinculando(participante);
    setCodigoEscaneado(null);
  };

  const cerrarVincular = () => {
    setParticipanteVinculando(null);
    setCodigoEscaneado(null);
    setEscaneando(false);
  };

  const simularEscaneo = () => {
    if (codigosDisponibles.length === 0) return;
    setEscaneando(true);
    setTimeout(() => {
      const elegido = codigosDisponibles[Math.floor(Math.random() * codigosDisponibles.length)];
      setCodigoEscaneado(elegido);
      setEscaneando(false);
    }, 700);
  };

  const confirmarVinculo = async () => {
    if (!codigoEscaneado || !participanteVinculando) return;
    await api.entradas.vincularQr(participanteVinculando.id, codigoEscaneado.id);
    refrescarEvento(eventoIdDetalle);
    cerrarVincular();
  };

  return (
    <div className="pi-entrega-container">

      {eventoDetalle ? (
        <>
          <button className="pi-entrega-btn-volver" onClick={volverALista}>
            <FaArrowLeft /> Volver a Gestión de Entrega
          </button>

          <div className="pi-entrega-header">
            <h2>{eventoDetalle.nombre}</h2>
            <p>Busca a un participante y vincula su código QR de entrega.</p>
          </div>

          <div className="pi-entrega-stats-grid">
            <div className="pi-entrega-stat-card">
              <div className="pi-entrega-stat-icon pi-entrega-icon-total"><FaUsers /></div>
              <div className="pi-entrega-stat-info">
                <span className="numero">{stats.total}</span>
                <span className="label">Total Participantes</span>
              </div>
            </div>
            <div className="pi-entrega-stat-card">
              <div className="pi-entrega-stat-icon pi-entrega-icon-ok"><FaCheckCircle /></div>
              <div className="pi-entrega-stat-info">
                <span className="numero">{stats.entregados}</span>
                <span className="label">Ya se Entregó</span>
              </div>
            </div>
            <div className="pi-entrega-stat-card">
              <div className="pi-entrega-stat-icon pi-entrega-icon-pend"><FaHourglassHalf /></div>
              <div className="pi-entrega-stat-info">
                <span className="numero">{stats.faltan}</span>
                <span className="label">Falta Entregar</span>
              </div>
            </div>
          </div>

          <div className="pi-entrega-buscador">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar participante por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="pi-entrega-tabla-wrapper">
            <table className="pi-entrega-tabla">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Tipo de Entrada</th>
                  <th>Correo</th>
                  <th>Vínculo QR</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {participantesFiltrados.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="pi-entrega-fila-persona">
                        {p.foto && <img src={p.foto} alt={p.nombre} className="pi-entrega-mini-avatar" />}
                        <span>{p.nombre}</span>
                      </div>
                    </td>
                    <td>{p.categoriaTicket?.nombre || '—'}</td>
                    <td>{p.correo}</td>
                    <td>
                      {p.codigoQrVinculado
                        ? <span className="pi-entrega-badge pi-entrega-badge-ok"><FaCheckCircle /> {p.codigoQrVinculado.codigo}</span>
                        : <span className="pi-entrega-badge pi-entrega-badge-pend">Sin vincular</span>}
                    </td>
                    <td>
                      <button className="pi-entrega-btn-vincular" onClick={() => abrirVincular(p)}>
                        <FaLink /> {p.codigoQrVinculado ? 'Cambiar' : 'Vincular'}
                      </button>
                    </td>
                  </tr>
                ))}
                {participantesFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="pi-entrega-sin-resultados">No se encontraron participantes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="pi-entrega-header">
            <h2>Gestión de Entrega</h2>
            <p>Selecciona un evento para buscar participantes y vincular sus códigos QR.</p>
          </div>

          <div className="pi-entrega-eventos-grid">
            {eventos.map(ev => (
              <button key={ev.id} className="pi-entrega-evento-card" onClick={() => abrirEvento(ev)}>
                <img src={ev.imagen} alt={ev.nombre} className="pi-entrega-evento-imagen" />
                <div className="pi-entrega-evento-info">
                  <strong>{ev.nombre}</strong>
                  <span><FaMapMarkerAlt /> {ev.lugar} · {formatearFecha(ev.fecha)}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* MODAL: VINCULAR CÓDIGO QR */}
      {participanteVinculando && (
        <div className="pi-entrega-modal-overlay" onClick={cerrarVincular}>
          <div className="pi-entrega-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pi-entrega-modal-header">
              <h3><FaQrcode color="var(--indigo-profundo)" /> Vincular QR: {participanteVinculando.nombre}</h3>
              <button className="pi-entrega-btn-cerrar-modal" onClick={cerrarVincular}>
                <FaTimes />
              </button>
            </div>

            <div className="pi-entrega-modal-body">
              <div className="pi-entrega-camara-simulada">
                <FaQrcode size={56} />
                <span>
                  {escaneando ? 'Escaneando...' : codigoEscaneado ? 'Código detectado' : 'Apunta la cámara al código QR'}
                </span>
              </div>

              {codigoEscaneado ? (
                <div className="pi-entrega-codigo-detectado">
                  <FaCheckCircle color="var(--verde-recarga-texto)" />
                  <span>{codigoEscaneado.codigo}</span>
                </div>
              ) : (
                <button
                  className="pi-entrega-btn-escanear"
                  onClick={simularEscaneo}
                  disabled={escaneando || codigosDisponibles.length === 0}
                >
                  <FaQrcode /> {escaneando ? 'Escaneando...' : 'Escanear Código QR'}
                </button>
              )}

              {codigosDisponibles.length === 0 && !codigoEscaneado && (
                <p className="pi-entrega-aviso">
                  No hay códigos QR sin vincular para este evento. Pídele al Admin que genere más desde "Generar QR".
                </p>
              )}

              <div className="pi-entrega-modal-acciones">
                <button className="pi-entrega-btn-cancelar" onClick={cerrarVincular}>Cancelar</button>
                <button className="pi-entrega-btn-confirmar" onClick={confirmarVinculo} disabled={!codigoEscaneado}>
                  <FaLink /> Vincular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
