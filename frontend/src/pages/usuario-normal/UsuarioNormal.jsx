import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import DetalleVentaModal from '../../components/DetalleVentaModal.jsx';
import HistorialManillas from '../../components/HistorialManillas.jsx';
import Tabla from '../../components/Tabla.jsx';
import Buscador from '../../components/Buscador.jsx';
import Paginador from '../../components/Paginador.jsx';
import { usePaginacion } from '../../utils/usePaginacion.js';
import Filtros from '../../components/Filtros.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaWallet, FaQrcode, FaUpload, FaPlus, FaTrash, FaUserPlus,
  FaCheckCircle, FaHourglassHalf, FaEnvelope, FaHistory,
  FaStore, FaCoins, FaExclamationTriangle, FaUserTag, FaIdCard,
  FaSearch, FaPhoneAlt, FaCalendarAlt, FaMapMarkerAlt, FaChevronDown, FaMoon,
  FaTh, FaList
} from 'react-icons/fa';
import './UsuarioNormal.css';
import './CompraEntradas.css';
import { useCuentaRegresiva } from '../../utils/useCuentaRegresiva.js';
import EventosDestacados from '../../components/EventosDestacados.jsx';
import FotoZoom from '../../components/FotoZoom.jsx';
import { VERSION_TERMINOS, TEXTO_TERMINOS } from '../../constants/terminos.js';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import { esVigente, estadoEvento, formatearFecha, imagenEvento, nombreJornada, nombreJornadaConAnio, mostrarJornada, agruparPorJornada } from '../../utils/eventos.js';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';

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

// Estado del plazo de retiro de una billetera de evento (§T&C).
function plazoRetiro(expiraEn) {
  if (!expiraEn) return { tono: 'neutro', texto: 'El plazo de retiro se fija cuando termina el evento' };
  const fin = new Date(expiraEn);
  const dias = Math.ceil((fin - new Date()) / 86400000);
  if (dias < 0) return { tono: 'vencido', texto: `Plazo de retiro vencido (${fin.toLocaleDateString('es-BO')})` };
  if (dias === 0) return { tono: 'porVencer', texto: 'Hoy es el último día para retirar tu saldo' };
  return {
    tono: dias <= 7 ? 'porVencer' : 'ok',
    texto: `Te quedan ${dias} día${dias === 1 ? '' : 's'} para retirar el saldo (hasta el ${fin.toLocaleDateString('es-BO')})`,
  };
}

