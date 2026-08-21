import { useEffect, useMemo, useState } from 'react';
import {
  FaMapMarkerAlt, FaSearch, FaArrowLeft, FaLink, FaCheckCircle, FaQrcode, FaTimes,
  FaUsers, FaHourglassHalf, FaExclamationTriangle
} from 'react-icons/fa';
import api from '../../api/index.js';
import { formatearFecha } from '../../utils/eventos.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import './GestionEntrega.css';

export default function GestionEntrega() {
  const [eventos, setEventos] = useState([]);

  const [eventoIdDetalle, setEventoIdDetalle] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  const [participanteVinculando, setParticipanteVinculando] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [codigoValidado, setCodigoValidado] = useState(null);
  const [errorCodigo, setErrorCodigo] = useState('');
  const [validando, setValidando] = useState(false);

  useEffect(() => { api.eventos.listar().then(setEventos); }, []);

  const eventoDetalle = eventos.find(ev => ev.id === eventoIdDetalle) || null;

  // Solo aparecen aquí las compras ya aprobadas por Admin (el backend ya filtra las
  // pendientes/rechazadas): no tiene sentido entregarle manilla a alguien sin entrada confirmada.
  const refrescarEvento = (eventoId) => {
    api.entradas.listar({ eventoId }).then(setParticipantes);
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
    setCodigoValidado(null);
    setErrorCodigo('');
    setEscaneando(false);
  };

  const cerrarVincular = () => {
    setParticipanteVinculando(null);
    setCodigoValidado(null);
    setErrorCodigo('');
    setEscaneando(false);
  };

  // Al detectar un código con la cámara, primero se le pregunta a la base si existe, si es de
  // este evento y si ya está tomado — recién si pasa todo eso se ofrece confirmar el vínculo.
  const handleCodigoDetectado = async (codigo) => {
    setEscaneando(false);
    setValidando(true);
    setErrorCodigo('');
    try {
      const codigoQr = await api.codigosQr.buscarPorCodigo(codigo);
      if (codigoQr.eventoId !== eventoIdDetalle) {
        setErrorCodigo('Este código no pertenece a este evento.');
      } else if (codigoQr.anulado) {
        setErrorCodigo('Este código fue anulado y ya no se puede usar.');
      } else if (codigoQr.entradaId) {
        setErrorCodigo('Este código ya está vinculado a otra persona.');
      } else {
        setCodigoValidado(codigoQr);
      }
    } catch (err) {
      setErrorCodigo(err.message);
    } finally {
      setValidando(false);
    }
  };

  const confirmarVinculo = async () => {
    if (!codigoValidado || !participanteVinculando) return;
    await api.entradas.vincularQr(participanteVinculando.id, codigoValidado.id);
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
              {escaneando ? (
                <EscanerQr onDetectado={handleCodigoDetectado} onCancelar={() => setEscaneando(false)} />
              ) : validando ? (
                <div className="pi-entrega-camara-simulada">
                  <FaQrcode size={56} />
                  <span>Verificando código...</span>
                </div>
              ) : codigoValidado ? (
                <div className="pi-entrega-codigo-detectado">
                  <FaCheckCircle color="var(--verde-recarga-texto)" />
                  <span>Código <strong>{codigoValidado.codigo}</strong> listo para vincular a <strong>{participanteVinculando.nombre}</strong></span>
                </div>
              ) : (
                <div className="pi-entrega-camara-simulada">
                  <FaQrcode size={56} />
                  <span>Apunta la cámara al código QR de la manilla</span>
                </div>
              )}

              {errorCodigo && (
                <p className="pi-entrega-aviso pi-entrega-aviso-error">
                  <FaExclamationTriangle /> {errorCodigo}
                </p>
              )}

              {!escaneando && !codigoValidado && (
                <button
                  className="pi-entrega-btn-escanear"
                  onClick={() => { setErrorCodigo(''); setEscaneando(true); }}
                  disabled={validando}
                >
                  <FaQrcode /> {errorCodigo ? 'Escanear otro código' : 'Escanear Código QR'}
                </button>
              )}

              <div className="pi-entrega-modal-acciones">
                <button className="pi-entrega-btn-cancelar" onClick={cerrarVincular}>Cancelar</button>
                <button className="pi-entrega-btn-confirmar" onClick={confirmarVinculo} disabled={!codigoValidado}>
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
