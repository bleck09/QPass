import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaQrcode, FaHistory, FaTimes, FaIdCard, FaCoins, FaCheckCircle, FaWallet
} from 'react-icons/fa';
import './Recargador.css';

// --- DATOS SIMULADOS DE PARTICIPANTES ---
const participantesIniciales = [
  { id: 1, nombre: 'María Fernanda Rojas', documento: '7451236 LP', foto: 'https://i.pravatar.cc/300?img=47', saldo: 120 },
  { id: 2, nombre: 'Jorge Luis Quispe', documento: '6621345 SC', foto: 'https://i.pravatar.cc/300?img=12', saldo: 45 },
  { id: 3, nombre: 'Ana Belén Castro', documento: '5589214 CB', foto: 'https://i.pravatar.cc/300?img=32', saldo: 0 },
  { id: 4, nombre: 'Ricardo Alanoca Mamani', documento: '4471258 LP', foto: 'https://i.pravatar.cc/300?img=51', saldo: 300 },
  { id: 5, nombre: 'Daniela Vargas Soto', documento: '7789456 SC', foto: 'https://i.pravatar.cc/300?img=25', saldo: 80 },
  { id: 6, nombre: 'Sergio Fabián Choque', documento: '3312589 OR', foto: 'https://i.pravatar.cc/300?img=15', saldo: 15 },
  { id: 7, nombre: 'Paola Andrea Terrazas', documento: '6654123 CB', foto: 'https://i.pravatar.cc/300?img=45', saldo: 200 },
  { id: 8, nombre: 'Luis Fernando Mamani', documento: '5521478 LP', foto: 'https://i.pravatar.cc/300?img=13', saldo: 0 },
];

const montosRapidos = [20, 50, 100, 200];

const fechaHoraActual = () => {
  const ahora = new Date();
  return {
    fecha: ahora.toLocaleDateString('es-BO'),
    hora: ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
  };
};

