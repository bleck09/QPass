import { useMemo, useState } from 'react';
import {
  FaQrcode, FaTimes, FaIdCard, FaWallet, FaCheckCircle, FaExclamationTriangle,
  FaMoneyBillWave, FaUser, FaBuilding, FaHistory
} from 'react-icons/fa';
import './Devolucion.css';

// --- DATOS SIMULADOS: USUARIOS NORMALES Y DE NEGOCIO ---
// (fuente interna para resolver el QR escaneado; el encargado de devolución
// nunca ve este listado completo, solo a la persona que escanea)
const beneficiariosIniciales = [
  { id: 1, nombre: 'María Fernanda Rojas', documento: '7451236 LP', tipo: 'Normal', foto: 'https://i.pravatar.cc/300?img=47', saldo: 120 },
  { id: 2, nombre: 'Restaurante El Fogón', documento: '6621345 SC', tipo: 'Negocio', foto: 'https://i.pravatar.cc/300?img=12', saldo: 860 },
  { id: 3, nombre: 'Ana Belén Castro', documento: '5589214 CB', tipo: 'Normal', foto: 'https://i.pravatar.cc/300?img=32', saldo: 35 },
  { id: 4, nombre: 'Foodtruck La Paceña', documento: '4471258 LP', tipo: 'Negocio', foto: 'https://i.pravatar.cc/300?img=51', saldo: 410 },
  { id: 5, nombre: 'Daniela Vargas Soto', documento: '7789456 SC', tipo: 'Normal', foto: 'https://i.pravatar.cc/300?img=25', saldo: 0 },
  { id: 6, nombre: 'Cervecería Andina', documento: '3312589 OR', tipo: 'Negocio', foto: 'https://i.pravatar.cc/300?img=15', saldo: 275 },
  { id: 7, nombre: 'Paola Andrea Terrazas', documento: '6654123 CB', tipo: 'Normal', foto: 'https://i.pravatar.cc/300?img=45', saldo: 90 },
  { id: 8, nombre: 'Luis Fernando Mamani', documento: '5521478 LP', tipo: 'Normal', foto: 'https://i.pravatar.cc/300?img=13', saldo: 50 },
];

const fechaHoraActual = () => {
  const ahora = new Date();
  return {
    fecha: ahora.toLocaleDateString('es-BO'),
    hora: ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
  };
};

