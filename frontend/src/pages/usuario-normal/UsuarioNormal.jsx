import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
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

  const montoTotalEntradas = entradasCart.reduce((acc, entrada) => acc + Number(entrada.precio), 0);

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

      setEntradasCart([]);
      setComprobante(null);
      setAceptoTerminos(false);
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
          PESTAÑA: COMPRAR (formulario compacto, para el evento seleccionado)
      ========================================================= */}
      {pestana === 'comprar' && (
        <div className="pi-usr-comprar">

          <div className="pi-usr-evento-header">
            <img src={imagenEvento(eventoSeleccionado)} alt={eventoSeleccionado.nombre} width="320" height="180" />
            <div>
              <span className="pi-usr-evento-header-eyebrow">Comprando entradas para</span>
              <h3>{eventoSeleccionado.nombre}</h3>
              <span className="texto-ayuda">
                <FaCalendarAlt /> {formatearFecha(eventoSeleccionado.fecha)} · <FaMapMarkerAlt /> {eventoSeleccionado.lugar}
              </span>
            </div>
          </div>

          {/* Nota dinámica dependiendo de la validación */}
          {!puedoSerTitular ? (
            <div className="pi-usr-nota-informativa nota-verde">
              <FaUserPlus className="nota-icon" />
              <div>
                <strong>Comprando para terceros (Invitados)</strong>
                <p>
                  {jornadasDelEvento.length > 1
                    ? <>Ya tenés tu propia entrada en <b>todas las jornadas</b> de este evento. Las que agregues abajo serán para tus invitados.</>
                    : <>El sistema detecta que <b>ya cuentas con una entrada</b> asignada a tu cuenta. Todas las entradas que agregues abajo serán para tus invitados.</>}
                  {' '}Al aprobarse la compra, cada invitado recibe su propia cuenta. La manilla física con su código QR se la entrega Supervisor al recogerla en el evento.
                </p>
              </div>
            </div>
          ) : (
            <div className="pi-usr-nota-informativa">
              <FaIdCard className="nota-icon" />
              <div>
                <strong>Elige una categoría para empezar</strong>
                <p>
                  {jornadasDelEvento.length > 1
                    ? 'La primera entrada que agregues de cada jornada será la tuya; las siguientes de esa jornada serán para invitados. Podés comprar tu entrada para cada noche del evento.'
                    : 'La primera entrada que agregues abajo será la tuya (no vas a poder cambiar tu nombre ni correo). Si haces clic de nuevo, esa entrada será para un invitado, y así sucesivamente.'}
                </p>
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
                  {/* Con 2+ jornadas en el carrito, agrupadas bajo un encabezado por
                      noche; con 0 o 1, `gruposCarrito` viene [] y cae al grupo único
                      sin encabezado — mismo render de siempre. */}
                  {(gruposCarrito.length > 0 ? gruposCarrito : [{ dia: null, items: entradasCart }]).map((grupo) => (
                    <Fragment key={grupo.dia?.id ?? 'unica'}>
                      {grupo.dia && (
                        <h5 className="pi-usr-cart-dia-header"><FaMoon aria-hidden="true" /> {nombreJornadaConAnio(grupo.dia)}</h5>
                      )}
                      {grupo.items.map((entrada) => {
                        const catSeleccionada = categoriasEntradas.find(c => c.id === entrada.categoriaTicketId);
                        const indiceGlobal = entradasCart.indexOf(entrada);
                        return (
                          <div key={entrada.id} className="pi-usr-ticket-row" style={{ borderLeftColor: catSeleccionada.color }}>
                            <div className="pi-usr-ticket-row-top">
                              <span className="pi-usr-ticket-row-titulo">
                                {entrada.isTitular ? <FaUserTag color="var(--indigo-profundo)"/> : <FaUserPlus color="var(--gris-medio)"/>}
                                {entrada.isTitular
                                  ? 'Tú'
                                  : `Invitado ${entradasCart.slice(0, indiceGlobal + 1).filter(e => !e.isTitular).length}`}
                              </span>

                              <span className="pi-usr-cat-badge-fija" style={{ background: catSeleccionada.color }}>
                                {catSeleccionada.nombre} · Bs.{catSeleccionada.precio}
                              </span>

                              <button type="button" className="btn-eliminar-ticket" onClick={() => quitarEntrada(entrada.id)} aria-label={`Quitar entrada de ${entrada.nombre || 'invitado'}`}>
                                <FaTrash aria-hidden="true" />
                              </button>
                            </div>

                            <div className="pi-usr-ticket-inputs">
                              <div className="input-group">
                                <label htmlFor={`compra-nombre-${entrada.id}`}>Nombre completo</label>
                                <input id={`compra-nombre-${entrada.id}`} type="text" autoComplete="name" placeholder="Ej: Ana López" value={entrada.nombre} onChange={(e) => actualizarEntrada(entrada.id, 'nombre', e.target.value)} disabled={entrada.isTitular} />
                              </div>
                              <div className="input-group">
                                <label htmlFor={`compra-correo-${entrada.id}`}>Correo electrónico</label>
                                <input id={`compra-correo-${entrada.id}`} type="email" autoComplete="email" placeholder="Para enviar credenciales" value={entrada.correo} onChange={(e) => actualizarEntrada(entrada.id, 'correo', e.target.value)} disabled={entrada.isTitular} />
                              </div>
                              <div className="input-group">
                                <label htmlFor={`compra-celular-${entrada.id}`}>Celular (WhatsApp)</label>
                                <input id={`compra-celular-${entrada.id}`} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="Ej: 71234567" value={entrada.celular} onChange={(e) => actualizarEntrada(entrada.id, 'celular', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              )}

              <div className="pi-usr-categorias-grandes">
                <h4>{!puedoSerTitular ? 'Añadir entradas para invitados' : 'Elige tu categoría'}</h4>
                <p className="texto-ayuda">
                  {!puedoSerTitular
                    ? `Elige la categoría para sumar una entrada de invitado. Puedes hacer clic varias veces para agregar a más de una persona (máx. ${MAX_ENTRADAS} entradas por compra).`
                    : 'Haz clic en la categoría que quieres para tu propia entrada.'}
                </p>
                {/* Con 2+ jornadas ofrecidas, una grilla por noche bajo su propio
                    encabezado (el badge de jornada de la tarjeta se omite ahí, ya
                    es redundante); con 0 o 1, `gruposCategorias` viene [] y cae a
                    una sola grilla — mismo render de siempre, badge incluido. */}
                {(gruposCategorias.length > 0 ? gruposCategorias : [{ dia: null, items: categoriasEntradas }]).map((grupo) => (
                  <Fragment key={grupo.dia?.id ?? 'unica'}>
                    {grupo.dia && (
                      <h5 className="pi-usr-categorias-dia-header"><FaMoon aria-hidden="true" /> {nombreJornadaConAnio(grupo.dia)}</h5>
                    )}
                    <div className="pi-usr-categorias-grid">
                      {grupo.items.map(cat => {
                        const cantidad = entradasCart.filter(ent => ent.categoriaTicketId === cat.id).length;
                        const alMaximo = entradasCart.length >= MAX_ENTRADAS;
                        const cupoLibre = cupoLibreDe(cat);
                        const agotada = Number(cat.cantidad) - Number(cat.cantidadVendida) <= 0;
                        const sinCupoParaMas = cupoLibre <= 0;
                        return (
                          <button
                            key={cat.id}
                            className="pi-usr-categoria-card"
                            style={{ background: cat.color, opacity: agotada ? 0.55 : 1 }}
                            disabled={alMaximo || sinCupoParaMas}
                            onClick={() => agregarEntrada(cat.id)}
                          >
                            {cantidad > 0 && (
                              <span className="cat-card-badge" style={{ color: cat.color }}>{cantidad}</span>
                            )}
                            {!grupo.dia && mostrarJornada(cat.diaEvento) && (
                              <span className="cat-card-jornada">{nombreJornada(cat.diaEvento)}</span>
                            )}
                            {misJornadasConEntrada.has(cat.diaEventoId ?? null) && (
                              <span className="cat-card-jornada cat-card-jornada--tengo">Ya tenés tu entrada</span>
                            )}
                            <span className="cat-card-nombre">{cat.nombre}</span>
                            <span className="cat-card-precio">Bs. {cat.precio}</span>
                            {agotada ? (
                              <span className="cat-card-cta">Agotada</span>
                            ) : sinCupoParaMas ? (
                              <span className="cat-card-cta">Sin más cupo</span>
                            ) : (
                              <span className="cat-card-cta"><FaPlus /> {cantidad > 0 ? 'Agregar otra' : 'Agregar'}</span>
                            )}
                            {!agotada && cupoLibre > 0 && cupoLibre <= 10 && (
                              <span className="cat-card-stock">Quedan {cupoLibre}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </Fragment>
                ))}
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
        <Modal
          titulo={<><FaQrcode color="var(--indigo-profundo)" aria-hidden="true" /> Pagar entradas</>}
          onCerrar={() => setPagoIniciado(false)}
          tamano="lg"
          className="pi-usr-modal-pago"
        >
            <div className="pi-usr-modal-body">
              <div className="pi-usr-qr-card pi-usr-qr-card-grande">
                <img width="200" height="200" src={DATOS_PAGO_NEGOCIO.qrUrl} alt="QR de pago del negocio" />
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
                    <img width="240" height="320" src={comprobante.previewUrl} alt="Comprobante" />
                    <div className="preview-info">
                      <span>{comprobante.nombreArchivo}</span>
                      <label htmlFor="pi-usr-file" className="btn-cambiar-archivo">Cambiar foto</label>
                    </div>
                  </div>
                )}
                <input id="pi-usr-file" type="file" accept="image/*" onChange={handleComprobanteUpload} hidden />
              </div>

              <div className="pi-usr-terminos">
                <details>
                  <summary>Términos y condiciones</summary>
                  <pre className="pi-usr-terminos-texto">{TEXTO_TERMINOS}</pre>
                </details>
                <label className="pi-usr-terminos-check">
                  <input
                    type="checkbox"
                    checked={aceptoTerminos}
                    onChange={(e) => setAceptoTerminos(e.target.checked)}
                  />
                  <span>
                    Acepto los términos y condiciones. Entiendo que el saldo cargado
                    es solo para este evento y que tengo{' '}
                    <strong>{eventoSeleccionado?.diasParaRetiro ?? 30} días</strong> tras
                    el cierre para retirar lo que no consuma.
                  </span>
                </label>
              </div>

              {errorForm && <div className="pi-usr-alerta-error"><FaExclamationTriangle /> {errorForm}</div>}

              <div className="pi-usr-modal-acciones">
                <button type="button" className="btn-cerrar-secundario" onClick={() => setPagoIniciado(false)}>Cerrar</button>
                <button
                  type="button"
                  className="pi-usr-btn-enviar"
                  onClick={handleEnviarComprobante}
                  disabled={!comprobante || !aceptoTerminos}
                >
                  <FaCheckCircle /> Enviar Pago y Solicitar
                </button>
              </div>
            </div>
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
                  detalle = (
                    <span className="pi-usr-detalle-consumo">
                      <strong>{item.venta.puesto?.nombre || 'Puesto'}</strong>
                      {items.length > 0 ? (
                        <span className="pi-usr-detalle-items">
                          {items.map((i, idx) => (
                            <span key={idx} className="pi-usr-detalle-item">
                              <span>{i.cantidad}× {i.nombreProducto}</span>
                              <span className="pi-usr-detalle-precio">
                                {Number(i.precioUnitario) * i.cantidad} pts
                                {i.cantidad > 1 && ` (${Number(i.precioUnitario)} c/u)`}
                              </span>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="pi-usr-detalle-items">Compra sin detalle de productos</span>
                      )}
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
                        : ['recarga', 'reverso_consumo'].includes(item.tipo);
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
                    <span>
                      <FaCalendarAlt /> {formatearFecha(entradaDestacada.evento.fecha)}
                    </span>
                    {mostrarJornada(entradaDestacada.diaEvento) && (
                      <span className="pi-usr-badge" style={{ background: 'var(--indigo-profundo)', color: 'var(--blanco)' }}>
                        <FaMoon /> {nombreJornada(entradaDestacada.diaEvento)}
                      </span>
                    )}
                    <span><FaMapMarkerAlt /> {entradaDestacada.evento.lugar}</span>
                    {entradaDestacada.categoriaTicket && (
                      <span className="pi-usr-badge" style={{ background: 'var(--cian-digital)', color: 'var(--blanco)' }}>
                        {entradaDestacada.categoriaTicket.nombre}
                      </span>
                    )}
                    {entradaDestacada.numero != null && (
                      <span className="pi-usr-badge" style={{ background: 'var(--indigo-profundo)', color: 'var(--blanco)' }}>
                        <FaIdCard /> Entrada N.º {entradaDestacada.numero}
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
