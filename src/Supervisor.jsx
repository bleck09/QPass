import { useMemo, useState } from 'react';
import {
  FaUsers, FaCheckCircle, FaHourglassHalf, FaQrcode, FaTimes,
  FaSearch, FaIdCard, FaTicketAlt, FaClock, FaUserCheck, FaExclamationTriangle
} from 'react-icons/fa';
import './Supervisor.css';

// --- DATOS SIMULADOS DEL EVENTO ---
const participantesIniciales = [
  { id: 1, nombre: 'María Fernanda Rojas', documento: '7451236 LP', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=47', estado: 'ingresado', horaIngreso: '08:12' },
  { id: 2, nombre: 'Jorge Luis Quispe', documento: '6621345 SC', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=12', estado: 'ingresado', horaIngreso: '08:20' },
  { id: 3, nombre: 'Ana Belén Castro', documento: '5589214 CB', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=32', estado: 'ingresado', horaIngreso: '08:35' },
  { id: 4, nombre: 'Ricardo Alanoca Mamani', documento: '4471258 LP', tipoEntrada: 'Staff', foto: 'https://i.pravatar.cc/300?img=51', estado: 'ingresado', horaIngreso: '08:41' },
  { id: 5, nombre: 'Daniela Vargas Soto', documento: '7789456 SC', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=25', estado: 'pendiente', horaIngreso: null },
  { id: 6, nombre: 'Sergio Fabián Choque', documento: '3312589 OR', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=15', estado: 'pendiente', horaIngreso: null },
  { id: 7, nombre: 'Paola Andrea Terrazas', documento: '6654123 CB', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=45', estado: 'pendiente', horaIngreso: null },
  { id: 8, nombre: 'Luis Fernando Mamani', documento: '5521478 LP', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=13', estado: 'pendiente', horaIngreso: null },
  { id: 9, nombre: 'Carla Ximena Flores', documento: '4498712 SC', tipoEntrada: 'Staff', foto: 'https://i.pravatar.cc/300?img=44', estado: 'pendiente', horaIngreso: null },
  { id: 10, nombre: 'Diego Armando Peñaranda', documento: '7712365 TJ', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=59', estado: 'pendiente', horaIngreso: null },
  { id: 11, nombre: 'Valeria Nicole Guzmán', documento: '3387654 LP', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=48', estado: 'pendiente', horaIngreso: null },
  { id: 12, nombre: 'Marco Antonio Villca', documento: '6698741 CB', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=14', estado: 'pendiente', horaIngreso: null },
];

const horaActual = () => new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

export default function Supervisor() {
  const [participantes, setParticipantes] = useState(participantesIniciales);
  const [tarjetaQR, setTarjetaQR] = useState(null); // participante mostrado en la tarjeta grande
  const [yaHabiaIngresado, setYaHabiaIngresado] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [filtro, setFiltro] = useState('todos'); // todos | pendiente | ingresado
  const [busqueda, setBusqueda] = useState('');

  const stats = useMemo(() => {
    const total = participantes.length;
    const ingresados = participantes.filter(p => p.estado === 'ingresado').length;
    const faltan = total - ingresados;
    const pctIngresados = total ? Math.round((ingresados / total) * 1000) / 10 : 0;
    const pctFaltan = total ? Math.round((faltan / total) * 1000) / 10 : 0;
    return { total, ingresados, faltan, pctIngresados, pctFaltan };
  }, [participantes]);

  const listaFiltrada = useMemo(() => {
    return participantes.filter(p => {
      const coincideFiltro = filtro === 'todos' || p.estado === filtro;
      const coincideBusqueda =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.documento.toLowerCase().includes(busqueda.toLowerCase());
      return coincideFiltro && coincideBusqueda;
    });
  }, [participantes, filtro, busqueda]);

  const abrirTarjeta = (participante) => {
    setYaHabiaIngresado(participante.estado === 'ingresado');
    setTarjetaQR(participante);
  };

  const handleSimularEscaneo = () => {
    const pendientes = participantes.filter(p => p.estado === 'pendiente');
    if (pendientes.length === 0) {
      setYaHabiaIngresado(false);
      setTarjetaQR({ todosIngresaron: true });
      return;
    }
    setEscaneando(true);
    setTimeout(() => {
      const elegido = pendientes[Math.floor(Math.random() * pendientes.length)];
      setEscaneando(false);
      abrirTarjeta(elegido);
    }, 700);
  };

  const confirmarIngreso = () => {
    if (!tarjetaQR || tarjetaQR.todosIngresaron) return;
    setParticipantes(prev => prev.map(p =>
      p.id === tarjetaQR.id ? { ...p, estado: 'ingresado', horaIngreso: horaActual() } : p
    ));
    setTarjetaQR(null);
  };

  const cerrarTarjeta = () => setTarjetaQR(null);

  return (
    <div className="pi-sup-container">

      <div className="pi-sup-header">
        <h2>Control de Ingreso al Evento</h2>
        <button className="pi-sup-btn-escanear" onClick={handleSimularEscaneo} disabled={escaneando}>
          <FaQrcode /> {escaneando ? 'Escaneando...' : 'Simular Escaneo QR'}
        </button>
      </div>

      {/* --- TARJETAS DE ESTADÍSTICAS --- */}
      <div className="pi-sup-stats-grid">
        <div className="pi-sup-stat-card">
          <div className="pi-sup-stat-icon pi-sup-icon-total"><FaUsers /></div>
          <div className="pi-sup-stat-info">
            <span className="pi-sup-stat-numero">{stats.total}</span>
            <span className="pi-sup-stat-label">Total de Participantes</span>
          </div>
        </div>

        <div className="pi-sup-stat-card">
          <div className="pi-sup-stat-icon pi-sup-icon-ok"><FaCheckCircle /></div>
          <div className="pi-sup-stat-info">
            <span className="pi-sup-stat-numero">{stats.ingresados}</span>
            <span className="pi-sup-stat-label">Ya Ingresaron</span>
          </div>
          <span className="pi-sup-stat-porcentaje pi-sup-badge-ok">{stats.pctIngresados}%</span>
        </div>

        <div className="pi-sup-stat-card">
          <div className="pi-sup-stat-icon pi-sup-icon-pend"><FaHourglassHalf /></div>
          <div className="pi-sup-stat-info">
            <span className="pi-sup-stat-numero">{stats.faltan}</span>
            <span className="pi-sup-stat-label">Faltan por Ingresar</span>
          </div>
          <span className="pi-sup-stat-porcentaje pi-sup-badge-pend">{stats.pctFaltan}%</span>
        </div>
      </div>

      {/* --- BARRA DE PROGRESO GENERAL --- */}
      <div className="pi-sup-progreso-card">
        <div className="pi-sup-progreso-header">
          <span>Progreso de Ingreso al Evento</span>
          <span className="pi-sup-progreso-pct">{stats.pctIngresados}%</span>
        </div>
        <div className="pi-sup-progreso-barra">
          <div className="pi-sup-progreso-relleno" style={{ width: `${stats.pctIngresados}%` }} />
        </div>
        <div className="pi-sup-progreso-footer">
          <span><FaUserCheck color="#16a34a" /> {stats.ingresados} ingresaron</span>
          <span><FaHourglassHalf color="#d97706" /> {stats.faltan} pendientes</span>
        </div>
      </div>

      {/* --- LISTADO DE PARTICIPANTES --- */}
      <div className="pi-sup-lista-card">
        <div className="pi-sup-lista-header">
          <h3>Listado de Participantes</h3>
          <div className="pi-sup-lista-controles">
            <div className="pi-sup-buscador">
              <FaSearch />
              <input
                type="text"
                placeholder="Buscar por nombre o documento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <div className="pi-sup-filtros">
              <button className={filtro === 'todos' ? 'activo' : ''} onClick={() => setFiltro('todos')}>Todos</button>
              <button className={filtro === 'ingresado' ? 'activo' : ''} onClick={() => setFiltro('ingresado')}>Ingresaron</button>
              <button className={filtro === 'pendiente' ? 'activo' : ''} onClick={() => setFiltro('pendiente')}>Pendientes</button>
            </div>
          </div>
        </div>

        <div className="pi-sup-tabla-wrapper">
          <table className="pi-sup-tabla">
            <thead>
              <tr>
                <th>Participante</th>
                <th>Documento</th>
                <th>Entrada</th>
                <th>Estado</th>
                <th>Hora</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="pi-sup-fila-persona">
                      <img src={p.foto} alt={p.nombre} className="pi-sup-mini-avatar" />
                      <span>{p.nombre}</span>
                    </div>
                  </td>
                  <td>{p.documento}</td>
                  <td>{p.tipoEntrada}</td>
                  <td>
                    {p.estado === 'ingresado'
                      ? <span className="pi-sup-badge pi-sup-badge-ok">Ingresó</span>
                      : <span className="pi-sup-badge pi-sup-badge-pend">Pendiente</span>}
                  </td>
                  <td>{p.horaIngreso || '—'}</td>
                  <td>
                    <button className="pi-sup-btn-ver" onClick={() => abrirTarjeta(p)}>
                      Ver tarjeta
                    </button>
                  </td>
                </tr>
              ))}
              {listaFiltrada.length === 0 && (
                <tr>
                  <td colSpan={6} className="pi-sup-sin-resultados">No se encontraron participantes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- TARJETA GRANDE AL ESCANEAR QR --- */}
      {tarjetaQR && (
        <div className="pi-sup-modal-overlay" onClick={cerrarTarjeta}>
          <div className="pi-sup-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <button className="pi-sup-btn-cerrar" onClick={cerrarTarjeta}><FaTimes /></button>

            {tarjetaQR.todosIngresaron ? (
              <div className="pi-sup-todos-ingresaron">
                <FaCheckCircle size={60} color="#16a34a" />
                <h3>¡Todos los participantes ya ingresaron!</h3>
                <p>No quedan personas pendientes por registrar.</p>
              </div>
            ) : (
              <>
                <div className={`pi-sup-tarjeta-estado ${yaHabiaIngresado ? 'aviso' : 'ok'}`}>
                  {yaHabiaIngresado
                    ? <><FaExclamationTriangle /> QR ya utilizado</>
                    : <><FaCheckCircle /> Código QR Válido</>}
                </div>

                <img src={tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-sup-tarjeta-foto" />
                <h2 className="pi-sup-tarjeta-nombre">{tarjetaQR.nombre}</h2>

                <div className="pi-sup-tarjeta-datos">
                  <div className="pi-sup-tarjeta-dato">
                    <FaIdCard />
                    <div>
                      <span className="label">Documento</span>
                      <span className="valor">{tarjetaQR.documento}</span>
                    </div>
                  </div>
                  <div className="pi-sup-tarjeta-dato">
                    <FaTicketAlt />
                    <div>
                      <span className="label">Tipo de Entrada</span>
                      <span className="valor">{tarjetaQR.tipoEntrada}</span>
                    </div>
                  </div>
                  <div className="pi-sup-tarjeta-dato">
                    <FaClock />
                    <div>
                      <span className="label">Hora de Ingreso</span>
                      <span className="valor">{tarjetaQR.horaIngreso || 'Aún no registrado'}</span>
                    </div>
                  </div>
                </div>

                <div className="pi-sup-tarjeta-acciones">
                  {yaHabiaIngresado ? (
                    <button className="pi-sup-btn-cancelar" onClick={cerrarTarjeta}>Cerrar</button>
                  ) : (
                    <>
                      <button className="pi-sup-btn-cancelar" onClick={cerrarTarjeta}>Cancelar</button>
                      <button className="pi-sup-btn-confirmar" onClick={confirmarIngreso}>
                        <FaCheckCircle /> Confirmar Ingreso
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
