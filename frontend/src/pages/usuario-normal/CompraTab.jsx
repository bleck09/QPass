import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaQrcode, FaUpload, FaPlus, FaTrash, FaUserPlus, FaCheckCircle,
  FaHourglassHalf, FaEnvelope, FaExclamationTriangle, FaUserTag, FaCalendarAlt,
  FaMapMarkerAlt, FaMoon, FaArrowLeft, FaArrowRight, FaCopy
} from 'react-icons/fa';
import Modal from '../../components/Modal.jsx';
import Boton from '../../components/Boton.jsx';
import { useAvisos } from '../../components/Avisos.jsx';
import CuentaRegresiva from '../../components/CuentaRegresiva.jsx';
import { VERSION_TERMINOS, TEXTO_TERMINOS } from '../../constants/terminos.js';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import { formatearFecha, imagenEvento, nombreJornada, nombreJornadaConAnio, mostrarJornada, agruparPorJornada } from '../../utils/eventos.js';
import { qrDe } from '../../utils/qr.js';
import './CompraEntradas.css';

const MAX_ENTRADAS = 6;

const COLORES_CATEGORIA = ['var(--cian-digital)', 'var(--ambar-aviso)', 'var(--coral-compra)', 'var(--indigo-profundo)'];

// --- DATOS DE PAGO DEL NEGOCIO (QR genérico que se muestra al hacer clic en "Pagar") ---
const DATOS_PAGO_NEGOCIO = {
  nombre: 'QPass Eventos',
  qrUrl: qrDe('QPASS-PAGO-NEGOCIO'),
};

/**
 * Pestaña "Comprar": flujo guiado (elegir → datos → pago → aprobación) para
 * el evento elegido en la cartelera (location.state.evento) o el próximo.
 */
export default function CompraTab({
  usuario, proximosEventos, comprasConEvento, entradasANombreMio, recargarCompras,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const avisos = useAvisos();
  // Estado "enviando": el botón muestra spinner y no se puede apretar dos veces.
  const [enviandoCompra, setEnviandoCompra] = useState(false);

  const [categoriasEntradas, setCategoriasEntradas] = useState([]);

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

  // Quitar es reversible: sin confirmación, pero con "Deshacer" (PLAN §2.4).
  const quitarEntrada = (id) => {
    const indice = entradasCart.findIndex(e => e.id === id);
    const quitada = entradasCart[indice];
    if (!quitada) return;
    setEntradasCart(entradasCart.filter(e => e.id !== id));
    avisos.info(
      quitada.isTitular ? 'Quitaste tu entrada.' : `Quitaste la entrada de ${quitada.nombre.trim() || 'un invitado'}.`,
      {
        accion: {
          texto: 'Deshacer',
          onClick: () => setEntradasCart(lista => {
            if (lista.some(e => e.id === quitada.id) || lista.length >= MAX_ENTRADAS) return lista;
            const copia = [...lista];
            copia.splice(Math.min(indice, copia.length), 0, quitada);
            return copia;
          }),
        },
      },
    );
  };

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

    setEnviandoCompra(true);
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
      avisos.error(err.message, { titulo: 'No se pudo enviar la solicitud' });
    } finally {
      setEnviandoCompra(false);
    }
  };

  return (
    <>
      {/* =========================================================
          PESTAÑA: COMPRAR — flujo guiado: elegir → datos → pago → aprobación
          (estilos en CompraEntradas.css)
      ========================================================= */}
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
            <CuentaRegresiva fecha={eventoSeleccionado.fecha} variante="oscura" segundos={false} llegada={null} />
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
                                <Boton variante="peligro-suave" tamano="sm" icono={FaTrash} onClick={() => quitarEntrada(entrada.id)} aria-label={`Quitar ${etiqueta}`} />
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
              <Boton
                variante="compra"
                tamano="lg"
                icono={FaQrcode}
                anchoCompleto
                disabled={!datosCompletos}
                onClick={() => { setErrorForm(''); setPagoIniciado(true); }}
              >
                Pagar Bs {montoTotalEntradas.toFixed(2)}
              </Boton>
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
              <Boton variante="compra" icono={FaQrcode} disabled={!datosCompletos} onClick={() => { setErrorForm(''); setPagoIniciado(true); }}>
                Pagar
              </Boton>
            </div>
          )}
        </div>

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
              <Boton variante="primario" tamano="lg" icono={FaTicketAlt} onClick={cerrarPago}>
                Ver mis entradas
              </Boton>
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
                      <Boton variante="secundario" tamano="sm" icono={montoCopiado ? FaCheckCircle : FaCopy} onClick={copiarMonto}>
                        {montoCopiado ? 'Copiado' : 'Copiar monto'}
                      </Boton>
                      <p className="pi-cmp-ayuda">A nombre de <b>{DATOS_PAGO_NEGOCIO.nombre}</b>. Escaneá el QR desde la app de tu banco.</p>
                      {!transferido && !comprobante && (
                        <Boton tamano="sm" iconoDerecha={FaArrowRight} onClick={() => setTransferido(true)}>
                          Ya transferí
                        </Boton>
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
                    <Boton variante="secundario" icono={FaArrowLeft} onClick={cerrarPago} disabled={enviandoCompra}>Volver</Boton>
                    <Boton variante="compra" icono={FaCheckCircle} onClick={handleEnviarComprobante} cargando={enviandoCompra} disabled={!comprobante || !aceptoTerminos}>
                      {enviandoCompra ? 'Enviando…' : 'Enviar solicitud'}
                    </Boton>
                  </div>
                </div>
              </section>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