export default function Recargador() {
  const [usuario] = useState(() => {
    const guardado = localStorage.getItem('usuarioProyectoIngresos');
    return guardado ? JSON.parse(guardado) : { nombre: 'Recargador' };
  });

  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/historial') ? 'historial' : 'escanear';

  const [participantes, setParticipantes] = useState(participantesIniciales);
  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [monto, setMonto] = useState('');
  const [recargaExitosa, setRecargaExitosa] = useState(null);
  const [historial, setHistorial] = useState([]);

  const totalHistorialHoy = useMemo(
    () => historial.reduce((suma, item) => suma + item.monto, 0),
    [historial]
  );

  const handleSimularEscaneo = () => {
    setEscaneando(true);
    setMonto('');
    setRecargaExitosa(null);
    setTimeout(() => {
      const elegido = participantes[Math.floor(Math.random() * participantes.length)];
      setEscaneando(false);
      setTarjetaQR(elegido);
    }, 700);
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setMonto('');
    setRecargaExitosa(null);
  };

  const confirmarRecarga = () => {
    const valor = Number(monto);
    if (!tarjetaQR || !valor || valor <= 0) return;

    const nuevoSaldo = tarjetaQR.saldo + valor;
    const { fecha, hora } = fechaHoraActual();

    setParticipantes(prev => prev.map(p =>
      p.id === tarjetaQR.id ? { ...p, saldo: nuevoSaldo } : p
    ));

    setHistorial(prev => [
      {
        id: Date.now(),
        participante: tarjetaQR.nombre,
        documento: tarjetaQR.documento,
        foto: tarjetaQR.foto,
        monto: valor,
        saldoResultante: nuevoSaldo,
        fecha,
        hora,
      },
      ...prev,
    ]);

    setRecargaExitosa({ monto: valor, saldo: nuevoSaldo });
  };

  return (
    <div className="pi-rec-container">

      <div className="pi-rec-header">
        <h2>Recarga de Puntos</h2>
        <div className="pi-rec-tabs">
          <button
            className={pestana === 'escanear' ? 'activo' : ''}
            onClick={() => navigate('/recargador')}
          >
            <FaQrcode /> Escanear QR
          </button>
          <button
            className={pestana === 'historial' ? 'activo' : ''}
            onClick={() => navigate('/recargador/historial')}
          >
            <FaHistory /> Historial ({historial.length})
          </button>
        </div>
      </div>

      {/* --- PESTAÑA: ESCANEAR --- */}
      {pestana === 'escanear' && (
        <div className="pi-rec-escanear-panel">
          <FaQrcode size={70} color="var(--cian-digital)" />
          <h3>Escanea el código QR del participante</h3>
          <p>Apunta la cámara al código QR para cargar sus datos y registrar la recarga.</p>
          <button className="pi-rec-btn-escanear" onClick={handleSimularEscaneo} disabled={escaneando}>
            <FaQrcode /> {escaneando ? 'Escaneando...' : 'Simular Escaneo QR'}
          </button>
        </div>
      )}

      {/* --- PESTAÑA: HISTORIAL --- */}
      {pestana === 'historial' && (
        <div className="pi-rec-historial">
          <div className="pi-rec-historial-stats">
            <div className="pi-rec-historial-stat">
              <span className="numero">{historial.length}</span>
              <span className="label">Recargas realizadas</span>
            </div>
            <div className="pi-rec-historial-stat">
              <span className="numero">{totalHistorialHoy} pts</span>
              <span className="label">Total recargado</span>
            </div>
            <div className="pi-rec-historial-stat">
              <span className="numero">{usuario.nombre}</span>
              <span className="label">Recargador</span>
            </div>
          </div>

          <div className="pi-rec-tabla-wrapper">
            <table className="pi-rec-tabla">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Documento</th>
                  <th>Monto</th>
                  <th>Saldo Resultante</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="pi-rec-fila-persona">
                        <img src={item.foto} alt={item.participante} className="pi-rec-mini-avatar" />
                        <span>{item.participante}</span>
                      </div>
                    </td>
                    <td>{item.documento}</td>
                    <td className="pi-rec-monto-celda">+{item.monto} pts</td>
                    <td>{item.saldoResultante} pts</td>
                    <td>{item.fecha}</td>
                    <td>{item.hora}</td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr>
                    <td colSpan={6} className="pi-rec-sin-resultados">
                      Aún no has realizado ninguna recarga en esta sesión.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TARJETA GRANDE AL ESCANEAR QR --- */}
      {tarjetaQR && (
        <div className="pi-rec-modal-overlay" onClick={cerrarTarjeta}>
          <div className="pi-rec-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <button className="pi-rec-btn-cerrar" onClick={cerrarTarjeta}><FaTimes /></button>

            {recargaExitosa ? (
              <div className="pi-rec-exito">
                <FaCheckCircle size={60} color="var(--verde-recarga)" />
                <h3>¡Recarga exitosa!</h3>
                <p>Se acreditaron <strong>{recargaExitosa.monto} pts</strong> a {tarjetaQR.nombre}.</p>
                <div className="pi-rec-exito-saldo">
                  <FaWallet /> Nuevo saldo: <strong>{recargaExitosa.saldo} pts</strong>
                </div>
                <button className="pi-rec-btn-confirmar" onClick={cerrarTarjeta}>Listo</button>
              </div>
            ) : (
              <>
                <div className="pi-rec-tarjeta-estado">
                  <FaCheckCircle /> Código QR Válido
                </div>

                <img src={tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-rec-tarjeta-foto" />
                <h2 className="pi-rec-tarjeta-nombre">{tarjetaQR.nombre}</h2>

                <div className="pi-rec-tarjeta-datos">
                  <div className="pi-rec-tarjeta-dato">
                    <FaIdCard />
                    <div>
                      <span className="label">Documento</span>
                      <span className="valor">{tarjetaQR.documento}</span>
                    </div>
                  </div>
                  <div className="pi-rec-tarjeta-dato">
                    <FaWallet />
                    <div>
                      <span className="label">Saldo Actual</span>
                      <span className="valor">{tarjetaQR.saldo} pts</span>
                    </div>
                  </div>
                </div>

                <div className="pi-rec-form-monto">
                  <label><FaCoins /> Monto a recargar (puntos)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej: 100"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    autoFocus
                  />
                  <div className="pi-rec-montos-rapidos">
                    {montosRapidos.map(m => (
                      <button key={m} type="button" onClick={() => setMonto(String(m))}>
                        +{m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pi-rec-tarjeta-acciones">
                  <button className="pi-rec-btn-cancelar" onClick={cerrarTarjeta}>Cancelar</button>
                  <button
                    className="pi-rec-btn-confirmar"
                    onClick={confirmarRecarga}
                    disabled={!monto || Number(monto) <= 0}
                  >
                    <FaCheckCircle /> Confirmar Recarga
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
