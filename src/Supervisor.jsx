import { useMemo, useState } from 'react';
import {
  FaUsers, FaCheckCircle, FaQrcode, FaTimes,
  FaSearch, FaIdCard, FaTicketAlt,  FaUserCheck, FaExclamationTriangle,
  FaSignOutAlt, FaCamera, FaHistory, FaSignInAlt, FaUserSecret, FaSyncAlt
} from 'react-icons/fa';
import './Supervisor.css';

// --- DATOS SIMULADOS DEL EVENTO ---
const participantesIniciales = [
  // 1. Caso Normal: Adentro y con foto
  { id: 1, nombre: 'María Fernanda Rojas', documento: '7451236 LP', tipoEntrada: 'VIP', fotoPerfil: 'https://i.pravatar.cc/300?img=47', fotoIngreso: 'https://i.pravatar.cc/300?img=47', estado: 'ingresado', historial: [{ tipo: 'Entrada', hora: '08:12' }] },
  // 2. Caso Salida: Afuera temporalmente
  { id: 2, nombre: 'Jorge Luis Quispe', documento: '6621345 SC', tipoEntrada: 'General', fotoPerfil: 'https://i.pravatar.cc/300?img=12', fotoIngreso: 'https://i.pravatar.cc/300?img=12', estado: 'salio', historial: [{ tipo: 'Entrada', hora: '08:20' }, { tipo: 'Salida', hora: '10:15' }] },
  // 3. Caso Excepción: Adentro pero OMITIÓ la foto al entrar
  { id: 3, nombre: 'Ana Belén Castro', documento: '5589214 CB', tipoEntrada: 'General', fotoPerfil: 'https://i.pravatar.cc/300?img=32', fotoIngreso: null, estado: 'ingresado', historial: [{ tipo: 'Entrada (Sin Foto)', hora: '08:35' }] },
  // 4. Casos Pendientes: Nunca han entrado
  { id: 4, nombre: 'Sergio Fabián Choque', documento: '3312589 OR', tipoEntrada: 'General', fotoPerfil: 'https://i.pravatar.cc/300?img=15', fotoIngreso: null, estado: 'pendiente', historial: [] },
  { id: 5, nombre: 'Daniela Vargas Soto', documento: '7789456 SC', tipoEntrada: 'VIP', fotoPerfil: 'https://i.pravatar.cc/300?img=25', fotoIngreso: null, estado: 'pendiente', historial: [] },
];

const horaActual = () => new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