// Tarjeta expandible: saldo de un evento + desglose recargado/gastado/devuelto.
// `enCurso`: es el mismo evento que ya se destacó grande arriba — se marca acá
// también para no perderlo de vista dentro de la lista completa.
function BilleteraAcordeon({ b, enCurso = false, qrCodigo }) {
  const [abierto, setAbierto] = useState(false);
  const [verQr, setVerQr] = useState(false);
  const plazo = plazoRetiro(b.expiraEn);
  const bloqueado = Number(b.bloqueado ?? 0);
  const disponible = Number(b.disponible ?? b.saldo);
  // Solo tiene sentido "retirar" (y por lo tanto mostrar el QR) en un evento
  // que ya terminó, con saldo pendiente de cobrar y ANTES de que venza el
  // plazo de retiro — pasada la fecha límite, ya no sirve mostrar el QR.
  const puedeRetirar =
    ['finalizado', 'archivado'].includes(estadoEvento(b)) &&
    disponible > 0 &&
    qrCodigo &&
    plazo.tono !== 'vencido';
  return (
    <div className={`pi-usr-bill ${abierto ? 'abierto' : ''}${enCurso ? ' pi-usr-bill--en-curso' : ''}`}>
      <button type="button" className="pi-usr-bill-cab" onClick={() => setAbierto(o => !o)} aria-expanded={abierto}>
        <span className="pi-usr-bill-titulo">
          <strong>{b.eventoNombre}</strong>
          <span className="pi-usr-bill-fecha">
            {new Date(b.fecha).toLocaleDateString('es-BO')}
            {enCurso && <span className="pi-usr-bill-badge-curso">En curso</span>}
          </span>
        </span>
        <span className={`pi-usr-bill-plazo tono-${plazo.tono}`}>{plazo.tono === 'vencido' ? 'Vencido' : plazo.tono === 'porVencer' ? '¡Retirá pronto!' : ''}</span>
        <span className="pi-usr-bill-saldo">{disponible} pts</span>
        <FaChevronDown className="pi-usr-bill-flecha" aria-hidden="true" />
      </button>
      {abierto && (
        <div className="pi-usr-bill-cuerpo">
          <div className="pi-usr-bill-grid">
            <div><span>{Number(b.recargado)} pts</span><small>Recargado</small></div>
            <div><span>{Number(b.gastado)} pts</span><small>Gastado en puestos</small></div>
            <div><span>{Number(b.devuelto)} pts</span><small>Devuelto</small></div>
            <div className="destacado"><span>{disponible} pts</span><small>Saldo disponible</small></div>
          </div>
          {bloqueado > 0 && (
            <p className="pi-usr-bill-disputa">
              <FaExclamationTriangle aria-hidden="true" /> {bloqueado} pts retenidos por una incidencia de recarga en revisión — no los podés usar ni retirar hasta que se resuelva.
            </p>
          )}
          <p className={`pi-usr-bill-plazo-detalle tono-${plazo.tono}`}>{plazo.texto}</p>
          {puedeRetirar && (
            <button type="button" className="pi-usr-bill-btn-qr" onClick={() => setVerQr(true)}>
              <FaQrcode aria-hidden="true" /> Ver mi QR para retirar
            </button>
          )}
        </div>
      )}
      {verQr && (
        <Modal
          titulo={<><FaQrcode aria-hidden="true" /> Tu código QR — {b.eventoNombre}</>}
          onCerrar={() => setVerQr(false)}
          tamano="sm"
        >
          <div className="pi-usr-qr-grande">
            <FotoZoom width="260" height="260" src={qrDe(qrCodigo)} alt="Tu código QR" />
            <p className="texto-ayuda">
              Mostrá este código en el punto de retiro para cobrar tus {disponible} pts disponibles.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Cuenta regresiva del encabezado de compra (días / hs / min). */
function CuentaCompra({ fecha }) {
  const c = useCuentaRegresiva(fecha);
  if (!c || c.terminada) return null;
  return (
    <div className="pi-cmp-cuenta" aria-label={`Faltan ${c.dias} días y ${c.horas} horas`}>
      <span className="pi-cmp-cuenta-tit" aria-hidden="true"><FaHourglassHalf /> Faltan</span>
      {[[c.dias, 'días'], [c.horas, 'hs'], [c.minutos, 'min']].map(([v, u]) => (
        <span key={u} className="pi-cmp-cuenta-bloque" aria-hidden="true">
          <b key={v}>{u === 'días' ? v : String(v).padStart(2, '0')}</b>
          <em>{u}</em>
        </span>
      ))}
    </div>
  );
}

export default function UsuarioNormal() {
  useTituloPagina('Mi panel');
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

  const [categoriasEntradas, setCategoriasEntradas] = useState([]);

  // Cartelera con estados cargando/error/reintentar (Manual 8.9).
  const cargarEventos = useCallback(() => api.eventos.listar(), []);
  const {
    data: todosEventos,
    cargando: cargandoEventos,
    error: errorEventos,
    recargar: recargarEventos,
  } = useApi(cargarEventos, { inicial: [] });
  const proximosEventos = todosEventos.filter(esVigente);
  // Los últimos 5 (por fecha del evento, no por orden de creación) — no toda
  // la cartelera histórica, que solo va a crecer con el tiempo.
  const eventosPasados = todosEventos
    .filter(ev => !esVigente(ev))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  // Evento para el que se está comprando: llega desde "Adquirir Entradas" en la pestaña Eventos.
  // Si se entra directo a /usuarionormal/comprar (sin pasar por ahí), caemos al primer evento disponible.
  const eventoSeleccionado = location.state?.evento || proximosEventos[0];
  const eventoSeleccionadoId = eventoSeleccionado?.id;

  useEffect(() => {
    if (!eventoSeleccionadoId) return;
    api.categoriasTicket.listar(eventoSeleccionadoId).then(lista => {
      setCategoriasEntradas(lista.map((c, i) => ({ ...c, color: COLORES_CATEGORIA[i % COLORES_CATEGORIA.length] })));
    });
  }, [eventoSeleccionadoId]);

  // --- ESTADOS DE COMPRAS (traídas del backend; Admin las aprueba desde su panel) ---
  const [compras, setCompras] = useState([]);
  // Entradas a MI nombre (titular o invitado). Incluye las que compró otra persona:
  // esas no aparecen en compras.mias() porque mi cuenta nunca fue "comprador".
  const [entradasANombreMio, setEntradasANombreMio] = useState([]);

  const recargarCompras = () => Promise.all([
    api.compras.mias().then(setCompras),
    api.entradas.mias().then(setEntradasANombreMio).catch(() => setEntradasANombreMio([])),
  ]);
  useEffect(() => { recargarCompras(); }, []);

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
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  // Al hacer clic en "Pagar" se muestra primero el QR del negocio; solo después se habilita subir el comprobante.
  const [pagoIniciado, setPagoIniciado] = useState(false);
  // Paso 1 del pago ("ya transferí"): solo guía visual, habilita el paso 2.
  const [transferido, setTransferido] = useState(false);
  const [montoCopiado, setMontoCopiado] = useState(false);
  // Resumen de la compra recién enviada: muestra la pantalla de éxito del
  // modal en vez de sacar al usuario de golpe a Mis Entradas.
  const [compraEnviada, setCompraEnviada] = useState(null);

  const montoTotalEntradas = entradasCart.reduce((acc, entrada) => acc + Number(entrada.precio), 0);

  // Una entrada está completa cuando tiene nombre, correo con forma de correo
  // y (si es de un invitado) celular. Guía visual; la validación final sigue
  // siendo la de handleEnviarComprobante.
  const entradaCompleta = (e) =>
    !!e.nombre.trim() && /\S+@\S+\.\S+/.test(e.correo.trim()) && (e.isTitular || !!e.celular.trim());
  const entradasCompletas = entradasCart.filter(entradaCompleta).length;
  const datosCompletos = entradasCart.length > 0 && entradasCompletas === entradasCart.length;
  // Paso actual del indicador de arriba: 0 elegir, 1 datos, 2 pago.
  const pasoCompra = entradasCart.length === 0 ? 0 : !datosCompletos ? 1 : 2;

  const cerrarPago = () => {
    setPagoIniciado(false);
    setTransferido(false);
    if (compraEnviada) {
      setCompraEnviada(null);
      navigate('/usuarionormal');
    }
  };

  const copiarMonto = async () => {
    try {
      await navigator.clipboard.writeText(montoTotalEntradas.toFixed(2));
      setMontoCopiado(true);
      setTimeout(() => setMontoCopiado(false), 2000);
    } catch { /* sin permiso de portapapeles: el monto sigue a la vista */ }
  };

  // Cada compra con su evento resuelto y si ese evento sigue vigente (para Mis Entradas).
  const comprasConEvento = useMemo(() => {
    return compras
      .filter(compra => compra.evento)
      .map(compra => ({ ...compra, vigente: esVigente(compra.evento) }))
      .sort((a, b) => new Date(b.evento.fecha) - new Date(a.evento.fecha));
  }, [compras]);

  // La entrada titular ("para ti") se controla POR JORNADA, no por evento: podés
  // tener tu entrada de la noche 1 y comprar la tuya para la noche 2. Solo cuando
  // ya tenés entrada propia en TODAS las jornadas ofrecidas se te obliga a comprar
  // solo para invitados.
  const jornadaDeCategoria = useCallback(
    (catId) => categoriasEntradas.find(c => c.id === catId)?.diaEventoId ?? null,
    [categoriasEntradas],
  );

  // Jornadas ofrecidas por el evento seleccionado (una entrada "sin jornada" cuenta como null).
  const jornadasDelEvento = useMemo(
    () => [...new Set(categoriasEntradas.map(c => c.diaEventoId ?? null))],
    [categoriasEntradas],
  );

  // Agrupar la grilla de categorías y el carrito por jornada: con 2+ noches
  // ofrecidas, cada una se ve en su propia sección (en vez de una lista plana
  // mezclando categorías de días distintos). Con 0 o 1 jornada, ambas quedan
  // en `[]` y el render sigue exactamente como antes (sin encabezados).
  const gruposCategorias = useMemo(
    () => agruparPorJornada(categoriasEntradas, (cat) => cat.diaEvento),
    [categoriasEntradas],
  );
  const gruposCarrito = useMemo(
    () => agruparPorJornada(
      entradasCart,
      (entrada) => categoriasEntradas.find(c => c.id === entrada.categoriaTicketId)?.diaEvento,
    ),
    [entradasCart, categoriasEntradas],
  );

  // Jornadas del evento seleccionado en las que YA tengo una entrada propia (no
  // rechazada) — ya sea porque la compré yo (titular, pendiente o confirmada)
  // o porque me la compró OTRA persona y ya está vinculada a mi cuenta
  // (entradasANombreMio, que solo trae compras ya confirmadas). Sin esto, a
  // alguien a quien ya le regalaron su entrada de una noche se le dejaba
  // comprar otra "para sí mismo" en esa misma noche.
  const misJornadasConEntrada = useMemo(() => {
    if (!eventoSeleccionado) return new Set();
    const s = new Set();
    comprasConEvento
      .filter(c => c.evento.id === eventoSeleccionado.id && c.estado !== 'rechazado')
      .forEach(c => c.entradas.forEach(e => {
        if (e.isTitular) s.add(e.diaEventoId ?? null);
      }));
    entradasANombreMio
      .filter(e => e.evento?.id === eventoSeleccionado.id)
      .forEach(e => s.add(e.diaEventoId ?? null));
    return s;
  }, [comprasConEvento, eventoSeleccionado, entradasANombreMio]);

  // ¿Ya tengo entrada propia para esta jornada? (contando compras previas + carrito actual)
  const yaTengoJornada = useCallback(
    (dia) => misJornadasConEntrada.has(dia ?? null)
      || entradasCart.some(e => e.isTitular && (jornadaDeCategoria(e.categoriaTicketId) ?? null) === (dia ?? null)),
    [misJornadasConEntrada, entradasCart, jornadaDeCategoria],
  );

  // ¿Queda alguna jornada donde todavía podría comprar mi propia entrada?
  const puedoSerTitular = useMemo(
    () => jornadasDelEvento.some(d => !yaTengoJornada(d)),
    [jornadasDelEvento, yaTengoJornada],
  );

  // Tu entrada ya aprobada del evento próximo más cercano: se destaca como "Tu
  // Manilla Digital". No importa si la compraste vos (titular) o te la
  // compró otra persona (invitado) — entradasANombreMio ya trae ambos casos,
  // siempre confirmados. Antes esto solo miraba tus propias compras, así que
  // alguien que únicamente tenía entradas de invitado nunca veía este banner.
  const entradaDestacada = useMemo(() => {
    const candidatas = entradasANombreMio
      .filter(e => e.evento && esVigente(e.evento))
      .sort((a, b) => new Date(a.evento.fecha) - new Date(b.evento.fecha)); // más próximo primero
    const entrada = candidatas[0];
    return entrada ? { ...entrada, compraId: entrada.compra?.id } : null;
  }, [entradasANombreMio]);

  // --- ESTADO DE SALDO (billetera POR EVENTO: el saldo recargado en un evento
  //     solo sirve en ese evento) ---
  const [historial, setHistorial] = useState([]);
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [billeteras, setBilleteras] = useState([]);
  const saldoTotal = useMemo(
    () => billeteras.reduce((s, b) => s + Number(b.disponible ?? b.saldo), 0),
    [billeteras],
  );

  // El evento que está pasando AHORA se destaca grande arriba de la lista; sigue
  // apareciendo también en la lista de abajo (con buscador, para no perderlo de
  // vista entre muchos eventos).
  const billeteraEnCurso = useMemo(
    () => billeteras.find(b => estadoEvento(b) === 'en_curso') || null,
    [billeteras],
  );
  const [busquedaBilleteras, setBusquedaBilleteras] = useState('');
  // Saldo por evento se muestra COMPLETO, pero de a 5: la lista crece con
  // cada evento en el que el usuario recargo alguna vez y no tiene techo.
  // Se pagina sobre la lista ya filtrada por el buscador, no sobre la total.
  const billeterasFiltradas = useMemo(() => {
    const q = busquedaBilleteras.trim().toLowerCase();
    if (!q) return billeteras;
    return billeteras.filter(b => b.eventoNombre.toLowerCase().includes(q));
  }, [billeteras, busquedaBilleteras]);
  const pagBilleteras = usePaginacion(billeterasFiltradas, 5);

  // eventoId -> saldo disponible: para avisar en la cartelera de eventos que
  // todavía te queda plata ahí (incluidos eventos ya pasados, por el retiro).
  const saldoPorEvento = useMemo(
    () => new Map(billeteras.map(b => [b.eventoId, Number(b.disponible ?? b.saldo)])),
    [billeteras],
  );

  // eventoId -> código QR de mi manilla en ese evento (titular o invitado): para
  // mostrarlo grande en "Mi Saldo" cuando el evento ya pasó y hay que retirar.
  const qrPorEvento = useMemo(() => {
    const m = new Map();
    entradasANombreMio.forEach(e => {
      if (e.evento && e.codigoQrVinculado) m.set(e.evento.id, e.codigoQrVinculado.codigo);
    });
    return m;
  }, [entradasANombreMio]);

  useEffect(() => {
    if (!usuario?.id) return;
    api.billeterasEvento.mias().then(setBilleteras).catch(() => setBilleteras([]));
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

  // --- Búsqueda + filtros del historial de transacciones ---
  const [busquedaHist, setBusquedaHist] = useState('');
  const [filtroHist, setFiltroHist] = useState('todos');

  // Agrupa los tipos crudos en las categorías que ve el usuario.
  const grupoTipo = (tipo) => {
    if (tipo === 'recarga') return 'recarga';
    if (tipo === 'consumo') return 'consumo';
    if (tipo === 'devolucion') return 'devolucion';
    return 'ajuste'; // ajuste, reverso_consumo, reverso_venta…
  };

  const filtrosHist = useMemo(() => {
    const conteo = (g) => historial.filter(t => grupoTipo(t.tipo) === g).length;
    return [
      { valor: 'todos', texto: 'Todos', conteo: historial.length },
      { valor: 'recarga', texto: 'Recargas', conteo: conteo('recarga') },
      { valor: 'consumo', texto: 'Consumos', conteo: conteo('consumo') },
      { valor: 'devolucion', texto: 'Devoluciones', conteo: conteo('devolucion') },
      { valor: 'ajuste', texto: 'Ajustes', conteo: conteo('ajuste') },
    ].filter(f => f.valor === 'todos' || f.conteo > 0);
  }, [historial]);

  const historialFiltrado = useMemo(() => {
    const q = busquedaHist.trim().toLowerCase();
    return historial.filter(t => {
      if (filtroHist !== 'todos' && grupoTipo(t.tipo) !== filtroHist) return false;
      if (!q) return true;
      const enProductos = (t.venta?.items || [])
        .some(i => (i.nombreProducto || '').toLowerCase().includes(q));
      return (
        (t.evento?.nombre || '').toLowerCase().includes(q) ||
        (t.venta?.puesto?.nombre || '').toLowerCase().includes(q) ||
        (t.operador?.nombre || '').toLowerCase().includes(q) ||
        (t.nota || '').toLowerCase().includes(q) ||
        enProductos
      );
    });
  }, [historial, busquedaHist, filtroHist]);

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
  // La compra destacada solo se excluye si no tiene nada más que mostrar: si
  // trae más entradas (ej. tu propia entrada de otra jornada del mismo evento,
  // o invitados), esa compra también aparece acá para no esconder el resto.
  // No se excluye la compra de la entrada destacada: esa entrada se repite
  // arriba en el banner Y abajo en la lista/tabla completa, a propósito.
  const comprasOtras = useMemo(
    () => comprasConEvento.filter(compra => compra.vigente),
    [comprasConEvento]
  );

  // Solicitudes de eventos que ya pasaron, solo como registro histórico.
  const comprasPasadas = useMemo(
    () => comprasConEvento.filter(compra => !compra.vigente),
    [comprasConEvento]
  );

  // Entradas de eventos próximos que compró OTRA persona a mi nombre (yo no fui el
  // comprador). Ya vienen solo de compras confirmadas desde el backend.
  // No se excluye la que ya está destacada arriba: se repite a propósito
  // también en la lista/tabla completa de abajo.
  const entradasDeInvitado = useMemo(
    () => entradasANombreMio
      .filter(e => e.evento && esVigente(e.evento))
      .filter(e => e.compra?.compradorId !== usuario?.id),
    [entradasANombreMio, usuario?.id]
  );

  // Igual que arriba, pero de eventos que ya pasaron: sin esto, la entrada de un
  // invitado (comprada por otra persona) desaparecía para siempre en cuanto el
  // evento terminaba — ni QR, ni categoría, nada (aunque le quedara saldo por
  // retirar). Se muestran junto con "Mis entradas pasadas" al desplegarlas.
  const entradasDeInvitadoPasadas = useMemo(
    () => entradasANombreMio
      .filter(e => e.evento && !esVigente(e.evento))
      .filter(e => e.compra?.compradorId !== usuario?.id),
    [entradasANombreMio, usuario?.id]
  );

  // --- MIS ENTRADAS (tabla): unifica compras propias + entradas de invitado,
  // próximas y pasadas, en filas homogéneas para un solo buscador + tabla en
  // vez de 4 grillas de tarjetas separadas.
  const filasMisEntradas = useMemo(() => {
    const deCompra = (compra) => {
      const jornadas = [...new Map(
        (compra.entradas || []).map(e => e.diaEvento).filter(mostrarJornada).map(d => [d.id, d])
      ).values()];
      return {
        key: `compra-${compra.id}`,
        tipo: 'compra',
        evento: compra.evento,
        vigente: compra.vigente,
        estado: compra.estado,
        motivoRechazo: compra.motivoRechazo,
        jornadas,
        cantidad: compra.entradas.length,
        monto: compra.montoTotal,
        numeros: compra.entradas.map(e => e.numero).filter(n => n != null).sort((a, b) => a - b),
        raw: compra,
      };
    };
    const deInvitado = (entrada) => ({
      key: `invitado-${entrada.id}`,
      tipo: 'invitado',
      evento: entrada.evento,
      vigente: esVigente(entrada.evento),
      estado: 'confirmado',
      motivoRechazo: null,
      jornadas: mostrarJornada(entrada.diaEvento) ? [entrada.diaEvento] : [],
      cantidad: 1,
      monto: entrada.categoriaTicket?.precio ?? null,
      numeros: entrada.numero != null ? [entrada.numero] : [],
      raw: entrada,
    });
    return [
      ...comprasOtras.map(deCompra),
      ...comprasPasadas.map(deCompra),
      ...entradasDeInvitado.map(deInvitado),
      ...entradasDeInvitadoPasadas.map(deInvitado),
    ];
  }, [comprasOtras, comprasPasadas, entradasDeInvitado, entradasDeInvitadoPasadas]);

  const [busquedaMisEntradas, setBusquedaMisEntradas] = useState('');
  const [filtroMisEntradas, setFiltroMisEntradas] = useState('todas');

  const filtrosMisEntradas = useMemo(() => {
    const conteo = (pred) => filasMisEntradas.filter(pred).length;
    return [
      { valor: 'todas', texto: 'Todas', conteo: filasMisEntradas.length },
      { valor: 'proximas', texto: 'Próximas', conteo: conteo(f => estadoEvento(f.evento) === 'proximo') },
      { valor: 'encurso', texto: 'En curso', conteo: conteo(f => estadoEvento(f.evento) === 'en_curso') },
      { valor: 'pasadas', texto: 'Pasadas', conteo: conteo(f => !f.vigente) },
      { valor: 'pendientes', texto: 'En revisión', conteo: conteo(f => f.estado === 'pendiente') },
      { valor: 'rechazadas', texto: 'Rechazadas', conteo: conteo(f => f.estado === 'rechazado') },
    ].filter(f => f.valor === 'todas' || f.conteo > 0);
  }, [filasMisEntradas]);

  // Filtro por tipo de manilla: aparte del de arriba (no son excluyentes
  // entre sí — se pueden combinar, ej. "Pasadas" + "Manilla física").
  const [filtroManilla, setFiltroManilla] = useState('todas');
  const hayFisicaYDigital = useMemo(
    () => new Set(filasMisEntradas.map(f => f.evento.tipoManilla)).size > 1,
    [filasMisEntradas],
  );

  const filasMisEntradasFiltradas = useMemo(() => {
    const q = busquedaMisEntradas.trim().toLowerCase();
    return filasMisEntradas
      .filter(f => {
        if (filtroMisEntradas === 'proximas') return estadoEvento(f.evento) === 'proximo';
        if (filtroMisEntradas === 'encurso') return estadoEvento(f.evento) === 'en_curso';
        if (filtroMisEntradas === 'pasadas') return !f.vigente;
        if (filtroMisEntradas === 'pendientes') return f.estado === 'pendiente';
        if (filtroMisEntradas === 'rechazadas') return f.estado === 'rechazado';
        return true;
      })
      .filter(f => filtroManilla === 'todas' || f.evento.tipoManilla === filtroManilla)
      .filter(f => !q
        || f.evento.nombre.toLowerCase().includes(q)
        || (f.evento.lugar || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.evento.fecha) - new Date(a.evento.fecha));
  }, [filasMisEntradas, busquedaMisEntradas, filtroMisEntradas, filtroManilla]);

  // Modal liviano para el QR de una entrada de invitado (sin el flujo completo
  // de "Revisar mi solicitud", que es solo para compras propias).
  const [entradaInvitadaQr, setEntradaInvitadaQr] = useState(null);

  // "Mis Entradas" se puede ver como tabla (más compacta, con buscador/filtros)
  // o como tarjetas (como estaba antes) — se mantienen las dos, el usuario
  // elige. El buscador/filtro de arriba es el mismo para ambas vistas.
  const [vistaMisEntradas, setVistaMisEntradas] = useState('tarjetas');

  // --- LÓGICA DEL CARRITO ---
  // Contador local para ids de entradas del carrito (evita depender de Date.now() en el handler).
  const siguienteIdCartRef = useRef(1);

  // Cada clic en un card grande de categoría agrega una entrada: si todavía no tienes la tuya
  // (y no la tenías de antes), la primera que agregues es la tuya; las siguientes son de invitados.
  // Cupo libre de una categoría = cantidad total - ya vendidas - las que ya tengo en el carrito.
  const cupoLibreDe = (cat) => {
    if (!cat) return 0;
    const enCarrito = entradasCart.filter(ent => ent.categoriaTicketId === cat.id).length;
    return Math.max(0, Number(cat.cantidad) - Number(cat.cantidadVendida) - enCarrito);
  };

  const agregarEntrada = (categoriaId) => {
    if (entradasCart.length >= MAX_ENTRADAS) return;
    const cat = categoriasEntradas.find(c => c.id === categoriaId) || categoriasEntradas[0];
    if (!cat || cupoLibreDe(cat) <= 0) return;
    const nuevoId = `cart-${siguienteIdCartRef.current++}`;
    // La primera entrada que agrego de una jornada donde no tengo la mía es "para mí".
    const esMiEntrada = !yaTengoJornada(cat.diaEventoId ?? null);
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

  const handleComprobanteUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'comprobantes');
      setComprobante({ nombreArchivo: file.name, previewUrl: url });
    } catch (err) {
      setErrorForm(err.message);
    }
  };

  const handleEnviarComprobante = async () => {
    setErrorForm('');
    if (entradasCart.length === 0) return setErrorForm('Agrega al menos una entrada antes de continuar.');
    if (!comprobante) return setErrorForm('Debes subir el comprobante de pago para continuar.');
    if (!aceptoTerminos) return setErrorForm('Debes aceptar los términos y condiciones para continuar.');

    const invitadosIncompletos = entradasCart.some(ent => !ent.nombre.trim() || !ent.correo.trim() || (!ent.isTitular && !ent.celular.trim()));
    if (invitadosIncompletos) return setErrorForm('Completa el nombre, correo y celular de todas las personas asignadas.');

    // El correo debe ser único DENTRO de cada jornada, no en todo el carrito:
    // la misma persona puede tener una entrada la noche 1 y otra la noche 2.
    const correosPorJornada = new Map();
    entradasCart.forEach(e => {
      const clave = jornadaDeCategoria(e.categoriaTicketId) ?? '__sin_jornada__';
      const lista = correosPorJornada.get(clave) ?? [];
      lista.push(e.correo.toLowerCase());
      correosPorJornada.set(clave, lista);
    });
    const hayCorreoRepetido = [...correosPorJornada.values()].some(lista => lista.length !== new Set(lista).size);
    if (hayCorreoRepetido) return setErrorForm('Cada entrada de una misma jornada necesita un correo electrónico único.');

    try {
      await api.compras.crear({
        eventoId: eventoSeleccionado.id,
        entradas: entradasCart.map(({ isTitular, nombre, correo, celular, categoriaTicketId }) => ({ isTitular, nombre, correo, celular, categoriaTicketId })),
        comprobanteUrl: comprobante.previewUrl,
        comprobanteNombreArchivo: comprobante.nombreArchivo,
        aceptoTerminos: true,
        versionTerminos: VERSION_TERMINOS,
      });
      await recargarCompras();

      // Pantalla de éxito dentro del mismo modal; "Ver mis entradas" lleva a la
      // solicitud recién creada (aparece como pendiente en Mis Entradas).
      setCompraEnviada({ cantidad: entradasCart.length, total: montoTotalEntradas, evento: eventoSeleccionado.nombre });
      setEntradasCart([]);
      setComprobante(null);
      setAceptoTerminos(false);
      setTransferido(false);
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

    // El correo debe ser único DENTRO de cada jornada, no en toda la solicitud.
    const correosPorJornada = new Map();
    entradasEdicion.forEach(ent => {
      const clave = ent.diaEventoId ?? '__sin_jornada__';
      const lista = correosPorJornada.get(clave) ?? [];
      lista.push(ent.correo.toLowerCase());
      correosPorJornada.set(clave, lista);
    });
    const hayCorreoRepetido = [...correosPorJornada.values()].some(lista => lista.length !== new Set(lista).size);
    if (hayCorreoRepetido) return setErrorRevision('Cada entrada de una misma jornada necesita un correo electrónico único.');

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
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>¿Qué datos están mal? (puedes marcar varios)</legend>
        <div className="pi-usr-checks-reporte">
          {camposReportables.map(campo => (
            <label key={campo} className="pi-usr-check-campo">
              <input type="checkbox" checked={camposReporte.includes(campo)} onChange={() => toggleCampoReporte(campo)} />
              {ETIQUETA_CAMPO[campo]}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="usr-reporte-desc">Cuéntale a Admin cuáles son los datos correctos</label>
      <textarea
        id="usr-reporte-desc"
        rows={3}
        placeholder="Ej: el nombre correcto es Juan Pérez y el celular es 71234567"
        value={descripcionReporte}
        onChange={(e) => setDescripcionReporte(e.target.value)}
        autoFocus
      />
      <div className="pi-usr-modal-acciones">
        <button type="button" className="btn-cerrar-secundario" onClick={cancelarReporte}>Cancelar</button>
        <button
          type="button"
          className="pi-usr-btn-enviar"
          onClick={enviarReporte}
          disabled={camposReporte.length === 0 || !descripcionReporte.trim()}
        >
          <FaExclamationTriangle aria-hidden="true" /> Enviar Reporte
        </button>
      </div>
    </div>
  );

  // Card compacta de una compra para la vista "Tarjetas" de Mis Entradas: fondo con la
  // imagen del evento (para diferenciarlas de un vistazo) y sin mostrar el QR ahí mismo;
  // el QR y los datos de cada persona se ven al entrar a "Ver detalles".
  const renderCompraCard = (compra) => {
   const jornadas = [...new Map(
     (compra.entradas || [])
       .map(e => e.diaEvento)
       .filter(mostrarJornada)
       .map(d => [d.id, d])
   ).values()];
   return (
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
          {jornadas.length > 0 && (
            <span><FaMoon /> {jornadas.map(d => nombreJornada(d)).join(', ')}</span>
          )}
          <span><FaTicketAlt /> Lote de {compra.entradas.length} entrada(s) · Bs. {compra.montoTotal}</span>
          {compra.entradas.some(e => e.numero != null) && (
            <span><FaIdCard /> N.º {compra.entradas.map(e => e.numero).filter(n => n != null).sort((a, b) => a - b).join(', ')}</span>
          )}
        </div>

        <div className="pi-usr-compra-card-acciones">
          <button type="button" className="pi-usr-btn-revisar" onClick={() => abrirRevision(compra)}>
            <FaSearch /> Ver detalles
          </button>
        </div>
      </div>
    </div>
   );
  };

  // Card de una entrada que compró otra persona a nombre del usuario logueado.
  // Aquí sí se muestra el QR (o el aviso de manilla pendiente), porque es el
  // único lugar donde el invitado ve su entrada sin abrir el modal de QR aparte.
  const renderEntradaInvitadoCard = (entrada) => (
    <div key={entrada.id} className="pi-usr-compra-card" style={{ backgroundImage: `url(${imagenEvento(entrada.evento)})` }}>
      <div className="pi-usr-compra-card-overlay">
        <div className="pi-usr-compra-card-badges">
          <span className="pi-usr-badge pi-usr-badge-ok"><FaCheckCircle /> Aprobada</span>
          {entrada.numero != null && <span className="pi-usr-badge"><FaIdCard /> Entrada N.º {entrada.numero}</span>}
          {!esVigente(entrada.evento) && <span className="pi-usr-badge pi-usr-badge-pasado">Evento pasado</span>}
        </div>

        <div className="pi-usr-compra-card-info">
          <strong>{entrada.evento.nombre}</strong>
          <span><FaCalendarAlt /> {formatearFecha(entrada.evento.fecha)}</span>
          {mostrarJornada(entrada.diaEvento) && (
            <span><FaMoon /> {nombreJornada(entrada.diaEvento)}</span>
          )}
          <span><FaMapMarkerAlt /> {entrada.evento.lugar}</span>
          {entrada.categoriaTicket && <span><FaTicketAlt /> {entrada.categoriaTicket.nombre}</span>}
        </div>

        <div className="pi-usr-compra-card-acciones">
          {entrada.codigoQrVinculado ? (
            <button type="button" className="pi-usr-btn-revisar" onClick={() => setEntradaInvitadaQr(entrada)}>
              <FaQrcode /> Ver QR
            </button>
          ) : (
            <span className="pi-usr-badge pi-usr-badge-pend"><FaHourglassHalf /> Manilla aún sin vincular</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pi-usr-container">

      <div className="pi-usr-header">
        <h1>
          {pestana === 'eventos' && 'Elige tu evento'}
          {pestana === 'comprar' && 'Comprar entradas'}
          {pestana === 'misentradas' && 'Mis entradas'}
          {pestana === 'saldo' && 'Mi saldo'}
        </h1>
        <div className="pi-usr-tabs">
          <button type="button" className={pestana === 'eventos' ? 'activo' : ''} aria-current={pestana === 'eventos' ? 'page' : undefined} onClick={() => navigate('/usuarionormal/eventos')}>
            <FaCalendarAlt aria-hidden="true" /> Eventos
          </button>
          <button type="button" className={pestana === 'misentradas' ? 'activo' : ''} aria-current={pestana === 'misentradas' ? 'page' : undefined} onClick={() => navigate('/usuarionormal')}>
            <FaTicketAlt aria-hidden="true" /> Mis Entradas
          </button>
          <button type="button" className={pestana === 'saldo' ? 'activo' : ''} aria-current={pestana === 'saldo' ? 'page' : undefined} onClick={() => navigate('/usuarionormal/saldo')}>
            <FaWallet aria-hidden="true" /> Mi Saldo
          </button>
        </div>
      </div>

      {/* =========================================================
          PESTAÑA: EVENTOS (elegir a qué evento comprar)
      ========================================================= */}
      {pestana === 'eventos' && (
        <div className="pi-usr-eventos">
          <div className="pi-usr-eventos-panel">
            {errorEventos ? (
              <EstadoError onReintentar={recargarEventos} titulo="No se pudo cargar la cartelera" />
            ) : cargandoEventos ? (
              <EstadoCarga filas={3} etiqueta="Cargando cartelera…" />
            ) : (
              <EventosDestacados
                id="cartelera-usuario"
                compacto
                eventos={proximosEventos}
                saldoPorEvento={saldoPorEvento}
                textoCta="Comprar entradas"
                onVerEvento={(evento) => navigate('/usuarionormal/comprar', { state: { evento } })}
              />
            )}
          </div>

          <div className="pi-usr-card mt-20">
            <h3><FaHistory color="var(--indigo-profundo)" /> Eventos Pasados</h3>
            <div className="pi-usr-eventos-pasados-grid">
              {eventosPasados.map(ev => {
                const saldoAhi = saldoPorEvento.get(ev.id);
                return (
                  <div key={ev.id} className="pi-usr-evento-pasado-card">
                    <img src={imagenEvento(ev)} alt={ev.nombre} width="320" height="120" loading="lazy" />
                    <div className="pi-usr-evento-pasado-info">
                      <strong>{ev.nombre}</strong>
                      <span><FaMapMarkerAlt /> {ev.lugar} · {formatearFecha(ev.fecha)}</span>
                      {saldoAhi > 0 && (
                        <span className="pi-usr-evento-pasado-saldo">
                          <FaCoins aria-hidden="true" /> Te quedan {saldoAhi} pts por retirar
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PESTAÑA: COMPRAR — flujo guiado: elegir → datos → pago → aprobación
          (estilos en CompraEntradas.css)
      ========================================================= */}
      {pestana === 'comprar' && (
        <div className="pi-cmp">

          {/* ---------- Encabezado del evento + pasos ---------- */}
          <header className="pi-cmp-hero" style={{ backgroundImage: `url(${imagenEvento(eventoSeleccionado)})` }}>
            <div className="pi-cmp-hero-velo" aria-hidden="true" />
            <div className="pi-cmp-hero-txt">
              <span className="pi-cmp-eyebrow"><FaTicketAlt aria-hidden="true" /> Comprando entradas para</span>
              <h2>{eventoSeleccionado.nombre}</h2>
              <span className="pi-cmp-hero-datos">
                <span><FaCalendarAlt aria-hidden="true" /> {formatearFecha(eventoSeleccionado.fecha)}</span>
                <span><FaMapMarkerAlt aria-hidden="true" /> {eventoSeleccionado.lugar}</span>
              </span>
            </div>
            <CuentaCompra fecha={eventoSeleccionado.fecha} />
          </header>

          <ol className="pi-cmp-pasos" aria-label="Pasos de la compra">
            {['Elegí tus entradas', 'Datos de cada persona', 'Pago y comprobante', 'Aprobación'].map((t, i) => (
              <li key={t} className={i < pasoCompra ? 'listo' : i === pasoCompra ? 'actual' : ''} aria-current={i === pasoCompra ? 'step' : undefined}>
                <span className="pi-cmp-paso-num">{i < pasoCompra ? <FaCheckCircle aria-hidden="true" /> : i + 1}</span>
                <span className="pi-cmp-paso-txt">{t}</span>
              </li>
            ))}
          </ol>

          {!puedoSerTitular && (
            <div className="pi-cmp-aviso">
              <FaUserPlus aria-hidden="true" />
              <p>
                {jornadasDelEvento.length > 1
                  ? <>Ya tenés tu propia entrada en <b>todas las jornadas</b>: las que agregues serán para tus invitados.</>
                  : <>Ya tenés <b>tu entrada</b> para este evento: las que agregues serán para tus invitados.</>}
                {' '}Cada invitado recibe su propia cuenta al aprobarse la compra.
              </p>
            </div>
          )}

          <div className="pi-cmp-grid">
            <div className="pi-cmp-col">

              {/* ---------- 1. Categorías ---------- */}
              <section className="pi-cmp-seccion">
                <h3><span className="pi-cmp-num">1</span> {puedoSerTitular ? 'Elegí tus entradas' : 'Sumá entradas para invitados'}</h3>
                <p className="pi-cmp-ayuda">
                  {puedoSerTitular
                    ? 'La primera entrada de cada jornada es la tuya; las siguientes, de invitados.'
                    : 'Cada clic suma una entrada de invitado.'}
                  {' '}Máximo {MAX_ENTRADAS} por compra.
                </p>

                {(gruposCategorias.length > 0 ? gruposCategorias : [{ dia: null, items: categoriasEntradas }]).map((grupo) => (
                  <Fragment key={grupo.dia?.id ?? 'unica'}>
                    {grupo.dia && (
                      <h4 className="pi-cmp-dia"><FaMoon aria-hidden="true" /> {nombreJornadaConAnio(grupo.dia)}</h4>
                    )}
                    <div className="pi-cmp-cats">
                      {grupo.items.map((cat, iCat) => {
                        const cantidad = entradasCart.filter(ent => ent.categoriaTicketId === cat.id).length;
                        const alMaximo = entradasCart.length >= MAX_ENTRADAS;
                        const cupoLibre = cupoLibreDe(cat);
                        const agotada = Number(cat.cantidad) - Number(cat.cantidadVendida) <= 0;
                        const sinCupoParaMas = cupoLibre <= 0;
                        const vendidoPct = Number(cat.cantidad) > 0 ? Math.min(100, (Number(cat.cantidadVendida) / Number(cat.cantidad)) * 100) : 0;
                        const paraMi = !yaTengoJornada(cat.diaEventoId ?? null);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            className={`pi-cmp-cat${cantidad > 0 ? ' elegida' : ''}${agotada ? ' agotada' : ''}`}
                            style={{ '--cat': cat.color, '--i': iCat }}
                            disabled={alMaximo || sinCupoParaMas}
                            onClick={() => agregarEntrada(cat.id)}
                          >
                            {cantidad > 0 && <span key={cantidad} className="pi-cmp-cat-badge">{cantidad}</span>}
                            <span className="pi-cmp-cat-franja" aria-hidden="true" />
                            <span className="pi-cmp-cat-cab">
                              <span className="pi-cmp-cat-ic" aria-hidden="true"><FaTicketAlt /></span>
                              {!grupo.dia && mostrarJornada(cat.diaEvento) && (
                                <span className="pi-cmp-chip">{nombreJornada(cat.diaEvento)}</span>
                              )}
                            </span>
                            <span className="pi-cmp-cat-nombre">{cat.nombre}</span>
                            <span className="pi-cmp-cat-precio"><small>Bs</small> {cat.precio}</span>
                            {!agotada && (
                              <span className="pi-cmp-cat-cupo">
                                <span className="pi-cmp-cat-pista" aria-hidden="true"><span style={{ width: `${vendidoPct}%` }} /></span>
                                <small>{cupoLibre <= 10 ? `¡Quedan ${cupoLibre}!` : `${cupoLibre} disponibles`}</small>
                              </span>
                            )}
                            <span className="pi-cmp-cat-pie">
                              {agotada ? 'Agotada' : sinCupoParaMas ? 'Sin más cupo' : (
                                <>
                                  <span className="pi-cmp-para">{paraMi ? <><FaUserTag aria-hidden="true" /> Será tu entrada</> : <><FaUserPlus aria-hidden="true" /> Para un invitado</>}</span>
                                  <span className="pi-cmp-cat-cta"><FaPlus aria-hidden="true" /> {cantidad > 0 ? 'Otra' : 'Agregar'}</span>
                                </>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Fragment>
                ))}
                {entradasCart.length >= MAX_ENTRADAS && (
                  <p className="pi-cmp-ayuda">Llegaste al máximo de {MAX_ENTRADAS} entradas por compra.</p>
                )}
              </section>

              {/* ---------- 2. Datos de cada persona ---------- */}
              <section className="pi-cmp-seccion">
                <h3>
                  <span className="pi-cmp-num">2</span> Tus entradas
                  {entradasCart.length > 0 && <span className="pi-cmp-contador">{entradasCompletas}/{entradasCart.length} completas</span>}
                </h3>

                {entradasCart.length === 0 ? (
                  <div className="pi-cmp-vacio">
                    <FaTicketAlt aria-hidden="true" />
                    <p>Todavía no agregaste entradas. Tocá una categoría de arriba para empezar.</p>
                  </div>
                ) : (
                  <div className="pi-cmp-items">
                    {(gruposCarrito.length > 0 ? gruposCarrito : [{ dia: null, items: entradasCart }]).map((grupo) => (
                      <Fragment key={grupo.dia?.id ?? 'unica'}>
                        {grupo.dia && (
                          <h4 className="pi-cmp-dia"><FaMoon aria-hidden="true" /> {nombreJornadaConAnio(grupo.dia)}</h4>
                        )}
                        {grupo.items.map((entrada) => {
                          const cat = categoriasEntradas.find(c => c.id === entrada.categoriaTicketId);
                          const indiceGlobal = entradasCart.indexOf(entrada);
                          const completa = entradaCompleta(entrada);
                          const etiqueta = entrada.isTitular
                            ? 'Tu entrada'
                            : `Invitado ${entradasCart.slice(0, indiceGlobal + 1).filter(e => !e.isTitular).length}`;
                          const inicial = (entrada.nombre.trim()[0] || (entrada.isTitular ? 'T' : '?')).toUpperCase();
                          return (
                            <article key={entrada.id} className={`pi-cmp-item${completa ? ' completa' : ''}`} style={{ '--cat': cat?.color }}>
                              <div className="pi-cmp-item-cab">
                                <span className="pi-cmp-avatar" aria-hidden="true">{inicial}</span>
                                <span className="pi-cmp-item-tit">
                                  <strong>{etiqueta}</strong>
                                  <span className="pi-cmp-chip pi-cmp-chip--cat">{cat?.nombre} · Bs {cat?.precio}</span>
                                </span>
                                <span className={`pi-cmp-estado${completa ? ' ok' : ''}`}>
                                  {completa ? <><FaCheckCircle aria-hidden="true" /> Completa</> : 'Faltan datos'}
                                </span>
                                <button type="button" className="pi-cmp-quitar" onClick={() => quitarEntrada(entrada.id)} aria-label={`Quitar ${etiqueta}`}>
                                  <FaTrash aria-hidden="true" />
                                </button>
                              </div>
                              <div className="pi-cmp-item-campos">
                                <div className="input-group">
                                  <label htmlFor={`compra-nombre-${entrada.id}`}>Nombre completo</label>
                                  <input id={`compra-nombre-${entrada.id}`} type="text" autoComplete="name" placeholder="Ej: Ana López" value={entrada.nombre} onChange={(e) => actualizarEntrada(entrada.id, 'nombre', e.target.value)} disabled={entrada.isTitular} />
                                </div>
                                <div className="input-group">
                                  <label htmlFor={`compra-correo-${entrada.id}`}>Correo electrónico</label>
                                  <input id={`compra-correo-${entrada.id}`} type="email" autoComplete="email" placeholder="Para enviar su acceso" value={entrada.correo} onChange={(e) => actualizarEntrada(entrada.id, 'correo', e.target.value)} disabled={entrada.isTitular} />
                                </div>
                                <div className="input-group">
                                  <label htmlFor={`compra-celular-${entrada.id}`}>Celular (WhatsApp){entrada.isTitular && ' · opcional'}</label>
                                  <input id={`compra-celular-${entrada.id}`} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="Ej: 71234567" value={entrada.celular} onChange={(e) => actualizarEntrada(entrada.id, 'celular', e.target.value)} />
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ---------- Resumen (recibo) ---------- */}
            <aside className="pi-cmp-resumen" aria-label="Resumen de la compra">
              <h3><FaTicketAlt aria-hidden="true" /> Resumen</h3>
              {entradasCart.length === 0 ? (
                <p className="pi-cmp-ayuda">Acá vas a ver el detalle y el total.</p>
              ) : (
                <ul className="pi-cmp-lineas">
                  {categoriasEntradas
                    .map(cat => ({ cat, n: entradasCart.filter(e => e.categoriaTicketId === cat.id).length }))
                    .filter(({ n }) => n > 0)
                    .map(({ cat, n }) => (
                      <li key={cat.id}>
                        <span><i style={{ background: cat.color }} aria-hidden="true" /> {n} × {cat.nombre}</span>
                        <b>Bs {(n * Number(cat.precio)).toFixed(2)}</b>
                      </li>
                    ))}
                </ul>
              )}
              <div className="pi-cmp-corte" aria-hidden="true" />
              <div className="pi-cmp-total">
                <span>Total a pagar</span>
                <strong key={montoTotalEntradas}>Bs {montoTotalEntradas.toFixed(2)}</strong>
              </div>
              <ul className="pi-cmp-check">
                <li className={entradasCart.length > 0 ? 'ok' : ''}>
                  <FaCheckCircle aria-hidden="true" /> {entradasCart.length || 'Sin'} entrada{entradasCart.length === 1 ? '' : 's'} elegida{entradasCart.length === 1 ? '' : 's'}
                </li>
                <li className={datosCompletos ? 'ok' : ''}>
                  <FaCheckCircle aria-hidden="true" /> Datos completos {entradasCart.length > 0 && `(${entradasCompletas}/${entradasCart.length})`}
                </li>
              </ul>
              <button
                type="button"
                className="pi-cmp-pagar"
                disabled={!datosCompletos}
                onClick={() => { setErrorForm(''); setPagoIniciado(true); }}
              >
                <FaQrcode aria-hidden="true" /> Pagar Bs {montoTotalEntradas.toFixed(2)}
              </button>
              {!datosCompletos && entradasCart.length > 0 && (
                <p className="pi-cmp-ayuda">Completá los datos de todas las entradas para continuar.</p>
              )}
              {errorForm && !pagoIniciado && <div className="pi-usr-alerta-error"><FaExclamationTriangle aria-hidden="true" /> {errorForm}</div>}
            </aside>
          </div>

          {/* Barra fija en celular: el total y el botón siempre a mano. */}
          {entradasCart.length > 0 && (
            <div className="pi-cmp-barra-movil">
              <span><small>{entradasCart.length} entrada{entradasCart.length === 1 ? '' : 's'}</small><b>Bs {montoTotalEntradas.toFixed(2)}</b></span>
              <button type="button" className="pi-cmp-pagar" disabled={!datosCompletos} onClick={() => { setErrorForm(''); setPagoIniciado(true); }}>
                <FaQrcode aria-hidden="true" /> Pagar
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- PAGO: tres pasos guiados y pantalla de éxito --- */}
      {pagoIniciado && (
        <Modal
          titulo={compraEnviada
            ? <><FaCheckCircle color="var(--verde-recarga-texto)" aria-hidden="true" /> Solicitud enviada</>
            : <><FaQrcode color="var(--indigo-profundo)" aria-hidden="true" /> Pagar entradas</>}
          onCerrar={cerrarPago}
          tamano="lg"
          className="pi-usr-modal-pago"
        >
          {compraEnviada ? (
            <div className="pi-cmp-exito">
              <div className="pi-cmp-confeti" aria-hidden="true">
                {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i }} />)}
              </div>
              <svg className="pi-cmp-exito-check" viewBox="0 0 52 52" aria-hidden="true">
                <circle cx="26" cy="26" r="24" />
                <path d="M15 27 l7 7 l15 -16" />
              </svg>
              <h3>¡Listo! Recibimos tu solicitud</h3>
              <p>
                {compraEnviada.cantidad} entrada{compraEnviada.cantidad === 1 ? '' : 's'} para <b>{compraEnviada.evento}</b> · Bs {compraEnviada.total.toFixed(2)}
              </p>
              <ol className="pi-cmp-exito-pasos">
                <li><FaHourglassHalf aria-hidden="true" /> Un administrador revisa tu comprobante.</li>
                <li><FaEnvelope aria-hidden="true" /> Te avisamos por correo cuando se apruebe.</li>
                <li><FaQrcode aria-hidden="true" /> Tu entrada aparece en <b>Mis entradas</b>.</li>
              </ol>
              <button type="button" className="pi-cmp-pagar" onClick={cerrarPago}>
                <FaTicketAlt aria-hidden="true" /> Ver mis entradas
              </button>
            </div>
          ) : (
            <div className="pi-cmp-pago">
              {/* Paso 1: transferir */}
              <section className={`pi-cmp-pago-paso${transferido || comprobante ? ' listo' : ' actual'}`}>
                <span className="pi-cmp-pago-num">{transferido || comprobante ? <FaCheckCircle aria-hidden="true" /> : 1}</span>
                <div className="pi-cmp-pago-cuerpo">
                  <h4>Transferí el monto con QR</h4>
                  <div className="pi-cmp-qr">
                    <img width="180" height="180" src={DATOS_PAGO_NEGOCIO.qrUrl} alt="QR de pago" />
                    <div>
                      <span className="pi-cmp-monto-tag">Monto exacto</span>
                      <strong className="pi-cmp-monto">Bs {montoTotalEntradas.toFixed(2)}</strong>
                      <button type="button" className="pi-cmp-copiar" onClick={copiarMonto}>
                        {montoCopiado ? <><FaCheckCircle aria-hidden="true" /> Copiado</> : 'Copiar monto'}
                      </button>
                      <p className="pi-cmp-ayuda">A nombre de <b>{DATOS_PAGO_NEGOCIO.nombre}</b>. Escaneá el QR desde la app de tu banco.</p>
                      {!transferido && !comprobante && (
                        <button type="button" className="pi-cmp-listo" onClick={() => setTransferido(true)}>
                          Ya transferí <FaCheckCircle aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Paso 2: comprobante */}
              <section className={`pi-cmp-pago-paso${comprobante ? ' listo' : transferido ? ' actual' : ''}`}>
                <span className="pi-cmp-pago-num">{comprobante ? <FaCheckCircle aria-hidden="true" /> : 2}</span>
                <div className="pi-cmp-pago-cuerpo">
                  <h4>Subí la captura del comprobante</h4>
                  {!comprobante ? (
                    <label className="pi-cmp-subir">
                      <FaUpload aria-hidden="true" />
                      <span><b>Tocá para elegir</b> o arrastrá la imagen acá</span>
                      <small>JPG o PNG</small>
                      <input type="file" accept="image/*" onChange={handleComprobanteUpload} />
                    </label>
                  ) : (
                    <div className="pi-cmp-comprobante">
                      <img width="120" height="160" src={comprobante.previewUrl} alt="Comprobante subido" />
                      <div>
                        <span className="pi-cmp-ok"><FaCheckCircle aria-hidden="true" /> Comprobante cargado</span>
                        <small>{comprobante.nombreArchivo}</small>
                        <label className="pi-cmp-cambiar">
                          Cambiar imagen
                          <input type="file" accept="image/*" onChange={handleComprobanteUpload} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Paso 3: confirmar */}
              <section className={`pi-cmp-pago-paso${comprobante ? ' actual' : ''}`}>
                <span className="pi-cmp-pago-num">3</span>
                <div className="pi-cmp-pago-cuerpo">
                  <h4>Confirmá y enviá</h4>
                  <details className="pi-cmp-terminos">
                    <summary>Leer términos y condiciones</summary>
                    <pre className="pi-usr-terminos-texto">{TEXTO_TERMINOS}</pre>
                  </details>
                  <label className="pi-usr-terminos-check">
                    <input type="checkbox" checked={aceptoTerminos} onChange={(e) => setAceptoTerminos(e.target.checked)} />
                    <span>
                      Acepto los términos. Entiendo que el saldo es solo para este evento y que tengo{' '}
                      <strong>{eventoSeleccionado?.diasParaRetiro ?? 30} días</strong> tras el cierre para retirar lo que no consuma.
                    </span>
                  </label>
                  {errorForm && <div className="pi-usr-alerta-error"><FaExclamationTriangle aria-hidden="true" /> {errorForm}</div>}
                  <div className="pi-usr-modal-acciones">
                    <button type="button" className="btn-cerrar-secundario" onClick={cerrarPago}>Volver</button>
                    <button type="button" className="pi-cmp-pagar" onClick={handleEnviarComprobante} disabled={!comprobante || !aceptoTerminos}>
                      <FaCheckCircle aria-hidden="true" /> Enviar solicitud
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </Modal>
      )}

      {/* =========================================================
          PESTAÑA: MI SALDO
      ========================================================= */}
      {pestana === 'saldo' && (
        <div className="pi-usr-saldo">
          <div className="pi-usr-saldo-stats">
            <div className="pi-usr-saldo-card">
              <FaWallet size={30} color="var(--indigo-profundo)" />
              <span className="pi-usr-saldo-numero">{saldoTotal} pts</span>
              <span className="pi-usr-saldo-label">Saldo total (todos los eventos)</span>
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

          {billeteraEnCurso && (
            <div className="pi-usr-bill-destacada">
              <div className="pi-usr-bill-destacada-info">
                <BadgeEstadoEvento evento={billeteraEnCurso} className="pi-usr-bill-destacada-badge" />
                <strong className="pi-usr-bill-destacada-nombre">{billeteraEnCurso.eventoNombre}</strong>
                <span className="pi-usr-bill-destacada-saldo">
                  {Number(billeteraEnCurso.disponible ?? billeteraEnCurso.saldo)} pts disponibles
                </span>
              </div>
              <button type="button" className="btn-primario" onClick={() => navigate('/usuarionormal')}>
                <FaQrcode aria-hidden="true" /> Ver mi manilla
              </button>
            </div>
          )}

          <div className="pi-usr-card mt-20">
            <h3><FaWallet color="var(--indigo-profundo)" /> Saldo por evento</h3>
            <p className="texto-ayuda">
              El saldo que recargás en un evento solo se puede usar en ese evento.
              Tocá un evento para ver el detalle.
            </p>
            {billeteras.length === 0 ? (
              <p className="texto-ayuda">Todavía no recargaste saldo en ningún evento.</p>
            ) : (
              <>
                {billeteras.length > 3 && (
                  <Buscador
                    valor={busquedaBilleteras}
                    onCambio={setBusquedaBilleteras}
                    placeholder="Buscar evento…"
                    etiqueta="Buscar en saldo por evento"
                  />
                )}
                {billeterasFiltradas.length === 0 ? (
                  <p className="texto-ayuda">Ningún evento coincide con la búsqueda.</p>
                ) : (
                  <>
                    <div className="pi-usr-bill-lista">
                      {pagBilleteras.slice.map(b => (
                        <BilleteraAcordeon
                          key={b.eventoId}
                          b={b}
                          enCurso={b.eventoId === billeteraEnCurso?.eventoId}
                          qrCodigo={qrPorEvento.get(b.eventoId)}
                        />
                      ))}
                    </div>
                    <Paginador
                      pagina={pagBilleteras.paginaActual}
                      totalPaginas={pagBilleteras.totalPaginas}
                      onCambio={pagBilleteras.setPagina}
                      total={pagBilleteras.total}
                      unidad="eventos"
                    />
                  </>
                )}
              </>
            )}
          </div>

          <div className="pi-usr-card mt-20">
            <h3><FaHistory color="var(--indigo-profundo)" /> Mis Transacciones (Compras y Recargas)</h3>

            <div className="pi-usr-hist-buscador">
              <Buscador
                valor={busquedaHist}
                onCambio={setBusquedaHist}
                placeholder="Buscar por evento, puesto o producto…"
                filtros={filtrosHist}
                filtroActivo={filtroHist}
                onFiltro={setFiltroHist}
                etiquetaFiltros="Filtrar movimientos por tipo"
              />
            </div>

            <Tabla
              columnas={['Movimiento', 'Evento', 'Lugar / Detalle', 'Monto', 'Fecha / Hora']}
              datos={historialFiltrado}
              vacio={
                historial.length === 0
                  ? 'Aún no tienes movimientos registrados.'
                  : 'Ningún movimiento coincide con la búsqueda.'
              }
              renderFila={item => {
                const esVenta = ['consumo', 'reverso_consumo'].includes(item.tipo) && item.venta;
                let detalle;
                if (esVenta) {
                  const items = item.venta.items || [];
                  const unidades = items.reduce((total, i) => total + Number(i.cantidad), 0);
                  detalle = (
                    <span className="pi-usr-detalle-consumo">
                      <strong>{item.venta.puesto?.nombre || 'Puesto'}</strong>
                      <span className="pi-usr-detalle-items">
                        {items.length > 0
                          ? `${unidades} ${unidades === 1 ? 'producto' : 'productos'}`
                          : 'Compra sin detalle de productos'}
                      </span>
                      <button
                        type="button"
                        className="pi-usr-btn-revisar"
                        onClick={() => setVentaDetalle({
                          fecha: item.createdAt,
                          puesto: item.venta.puesto?.nombre,
                          anulada: item.tipo === 'reverso_consumo' || !!item.venta.anuladaEn,
                          motivoAnulacion: item.venta.motivoAnulacion,
                          monto: item.venta.montoTotal ?? item.monto,
                          items,
                        })}
                      >
                        Ver detalle
                      </button>
                    </span>
                  );
                } else if (item.tipo === 'recarga') {
                  detalle = item.operador?.nombre
                    ? <span className="pi-usr-detalle-consumo">Recargado por {item.operador.nombre}</span>
                    : (item.nota || '—');
                } else if (item.tipo === 'devolucion') {
                  detalle = (
                    <span className="pi-usr-detalle-consumo">
                      {item.nota || 'Retiro de saldo'}
                      {item.operador?.nombre ? ` · ${item.operador.nombre}` : ''}
                    </span>
                  );
                } else {
                  detalle = item.nota || '—';
                }
                return (
                  <tr key={item.id}>
                    <td>
                      <span className="pi-usr-tipo-celda">
                        {item.tipo === 'recarga' && <><FaCoins color="var(--verde-recarga-texto)" /> Recarga de Saldo</>}
                        {item.tipo === 'consumo' && <><FaStore color="var(--indigo-profundo)" /> Consumo en Puesto</>}
                        {item.tipo === 'devolucion' && <><FaTicketAlt color="var(--coral-compra)" /> Devolución</>}
                        {item.tipo === 'ajuste' && <><FaCoins color="var(--verde-recarga-texto)" /> Ajuste</>}
                        {item.tipo === 'ajuste_manual' && <><FaCoins color="var(--verde-recarga-texto)" /> Reposición de saldo</>}
                        {item.tipo === 'reverso_consumo' && <><FaCoins color="var(--verde-recarga-texto)" /> Reintegro por venta anulada</>}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>{item.evento?.nombre || '—'}</td>
                    <td>{detalle}</td>
                    {(() => {
                      const monto = Number(item.monto);
                      // El "ajuste" es el único tipo cuyo monto viene con signo propio
                      // (puede ser una corrección negativa); los demás siempre guardan
                      // una magnitud positiva y el signo lo da el tipo de movimiento.
                      const positivo = item.tipo === 'ajuste'
                        ? monto >= 0
                        : ['recarga', 'reverso_consumo', 'ajuste_manual'].includes(item.tipo);
                      return (
                        <td className={positivo ? 'pi-usr-monto-positivo' : 'pi-usr-monto-negativo'}>
                          {positivo ? '+' : '-'}{Math.abs(monto)} pts
                        </td>
                      );
                    })()}
                    <td style={{color: 'var(--texto-secundario)', fontSize: '13px'}}>{new Date(item.createdAt).toLocaleString('es-BO')}</td>
                  </tr>
                );
              }}
            />
            {ventaDetalle && (
              <DetalleVentaModal venta={ventaDetalle} onCerrar={() => setVentaDetalle(null)} />
            )}
          </div>

          {/* Cambios de manilla de sus entradas: si le cambiaron la manilla (perdida,
              dañada o duplicada), acá ve cuándo y por qué. */}
          <div className="pi-usr-card mt-20">
            <HistorialManillas
              mias
              titulo="Mis manillas"
              descripcion="Cada manilla que te entregaron y cada cambio, con el motivo."
            />
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
                  <FotoZoom width="140" height="140" src={qrDe(entradaDestacada.codigoQrVinculado.codigo)} alt="Tu código QR" className="manilla-qr" />
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
                    <span><FaCalendarAlt aria-hidden="true" /> {formatearFecha(entradaDestacada.evento.fecha)}</span>
                    <span><FaMapMarkerAlt aria-hidden="true" /> {entradaDestacada.evento.lugar}</span>
                  </div>
                  <div className="manilla-badges">
                    {mostrarJornada(entradaDestacada.diaEvento) && (
                      <span className="pi-usr-badge manilla-badge">
                        <FaMoon aria-hidden="true" /> {nombreJornada(entradaDestacada.diaEvento)}
                      </span>
                    )}
                    {entradaDestacada.categoriaTicket && (
                      <span className="pi-usr-badge manilla-badge manilla-badge--categoria">
                        {entradaDestacada.categoriaTicket.nombre}
                      </span>
                    )}
                    {entradaDestacada.numero != null && (
                      <span className="pi-usr-badge manilla-badge">
                        <FaIdCard aria-hidden="true" /> Entrada N.º {entradaDestacada.numero}
                      </span>
                    )}
                  </div>
                </div>

                {tiempoRestante && (
                  <div className="pi-usr-manilla-countdown">
                    {tiempoRestante.llego ? (
                      <div className="countdown-llego">
                        <FaTicketAlt className="countdown-llego-icono" aria-hidden="true" />
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

          <div className="pi-usr-mis-entradas-cabecera">
            <h3 className="pi-usr-mis-entradas-subtitulo">Todas tus entradas</h3>
            <div className="pi-usr-vista-toggle" role="group" aria-label="Cambiar vista de Mis Entradas">
              <button
                type="button"
                className={vistaMisEntradas === 'tarjetas' ? 'activo' : ''}
                aria-pressed={vistaMisEntradas === 'tarjetas'}
                onClick={() => setVistaMisEntradas('tarjetas')}
              >
                <FaTh aria-hidden="true" /> Tarjetas
              </button>
              <button
                type="button"
                className={vistaMisEntradas === 'tabla' ? 'activo' : ''}
                aria-pressed={vistaMisEntradas === 'tabla'}
                onClick={() => setVistaMisEntradas('tabla')}
              >
                <FaList aria-hidden="true" /> Tabla
              </button>
            </div>
          </div>

          <Buscador
            valor={busquedaMisEntradas}
            onCambio={setBusquedaMisEntradas}
            placeholder="Buscar por evento o lugar…"
            etiqueta="Buscar en mis entradas"
            filtros={filtrosMisEntradas}
            filtroActivo={filtroMisEntradas}
            onFiltro={setFiltroMisEntradas}
            etiquetaFiltros="Filtrar entradas"
            acciones={hayFisicaYDigital && (
              <Filtros
                opciones={[
                  { valor: 'todas', texto: 'Todo tipo de manilla' },
                  { valor: 'fisica', texto: 'Manilla física' },
                  { valor: 'digital', texto: 'Manilla digital' },
                ]}
                activo={filtroManilla}
                onCambio={setFiltroManilla}
                etiqueta="Filtrar por tipo de manilla"
              />
            )}
          />

          {vistaMisEntradas === 'tabla' ? (
            <Tabla
              columnas={['Origen', 'Evento', 'Lugar / Detalle', 'Estado', 'Entradas', 'Fecha', { texto: 'Acción', align: 'center' }]}
              datos={filasMisEntradasFiltradas}
              vacio={
                filasMisEntradas.length === 0
                  ? 'Todavía no tienes ninguna entrada.'
                  : 'Ninguna entrada coincide con la búsqueda.'
              }
              renderFila={(fila) => (
                <tr key={fila.key}>
                  <td>
                    <span className="pi-usr-tipo-celda">
                      {fila.tipo === 'invitado' ? <><FaUserPlus color="var(--cian-digital-texto)" /> Te invitaron</> : <><FaUserTag color="var(--indigo-profundo)" /> Tu compra</>}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{fila.evento.nombre}</td>
                  <td>
                    <span className="pi-usr-detalle-consumo">
                      <span><FaMapMarkerAlt /> {fila.evento.lugar}</span>
                      {fila.jornadas.length > 0 && <span><FaMoon /> {fila.jornadas.map(d => nombreJornada(d)).join(', ')}</span>}
                    </span>
                  </td>
                  <td>
                    <span className="pi-usr-tipo-celda">
                      {fila.estado === 'confirmado' && <><FaCheckCircle color="var(--verde-recarga-texto)" /> Aprobado</>}
                      {fila.estado === 'pendiente' && <><FaHourglassHalf color="var(--ambar-aviso-texto)" /> En revisión</>}
                      {fila.estado === 'rechazado' && (
                        <span title={fila.motivoRechazo || ''}><FaExclamationTriangle color="var(--rojo-error)" /> Rechazada</span>
                      )}
                    </span>
                    {!fila.vigente && <span className="pi-usr-detalle-consumo">Evento pasado</span>}
                  </td>
                  <td>
                    <span className="pi-usr-detalle-consumo">
                      <strong>{fila.cantidad} entrada{fila.cantidad === 1 ? '' : 's'}{fila.monto != null && ` · Bs. ${fila.monto}`}</strong>
                      {fila.numeros.length > 0 && <span><FaIdCard /> N.º {fila.numeros.join(', ')}</span>}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{formatearFecha(fila.evento.fecha)}</td>
                  <td style={{ textAlign: 'center' }}>
                    {fila.tipo === 'compra' ? (
                      <button type="button" className="pi-usr-btn-revisar" onClick={() => abrirRevision(fila.raw)}>
                        <FaSearch /> Ver detalles
                      </button>
                    ) : (
                      <button type="button" className="pi-usr-btn-revisar" onClick={() => setEntradaInvitadaQr(fila.raw)}>
                        <FaQrcode /> Ver QR
                      </button>
                    )}
                  </td>
                </tr>
              )}
            />
          ) : (
            filasMisEntradasFiltradas.length === 0 ? (
              <div className="pi-usr-card" style={{ textAlign: 'center', color: 'var(--gris-medio)' }}>
                {filasMisEntradas.length === 0 ? 'Todavía no tienes ninguna entrada.' : 'Ninguna entrada coincide con la búsqueda.'}
              </div>
            ) : (
              <div className="pi-usr-entradas-grid">
                {filasMisEntradasFiltradas.map(fila =>
                  fila.tipo === 'compra' ? renderCompraCard(fila.raw) : renderEntradaInvitadoCard(fila.raw)
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* --- REPORTAR ERROR DE DATOS (desde Mis Entradas) --- */}
      {entradaReportando && !compraEnRevision && (
        <Modal
          titulo={<><FaExclamationTriangle color="var(--ambar-aviso-texto)" aria-hidden="true" /> Reportar error de datos</>}
          onCerrar={cancelarReporte}
          className="pi-usr-modal"
        >
            <div className="pi-usr-modal-body">
              <p className="texto-ayuda">Entrada de: <strong>{entradaReportando.entrada.nombre}</strong></p>
              {formularioReporte}
            </div>
        </Modal>
      )}

      {/* --- REVISAR MI SOLICITUD --- */}
      {compraEnRevision && (
        <Modal
          titulo={<><FaSearch color="var(--indigo-profundo)" aria-hidden="true" /> Revisar mi solicitud</>}
          onCerrar={cerrarRevision}
          className="pi-usr-modal"
        >
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
                    <button type="button" className="btn-cerrar-secundario" onClick={cerrarRevision}>Cerrar</button>
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
                            <label htmlFor={`rev-nombre-${ent.id}`}>Nombre completo</label>
                            <input
                              id={`rev-nombre-${ent.id}`}
                              type="text"
                              autoComplete="name"
                              value={ent.nombre}
                              onChange={(e) => actualizarEntradaEdicion(ent.id, 'nombre', e.target.value)}
                              disabled={ent.isTitular}
                            />
                          </div>
                          <div className="input-group">
                            <label htmlFor={`rev-correo-${ent.id}`}>Correo electrónico</label>
                            <input
                              id={`rev-correo-${ent.id}`}
                              type="email"
                              autoComplete="email"
                              value={ent.correo}
                              onChange={(e) => actualizarEntradaEdicion(ent.id, 'correo', e.target.value)}
                              disabled={ent.isTitular}
                            />
                          </div>
                          <div className="input-group">
                            <label htmlFor={`rev-celular-${ent.id}`}>Celular (WhatsApp)</label>
                            <input
                              id={`rev-celular-${ent.id}`}
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel-national"
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
                    <button type="button" className="btn-cerrar-secundario" onClick={cerrarRevision}>Cerrar</button>
                    <button type="button" className="pi-usr-btn-enviar" onClick={guardarRevision}>
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
                                <button type="button" className="pi-usr-btn-reportar-entrada" onClick={() => iniciarReporte(compraEnRevision.id, ent)}>
                                  <FaExclamationTriangle /> Reportar error
                                </button>
                              )
                            )}
                          </div>
                          <div className="pi-usr-revision-datos">
                            <span><FaEnvelope /> {ent.correo}</span>
                            <span><FaPhoneAlt /> {ent.celular || '—'}</span>
                            {mostrarJornada(ent.diaEvento) && (
                              <span><FaMoon /> {nombreJornada(ent.diaEvento)}</span>
                            )}
                          </div>

                          <div className="pi-usr-entrada-qr">
                            {ent.isTitular ? (
                              // Tu propia entrada: tu QR, lo podés ver acá igual que en Mis Entradas.
                              ent.codigoQrVinculado ? (
                                <img width="80" height="80" src={qrDe(ent.codigoQrVinculado.codigo)} alt="QR" className="qr-miniatura" />
                              ) : (
                                <span className="texto-ayuda"><FaHourglassHalf /> Manilla aún sin vincular</span>
                              )
                            ) : (
                              // Entrada de un invitado: nunca se muestra SU código acá (el
                              // comprador no debe poder ver/usar el QR de otra persona) —
                              // solo si ya tiene manilla vinculada o no, sin la imagen.
                              ent.codigoQrVinculado ? (
                                <span className="texto-ayuda"><FaCheckCircle color="var(--verde-recarga-texto)" /> Ya tiene su manilla vinculada</span>
                              ) : (
                                <span className="texto-ayuda"><FaHourglassHalf /> Manilla aún sin vincular</span>
                              )
                            )}
                          </div>

                          {reportando && formularioReporte}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pi-usr-modal-acciones">
                    <button type="button" className="btn-cerrar-secundario" onClick={cerrarRevision}>Cerrar</button>
                  </div>
                </>
              ) : null}
            </div>
        </Modal>
      )}

      {/* --- VER QR de una entrada de invitado (desde la tabla de Mis Entradas) --- */}
      {entradaInvitadaQr && (
        <Modal
          titulo={<><FaQrcode color="var(--indigo-profundo)" aria-hidden="true" /> Tu código QR</>}
          onCerrar={() => setEntradaInvitadaQr(null)}
          tamano="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
            <strong>{entradaInvitadaQr.evento?.nombre}</strong>
            {entradaInvitadaQr.categoriaTicket && (
              <span className="texto-ayuda">{entradaInvitadaQr.categoriaTicket.nombre}</span>
            )}
            {entradaInvitadaQr.codigoQrVinculado ? (
              <FotoZoom
                width="220"
                height="220"
                src={qrDe(entradaInvitadaQr.codigoQrVinculado.codigo)}
                alt="Tu código QR"
                className="pi-usr-qr-modal-img"
              />
            ) : (
              <p className="texto-ayuda">
                <FaHourglassHalf /> Manilla aún sin vincular — vas a poder verla apenas inicies sesión el día del evento.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