export default function Devolucion() {
  const [beneficiarios, setBeneficiarios] = useState(beneficiariosIniciales);
  const [pestana, setPestana] = useState('escanear'); // escanear | historial
  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [monto, setMonto] = useState('');
  const [retiroExitoso, setRetiroExitoso] = useState(null);
  const [retiros, setRetiros] = useState([]);

  const totalRetiradoHoy = useMemo(
    () => retiros.reduce((suma, item) => suma + item.monto, 0),
    [retiros]
  );

  const excedeSaldo = tarjetaQR && Number(monto) > tarjetaQR.saldo;

  const handleSimularEscaneo = () => {
    setEscaneando(true);
    setMonto('');
    setRetiroExitoso(null);
    setTimeout(() => {
      const elegido = beneficiarios[Math.floor(Math.random() * beneficiarios.length)];
      setEscaneando(false);
      setTarjetaQR(elegido);
    }, 700);
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setMonto('');
    setRetiroExitoso(null);
  };

  const confirmarRetiro = () => {
    const valor = Number(monto);
    if (!tarjetaQR || !valor || valor <= 0 || valor > tarjetaQR.saldo) return;

    const nuevoSaldo = tarjetaQR.saldo - valor;
    const { fecha, hora } = fechaHoraActual();

    setBeneficiarios(prev => prev.map(p =>
      p.id === tarjetaQR.id ? { ...p, saldo: nuevoSaldo } : p
    ));

    setRetiros(prev => [
      {
        id: Date.now(),
        beneficiario: tarjetaQR.nombre,
        tipo: tarjetaQR.tipo,
        documento: tarjetaQR.documento,
        foto: tarjetaQR.foto,
        monto: valor,
        saldoResultante: nuevoSaldo,
        fecha,
        hora,
      },
      ...prev,
    ]);

    setRetiroExitoso({ monto: valor, saldo: nuevoSaldo });
  };

  return (
    <div className="pi-dev-container">

      <div className="pi-dev-header">
        <h2>Gestión de Devoluciones</h2>
        <div className="pi-dev-tabs">
          <button
            className={pestana === 'escanear' ? 'activo' : ''}
            onClick={() => setPestana('escanear')}
          >
            <FaQrcode /> Escanear QR
          </button>
          <button
            className={pestana === 'historial' ? 'activo' : ''}
            onClick={() => setPestana('historial')}
          >
            <FaHistory /> Historial ({retiros.length})
          </button>
        </div>
      </div>

      {/* --- PESTAÑA: ESCANEAR --- */}
      {pestana === 'escanear' && (
        <div className="pi-dev-escanear-panel">
          <FaQrcode size={70} color="var(--cian-digital)" />
          <h3>Escanea el código QR del usuario o negocio</h3>
          <p>Solo se muestran los datos de la persona escaneada — no hay acceso al listado completo de usuarios.</p>
          <button className="pi-dev-btn-escanear" onClick={handleSimularEscaneo} disabled={escaneando}>
            <FaQrcode /> {escaneando ? 'Escaneando...' : 'Simular Escaneo QR'}
          </button>
        </div>
      )}

      {/* --- PESTAÑA: HISTORIAL --- */}
      {pestana === 'historial' && (
        <div className="pi-dev-historial">
          <div className="pi-dev-resumen">
            <div className="pi-dev-resumen-stat">
              <span className="numero">{retiros.length}</span>
              <span className="label">Retiros realizados</span>
            </div>
            <div className="pi-dev-resumen-stat">
              <span className="numero">{totalRetiradoHoy} pts</span>
              <span className="label">Total devuelto</span>
            </div>
          </div>

          <div className="pi-dev-tabla-wrapper">
            <table className="pi-dev-tabla">
              <thead>
                <tr>
                  <th>Beneficiario</th>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Saldo Resultante</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {retiros.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="pi-dev-fila-persona">
                        <img src={item.foto} alt={item.beneficiario} className="pi-dev-mini-avatar" />
                        <span>{item.beneficiario}</span>
                      </div>
                    </td>
                    <td>{item.documento}</td>
                    <td>
                      <span className={`pi-dev-badge-tipo ${item.tipo === 'Negocio' ? 'negocio' : 'normal'}`}>
                        {item.tipo === 'Negocio' ? <FaBuilding /> : <FaUser />} {item.tipo}
                      </span>
                    </td>
                    <td className="pi-dev-monto-celda">-{item.monto} pts</td>
                    <td>{item.saldoResultante} pts</td>
                    <td>{item.fecha}</td>
                    <td>{item.hora}</td>
                  </tr>
                ))}
                {retiros.length === 0 && (
                  <tr>
                    <td colSpan={7} className="pi-dev-sin-resultados">
                      Aún no has procesado ninguna devolución en esta sesión.
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
        <div className="pi-dev-modal-overlay" onClick={cerrarTarjeta}>
          <div className="pi-dev-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <button className="pi-dev-btn-cerrar" onClick={cerrarTarjeta}><FaTimes /></button>

            {retiroExitoso ? (
              <div className="pi-dev-exito">
                <FaCheckCircle size={60} color="var(--verde-recarga)" />
                <h3>¡Retiro realizado!</h3>
                <p>Se descontaron <strong>{retiroExitoso.monto} pts</strong> a {tarjetaQR.nombre}.</p>
                <div className="pi-dev-exito-saldo">
                  <FaWallet /> Saldo restante: <strong>{retiroExitoso.saldo} pts</strong>
                </div>
                <button className="pi-dev-btn-confirmar" onClick={cerrarTarjeta}>Listo</button>
              </div>
            ) : (
              <>
                <div className="pi-dev-tarjeta-estado">
                  <FaCheckCircle /> Código QR Válido
                </div>

                <img src={tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-dev-tarjeta-foto" />
                <h2 className="pi-dev-tarjeta-nombre">{tarjetaQR.nombre}</h2>
                <span className={`pi-dev-badge-tipo ${tarjetaQR.tipo === 'Negocio' ? 'negocio' : 'normal'}`}>
                  {tarjetaQR.tipo === 'Negocio' ? <FaBuilding /> : <FaUser />} Usuario {tarjetaQR.tipo}
                </span>

                <div className="pi-dev-tarjeta-datos">
                  <div className="pi-dev-tarjeta-dato">
                    <FaIdCard />
                    <div>
                      <span className="label">Documento</span>
                      <span className="valor">{tarjetaQR.documento}</span>
                    </div>
                  </div>
                  <div className="pi-dev-tarjeta-dato">
                    <FaWallet />
                    <div>
                      <span className="label">Saldo Disponible</span>
                      <span className="valor">{tarjetaQR.saldo} pts</span>
                    </div>
                  </div>
                </div>

                <div className="pi-dev-form-monto">
                  <label><FaMoneyBillWave /> Monto a retirar (puntos)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej: 50"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    autoFocus
                  />
                  <div className="pi-dev-montos-rapidos">
                    <button type="button" onClick={() => setMonto(String(Math.round(tarjetaQR.saldo / 2)))}>
                      Mitad
                    </button>
                    <button type="button" onClick={() => setMonto(String(tarjetaQR.saldo))}>
                      Retirar todo
                    </button>
                  </div>

                  {excedeSaldo && (
                    <div className="pi-dev-alerta-error">
                      <FaExclamationTriangle /> Saldo insuficiente: el máximo disponible es {tarjetaQR.saldo} pts.
                    </div>
                  )}
                </div>

                <div className="pi-dev-tarjeta-acciones">
                  <button className="pi-dev-btn-cancelar" onClick={cerrarTarjeta}>Cancelar</button>
                  <button
                    className="pi-dev-btn-confirmar"
                    onClick={confirmarRetiro}
                    disabled={!monto || Number(monto) <= 0 || excedeSaldo}
                  >
                    <FaCheckCircle /> Confirmar Retiro
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
