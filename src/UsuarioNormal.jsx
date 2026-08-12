import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaWallet, FaQrcode, FaUpload, FaPlus, FaMinus, FaUserPlus,
  FaCheckCircle, FaHourglassHalf, FaEnvelope, FaPhoneAlt, FaHistory,
  FaStore, FaCoins, FaExclamationTriangle, FaKey
} from 'react-icons/fa';
import './UsuarioNormal.css';

const PRECIO_ENTRADA = 150; // Bs. por entrada
const MAX_ENTRADAS = 6;

const generarPassword = () => Math.random().toString(36).slice(-8);

const qrDe = (texto) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(texto)}`;

const fechaHoraActual = () => {
  const ahora = new Date();
  return {
    fecha: ahora.toLocaleDateString('es-BO'),
    hora: ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
  };
};

const historialInicial = [
  { id: 1, tipo: 'recarga', detalle: 'Recarga en punto oficial', monto: 100, unidad: 'pts', fecha: '05/08/2026', hora: '09:15' },
  { id: 2, tipo: 'compra_qr', detalle: 'Foodtruck La Paceña', monto: 20, unidad: 'pts', fecha: '05/08/2026', hora: '13:40' },
  { id: 3, tipo: 'compra_qr', detalle: 'Cervecería Andina', monto: 15, unidad: 'pts', fecha: '05/08/2026', hora: '18:05' },
];

export default function UsuarioNormal() {
  const [usuario] = useState(() => {
    const guardado = localStorage.getItem('usuarioProyectoIngresos');
    return guardado ? JSON.parse(guardado) : { nombre: 'Usuario', email: 'usuario@proyectodeingresos.com' };
  });

  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/saldo') ? 'saldo' : 'comprar';

  const [historial, setHistorial] = useState(historialInicial);
  const [compras, setCompras] = useState([]);

  const [cantidad, setCantidad] = useState(1);
  const [invitados, setInvitados] = useState([]);
  const [comprobante, setComprobante] = useState(null); // { nombreArchivo, previewUrl }
  const [errorForm, setErrorForm] = useState('');

  const saldo = useMemo(
    () => historial.reduce((total, item) => {
      if (item.tipo === 'recarga') return total + item.monto;
      if (item.tipo === 'compra_qr') return total - item.monto;
      return total;
    }, 0),
    [historial]
  );

  const montoTotalEntradas = cantidad * PRECIO_ENTRADA;

  const cambiarCantidad = (delta) => {
    const nueva = Math.min(MAX_ENTRADAS, Math.max(1, cantidad + delta));
    setCantidad(nueva);
    setInvitados(prev => {
      const necesarios = nueva - 1;
      const copia = [...prev];
      while (copia.length < necesarios) copia.push({ nombre: '', correo: '', celular: '' });
      copia.length = necesarios;
      return copia;
    });
  };

  const actualizarInvitado = (index, campo, valor) => {
    setInvitados(prev => prev.map((inv, i) => (i === index ? { ...inv, [campo]: valor } : inv)));
  };

  const handleComprobanteUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setComprobante({ nombreArchivo: file.name, previewUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleEnviarComprobante = () => {
    setErrorForm('');

    if (!comprobante) {
      setErrorForm('Debes subir el comprobante de pago para continuar.');
      return;
    }
    if (cantidad > 1 && invitados.some(inv => !inv.nombre.trim() || !inv.correo.trim() || !inv.celular.trim())) {
      setErrorForm('Completa nombre, correo y celular de cada entrada adicional.');
      return;
    }

    const { fecha, hora } = fechaHoraActual();
    setCompras(prev => [
      {
        id: Date.now(),
        cantidad,
        monto: montoTotalEntradas,
        comprobante,
        invitados: [...invitados],
        estado: 'pendiente',
        fecha,
        hora,
      },
      ...prev,
    ]);

    setCantidad(1);
    setInvitados([]);
    setComprobante(null);
  };

  // Simulación del paso de confirmación del comprobante (en la vida real lo haría el equipo de Admin/Supervisor).
  const simularConfirmacion = (compraId) => {
    const compra = compras.find(c => c.id === compraId);
    if (!compra) return;

    setCompras(prev => prev.map(c => {
      if (c.id !== compraId) return c;
      const invitadosConCredenciales = c.invitados.map(inv => ({
        ...inv,
        password: generarPassword(),
        qrUrl: qrDe(`QPASS-${inv.correo}`),
      }));
      return { ...c, estado: 'confirmado', invitados: invitadosConCredenciales };
    }));

    const { fecha, hora } = fechaHoraActual();
    setHistorial(prev => [
      {
        id: Date.now(),
        tipo: 'entrada',
        detalle: compra.cantidad === 1 ? 'Compra de 1 entrada' : `Compra de ${compra.cantidad} entradas`,
        monto: compra.monto,
        unidad: 'Bs',
        estado: 'confirmado',
        fecha,
        hora,
      },
      ...prev,
    ]);
  };

  return (
    <div className="pi-usr-container">

      <div className="pi-usr-header">
        <h2>Mi Cuenta</h2>
        <div className="pi-usr-tabs">
          <button
            className={pestana === 'comprar' ? 'activo' : ''}
            onClick={() => navigate('/usuarionormal')}
          >
            <FaTicketAlt /> Comprar Entradas
          </button>
          <button
            className={pestana === 'saldo' ? 'activo' : ''}
            onClick={() => navigate('/usuarionormal/saldo')}
          >
            <FaWallet /> Mi Saldo
          </button>
        </div>
      </div>

      {/* --- PESTAÑA: COMPRAR ENTRADAS --- */}
      {pestana === 'comprar' && (
        <div className="pi-usr-comprar">
          <div className="pi-usr-card">
            <h3><FaTicketAlt color="var(--indigo-profundo)" /> Comprar entradas al evento</h3>

            <div className="pi-usr-stepper-fila">
              <div>
                <span className="pi-usr-stepper-label">Cantidad de entradas</span>
                <span className="pi-usr-stepper-precio">Bs. {PRECIO_ENTRADA} por entrada</span>
              </div>
              <div className="pi-usr-stepper">
                <button type="button" onClick={() => cambiarCantidad(-1)} disabled={cantidad <= 1}>
                  <FaMinus />
                </button>
                <span>{cantidad}</span>
                <button type="button" onClick={() => cambiarCantidad(1)} disabled={cantidad >= MAX_ENTRADAS}>
                  <FaPlus />
                </button>
              </div>
            </div>

            {invitados.length > 0 && (
              <div className="pi-usr-invitados">
                <p className="pi-usr-invitados-nota">
                  <FaUserPlus /> La primera entrada es para ti. Completa los datos de las {invitados.length} entrada(s) adicionales:
                  a cada correo se le enviará su propio código QR y una contraseña para que cree su cuenta.
                </p>
                {invitados.map((inv, index) => (
                  <div key={index} className="pi-usr-invitado-card">
                    <span className="pi-usr-invitado-titulo">Entrada adicional #{index + 2}</span>
                    <div className="pi-usr-invitado-grid">
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        value={inv.nombre}
                        onChange={(e) => actualizarInvitado(index, 'nombre', e.target.value)}
                      />
                      <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={inv.correo}
                        onChange={(e) => actualizarInvitado(index, 'correo', e.target.value)}
                      />
                      <input
                        type="tel"
                        placeholder="Celular"
                        value={inv.celular}
                        onChange={(e) => actualizarInvitado(index, 'celular', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pi-usr-comprobante">
              <span className="pi-usr-form-label">Comprobante de pago</span>
              <label htmlFor="pi-usr-file" className="pi-usr-btn-upload">
                <FaUpload /> {comprobante ? 'Cambiar comprobante' : 'Subir comprobante'}
              </label>
              <input id="pi-usr-file" type="file" accept="image/*" onChange={handleComprobanteUpload} hidden />
              {comprobante && (
                <div className="pi-usr-comprobante-preview">
                  <img src={comprobante.previewUrl} alt="Comprobante" />
                  <span>{comprobante.nombreArchivo}</span>
                </div>
              )}
            </div>

            {errorForm && (
              <div className="pi-usr-alerta-error">
                <FaExclamationTriangle /> {errorForm}
              </div>
            )}

            <div className="pi-usr-total-fila">
              <span>Total a pagar</span>
              <strong>Bs. {montoTotalEntradas}</strong>
            </div>

            <button className="pi-usr-btn-enviar" onClick={handleEnviarComprobante}>
              <FaUpload /> Enviar comprobante y solicitar entradas
            </button>
          </div>

          {compras.length > 0 && (
            <div className="pi-usr-card">
              <h3><FaHourglassHalf color="var(--indigo-profundo)" /> Tus solicitudes de compra</h3>
              <div className="pi-usr-solicitudes">
                {compras.map(compra => (
                  <div key={compra.id} className="pi-usr-solicitud">
                    <img src={compra.comprobante.previewUrl} alt="Comprobante" className="pi-usr-solicitud-img" />
                    <div className="pi-usr-solicitud-info">
                      <div className="pi-usr-solicitud-cabecera">
                        <span className="pi-usr-solicitud-titulo">
                          {compra.cantidad === 1 ? '1 entrada' : `${compra.cantidad} entradas`} · Bs. {compra.monto}
                        </span>
                        {compra.estado === 'pendiente' ? (
                          <span className="pi-usr-badge pi-usr-badge-pend">
                            <FaHourglassHalf /> Esperando confirmación
                          </span>
                        ) : (
                          <span className="pi-usr-badge pi-usr-badge-ok">
                            <FaCheckCircle /> Confirmado
                          </span>
                        )}
                      </div>
                      <span className="pi-usr-solicitud-fecha">{compra.fecha} · {compra.hora}</span>

                      {compra.estado === 'pendiente' && (
                        <button className="pi-usr-btn-demo" onClick={() => simularConfirmacion(compra.id)}>
                          Simular confirmación del comprobante (demo)
                        </button>
                      )}

                      {compra.estado === 'confirmado' && compra.invitados.length > 0 && (
                        <div className="pi-usr-credenciales">
                          {compra.invitados.map((inv, i) => (
                            <div key={i} className="pi-usr-credencial">
                              <img src={inv.qrUrl} alt={`QR de ${inv.nombre}`} />
                              <div>
                                <span className="pi-usr-credencial-nombre">{inv.nombre}</span>
                                <span className="pi-usr-credencial-linea"><FaEnvelope /> {inv.correo}</span>
                                <span className="pi-usr-credencial-linea"><FaPhoneAlt /> {inv.celular}</span>
                                <span className="pi-usr-credencial-linea"><FaKey /> {inv.password}</span>
                                <span className="pi-usr-credencial-nota">Se envió el QR y la contraseña a su correo.</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- PESTAÑA: MI SALDO --- */}
      {pestana === 'saldo' && (
        <div className="pi-usr-saldo">
          <div className="pi-usr-saldo-top">
            <div className="pi-usr-saldo-card">
              <FaWallet size={30} color="var(--indigo-profundo)" />
              <span className="pi-usr-saldo-numero">{saldo} pts</span>
              <span className="pi-usr-saldo-label">Saldo disponible para gastar en el evento</span>
            </div>

            <div className="pi-usr-qr-card">
              <img src={qrDe(`QPASS-${usuario.email}`)} alt="Tu código QR" />
              <span className="pi-usr-qr-titulo"><FaQrcode /> Tu código QR</span>
              <span className="pi-usr-qr-nota">Único y personal — es tu manilla digital para el evento.</span>
              <span className="pi-usr-qr-usuario">{usuario.nombre} · {usuario.email}</span>
            </div>
          </div>

          <div className="pi-usr-card">
            <h3><FaHistory color="var(--indigo-profundo)" /> Historial de compras y recargas</h3>
            <div className="pi-usr-tabla-wrapper">
              <table className="pi-usr-tabla">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Detalle</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(item => (
                    <tr key={item.id}>
                      <td>
                        <span className="pi-usr-tipo-celda">
                          {item.tipo === 'recarga' && <><FaCoins color="var(--verde-recarga-texto)" /> Recarga</>}
                          {item.tipo === 'compra_qr' && <><FaStore color="var(--indigo-profundo)" /> Compra con QR</>}
                          {item.tipo === 'entrada' && <><FaTicketAlt color="var(--coral-compra)" /> Entrada</>}
                        </span>
                      </td>
                      <td>{item.detalle}</td>
                      <td className={item.tipo === 'recarga' ? 'pi-usr-monto-positivo' : ''}>
                        {item.tipo === 'recarga' ? '+' : item.tipo === 'compra_qr' ? '-' : ''}{item.monto} {item.unidad}
                      </td>
                      <td>
                        {item.estado === 'confirmado' && (
                          <span className="pi-usr-badge pi-usr-badge-ok"><FaCheckCircle /> Confirmado</span>
                        )}
                        {item.estado === 'pendiente' && (
                          <span className="pi-usr-badge pi-usr-badge-pend"><FaHourglassHalf /> Pendiente</span>
                        )}
                        {!item.estado && '—'}
                      </td>
                      <td>{item.fecha}</td>
                      <td>{item.hora}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
