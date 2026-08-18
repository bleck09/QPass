import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaWallet, FaQrcode, FaUpload, FaPlus, FaTrash, FaUserPlus,
  FaCheckCircle, FaHourglassHalf, FaEnvelope, FaHistory,
  FaStore, FaCoins, FaExclamationTriangle, FaKey, FaUserTag, FaIdCard, FaLock, FaUserCheck,
  FaSearch, FaTimes, FaPhoneAlt, FaCalendarAlt, FaMapMarkerAlt, FaUsers
} from 'react-icons/fa';
import './UsuarioNormal.css';
import CarruselEventos from './CarruselEventos.jsx';
import { proximosEventos, eventosPasados } from './data/eventos.js';

const MAX_ENTRADAS = 6;

const categoriasEntradas = [
  { id: 'general', nombre: 'General', descripcion: 'Acceso general al recinto del evento.', precio: 150, color: 'var(--cian-digital)' },
  { id: 'vip', nombre: 'VIP', descripcion: 'Acceso a zona VIP con área preferencial.', precio: 300, color: 'var(--ambar-aviso)' },
];

// --- SOLICITUDES DE COMPRA Y REPORTES DE DATOS (compartidos con Admin vía localStorage) ---
const CLAVE_SOLICITUDES = 'qpass_solicitudes_entradas';
const CLAVE_REPORTES_ENTRADAS = 'qpass_reportes_entradas';

const leerSolicitudes = () => {
  const guardado = localStorage.getItem(CLAVE_SOLICITUDES);
  return guardado ? JSON.parse(guardado) : [];
};

const guardarSolicitudes = (lista) => {
  localStorage.setItem(CLAVE_SOLICITUDES, JSON.stringify(lista));
};

const leerReportesEntradas = () => {
  const guardado = localStorage.getItem(CLAVE_REPORTES_ENTRADAS);
  return guardado ? JSON.parse(guardado) : [];
};

const guardarReportesEntradas = (lista) => {
  localStorage.setItem(CLAVE_REPORTES_ENTRADAS, JSON.stringify(lista));
};

const ETIQUETA_CAMPO = { nombre: 'Nombre completo', correo: 'Correo electrónico', celular: 'Celular' };

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

// Un evento vence cuando su fecha ya pasó. Usamos fechaISO cuando está disponible
// (el catálogo compartido la trae); si no, caemos a `fecha` por compatibilidad con datos viejos guardados en localStorage.
const esVigente = (evento) => new Date(evento.fechaISO || evento.fecha) >= new Date();

// --- DATOS DE PAGO DEL NEGOCIO (QR genérico que se muestra al hacer clic en "Pagar") ---
const DATOS_PAGO_NEGOCIO = {
  nombre: 'QPass Eventos',
  qrUrl: qrDe('QPASS-PAGO-NEGOCIO'),
};

// Entrada de ejemplo de un evento YA PASADO, para mostrar cómo se ve el historial
// (los datos de entradas de eventos pasados ya no se pueden reportar).
const comprasSeedPasadas = (usuario) => [
  {
    id: 900001,
    compradorNombre: usuario.nombre,
    compradorEmail: usuario.email,
    evento: { nombre: 'Feria Gastronómica La Paz 2025', fecha: '2025-11-20', fechaISO: '2025-11-20' },
    entradas: [
      {
        id: 900001, isTitular: true, nombre: usuario.nombre, correo: usuario.email, celular: '71234567',
        categoriaId: 'general', precio: 50, password: null, qrUrl: qrDe(`QPASS-${usuario.email}`),
      },
    ],
    montoTotal: 50,
    comprobante: { nombreArchivo: 'comprobante_feria.jpg', previewUrl: 'https://placehold.co/150x150/e3e6ee/1A2B6B?text=Recibo' },
    estado: 'confirmado',
    fecha: '15/11/2025',
    hora: '19:00',
  },
];

