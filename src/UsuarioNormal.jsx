import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaWallet, FaQrcode, FaUpload, FaPlus, FaTrash, FaUserPlus,
  FaCheckCircle, FaHourglassHalf, FaEnvelope, FaHistory,
  FaStore, FaCoins, FaExclamationTriangle, FaKey, FaUserTag, FaIdCard, FaLock, FaUserCheck
} from 'react-icons/fa';
import './UsuarioNormal.css';

const MAX_ENTRADAS = 6;

const categoriasEntradas = [
  { id: 'general', nombre: 'General', descripcion: 'Acceso general al recinto del evento.', precio: 150, color: 'var(--cian-digital)' },
  { id: 'vip', nombre: 'VIP', descripcion: 'Acceso a zona VIP con área preferencial.', precio: 300, color: 'var(--ambar-aviso)' },
];

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
  { id: 1, tipo: 'recarga', detalle: 'Recarga inicial en boletería', monto: 200, unidad: 'pts', fecha: '13/08/2026', hora: '10:00' }
];

export default function UsuarioNormal() {
  const [usuario] = useState(() => {
    const guardado = localStorage.getItem('usuarioProyectoIngresos');
    return guardado ? JSON.parse(guardado) : { nombre: 'Vladimir Chambi', email: 'vladimir@univalle.edu' };
  });

  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/saldo') ? 'saldo' : 'comprar';

  // --- ESTADOS DE SIMULACIÓN Y LÓGICA DE NEGOCIO ---
  const [yaTieneEntrada, setYaTieneEntrada] = useState(false);
  const [miCuentaActiva, setMiCuentaActiva] = useState(false);

  // --- ESTADOS DE COMPRAS ---
  const [compras, setCompras] = useState([]);
  
  // El carrito inicia asumiendo que NO tiene entrada (el primer ticket es Titular)
  const [entradasCart, setEntradasCart] = useState([
    { id: "12/02/26", isTitular: true, nombre: usuario.nombre, correo: usuario.email, celular: '', categoriaId: 'general', precio: 150 }
  ]);
  
  const [comprobante, setComprobante] = useState(null); 
  const [errorForm, setErrorForm] = useState('');

  // --- ESTADOS DE SALDO ---
  const [miCategoriaAcceso] = useState('VIP'); 
  const [historial, setHistorial] = useState([]); 

  const saldo = useMemo(
    () => historial.reduce((total, item) => {
      if (item.tipo === 'recarga') return total + item.monto;
      if (item.tipo === 'compra_qr') return total - item.monto;
      return total;
    }, 0),
    [historial]
  );

  const montoTotalEntradas = entradasCart.reduce((acc, entrada) => acc + entrada.precio, 0);

  // --- CONTROLADOR DEL MODO SIMULACIÓN ---
  const toggleSimulacionEntradaPropia = () => {
    const nuevoEstado = !yaTieneEntrada;
    setYaTieneEntrada(nuevoEstado);
    
    // Si marcamos que YA tiene entrada, su cuenta se activa automáticamente en el panel de Saldo
    setMiCuentaActiva(nuevoEstado);
    if(nuevoEstado && historial.length === 0) setHistorial(historialInicial);

    // Reiniciamos el carrito basándonos en la nueva realidad del usuario
    if (nuevoEstado) {
      // Ya tiene entrada: Solo puede comprar para invitados
      setEntradasCart([{ id: Date.now(), isTitular: false, nombre: '', correo: '', celular: '', categoriaId: 'general', precio: 150 }]);
    } else {
      // No tiene entrada: La primera debe ser obligatoria para él
      setEntradasCart([{ id: Date.now(), isTitular: true, nombre: usuario.nombre, correo: usuario.email, celular: '', categoriaId: 'general', precio: 150 }]);
    }
  };

  // --- LÓGICA DEL CARRITO ---
  const agregarEntrada = () => {
    if (entradasCart.length >= MAX_ENTRADAS) return;
    setEntradasCart([
      ...entradasCart,
      { id: Date.now(), isTitular: false, nombre: '', correo: '', celular: '', categoriaId: 'general', precio: 150 }
    ]);
  };

  const quitarEntrada = (id) => setEntradasCart(entradasCart.filter(e => e.id !== id));

  const actualizarEntrada = (id, campo, valor) => {
    setEntradasCart(entradasCart.map(ent => {
      if (ent.id === id) {
        const updated = { ...ent, [campo]: valor };
        if (campo === 'categoriaId') {
          const cat = categoriasEntradas.find(c => c.id === valor);
          updated.precio = cat ? cat.precio : 0;
        }
        return updated;
      }
      return ent;
    }));
  };

  const handleComprobanteUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setComprobante({ nombreArchivo: file.name, previewUrl: reader.result });
    reader.readAsDataURL(file);
  };

  const handleEnviarComprobante = () => {
    setErrorForm('');
    if (!comprobante) return setErrorForm('Debes subir el comprobante de pago para continuar.');
    
    const invitadosIncompletos = entradasCart.some(ent => !ent.nombre.trim() || !ent.correo.trim() || (!ent.isTitular && !ent.celular.trim()));
    if (invitadosIncompletos) return setErrorForm('Completa el nombre, correo y celular de todas las personas asignadas.');

    const correos = entradasCart.map(e => e.correo.toLowerCase());
    if (correos.length !== new Set(correos).size) return setErrorForm('Cada entrada necesita un correo electrónico único.');

    const { fecha, hora } = fechaHoraActual();
    setCompras(prev => [
      { id: Date.now(), entradas: [...entradasCart], montoTotal: montoTotalEntradas, comprobante, estado: 'pendiente', fecha, hora },
      ...prev,
    ]);

    // Resetear el formulario basándonos en si ya tenía entrada o no
    if (yaTieneEntrada) {
      setEntradasCart([{ id: "12/02/26", isTitular: false, nombre: '', correo: '', celular: '', categoriaId: 'general', precio: 150 }]);
    } else {
      setEntradasCart([{ id: "12/02/26", isTitular: true, nombre: usuario.nombre, correo: usuario.email, celular: '', categoriaId: 'general', precio: 150 }]);
    }
    setComprobante(null);
  };

  const simularConfirmacionAdmin = (compraId) => {
    setCompras(prev => prev.map(c => {
      if (c.id !== compraId) return c;
      const entradasConfirmadas = c.entradas.map(ent => ({
        ...ent,
        password: ent.isTitular ? null : generarPassword(),
        qrUrl: qrDe(`QPASS-${ent.correo}`),
      }));
      return { ...c, estado: 'confirmado', entradas: entradasConfirmadas };
    }));
  };

  return (
    <div className="pi-usr-container">

      <div className="pi-usr-header">
        <h2>Panel de Asistente</h2>
        <div className="pi-usr-tabs">
          <button className={pestana === 'comprar' ? 'activo' : ''} onClick={() => navigate('/usuarionormal')}>
            <FaTicketAlt /> Comprar Entradas
          </button>
          <button className={pestana === 'saldo' ? 'activo' : ''} onClick={() => navigate('/usuarionormal/saldo')}>
            <FaWallet /> Mi Entrada y Saldo
          </button>
        </div>
      </div>

      {/* PANEL DE SIMULACIÓN PARA EL DESARROLLADOR */}
      <div className="pi-usr-demo-toggle">
        <label>Control de Simulador Lógico:</label>
        <button onClick={toggleSimulacionEntradaPropia} className={`btn-toggle-demo ${yaTieneEntrada ? 'activo' : ''}`}>
          {yaTieneEntrada ? <FaUserCheck /> : <FaExclamationTriangle />}
          {yaTieneEntrada ? ' Estado: YA TENGO UNA ENTRADA MÍA' : ' Estado: NO TENGO ENTRADA (Cuenta nueva)'}
        </button>
      </div>

      {/* =========================================================
          PESTAÑA 1: COMPRAR ENTRADAS
      ========================================================= */}
      {pestana === 'comprar' && (
        <div className="pi-usr-comprar">
          
          {/* Nota dinámica dependiendo de la validación */}
          {yaTieneEntrada ? (
            <div className="pi-usr-nota-informativa nota-verde">
              <FaUserPlus className="nota-icon" />
              <div>
                <strong>Comprando para terceros (Invitados)</strong>
                <p>El sistema detecta que <b>ya cuentas con una entrada</b> asignada a tu cuenta. Las entradas que adquieras aquí serán creadas para tus invitados y se les enviará el QR a sus correos.</p>
              </div>
            </div>
          ) : (
            <div className="pi-usr-nota-informativa">
              <FaIdCard className="nota-icon" />
              <div>
                <strong>Entradas personales e intransferibles</strong>
                <p>Tu primera entrada será asignada a esta cuenta (no puedes modificar los datos). Si compras para amigos, asígnales su correo y el sistema les creará sus propias cuentas.</p>
              </div>
            </div>
          )}

          <div className="pi-usr-cart-list">
            {entradasCart.map((entrada, index) => {
              const catSeleccionada = categoriasEntradas.find(c => c.id === entrada.categoriaId);
              return (
                <div key={entrada.id} className="pi-usr-ticket-card" style={{ borderLeftColor: catSeleccionada.color }}>
                  <div className="pi-usr-ticket-header">
                    <h4>
                      {entrada.isTitular ? <FaUserTag color="var(--indigo-profundo)"/> : <FaUserPlus color="var(--gris-medio)"/>}
                      {entrada.isTitular ? 'Entrada 1 (Tuya)' : `Entrada ${index + 1} (Invitado)`}
                    </h4>
                    
                    {/* Solo permite borrar si NO es titular y hay más de un elemento */}
                    {(!entrada.isTitular && entradasCart.length > 1) && (
                      <button className="btn-eliminar-ticket" onClick={() => quitarEntrada(entrada.id)}>
                        <FaTrash /> Quitar
                      </button>
                    )}
                  </div>

                  <div className="pi-usr-ticket-body">
                    <div className="pi-usr-ticket-categorias">
                      <label>Categoría de Entrada:</label>
                      <div className="cat-options">
                        {categoriasEntradas.map(cat => (
                          <button
                            key={cat.id}
                            className={`btn-cat ${entrada.categoriaId === cat.id ? 'activa' : ''}`}
                            onClick={() => actualizarEntrada(entrada.id, 'categoriaId', cat.id)}
                          >
                            <span className="cat-nombre">{cat.nombre}</span>
                            <span className="cat-precio">Bs. {cat.precio}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pi-usr-ticket-inputs">
                      <div className="input-group">
                        <label>Nombre Completo</label>
                        <input type="text" placeholder="Ej: Ana López" value={entrada.nombre} onChange={(e) => actualizarEntrada(entrada.id, 'nombre', e.target.value)} disabled={entrada.isTitular} />
                      </div>
                      <div className="input-group">
                        <label>Correo Electrónico</label>
                        <input type="email" placeholder="Para enviar credenciales" value={entrada.correo} onChange={(e) => actualizarEntrada(entrada.id, 'correo', e.target.value)} disabled={entrada.isTitular} />
                      </div>
                      <div className="input-group">
                        <label>Celular (WhatsApp)</label>
                        <input type="tel" placeholder="Ej: 71234567" value={entrada.celular} onChange={(e) => actualizarEntrada(entrada.id, 'celular', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {entradasCart.length < MAX_ENTRADAS && (
            <button className="pi-usr-btn-agregar-mas" onClick={agregarEntrada}>
              <FaPlus /> Añadir otra entrada para un amigo (Máx. {MAX_ENTRADAS})
            </button>
          )}

          <div className="pi-usr-card pi-usr-pago-card">
            <div className="pi-usr-comprobante">
              <span className="pi-usr-form-label">Comprobante de Transferencia</span>
              <p className="texto-ayuda" style={{marginBottom: '10px'}}>Transfiere el monto total a la cuenta oficial y sube la captura aquí.</p>
              {!comprobante ? (
                <label htmlFor="pi-usr-file" className="pi-usr-btn-upload-grande">
                  <FaUpload size={24} color="var(--cian-digital)"/> 
                  <span>Haz clic para subir comprobante</span>
                </label>
              ) : (
                <div className="pi-usr-comprobante-preview-grande">
                  <img src={comprobante.previewUrl} alt="Comprobante" />
                  <div className="preview-info">
                    <span>{comprobante.nombreArchivo}</span>
                    <label htmlFor="pi-usr-file" className="btn-cambiar-archivo">Cambiar foto</label>
                  </div>
                </div>
              )}
              <input id="pi-usr-file" type="file" accept="image/*" onChange={handleComprobanteUpload} hidden />
            </div>

            {errorForm && <div className="pi-usr-alerta-error"><FaExclamationTriangle /> {errorForm}</div>}

            <div className="pi-usr-resumen-compra">
              <div className="resumen-linea">
                <span>Total de entradas</span>
                <span>{entradasCart.length}</span>
              </div>
              <div className="resumen-total">
                <span>Total a pagar</span>
                <strong>Bs. {montoTotalEntradas.toFixed(2)}</strong>
              </div>
            </div>

            <button className="pi-usr-btn-enviar" onClick={handleEnviarComprobante}>
              <FaCheckCircle /> Enviar Pago y Solicitar
            </button>
          </div>

          {/* HISTORIAL DE SOLICITUDES */}
          {compras.length > 0 && (
            <div className="pi-usr-card mt-20">
              <h3><FaHourglassHalf color="var(--indigo-profundo)" /> Mis solicitudes de Tickets</h3>
              <div className="pi-usr-solicitudes">
                {compras.map(compra => (
                  <div key={compra.id} className="pi-usr-solicitud">
                    <img src={compra.comprobante.previewUrl} alt="Comprobante" className="pi-usr-solicitud-img" />
                    <div className="pi-usr-solicitud-info">
                      <div className="pi-usr-solicitud-cabecera">
                        <span className="pi-usr-solicitud-titulo">Lote de {compra.entradas.length} entrada(s) · Total: Bs. {compra.montoTotal}</span>
                        {compra.estado === 'pendiente' ? (
                          <span className="pi-usr-badge pi-usr-badge-pend"><FaHourglassHalf /> En revisión</span>
                        ) : (
                          <span className="pi-usr-badge pi-usr-badge-ok"><FaCheckCircle /> Aprobado</span>
                        )}
                      </div>
                      <span className="pi-usr-solicitud-fecha">{compra.fecha} · {compra.hora}</span>

                      {compra.estado === 'pendiente' && (
                        <button className="pi-usr-btn-demo" onClick={() => simularConfirmacionAdmin(compra.id)}>
                          Simular Aprobación del Admin (Demo)
                        </button>
                      )}

                      {compra.estado === 'confirmado' && (
                        <div className="pi-usr-credenciales">
                          <p className="texto-ayuda" style={{marginTop: '10px'}}>Credenciales generadas exitosamente:</p>
                          {compra.entradas.map((ent, i) => (
                            <div key={i} className="pi-usr-credencial">
                              <img src={ent.qrUrl} alt={`QR`} className="qr-miniatura"/>
                              <div className="credencial-datos">
                                <span className="cred-cat" style={{color: categoriasEntradas.find(c=>c.id === ent.categoriaId)?.color}}>
                                  {categoriasEntradas.find(c=>c.id === ent.categoriaId)?.nombre}
                                </span>
                                <span className="pi-usr-credencial-nombre">{ent.nombre} {ent.isTitular && "(Tú)"}</span>
                                <span className="pi-usr-credencial-linea"><FaEnvelope /> {ent.correo}</span>
                                {!ent.isTitular && (
                                  <div className="credencial-nueva-cuenta">
                                    <span className="pi-usr-credencial-linea"><FaKey /> Pass Temporal: <strong>{ent.password}</strong></span>
                                  </div>
                                )}
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

      {/* =========================================================
          PESTAÑA 2: MI SALDO Y ENTRADA (Maneja Espera vs Aprobado)
      ========================================================= */}
      {pestana === 'saldo' && (
        <div className="pi-usr-saldo">
          
          {/* ESTADO 1: EN ESPERA DE APROBACIÓN */}
          {!miCuentaActiva ? (
            <div className="pi-usr-espera-aprobacion">
              <div className="espera-icono">
                <FaLock size={48} color="var(--blanco)" />
              </div>
              <h3>Tu cuenta está en revisión</h3>
              <p>
                Aún no tienes una entrada validada. Estamos esperando que el Administrador apruebe el comprobante de pago vinculado a tu cuenta para activar tu código QR y habilitar tu saldo.
              </p>
              <div className="espera-info-extra">
                <FaHourglassHalf color="var(--ambar-aviso)"/>
                <span>Generalmente esto toma menos de 24 horas hábiles.</span>
              </div>
              
              <button className="pi-usr-btn-demo mt-20" onClick={() => {setMiCuentaActiva(true); setHistorial(historialInicial)}}>
                Simular Aprobación para ver el Dashboard (Demo)
              </button>
            </div>
          ) : (
            
            /* ESTADO 2: CUENTA ACTIVA Y APROBADA */
            <div className="pi-usr-saldo-activo animate-fade-in">
              <div className="pi-usr-saldo-top">
                <div className={`pi-usr-pase-card ${miCategoriaAcceso === 'VIP' ? 'is-vip' : 'is-general'}`}>
                  <FaUserTag size={36} color="var(--blanco)" style={{marginBottom: '10px'}} />
                  <span className="pase-label">TIPO DE ACCESO</span>
                  <span className="pase-tipo">PASE {miCategoriaAcceso}</span>
                </div>

                <div className="pi-usr-saldo-card">
                  <FaWallet size={30} color="var(--indigo-profundo)" />
                  <span className="pi-usr-saldo-numero">{saldo} pts</span>
                  <span className="pi-usr-saldo-label">Saldo digital disponible para gastar en el evento</span>
                </div>

                <div className="pi-usr-qr-card">
                  <img src={qrDe(`QPASS-${usuario.email}`)} alt="Tu código QR" />
                  <div className="qr-info-text">
                    <span className="pi-usr-qr-titulo"><FaQrcode /> Tu Manilla Digital</span>
                    <span className="pi-usr-qr-nota">Muestra este código en puerta y en los puestos de venta.</span>
                  </div>
                </div>
              </div>

              <div className="pi-usr-card mt-20">
                <h3><FaHistory color="var(--indigo-profundo)" /> Mis Transacciones (Compras y Recargas)</h3>
                <div className="pi-usr-tabla-wrapper">
                  <table className="pi-usr-tabla">
                    <thead>
                      <tr>
                        <th>Movimiento</th>
                        <th>Lugar / Detalle</th>
                        <th>Monto</th>
                        <th>Fecha / Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.length === 0 ? (
                        <tr><td colSpan="4" style={{textAlign:'center', padding:'30px', color:'var(--gris-medio)'}}>Aún no tienes movimientos registrados.</td></tr>
                      ) : (
                        historial.map(item => (
                          <tr key={item.id}>
                            <td>
                              <span className="pi-usr-tipo-celda">
                                {item.tipo === 'recarga' && <><FaCoins color="var(--verde-recarga-texto)" /> Recarga de Saldo</>}
                                {item.tipo === 'compra_qr' && <><FaStore color="var(--indigo-profundo)" /> Consumo en Puesto</>}
                                {item.tipo === 'entrada' && <><FaTicketAlt color="var(--coral-compra)" /> Pago de Entrada</>}
                              </span>
                            </td>
                            <td>{item.detalle}</td>
                            <td className={item.tipo === 'recarga' ? 'pi-usr-monto-positivo' : 'pi-usr-monto-negativo'}>
                              {item.tipo === 'recarga' ? '+' : item.tipo === 'compra_qr' ? '-' : ''}{item.monto} {item.unidad}
                            </td>
                            <td style={{color: 'var(--texto-secundario)', fontSize: '13px'}}>{item.fecha} {item.hora}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}