export default function Supervisor() {
  const [participantes, setParticipantes] = useState(participantesIniciales);
  
  const [tarjetaQR, setTarjetaQR] = useState(null); 
  const [fotoCapturadaTemporal, setFotoCapturadaTemporal] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  
  const [filtro, setFiltro] = useState('todos'); 
  const [busqueda, setBusqueda] = useState('');
  const [alertaToggle, setAlertaToggle] = useState(''); // Mensaje de error interno del modal

  const stats = useMemo(() => {
    const total = participantes.length;
    const adentro = participantes.filter(p => p.estado === 'ingresado').length;
    const afuera = participantes.filter(p => p.estado === 'salio').length;
    const pendientes = participantes.filter(p => p.estado === 'pendiente').length;
    const pctAdentro = total ? Math.round((adentro / total) * 1000) / 10 : 0;
    return { total, adentro, afuera, pendientes, pctAdentro };
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

  // ========================================================
  // LÓGICA DE ESCANEO GENERAL
  // ========================================================
  const simularEscaneoGeneral = () => {
    setEscaneando(true);
    setTimeout(() => {
      // Tomamos alguien al azar para simular
      const elegido = participantes[Math.floor(Math.random() * participantes.length)];
      setEscaneando(false);
      setFotoCapturadaTemporal(null);
      setAlertaToggle('');
      setTarjetaQR(elegido);
    }, 700);
  };

  // Botones específicos para tu demostración al Ingeniero
  const abrirModalEspecifico = (idRequerido) => {
    const elegido = participantes.find(p => p.id === idRequerido);
    setFotoCapturadaTemporal(null);
    setAlertaToggle('');
    setTarjetaQR(elegido);
  };

  // ========================================================
  // FUNCIONES DE CÁMARA
  // ========================================================
  const tomarFotoPuerta = () => {
    setFotoCapturadaTemporal('https://images.unsplash.com/photo-1511367461989-f85a21fda167?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80');
    setAlertaToggle('');
  };

  const descartarFoto = () => setFotoCapturadaTemporal(null);

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setFotoCapturadaTemporal(null);
    setAlertaToggle('');
  };

  // ========================================================
  // CAMBIO DE ESTADOS (TOGGLE Y PRIMER INGRESO)
  // ========================================================
  
  // 1. Para cuando es "Pendiente" (Primer ingreso)
  const registrarPrimerIngreso = (omitirFoto = false) => {
    if (!omitirFoto && !fotoCapturadaTemporal) return; // Validación de seguridad

    const nuevaHora = horaActual();
    const tipoMov = omitirFoto ? 'Entrada (Sin foto)' : 'Entrada';
    const nuevoHistorial = [{ tipo: tipoMov, hora: nuevaHora }];

    const actualizado = {
      ...tarjetaQR,
      estado: 'ingresado',
      historial: nuevoHistorial,
      fotoIngreso: omitirFoto ? null : fotoCapturadaTemporal
    };

    setTarjetaQR(actualizado);
    setParticipantes(prev => prev.map(p => p.id === actualizado.id ? actualizado : p));
  };

  // 2. Para cuando ya entró alguna vez (Interruptor Adentro/Afuera)
  const cambiarEstadoToggle = (nuevoEstado) => {
    // Regla de Negocio: Si quiere salir ('salio') pero NUNCA se tomó foto, bloquearlo.
    if (nuevoEstado === 'salio' && !tarjetaQR.fotoIngreso && !fotoCapturadaTemporal) {
      setAlertaToggle('¡FOTO OBLIGATORIA! El participante no tiene foto de seguridad. Tómale una antes de registrar su salida.');
      return;
    }

    setAlertaToggle('');
    const nuevaHora = horaActual();
    const tipoMov = nuevoEstado === 'ingresado' ? 'Entrada' : 'Salida';
    
    // Si acaba de tomar la foto para salir, se la guardamos definitivamente
    const fotoFinal = tarjetaQR.fotoIngreso || fotoCapturadaTemporal;

    const nuevoHistorial = [...tarjetaQR.historial, { tipo: tipoMov, hora: nuevaHora }];

    const actualizado = {
      ...tarjetaQR,
      estado: nuevoEstado,
      historial: nuevoHistorial,
      fotoIngreso: fotoFinal
    };

    // Actualiza la tarjeta en vivo y la base de datos global
    setTarjetaQR(actualizado);
    setParticipantes(prev => prev.map(p => p.id === actualizado.id ? actualizado : p));
  };

  // ========================================================
  // RENDERIZADO CONDICIONAL DEL MODAL
  // ========================================================
  const esPendiente = tarjetaQR && tarjetaQR.estado === 'pendiente';
  const faltaFotoObligatoria = tarjetaQR && !tarjetaQR.fotoIngreso;

  return (
    <div className="pi-sup-container">

      <div className="pi-sup-header">
        <h2>Punto de Control de Accesos</h2>
        
        <div className="pi-sup-simuladores">
          <button className="pi-sup-btn-escanear-general" onClick={simularEscaneoGeneral} disabled={escaneando}>
            <FaQrcode /> {escaneando ? 'Escaneando...' : 'Escanear Código QR'}
          </button>
          
          <div className="sim-demos">
            <span className="sim-label">Casos Demo:</span>
            <button onClick={() => abrirModalEspecifico(4)}>1. Nuevo Ingreso</button>
            <button onClick={() => abrirModalEspecifico(1)}>2. Cambiar Adentro/Afuera</button>
            <button onClick={() => abrirModalEspecifico(3)}>3. Adentro (Pero omitió foto)</button>
          </div>
        </div>
      </div>

      {/* --- ESTADÍSTICAS --- */}
      <div className="pi-sup-stats-grid">
        <div className="pi-sup-stat-card">
          <div className="pi-sup-stat-icon pi-sup-icon-total"><FaUsers /></div>
          <div className="pi-sup-stat-info">
            <span className="pi-sup-stat-numero">{stats.total}</span>
            <span className="pi-sup-stat-label">Total Participantes</span>
          </div>
        </div>
        <div className="pi-sup-stat-card">
          <div className="pi-sup-stat-icon pi-sup-icon-ok"><FaUserCheck /></div>
          <div className="pi-sup-stat-info">
            <span className="pi-sup-stat-numero">{stats.adentro}</span>
            <span className="pi-sup-stat-label">Personas Adentro</span>
          </div>
          <span className="pi-sup-stat-porcentaje pi-sup-badge-ok">{stats.pctAdentro}%</span>
        </div>
        <div className="pi-sup-stat-card">
          <div className="pi-sup-stat-icon pi-sup-icon-out"><FaSignOutAlt /></div>
          <div className="pi-sup-stat-info">
            <span className="pi-sup-stat-numero">{stats.afuera}</span>
            <span className="pi-sup-stat-label">Salieron Temporalmente</span>
          </div>
        </div>
      </div>

      {/* --- LISTADO DE AUDITORÍA --- */}
      <div className="pi-sup-lista-card">
        <div className="pi-sup-lista-header">
          <h3>Auditoría de Asistentes</h3>
          <div className="pi-sup-lista-controles">
            <div className="pi-sup-buscador">
              <FaSearch />
              <input type="text" placeholder="Buscar por nombre o CI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <div className="pi-sup-filtros">
              <button className={filtro === 'todos' ? 'activo' : ''} onClick={() => setFiltro('todos')}>Todos</button>
              <button className={filtro === 'ingresado' ? 'activo' : ''} onClick={() => setFiltro('ingresado')}>Adentro</button>
              <button className={filtro === 'salio' ? 'activo' : ''} onClick={() => setFiltro('salio')}>Afuera</button>
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
                <th>Estado Actual</th>
                <th>Último Movimiento</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map(p => {
                const ultimoHistorial = p.historial.length > 0 ? p.historial[p.historial.length - 1] : null;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="pi-sup-fila-persona">
                        <img src={p.fotoPerfil} alt={p.nombre} className="pi-sup-mini-avatar" />
                        <span>{p.nombre}</span>
                      </div>
                    </td>
                    <td>{p.documento}</td>
                    <td>{p.tipoEntrada}</td>
                    <td>
                      {p.estado === 'ingresado' && <span className="pi-sup-badge pi-sup-badge-ok">Adentro</span>}
                      {p.estado === 'salio' && <span className="pi-sup-badge pi-sup-badge-out">Salió</span>}
                      {p.estado === 'pendiente' && <span className="pi-sup-badge pi-sup-badge-pend">Pendiente</span>}
                    </td>
                    <td className="col-historial">
                      {ultimoHistorial ? `${ultimoHistorial.tipo} a las ${ultimoHistorial.hora}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          MODAL DE CONTROL DINÁMICO (INTERRUPTOR)
      ========================================================= */}
      {tarjetaQR && (
        <div className="pi-sup-modal-overlay" onClick={cerrarTarjeta}>
          <div className="pi-sup-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            
            <button className="pi-sup-btn-cerrar" onClick={cerrarTarjeta}><FaTimes /></button>

            {/* HEADER DE ESTADO */}
            <div className="pi-sup-tarjeta-estado">
              <div className="estado-badge">
                <FaCheckCircle /> Lectura Exitosa
              </div>
            </div>

            {/* FOTOS SUPERPUESTAS */}
            <div className={`pi-sup-fotos-comparacion ${faltaFotoObligatoria && !fotoCapturadaTemporal ? 'single-photo' : 'dual-photo'}`}>
              
              <div className="foto-box">
                <img src={tarjetaQR.fotoPerfil} alt="Perfil" className="foto-img" />
                <span className="foto-label text-gray">FOTO DE PERFIL</span>
              </div>

              {/* Lógica dinámica de la foto de puerta */}
              <div className="foto-box">
                {tarjetaQR.fotoIngreso ? (
                  <>
                    <img src={tarjetaQR.fotoIngreso} alt="Ingreso" className="foto-img border-cyan" />
                    <span className="foto-label text-cyan"><FaUserSecret/> FOTO EN PUERTA</span>
                  </>
                ) : fotoCapturadaTemporal ? (
                  <div className="foto-capturada-container">
                    <img src={fotoCapturadaTemporal} alt="Captura" className="foto-img border-cyan" />
                    <button className="btn-retake" onClick={descartarFoto} title="Volver a tomar"><FaSyncAlt /></button>
                    <span className="foto-label text-cyan"><FaUserSecret/> FOTO EN PUERTA</span>
                  </div>
                ) : (
                  <div className="foto-placeholder" onClick={tomarFotoPuerta}>
                    <FaCamera size={26}/>
                    <span>Tomar Foto<br/>Obligatoria</span>
                  </div>
                )}
              </div>

            </div>

            <h2 className="pi-sup-tarjeta-nombre">{tarjetaQR.nombre}</h2>

            <div className="pi-sup-info-card">
              <div className="info-row">
                <FaIdCard className="info-icon" />
                <div>
                  <span className="info-label">DOCUMENTO</span>
                  <span className="info-valor">{tarjetaQR.documento}</span>
                </div>
              </div>
              <div className="info-row">
                <FaTicketAlt className="info-icon" />
                <div>
                  <span className="info-label">TIPO DE ENTRADA</span>
                  <span className="info-valor">{tarjetaQR.tipoEntrada}</span>
                </div>
              </div>
            </div>

            {alertaToggle && (
              <div className="pi-sup-alerta-modal">
                <FaExclamationTriangle /> {alertaToggle}
              </div>
            )}

            <div className="pi-sup-historial-section">
              <h4 className="historial-title"><FaHistory /> Historial de Accesos</h4>
              {tarjetaQR.historial.length === 0 ? (
                <p className="historial-vacio">Sin registros previos.</p>
              ) : (
                <div className="historial-list">
                  {tarjetaQR.historial.map((mov, idx) => (
                    <div key={idx} className={`historial-item ${mov.tipo.includes('Entrada') ? 'item-in' : 'item-out'}`}>
                      {mov.tipo.includes('Entrada') ? <FaSignInAlt/> : <FaSignOutAlt/>}
                      <span>{mov.tipo} registrada a las {mov.hora}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* =========================================
                FOOTER DINÁMICO
            ========================================= */}
            <div className="pi-sup-modal-footer">
              
              {esPendiente ? (
                // --- FOOTER 1: PRIMER INGRESO ---
                <>
                  <button className="btn-omitir" onClick={() => registrarPrimerIngreso(true)}>
                    Omitir por ahora
                  </button>
                  <button 
                    className="btn-in-primero" 
                    onClick={() => registrarPrimerIngreso(false)}
                    disabled={!fotoCapturadaTemporal}
                  >
                    <FaSignInAlt /> {fotoCapturadaTemporal ? 'Confirmar Ingreso' : 'Requiere Fotografía'}
                  </button>
                </>
              ) : (
                // --- FOOTER 2: INTERRUPTOR (ADENTRO / AFUERA) ---
                <div className="pi-sup-toggle-switch">
                  <button 
                    className={`toggle-option ${tarjetaQR.estado === 'salio' ? 'active-out' : ''}`}
                    onClick={() => cambiarEstadoToggle('salio')}
                  >
                    <FaSignOutAlt /> AFUERA
                  </button>
                  
                  <button 
                    className={`toggle-option ${tarjetaQR.estado === 'ingresado' ? 'active-in' : ''}`}
                    onClick={() => cambiarEstadoToggle('ingresado')}
                  >
                    <FaSignInAlt /> ADENTRO
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </div>
  );
}