export default function UsuarioNormal() {
  const [usuario] = useState(() => {
    const guardado = localStorage.getItem('usuarioProyectoIngresos');
    return guardado ? JSON.parse(guardado) : { nombre: 'Vladimir Chambi', email: 'vladimir@univalle.edu' };
  });

  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/eventos')
    ? 'eventos'
    : location.pathname.endsWith('/comprar')
    ? 'comprar'
    : location.pathname.endsWith('/saldo')
    ? 'saldo'
    : 'misentradas';

  // Evento para el que se está comprando: llega desde "Adquirir Entradas" en la pestaña Eventos.
  // Si se entra directo a /usuarionormal/comprar (sin pasar por ahí), caemos al primer evento disponible.
  const eventoSeleccionado = location.state?.evento || proximosEventos[0];

  // --- ESTADOS DE SIMULACIÓN Y LÓGICA DE NEGOCIO ---
  const [yaTieneEntrada, setYaTieneEntrada] = useState(false);
  const [miCuentaActiva, setMiCuentaActiva] = useState(false);

  // --- ESTADOS DE COMPRAS (persistidas para que Admin las vea en detalle) ---
  const [compras, setCompras] = useState(() => {
    const propias = leerSolicitudes().filter(c => c.compradorEmail === usuario.email);
    // Primera vez que entra: sembramos una compra de ejemplo de un evento ya pasado,
    // para que Mis Entradas no se vea vacío en el mockup.
    return propias.length > 0 ? propias : comprasSeedPasadas(usuario);
  });

  // Sincronizamos cada cambio con el resto de solicitudes guardadas (de otros compradores).
  useEffect(() => {
    const otras = leerSolicitudes().filter(c => c.compradorEmail !== usuario.email);
    guardarSolicitudes([...otras, ...compras]);
  }, [compras, usuario.email]);

  // --- MIS ENTRADAS: sub-pestaña propias vs. compradas para invitados ---
  const [subTabEntradas, setSubTabEntradas] = useState('mias');

  // --- REVISAR MI SOLICITUD: edición mientras está pendiente, reporte si ya fue aprobada ---
  const [compraEnRevision, setCompraEnRevision] = useState(null);
  const [entradasEdicion, setEntradasEdicion] = useState([]);
  const [errorRevision, setErrorRevision] = useState('');

  // Reporte de datos incorrectos (compartido entre "Revisar mi solicitud" y Mis Entradas):
  // entradaReportando = { compraId, entrada } de la entrada que se está reportando.
  const [entradaReportando, setEntradaReportando] = useState(null);
  const [camposReporte, setCamposReporte] = useState([]);
  const [descripcionReporte, setDescripcionReporte] = useState('');
  const [entradasReportadas, setEntradasReportadas] = useState(
    () => leerReportesEntradas().filter(r => r.compradorEmail === usuario.email).map(r => r.entradaId)
  );

  // El carrito inicia asumiendo que NO tiene entrada (el primer ticket es Titular)
  const [entradasCart, setEntradasCart] = useState([
    { id: "12/02/26", isTitular: true, nombre: usuario.nombre, correo: usuario.email, celular: '', categoriaId: 'general', precio: 150 }
  ]);

  const [comprobante, setComprobante] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  // Al hacer clic en "Pagar" se muestra primero el QR del negocio; solo después se habilita subir el comprobante.
  const [pagoIniciado, setPagoIniciado] = useState(false);

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

  // Aplana todas las compras (pasadas y vigentes) en entradas individuales para Mis Entradas.
  const entradasHistorial = useMemo(() => {
    return compras
      .flatMap(compra => {
        const evento = compra.evento || proximosEventos[0];
        const vigente = esVigente(evento);
        return compra.entradas.map(ent => ({
          ...ent,
          compraId: compra.id,
          compraEstado: compra.estado,
          fechaCompra: compra.fecha,
          evento,
          vigente,
        }));
      })
      .sort((a, b) => new Date(b.evento.fechaISO || b.evento.fecha) - new Date(a.evento.fechaISO || a.evento.fecha));
  }, [compras]);

  const entradasMisEntradas = useMemo(
    () => entradasHistorial.filter(ent => subTabEntradas === 'mias' ? ent.isTitular : !ent.isTitular),
    [entradasHistorial, subTabEntradas]
  );

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
    setPagoIniciado(false);
    setComprobante(null);
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
      {
        id: Date.now(),
        compradorNombre: usuario.nombre,
        compradorEmail: usuario.email,
        evento: eventoSeleccionado,
        entradas: [...entradasCart],
        montoTotal: montoTotalEntradas,
        comprobante,
        estado: 'pendiente',
        fecha,
        hora,
      },
      ...prev,
    ]);

    // Resetear el formulario basándonos en si ya tenía entrada o no
    if (yaTieneEntrada) {
      setEntradasCart([{ id: "12/02/26", isTitular: false, nombre: '', correo: '', celular: '', categoriaId: 'general', precio: 150 }]);
    } else {
      setEntradasCart([{ id: "12/02/26", isTitular: true, nombre: usuario.nombre, correo: usuario.email, celular: '', categoriaId: 'general', precio: 150 }]);
    }
    setComprobante(null);
    setPagoIniciado(false);

    // La solicitud recién creada aparece como pendiente en Mis Entradas.
    navigate('/usuarionormal');
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

  // --- REVISAR MI SOLICITUD ---
  const abrirRevision = (compra) => {
    setCompraEnRevision(compra);
    setEntradasEdicion(compra.entradas.map(ent => ({ ...ent })));
    setErrorRevision('');
    cancelarReporte();
  };

  const abrirRevisionPorId = (compraId) => {
    const compra = compras.find(c => c.id === compraId);
    if (compra) abrirRevision(compra);
  };

  const cerrarRevision = () => {
    setCompraEnRevision(null);
    setEntradasEdicion([]);
    setErrorRevision('');
    cancelarReporte();
  };

  const actualizarEntradaEdicion = (id, campo, valor) => {
    setEntradasEdicion(prev => prev.map(ent => ent.id === id ? { ...ent, [campo]: valor } : ent));
  };

  // Solo aplica mientras la solicitud sigue pendiente: aún se puede corregir sin generar un reporte.
  const guardarRevision = () => {
    setErrorRevision('');
    const incompleto = entradasEdicion.some(ent => !ent.nombre.trim() || !ent.correo.trim() || !ent.celular.trim());
    if (incompleto) return setErrorRevision('Completa nombre, correo y celular de cada entrada.');

    const correos = entradasEdicion.map(ent => ent.correo.toLowerCase());
    if (correos.length !== new Set(correos).size) return setErrorRevision('Cada entrada necesita un correo electrónico único.');

    setCompras(prev => prev.map(c => c.id === compraEnRevision.id ? { ...c, entradas: entradasEdicion } : c));
    cerrarRevision();
  };

  // Una vez aprobada la solicitud ya no se edita directo: se reporta el/los dato(s) mal puestos para que Admin los corrija.
  const iniciarReporte = (compraId, entrada) => {
    setEntradaReportando({ compraId, entrada });
    setCamposReporte([]);
    setDescripcionReporte('');
  };

  const cancelarReporte = () => {
    setEntradaReportando(null);
    setCamposReporte([]);
    setDescripcionReporte('');
  };

  const toggleCampoReporte = (campo) => {
    setCamposReporte(prev => prev.includes(campo) ? prev.filter(c => c !== campo) : [...prev, campo]);
  };

  // Genera un reporte por cada dato marcado (nombre, correo y/o celular), así se pueden
  // reportar varios datos mal puestos de una sola vez en lugar de solo uno.
  const enviarReporte = () => {
    if (!entradaReportando || camposReporte.length === 0 || !descripcionReporte.trim()) return;

    const { compraId, entrada } = entradaReportando;
    const { fecha, hora } = fechaHoraActual();

    const nuevosReportes = camposReporte.map((campo, i) => ({
      id: Date.now() + i,
      compraId,
      entradaId: entrada.id,
      participanteNombre: entrada.nombre,
      correoActual: entrada.correo,
      celularActual: entrada.celular,
      campo,
      descripcion: descripcionReporte.trim(),
      compradorNombre: usuario.nombre,
      compradorEmail: usuario.email,
      estado: 'pendiente',
      fecha,
      hora,
    }));

    guardarReportesEntradas([...nuevosReportes, ...leerReportesEntradas()]);
    setEntradasReportadas(prev => [...prev, entrada.id]);
    cancelarReporte();
  };

  // Formulario reutilizado tanto dentro de "Revisar mi solicitud" como en Mis Entradas.
  const formularioReporte = (
    <div className="pi-usr-form-reporte">
      <label>¿Qué datos están mal? (puedes marcar varios)</label>
      <div className="pi-usr-checks-reporte">
        {Object.keys(ETIQUETA_CAMPO).map(campo => (
          <label key={campo} className="pi-usr-check-campo">
            <input type="checkbox" checked={camposReporte.includes(campo)} onChange={() => toggleCampoReporte(campo)} />
            {ETIQUETA_CAMPO[campo]}
          </label>
        ))}
      </div>
      <label>Cuéntale a Admin cuáles son los datos correctos</label>
      <textarea
        rows={3}
        placeholder="Ej: el nombre correcto es Juan Pérez y el celular es 71234567"
        value={descripcionReporte}
        onChange={(e) => setDescripcionReporte(e.target.value)}
        autoFocus
      />
      <div className="pi-usr-modal-acciones">
        <button className="btn-cerrar-secundario" onClick={cancelarReporte}>Cancelar</button>
        <button
          className="pi-usr-btn-enviar"
          onClick={enviarReporte}
          disabled={camposReporte.length === 0 || !descripcionReporte.trim()}
        >
          <FaExclamationTriangle /> Enviar Reporte
        </button>
      </div>
    </div>
  );

  return (
    <div className="pi-usr-container">

      <div className="pi-usr-header">
        <h2>Panel de Asistente</h2>
        <div className="pi-usr-tabs">
          <button className={pestana === 'eventos' ? 'activo' : ''} onClick={() => navigate('/usuarionormal/eventos')}>
            <FaCalendarAlt /> Eventos
          </button>
          <button className={pestana === 'misentradas' ? 'activo' : ''} onClick={() => navigate('/usuarionormal')}>
            <FaTicketAlt /> Mis Entradas
          </button>
          <button className={pestana === 'saldo' ? 'activo' : ''} onClick={() => navigate('/usuarionormal/saldo')}>
            <FaWallet /> Mi Saldo
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
          PESTAÑA: EVENTOS (elegir a qué evento comprar)
      ========================================================= */}
      {pestana === 'eventos' && (
        <div className="pi-usr-eventos">
          <div className="pi-usr-eventos-panel">
            <CarruselEventos
              eventos={proximosEventos}
              onAdquirir={(evento) => navigate('/usuarionormal/comprar', { state: { evento } })}
            />
          </div>

          <div className="pi-usr-card mt-20">
            <h3><FaHistory color="var(--indigo-profundo)" /> Eventos Pasados</h3>
            <div className="pi-usr-eventos-pasados-grid">
              {eventosPasados.map(ev => (
                <div key={ev.id} className="pi-usr-evento-pasado-card">
                  <img src={ev.imagen} alt={ev.nombre} />
                  <div className="pi-usr-evento-pasado-info">
                    <strong>{ev.nombre}</strong>
                    <span><FaMapMarkerAlt /> {ev.lugar} · {ev.fecha}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PESTAÑA: COMPRAR (formulario compacto, para el evento seleccionado)
      ========================================================= */}
      {pestana === 'comprar' && (
        <div className="pi-usr-comprar">

          <div className="pi-usr-evento-header">
            <img src={eventoSeleccionado.imagen} alt={eventoSeleccionado.nombre} />
            <div>
              <span className="pi-usr-evento-header-eyebrow">Comprando entradas para</span>
              <h3>{eventoSeleccionado.nombre}</h3>
              <span className="texto-ayuda">
                <FaCalendarAlt /> {eventoSeleccionado.fecha} · <FaMapMarkerAlt /> {eventoSeleccionado.lugar}
              </span>
            </div>
          </div>

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

          <div className="pi-usr-comprar-grid">
            <div className="pi-usr-comprar-col-entradas">
              <div className="pi-usr-cart-list">
                {entradasCart.map((entrada, index) => {
                  const catSeleccionada = categoriasEntradas.find(c => c.id === entrada.categoriaId);
                  return (
                    <div key={entrada.id} className="pi-usr-ticket-row" style={{ borderLeftColor: catSeleccionada.color }}>
                      <div className="pi-usr-ticket-row-top">
                        <span className="pi-usr-ticket-row-titulo">
                          {entrada.isTitular ? <FaUserTag color="var(--indigo-profundo)"/> : <FaUserPlus color="var(--gris-medio)"/>}
                          {entrada.isTitular ? 'Tú' : `Invitado ${index + (yaTieneEntrada ? 1 : 0)}`}
                        </span>

                        <div className="pi-usr-cat-mini-group">
                          {categoriasEntradas.map(cat => (
                            <button
                              key={cat.id}
                              className={`btn-cat-mini ${entrada.categoriaId === cat.id ? 'activa' : ''}`}
                              onClick={() => actualizarEntrada(entrada.id, 'categoriaId', cat.id)}
                            >
                              {cat.nombre} · Bs.{cat.precio}
                            </button>
                          ))}
                        </div>

                        {(!entrada.isTitular && entradasCart.length > 1) && (
                          <button className="btn-eliminar-ticket" onClick={() => quitarEntrada(entrada.id)}>
                            <FaTrash />
                          </button>
                        )}
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
                  )
                })}
              </div>

              {entradasCart.length < MAX_ENTRADAS && (
                <button className="pi-usr-btn-agregar-mas" onClick={agregarEntrada}>
                  <FaPlus /> Añadir otra entrada para un amigo (Máx. {MAX_ENTRADAS})
                </button>
              )}
            </div>

            <div className="pi-usr-comprar-col-resumen">
              <div className="pi-usr-card pi-usr-pago-card">
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

                {!pagoIniciado ? (
                  <button className="pi-usr-btn-enviar" onClick={() => setPagoIniciado(true)}>
                    <FaQrcode /> Pagar
                  </button>
                ) : (
                  <>
                    <div className="pi-usr-qr-card">
                      <img src={DATOS_PAGO_NEGOCIO.qrUrl} alt="QR de pago del negocio" />
                      <div className="qr-info-text">
                        <span className="pi-usr-qr-titulo"><FaQrcode /> Escanea para pagar</span>
                        <span className="pi-usr-qr-nota">
                          Transfiere Bs. {montoTotalEntradas.toFixed(2)} a {DATOS_PAGO_NEGOCIO.nombre} y luego sube tu comprobante.
                        </span>
                      </div>
                    </div>

                    <div className="pi-usr-comprobante">
                      <span className="pi-usr-form-label">Comprobante de Transferencia</span>
                      <p className="texto-ayuda" style={{marginBottom: '10px'}}>Sube la captura de tu transferencia aquí.</p>
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

                    <button className="pi-usr-btn-enviar" onClick={handleEnviarComprobante}>
                      <FaCheckCircle /> Enviar Pago y Solicitar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PESTAÑA: MI SALDO (Maneja Espera vs Aprobado)
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

      {/* =========================================================
          PESTAÑA: MIS ENTRADAS (propias / para invitados, editar en revisión, reportar)
      ========================================================= */}
      {pestana === 'misentradas' && (
        <div className="pi-usr-mis-entradas">
          <div className="pi-usr-subtabs">
            <button className={subTabEntradas === 'mias' ? 'activo' : ''} onClick={() => setSubTabEntradas('mias')}>
              <FaUserTag /> Mis entradas
            </button>
            <button className={subTabEntradas === 'invitados' ? 'activo' : ''} onClick={() => setSubTabEntradas('invitados')}>
              <FaUsers /> Compradas para otros
            </button>
          </div>

          <p className="texto-ayuda" style={{ marginBottom: '4px' }}>
            {subTabEntradas === 'mias'
              ? 'Las entradas asignadas a tu propia cuenta.'
              : 'Las entradas que compraste para tus invitados.'}
            {' '}Puedes editar los datos mientras la solicitud está en revisión, o reportarlos si ya fue aprobada
            y el evento sigue vigente.
          </p>

          {entradasMisEntradas.length === 0 ? (
            <div className="pi-usr-card mt-20" style={{ textAlign: 'center', color: 'var(--gris-medio)' }}>
              {subTabEntradas === 'mias' ? 'Aún no tienes entradas propias.' : 'Aún no compraste entradas para invitados.'}
            </div>
          ) : (
            <div className="pi-usr-entradas-grid mt-20">
              {entradasMisEntradas.map(ent => {
                const cat = categoriasEntradas.find(c => c.id === ent.categoriaId);
                const reportada = entradasReportadas.includes(ent.id);
                return (
                  <div key={ent.id} className="pi-usr-entrada-card" style={{ borderTopColor: cat?.color }}>
                    <div className="pi-usr-entrada-card-top">
                      <span className="pi-usr-entrada-nombre">
                        {ent.isTitular ? <FaUserTag color="var(--indigo-profundo)" /> : <FaUserPlus color="var(--gris-medio)" />}
                        {ent.nombre} {ent.isTitular && '(Tú)'}
                      </span>
                      <span className="pi-usr-badge" style={{ background: 'var(--gris-niebla)', color: 'var(--texto-principal)' }}>
                        {cat?.nombre || ent.categoriaId}
                      </span>
                    </div>

                    <div className="pi-usr-entrada-evento">
                      <FaCalendarAlt /> {ent.evento.nombre} · {ent.evento.fecha}
                    </div>

                    <div className="pi-usr-revision-datos">
                      <span><FaEnvelope /> {ent.correo}</span>
                      <span><FaPhoneAlt /> {ent.celular || '—'}</span>
                    </div>

                    <div className="pi-usr-entrada-badges">
                      {ent.compraEstado === 'confirmado' ? (
                        <span className="pi-usr-badge pi-usr-badge-ok"><FaCheckCircle /> Aprobado</span>
                      ) : (
                        <span className="pi-usr-badge pi-usr-badge-pend"><FaHourglassHalf /> En revisión</span>
                      )}
                      {ent.vigente
                        ? <span className="pi-usr-badge pi-usr-badge-vigente">Vigente</span>
                        : <span className="pi-usr-badge pi-usr-badge-pasado">Evento pasado</span>}
                    </div>

                    {ent.compraEstado === 'confirmado' && (
                      <div className="pi-usr-entrada-qr">
                        <img src={ent.qrUrl} alt="QR" className="qr-miniatura" />
                        {!ent.isTitular && ent.password && (
                          <span className="pi-usr-credencial-linea"><FaKey /> Pass: <strong>{ent.password}</strong></span>
                        )}
                      </div>
                    )}

                    <div className="pi-usr-entrada-acciones">
                      {ent.compraEstado === 'pendiente' && (
                        <>
                          <button className="pi-usr-btn-revisar" onClick={() => abrirRevisionPorId(ent.compraId)}>
                            <FaSearch /> Revisar mi solicitud
                          </button>
                          <button className="pi-usr-btn-demo" onClick={() => simularConfirmacionAdmin(ent.compraId)}>
                            Simular Aprobación (Demo)
                          </button>
                        </>
                      )}

                      {ent.compraEstado === 'confirmado' && ent.vigente && (
                        reportada ? (
                          <span className="pi-usr-badge pi-usr-badge-pend"><FaExclamationTriangle /> Reportado</span>
                        ) : (
                          <button className="pi-usr-btn-reportar-entrada" onClick={() => iniciarReporte(ent.compraId, ent)}>
                            <FaExclamationTriangle /> Reportar error
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- REPORTAR ERROR DE DATOS (desde Mis Entradas) --- */}
      {entradaReportando && !compraEnRevision && (
        <div className="pi-usr-modal-overlay" onClick={cancelarReporte}>
          <div className="pi-usr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pi-usr-modal-header">
              <h3><FaExclamationTriangle color="var(--ambar-aviso-texto)" /> Reportar error de datos</h3>
              <button className="pi-usr-btn-cerrar-modal" onClick={cancelarReporte}><FaTimes /></button>
            </div>
            <div className="pi-usr-modal-body">
              <p className="texto-ayuda">Entrada de: <strong>{entradaReportando.entrada.nombre}</strong></p>
              {formularioReporte}
            </div>
          </div>
        </div>
      )}

      {/* --- REVISAR MI SOLICITUD --- */}
      {compraEnRevision && (
        <div className="pi-usr-modal-overlay" onClick={cerrarRevision}>
          <div className="pi-usr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pi-usr-modal-header">
              <h3><FaSearch color="var(--indigo-profundo)" /> Revisar mi solicitud</h3>
              <button className="pi-usr-btn-cerrar-modal" onClick={cerrarRevision}><FaTimes /></button>
            </div>

            <div className="pi-usr-modal-body">
              <p className="texto-ayuda">
                Lote de {compraEnRevision.entradas.length} entrada(s) · {compraEnRevision.fecha} · {compraEnRevision.hora}
              </p>

              {compraEnRevision.estado === 'pendiente' ? (
                <>
                  <p className="texto-ayuda">
                    Tu solicitud aún está en revisión: puedes corregir el nombre, correo o celular de cada entrada.
                    El comprobante de pago no se puede modificar.
                  </p>

                  <div className="pi-usr-cart-list">
                    {entradasEdicion.map((ent, i) => (
                      <div key={ent.id} className="pi-usr-revision-entrada">
                        <span className="pi-usr-revision-titulo">
                          {ent.isTitular ? <FaUserTag color="var(--indigo-profundo)" /> : <FaUserPlus color="var(--gris-medio)" />}
                          {ent.isTitular ? ' Tu entrada' : ` Entrada ${i + 1} (Invitado)`}
                        </span>
                        <div className="pi-usr-ticket-inputs">
                          <div className="input-group">
                            <label>Nombre Completo</label>
                            <input
                              type="text"
                              value={ent.nombre}
                              onChange={(e) => actualizarEntradaEdicion(ent.id, 'nombre', e.target.value)}
                              disabled={ent.isTitular}
                            />
                          </div>
                          <div className="input-group">
                            <label>Correo Electrónico</label>
                            <input
                              type="email"
                              value={ent.correo}
                              onChange={(e) => actualizarEntradaEdicion(ent.id, 'correo', e.target.value)}
                              disabled={ent.isTitular}
                            />
                          </div>
                          <div className="input-group">
                            <label>Celular (WhatsApp)</label>
                            <input
                              type="tel"
                              value={ent.celular}
                              onChange={(e) => actualizarEntradaEdicion(ent.id, 'celular', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {errorRevision && <div className="pi-usr-alerta-error"><FaExclamationTriangle /> {errorRevision}</div>}

                  <div className="pi-usr-modal-acciones">
                    <button className="btn-cerrar-secundario" onClick={cerrarRevision}>Cerrar</button>
                    <button className="pi-usr-btn-enviar" onClick={guardarRevision}>
                      <FaCheckCircle /> Guardar cambios
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="texto-ayuda">
                    Tu solicitud ya fue aprobada, así que los datos no se pueden editar directamente. Si el nombre,
                    correo o celular de alguna entrada está mal, repórtalo para que Admin lo corrija.
                  </p>

                  {!esVigente(compraEnRevision.evento || proximosEventos[0]) && (
                    <div className="pi-usr-alerta-error">
                      <FaExclamationTriangle /> El evento de esta solicitud ya pasó, así que ya no se pueden reportar datos.
                    </div>
                  )}

                  <div className="pi-usr-cart-list">
                    {compraEnRevision.entradas.map((ent) => {
                      const vigente = esVigente(compraEnRevision.evento || proximosEventos[0]);
                      const reportando = entradaReportando?.entrada?.id === ent.id;
                      return (
                        <div key={ent.id} className="pi-usr-revision-entrada">
                          <div className="pi-usr-revision-cabecera">
                            <span className="pi-usr-revision-titulo">
                              {ent.isTitular ? <FaUserTag color="var(--indigo-profundo)" /> : <FaUserPlus color="var(--gris-medio)" />}
                              {' '}{ent.nombre} {ent.isTitular && '(Tú)'}
                            </span>
                            {vigente && (
                              entradasReportadas.includes(ent.id) ? (
                                <span className="pi-usr-badge pi-usr-badge-pend"><FaExclamationTriangle /> Reportado</span>
                              ) : !reportando && (
                                <button className="pi-usr-btn-reportar-entrada" onClick={() => iniciarReporte(compraEnRevision.id, ent)}>
                                  <FaExclamationTriangle /> Reportar error
                                </button>
                              )
                            )}
                          </div>
                          <div className="pi-usr-revision-datos">
                            <span><FaEnvelope /> {ent.correo}</span>
                            <span><FaPhoneAlt /> {ent.celular || '—'}</span>
                          </div>

                          {reportando && formularioReporte}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pi-usr-modal-acciones">
                    <button className="btn-cerrar-secundario" onClick={cerrarRevision}>Cerrar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
