import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaWallet, FaQrcode, FaUpload, FaPlus, FaTrash, FaUserPlus,
  FaCheckCircle, FaHourglassHalf, FaEnvelope, FaHistory,
  FaStore, FaCoins, FaExclamationTriangle, FaUserTag, FaIdCard,
  FaSearch, FaTimes, FaPhoneAlt, FaCalendarAlt, FaMapMarkerAlt
} from 'react-icons/fa';
import './UsuarioNormal.css';
import CarruselEventos from '../../components/CarruselEventos.jsx';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { esVigente, formatearFecha, imagenEvento } from '../../utils/eventos.js';

const MAX_ENTRADAS = 6;

const ETIQUETA_CAMPO = { nombre: 'Nombre completo', correo: 'Correo electrónico', celular: 'Celular' };

const COLORES_CATEGORIA = ['var(--cian-digital)', 'var(--ambar-aviso)', 'var(--coral-compra)', 'var(--indigo-profundo)'];

const qrDe = (texto) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(texto)}`;

// --- DATOS DE PAGO DEL NEGOCIO (QR genérico que se muestra al hacer clic en "Pagar") ---
const DATOS_PAGO_NEGOCIO = {
  nombre: 'QPass Eventos',
  qrUrl: qrDe('QPASS-PAGO-NEGOCIO'),
};

export default function UsuarioNormal() {
  const [usuario] = useState(() => leerSesion() || { nombre: 'Invitado', email: '' });

  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/eventos')
    ? 'eventos'
    : location.pathname.endsWith('/comprar')
    ? 'comprar'
    : location.pathname.endsWith('/saldo')
    ? 'saldo'
    : 'misentradas';

  const [proximosEventos, setProximosEventos] = useState([]);
  const [eventosPasados, setEventosPasados] = useState([]);
  const [categoriasEntradas, setCategoriasEntradas] = useState([]);

  useEffect(() => {
    api.eventos.listar().then((todos) => {
      setProximosEventos(todos.filter(esVigente));
      setEventosPasados(todos.filter(ev => !esVigente(ev)));
    });
  }, []);

  // Evento para el que se está comprando: llega desde "Adquirir Entradas" en la pestaña Eventos.
  // Si se entra directo a /usuarionormal/comprar (sin pasar por ahí), caemos al primer evento disponible.
  const eventoSeleccionado = location.state?.evento || proximosEventos[0];

  useEffect(() => {
    if (!eventoSeleccionado) return;
    api.categoriasTicket.listar(eventoSeleccionado.id).then(lista => {
      setCategoriasEntradas(lista.map((c, i) => ({ ...c, color: COLORES_CATEGORIA[i % COLORES_CATEGORIA.length] })));
    });
  }, [eventoSeleccionado?.id]);

  // --- ESTADOS DE COMPRAS (traídas del backend; Admin las aprueba desde su panel) ---
  const [compras, setCompras] = useState([]);

  const recargarCompras = () => api.compras.mias().then(setCompras);
  useEffect(() => { recargarCompras(); }, []);

  // --- MIS ENTRADAS: mostrar u ocultar las entradas de eventos ya pasados ---
  const [mostrarPasadas, setMostrarPasadas] = useState(false);

  // --- REVISAR MI SOLICITUD: edición mientras está pendiente, reporte si ya fue aprobada ---
  const [compraEnRevision, setCompraEnRevision] = useState(null);
  const [entradasEdicion, setEntradasEdicion] = useState([]);
  const [errorRevision, setErrorRevision] = useState('');

  // Reporte de datos incorrectos (compartido entre "Revisar mi solicitud" y Mis Entradas):
  // entradaReportando = { compraId, entrada } de la entrada que se está reportando.
  const [entradaReportando, setEntradaReportando] = useState(null);
  const [camposReporte, setCamposReporte] = useState([]);
  const [descripcionReporte, setDescripcionReporte] = useState('');
  const [entradasReportadas, setEntradasReportadas] = useState([]);
  useEffect(() => {
    api.reportesEntrada.listar().then(lista => setEntradasReportadas(lista.map(r => r.entradaId)));
  }, []);

  // El carrito arranca vacío: cada entrada (la tuya incluida) se agrega eligiendo una categoría abajo.
  const [entradasCart, setEntradasCart] = useState([]);

  const [comprobante, setComprobante] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  // Al hacer clic en "Pagar" se muestra primero el QR del negocio; solo después se habilita subir el comprobante.
  const [pagoIniciado, setPagoIniciado] = useState(false);

  const montoTotalEntradas = entradasCart.reduce((acc, entrada) => acc + Number(entrada.precio), 0);

  // Cada compra con su evento resuelto y si ese evento sigue vigente (para Mis Entradas).
  const comprasConEvento = useMemo(() => {
    return compras
      .filter(compra => compra.evento)
      .map(compra => ({ ...compra, vigente: esVigente(compra.evento) }))
      .sort((a, b) => new Date(b.evento.fecha) - new Date(a.evento.fecha));
  }, [compras]);

  // Ya tienes tu propia entrada (pendiente o aprobada) para el evento que se está comprando:
  // a partir de aquí, cada entrada nueva que agregues es para un invitado, no para ti.
  const yaTieneEntrada = useMemo(() => {
    if (!eventoSeleccionado) return false;
    return comprasConEvento.some(c =>
      c.evento.id === eventoSeleccionado.id && c.estado !== 'rechazado' && c.entradas.some(e => e.isTitular)
    );
  }, [comprasConEvento, eventoSeleccionado]);

  // Tu entrada propia ya aprobada del evento próximo más cercano: se destaca como "Tu Manilla Digital".
  const entradaDestacada = useMemo(() => {
    const candidatas = comprasConEvento
      .filter(compra => compra.vigente && compra.estado === 'confirmado' && compra.entradas.some(ent => ent.isTitular))
      .sort((a, b) => new Date(a.evento.fecha) - new Date(b.evento.fecha)); // más próximo primero
    const compraDestacada = candidatas[0];
    const titular = compraDestacada?.entradas.find(ent => ent.isTitular);
    return titular ? { ...titular, evento: compraDestacada.evento, compraId: compraDestacada.id } : null;
  }, [comprasConEvento]);

  // --- ESTADO DE SALDO (billetera personal del usuario: la misma en cualquier evento) ---
  const [historial, setHistorial] = useState([]);
  const [saldo, setSaldo] = useState(0);

  useEffect(() => {
    if (!usuario?.id) return;
    api.usuarios.obtener(usuario.id).then(u => setSaldo(Number(u.saldo)));
    api.transacciones.listar({ usuarioId: usuario.id }).then(setHistorial);
  }, [usuario?.id]);

  const totalRecargado = useMemo(
    () => historial.filter(t => t.tipo === 'recarga').reduce((total, t) => total + Number(t.monto), 0),
    [historial]
  );

  const totalGastado = useMemo(
    () => historial.filter(t => t.tipo === 'consumo').reduce((total, t) => total + Number(t.monto), 0),
    [historial]
  );

  // Cuenta regresiva hasta la fecha/hora del evento destacado (mismo cálculo que el contador de App.jsx).
  const [tiempoRestante, setTiempoRestante] = useState(null);

  useEffect(() => {
    if (!entradaDestacada) return;
    const fechaObjetivo = entradaDestacada.evento.fecha;

    const calcularTiempo = () => {
      const diferencia = +new Date(fechaObjetivo) - +new Date();
      if (diferencia <= 0) {
        setTiempoRestante({ llego: true });
        return;
      }
      setTiempoRestante({
        llego: false,
        dias: Math.floor(diferencia / (1000 * 60 * 60 * 24)),
        horas: Math.floor((diferencia / (1000 * 60 * 60)) % 24),
        minutos: Math.floor((diferencia / 1000 / 60) % 60),
        segundos: Math.floor((diferencia / 1000) % 60),
      });
    };

    calcularTiempo();
    const timer = setInterval(calcularTiempo, 1000);
    return () => clearInterval(timer);
  }, [entradaDestacada]);

  // El resto de solicitudes de eventos próximos (propias pendientes o compradas para invitados).
  const comprasOtras = useMemo(
    () => comprasConEvento.filter(compra => compra.vigente && compra.id !== entradaDestacada?.compraId),
    [comprasConEvento, entradaDestacada]
  );

  // Solicitudes de eventos que ya pasaron, solo como registro histórico.
  const comprasPasadas = useMemo(
    () => comprasConEvento.filter(compra => !compra.vigente),
    [comprasConEvento]
  );

  // --- LÓGICA DEL CARRITO ---
  // Contador local para ids de entradas del carrito (evita depender de Date.now() en el handler).
  const siguienteIdCartRef = useRef(1);

  // Cada clic en un card grande de categoría agrega una entrada: si todavía no tienes la tuya
  // (y no la tenías de antes), la primera que agregues es la tuya; las siguientes son de invitados.
  const agregarEntrada = (categoriaId) => {
    if (entradasCart.length >= MAX_ENTRADAS) return;
    const cat = categoriasEntradas.find(c => c.id === categoriaId) || categoriasEntradas[0];
    const nuevoId = `cart-${siguienteIdCartRef.current++}`;
    const esMiEntrada = !yaTieneEntrada && !entradasCart.some(ent => ent.isTitular);
    const nuevaEntrada = esMiEntrada
      ? { id: nuevoId, isTitular: true, nombre: usuario.nombre, correo: usuario.email, celular: '', categoriaTicketId: cat.id, precio: cat.precio }
      : { id: nuevoId, isTitular: false, nombre: '', correo: '', celular: '', categoriaTicketId: cat.id, precio: cat.precio };
    setEntradasCart([...entradasCart, nuevaEntrada]);
  };

  const quitarEntrada = (id) => setEntradasCart(entradasCart.filter(e => e.id !== id));

  const actualizarEntrada = (id, campo, valor) => {
    setEntradasCart(entradasCart.map(ent => {
      if (ent.id === id) {
        const updated = { ...ent, [campo]: valor };
        if (campo === 'categoriaTicketId') {
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

  const handleEnviarComprobante = async () => {
    setErrorForm('');
    if (entradasCart.length === 0) return setErrorForm('Agrega al menos una entrada antes de continuar.');
    if (!comprobante) return setErrorForm('Debes subir el comprobante de pago para continuar.');

    const invitadosIncompletos = entradasCart.some(ent => !ent.nombre.trim() || !ent.correo.trim() || (!ent.isTitular && !ent.celular.trim()));
    if (invitadosIncompletos) return setErrorForm('Completa el nombre, correo y celular de todas las personas asignadas.');

    const correos = entradasCart.map(e => e.correo.toLowerCase());
    if (correos.length !== new Set(correos).size) return setErrorForm('Cada entrada necesita un correo electrónico único.');

    try {
      await api.compras.crear({
        eventoId: eventoSeleccionado.id,
        entradas: entradasCart.map(({ isTitular, nombre, correo, celular, categoriaTicketId }) => ({ isTitular, nombre, correo, celular, categoriaTicketId })),
        comprobanteUrl: comprobante.previewUrl,
        comprobanteNombreArchivo: comprobante.nombreArchivo,
      });
      await recargarCompras();

      setEntradasCart([]);
      setComprobante(null);
      setPagoIniciado(false);

      // La solicitud recién creada aparece como pendiente en Mis Entradas.
      navigate('/usuarionormal');
    } catch (err) {
      setErrorForm(err.message);
    }
  };

  // --- REVISAR MI SOLICITUD ---
  const abrirRevision = (compra) => {
    setCompraEnRevision(compra);
    setEntradasEdicion(compra.entradas.map(ent => ({ ...ent })));
    setErrorRevision('');
    cancelarReporte();
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
  const guardarRevision = async () => {
    setErrorRevision('');
    const incompleto = entradasEdicion.some(ent => !ent.nombre.trim() || !ent.correo.trim() || !ent.celular.trim());
    if (incompleto) return setErrorRevision('Completa nombre, correo y celular de cada entrada.');

    const correos = entradasEdicion.map(ent => ent.correo.toLowerCase());
    if (correos.length !== new Set(correos).size) return setErrorRevision('Cada entrada necesita un correo electrónico único.');

    try {
      await api.compras.corregirEntradas(compraEnRevision.id, entradasEdicion);
      await recargarCompras();
      cerrarRevision();
    } catch (err) {
      setErrorRevision(err.message);
    }
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
  const enviarReporte = async () => {
    if (!entradaReportando || camposReporte.length === 0 || !descripcionReporte.trim()) return;

    const { compraId, entrada } = entradaReportando;
    await Promise.all(camposReporte.map(campo =>
      api.reportesEntrada.crear({ compraId, entradaId: entrada.id, campo, descripcion: descripcionReporte.trim() })
    ));
    setEntradasReportadas(prev => [...prev, entrada.id]);
    cancelarReporte();
  };

  // El correo de tu propia entrada (titular) es el de tu cuenta, con la que ya iniciaste
  // sesión — no tiene sentido "reportarlo mal puesto"; solo se puede reportar en invitados.
  const camposReportables = entradaReportando?.entrada?.isTitular
    ? Object.keys(ETIQUETA_CAMPO).filter(c => c !== 'correo')
    : Object.keys(ETIQUETA_CAMPO);

  // Formulario reutilizado tanto dentro de "Revisar mi solicitud" como en Mis Entradas.
  const formularioReporte = (
    <div className="pi-usr-form-reporte">
      <label>¿Qué datos están mal? (puedes marcar varios)</label>
      <div className="pi-usr-checks-reporte">
        {camposReportables.map(campo => (
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

  // Card compacta de una compra para "Otras entradas" / "Entradas pasadas": fondo con la
  // imagen del evento (para diferenciarlas de un vistazo) y sin mostrar el QR ahí mismo;
  // el QR y los datos de cada persona se ven al entrar a "Ver detalles".
  const renderCompraCard = (compra) => (
    <div key={compra.id} className="pi-usr-compra-card" style={{ backgroundImage: `url(${imagenEvento(compra.evento)})` }}>
      <div className="pi-usr-compra-card-overlay">
        <div className="pi-usr-compra-card-badges">
          {compra.estado === 'confirmado' && (
            <span className="pi-usr-badge pi-usr-badge-ok"><FaCheckCircle /> Aprobado</span>
          )}
          {compra.estado === 'pendiente' && (
            <span className="pi-usr-badge pi-usr-badge-pend"><FaHourglassHalf /> En revisión</span>
          )}
          {compra.estado === 'rechazado' && (
            <span className="pi-usr-badge pi-usr-badge-pend" title={compra.motivoRechazo || ''}>
              <FaExclamationTriangle /> Rechazada
            </span>
          )}
          {!compra.vigente && <span className="pi-usr-badge pi-usr-badge-pasado">Evento pasado</span>}
        </div>

        <div className="pi-usr-compra-card-info">
          <strong>{compra.evento.nombre}</strong>
          <span><FaCalendarAlt /> {formatearFecha(compra.evento.fecha)}</span>
          <span><FaTicketAlt /> Lote de {compra.entradas.length} entrada(s) · Bs. {compra.montoTotal}</span>
        </div>

        <div className="pi-usr-compra-card-acciones">
          <button className="pi-usr-btn-revisar" onClick={() => abrirRevision(compra)}>
            <FaSearch /> Ver detalles
          </button>
        </div>
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
                  <img src={imagenEvento(ev)} alt={ev.nombre} />
                  <div className="pi-usr-evento-pasado-info">
                    <strong>{ev.nombre}</strong>
                    <span><FaMapMarkerAlt /> {ev.lugar} · {formatearFecha(ev.fecha)}</span>
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
            <img src={imagenEvento(eventoSeleccionado)} alt={eventoSeleccionado.nombre} />
            <div>
              <span className="pi-usr-evento-header-eyebrow">Comprando entradas para</span>
              <h3>{eventoSeleccionado.nombre}</h3>
              <span className="texto-ayuda">
                <FaCalendarAlt /> {formatearFecha(eventoSeleccionado.fecha)} · <FaMapMarkerAlt /> {eventoSeleccionado.lugar}
              </span>
            </div>
          </div>

          {/* Nota dinámica dependiendo de la validación */}
          {yaTieneEntrada ? (
            <div className="pi-usr-nota-informativa nota-verde">
              <FaUserPlus className="nota-icon" />
              <div>
                <strong>Comprando para terceros (Invitados)</strong>
                <p>El sistema detecta que <b>ya cuentas con una entrada</b> asignada a tu cuenta. Todas las entradas que agregues abajo serán para tus invitados: al aprobarse la compra, cada uno recibe su propia cuenta. La manilla física con su código QR se la entrega Supervisor al recogerla en el evento.</p>
              </div>
            </div>
          ) : (
            <div className="pi-usr-nota-informativa">
              <FaIdCard className="nota-icon" />
              <div>
                <strong>Elige una categoría para empezar</strong>
                <p>La primera entrada que agregues abajo será la tuya (no vas a poder cambiar tu nombre ni correo). Si haces clic de nuevo, esa entrada será para un invitado, y así sucesivamente.</p>
              </div>
            </div>
          )}

          <div className="pi-usr-comprar-grid">
            <div className="pi-usr-comprar-col-entradas">
              {entradasCart.length === 0 ? (
                <div className="pi-usr-card" style={{ textAlign: 'center', color: 'var(--gris-medio)' }}>
                  Aún no agregaste ninguna entrada. Elige una categoría abajo para empezar.
                </div>
              ) : (
                <div className="pi-usr-cart-list">
                  {entradasCart.map((entrada, index) => {
                    const catSeleccionada = categoriasEntradas.find(c => c.id === entrada.categoriaTicketId);
                    return (
                      <div key={entrada.id} className="pi-usr-ticket-row" style={{ borderLeftColor: catSeleccionada.color }}>
                        <div className="pi-usr-ticket-row-top">
                          <span className="pi-usr-ticket-row-titulo">
                            {entrada.isTitular ? <FaUserTag color="var(--indigo-profundo)"/> : <FaUserPlus color="var(--gris-medio)"/>}
                            {entrada.isTitular ? 'Tú' : `Invitado ${index + (yaTieneEntrada ? 1 : 0)}`}
                          </span>

                          <span className="pi-usr-cat-badge-fija" style={{ background: catSeleccionada.color }}>
                            {catSeleccionada.nombre} · Bs.{catSeleccionada.precio}
                          </span>

                          <button className="btn-eliminar-ticket" onClick={() => quitarEntrada(entrada.id)}>
                            <FaTrash />
                          </button>
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
              )}

              <div className="pi-usr-categorias-grandes">
                <h4>{entradasCart.some(ent => ent.isTitular) || yaTieneEntrada ? 'Añadir entradas para invitados' : 'Elige tu categoría'}</h4>
                <p className="texto-ayuda">
                  {entradasCart.some(ent => ent.isTitular) || yaTieneEntrada
                    ? `Elige la categoría para sumar una entrada de invitado. Puedes hacer clic varias veces para agregar a más de una persona (máx. ${MAX_ENTRADAS} entradas por compra).`
                    : 'Haz clic en la categoría que quieres para tu propia entrada.'}
                </p>
                <div className="pi-usr-categorias-grid">
                  {categoriasEntradas.map(cat => {
                    const cantidad = entradasCart.filter(ent => ent.categoriaTicketId === cat.id).length;
                    const alMaximo = entradasCart.length >= MAX_ENTRADAS;
                    return (
                      <button
                        key={cat.id}
                        className="pi-usr-categoria-card"
                        style={{ background: cat.color }}
                        disabled={alMaximo}
                        onClick={() => agregarEntrada(cat.id)}
                      >
                        {cantidad > 0 && (
                          <span className="cat-card-badge" style={{ color: cat.color }}>{cantidad}</span>
                        )}
                        <span className="cat-card-nombre">{cat.nombre}</span>
                        <span className="cat-card-precio">Bs. {cat.precio}</span>
                        <span className="cat-card-cta"><FaPlus /> {cantidad > 0 ? 'Agregar otra' : 'Agregar'}</span>
                      </button>
                    );
                  })}
                </div>
                {entradasCart.length >= MAX_ENTRADAS && (
                  <p className="texto-ayuda">Llegaste al máximo de {MAX_ENTRADAS} entradas por compra.</p>
                )}
              </div>
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

                <button
                  className="pi-usr-btn-enviar"
                  onClick={() => {
                    if (entradasCart.length === 0) return setErrorForm('Agrega al menos una entrada antes de pagar.');
                    setErrorForm('');
                    setPagoIniciado(true);
                  }}
                >
                  <FaQrcode /> Pagar
                </button>

                {errorForm && !pagoIniciado && <div className="pi-usr-alerta-error"><FaExclamationTriangle /> {errorForm}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PANTALLA GRANDE DE PAGO: QR del negocio y luego subir el comprobante --- */}
      {pagoIniciado && (
        <div className="pi-usr-modal-overlay" onClick={() => setPagoIniciado(false)}>
          <div className="pi-usr-modal pi-usr-modal-pago" onClick={(e) => e.stopPropagation()}>
            <div className="pi-usr-modal-header">
              <h3><FaQrcode color="var(--indigo-profundo)" /> Pagar entradas</h3>
              <button className="pi-usr-btn-cerrar-modal" onClick={() => setPagoIniciado(false)}><FaTimes /></button>
            </div>
            <div className="pi-usr-modal-body">
              <div className="pi-usr-qr-card pi-usr-qr-card-grande">
                <img src={DATOS_PAGO_NEGOCIO.qrUrl} alt="QR de pago del negocio" />
                <div className="qr-info-text">
                  <span className="pi-usr-qr-titulo"><FaQrcode /> Escanea para pagar</span>
                  <span className="pi-usr-qr-nota">
                    Transfiere Bs. {montoTotalEntradas.toFixed(2)} a {DATOS_PAGO_NEGOCIO.nombre} y luego sube tu comprobante aquí abajo.
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

              <div className="pi-usr-modal-acciones">
                <button className="btn-cerrar-secundario" onClick={() => setPagoIniciado(false)}>Cerrar</button>
                <button className="pi-usr-btn-enviar" onClick={handleEnviarComprobante}>
                  <FaCheckCircle /> Enviar Pago y Solicitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PESTAÑA: MI SALDO
      ========================================================= */}
      {pestana === 'saldo' && (
        <div className="pi-usr-saldo">
          <div className="pi-usr-saldo-stats">
            <div className="pi-usr-saldo-card">
              <FaWallet size={30} color="var(--indigo-profundo)" />
              <span className="pi-usr-saldo-numero">{saldo} pts</span>
              <span className="pi-usr-saldo-label">Saldo actual disponible</span>
            </div>

            <div className="pi-usr-saldo-card saldo-card-recargado">
              <FaCoins size={30} color="var(--verde-recarga-texto)" />
              <span className="pi-usr-saldo-numero">{totalRecargado} pts</span>
              <span className="pi-usr-saldo-label">Total recargado</span>
            </div>

            <div className="pi-usr-saldo-card saldo-card-gastado">
              <FaStore size={30} color="var(--rojo-error-texto)" />
              <span className="pi-usr-saldo-numero">{totalGastado} pts</span>
              <span className="pi-usr-saldo-label">Total gastado</span>
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
                            {item.tipo === 'consumo' && <><FaStore color="var(--indigo-profundo)" /> Consumo en Puesto</>}
                            {item.tipo === 'devolucion' && <><FaTicketAlt color="var(--coral-compra)" /> Devolución</>}
                            {item.tipo === 'ajuste' && <><FaCoins color="var(--verde-recarga-texto)" /> Ajuste</>}
                          </span>
                        </td>
                        <td>
                          {item.tipo === 'consumo' && item.venta ? (
                            <span className="pi-usr-detalle-consumo">
                              <strong>{item.venta.puesto?.nombre}</strong>
                              {' — '}
                              {item.venta.items.map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ')}
                            </span>
                          ) : (
                            item.nota || '—'
                          )}
                        </td>
                        <td className={item.tipo === 'recarga' || item.tipo === 'ajuste' ? 'pi-usr-monto-positivo' : 'pi-usr-monto-negativo'}>
                          {item.tipo === 'recarga' || item.tipo === 'ajuste' ? '+' : '-'}{Number(item.monto)} pts
                        </td>
                        <td style={{color: 'var(--texto-secundario)', fontSize: '13px'}}>{new Date(item.createdAt).toLocaleString('es-BO')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PESTAÑA: MIS ENTRADAS (tu manilla destacada, otras solicitudes y las pasadas)
      ========================================================= */}
      {pestana === 'misentradas' && (
        <div className="pi-usr-mis-entradas">
          {entradaDestacada && (
            <div className="pi-usr-manilla-destacada" style={{ backgroundImage: `url(${imagenEvento(entradaDestacada.evento)})` }}>
              <div className="pi-usr-manilla-overlay">
                {entradaDestacada.codigoQrVinculado ? (
                  <img src={qrDe(entradaDestacada.codigoQrVinculado.codigo)} alt="Tu código QR" className="manilla-qr" />
                ) : (
                  <div className="manilla-qr manilla-qr-pendiente">
                    <FaHourglassHalf size={28} />
                    <span>Manilla aún sin vincular</span>
                  </div>
                )}
                <div className="manilla-info">
                  <span className="pi-usr-qr-titulo"><FaQrcode /> Tu Manilla Digital</span>
                  <h3>{entradaDestacada.evento.nombre}</h3>
                  <div className="manilla-datos">
                    <span>
                      <FaCalendarAlt /> {formatearFecha(entradaDestacada.evento.fecha)}
                    </span>
                    <span><FaMapMarkerAlt /> {entradaDestacada.evento.lugar}</span>
                    {entradaDestacada.categoriaTicket && (
                      <span className="pi-usr-badge" style={{ background: 'var(--cian-digital)', color: 'var(--blanco)' }}>
                        {entradaDestacada.categoriaTicket.nombre}
                      </span>
                    )}
                  </div>
                </div>

                {tiempoRestante && (
                  <div className="pi-usr-manilla-countdown">
                    {tiempoRestante.llego ? (
                      <div className="countdown-llego">
                        <span className="countdown-llego-emoji">🎉</span>
                        <span>¡Hoy es el evento!</span>
                      </div>
                    ) : (
                      <>
                        <span className="countdown-title-mini">Falta para el evento</span>
                        <div className="countdown-timer-mini">
                          <div className="time-block-mini">
                            <span className="time-number-mini">{String(tiempoRestante.dias).padStart(2, '0')}</span>
                            <span className="time-label-mini">DÍAS</span>
                          </div>
                          <span className="time-separator-mini">:</span>
                          <div className="time-block-mini">
                            <span className="time-number-mini">{String(tiempoRestante.horas).padStart(2, '0')}</span>
                            <span className="time-label-mini">HRS</span>
                          </div>
                          <span className="time-separator-mini">:</span>
                          <div className="time-block-mini">
                            <span className="time-number-mini">{String(tiempoRestante.minutos).padStart(2, '0')}</span>
                            <span className="time-label-mini">MIN</span>
                          </div>
                          <span className="time-separator-mini">:</span>
                          <div className="time-block-mini">
                            <span className="time-number-mini">{String(tiempoRestante.segundos).padStart(2, '0')}</span>
                            <span className="time-label-mini">SEG</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <h3 className="pi-usr-mis-entradas-subtitulo">Otras entradas</h3>
          {comprasOtras.length === 0 ? (
            <div className="pi-usr-card" style={{ textAlign: 'center', color: 'var(--gris-medio)' }}>
              No tienes más solicitudes de eventos próximos.
            </div>
          ) : (
            <div className="pi-usr-entradas-grid">
              {comprasOtras.map(renderCompraCard)}
            </div>
          )}

          <button className="pi-usr-btn-toggle-pasadas" onClick={() => setMostrarPasadas(v => !v)}>
            <FaHistory /> {mostrarPasadas ? 'Ocultar entradas pasadas' : `Ver entradas pasadas (${comprasPasadas.length})`}
          </button>

          {mostrarPasadas && (
            comprasPasadas.length === 0 ? (
              <div className="pi-usr-card" style={{ textAlign: 'center', color: 'var(--gris-medio)' }}>
                Aún no tienes entradas de eventos pasados.
              </div>
            ) : (
              <div className="pi-usr-entradas-grid">
                {comprasPasadas.map(renderCompraCard)}
              </div>
            )
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
                Lote de {compraEnRevision.entradas.length} entrada(s) · {formatearFecha(compraEnRevision.createdAt)}
              </p>

              {compraEnRevision.estado === 'rechazado' && (
                <>
                  <div className="pi-usr-alerta-error">
                    <FaExclamationTriangle /> Esta solicitud fue rechazada
                    {compraEnRevision.motivoRechazo ? `: ${compraEnRevision.motivoRechazo}` : '.'}
                  </div>
                  <p className="texto-ayuda">Si crees que fue un error, contacta al organizador o realiza una nueva compra.</p>
                  <div className="pi-usr-modal-acciones">
                    <button className="btn-cerrar-secundario" onClick={cerrarRevision}>Cerrar</button>
                  </div>
                </>
              )}

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
              ) : compraEnRevision.estado === 'confirmado' ? (
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

                          <div className="pi-usr-entrada-qr">
                            {ent.codigoQrVinculado ? (
                              <img src={qrDe(ent.codigoQrVinculado.codigo)} alt="QR" className="qr-miniatura" />
                            ) : (
                              <span className="texto-ayuda"><FaHourglassHalf /> Manilla aún sin vincular</span>
                            )}
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
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
