import { useEffect, useMemo, useState } from 'react';
import {
  FaTicketAlt, FaQrcode, FaUserPlus, FaCheckCircle, FaHourglassHalf,
  FaEnvelope, FaExclamationTriangle, FaUserTag, FaIdCard, FaSearch, FaPhoneAlt,
  FaCalendarAlt, FaMapMarkerAlt, FaMoon, FaTh, FaList, FaSave
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import Tabla from '../../components/Tabla.jsx';
import Buscador from '../../components/Buscador.jsx';
import Filtros from '../../components/Filtros.jsx';
import Insignia from '../../components/Insignia.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import CuentaRegresiva from '../../components/CuentaRegresiva.jsx';
import ModalQr from '../../components/ModalQr.jsx';
import { EstadoVacio } from '../../components/EstadosAsync.jsx';
import Boton from '../../components/Boton.jsx';
import { useAvisos, AvisoFijo } from '../../components/Avisos.jsx';
import Card from '../../components/Card.jsx';
import api from '../../api/index.js';
import { esVigente, estadoEvento, formatearFecha, imagenEvento, nombreJornada, mostrarJornada } from '../../utils/eventos.js';
import { qrDe } from '../../utils/qr.js';
import { erroresEntradas, hayErrores, enfocarPrimerError } from '../../utils/entradas.js';
import CamposEntrada from './CamposEntrada.jsx';
import './MisEntradasTab.css';

const ETIQUETA_CAMPO = { nombre: 'Nombre completo', correo: 'Correo electrónico', celular: 'Celular' };

/**
 * Pestaña "Mis Entradas": tu manilla destacada, todas tus entradas (tarjetas
 * o tabla) y los modales de revisar solicitud, reportar error y ver QR.
 */
export default function MisEntradasTab({
  usuario, proximosEventos, comprasConEvento, entradasANombreMio, recargarCompras,
}) {
  const avisos = useAvisos();
  const navigate = useNavigate();
  // QR de tu manilla destacada ampliado (ModalQr).
  const [verQrDestacada, setVerQrDestacada] = useState(false);
  // Estados "enviando": el botón muestra spinner y no se puede apretar dos veces.
  const [guardandoRevision, setGuardandoRevision] = useState(false);
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  // --- REVISAR MI SOLICITUD: edición mientras está pendiente, reporte si ya fue aprobada ---
  const [compraEnRevision, setCompraEnRevision] = useState(null);
  const [entradasEdicion, setEntradasEdicion] = useState([]);
  // Error del servidor al guardar (la validación de cada campo va junto al campo).
  const [errorRevision, setErrorRevision] = useState('');
  // Los errores por campo se muestran recién después del primer "Guardar";
  // desde ahí se actualizan mientras la persona escribe.
  const [intentoRevision, setIntentoRevision] = useState(false);
  const erroresRevision = intentoRevision ? erroresEntradas(entradasEdicion, (e) => e.diaEventoId) : {};

  // Reporte de datos incorrectos (compartido entre "Revisar mi solicitud" y Mis Entradas):
  // entradaReportando = { compraId, entrada } de la entrada que se está reportando.
  const [entradaReportando, setEntradaReportando] = useState(null);
  const [camposReporte, setCamposReporte] = useState([]);
  const [descripcionReporte, setDescripcionReporte] = useState('');
  const [entradasReportadas, setEntradasReportadas] = useState([]);
  useEffect(() => {
    api.reportesEntrada.listar().then(lista => setEntradasReportadas(lista.map(r => r.entradaId)));
  }, []);

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

  // --- REVISAR MI SOLICITUD ---
  const abrirRevision = (compra) => {
    setCompraEnRevision(compra);
    setEntradasEdicion(compra.entradas.map(ent => ({ ...ent })));
    setErrorRevision('');
    setIntentoRevision(false);
    cancelarReporte();
  };

  const cerrarRevision = () => {
    setCompraEnRevision(null);
    setEntradasEdicion([]);
    setErrorRevision('');
    setIntentoRevision(false);
    cancelarReporte();
  };

  const actualizarEntradaEdicion = (id, campo, valor) => {
    setEntradasEdicion(prev => prev.map(ent => ent.id === id ? { ...ent, [campo]: valor } : ent));
  };

  // Solo aplica mientras la solicitud sigue pendiente: aún se puede corregir sin generar un reporte.
  const guardarRevision = async () => {
    setErrorRevision('');
    setIntentoRevision(true);
    const errores = erroresEntradas(entradasEdicion, (e) => e.diaEventoId);
    if (hayErrores(errores)) return enfocarPrimerError(entradasEdicion, errores, 'rev');

    setGuardandoRevision(true);
    try {
      await api.compras.corregirEntradas(compraEnRevision.id, entradasEdicion);
      await recargarCompras();
      cerrarRevision();
      avisos.exito('Los datos de tu solicitud quedaron corregidos.');
    } catch (err) {
      setErrorRevision(err.message);
      avisos.error(err.message, { titulo: 'No se pudieron guardar los cambios' });
    } finally {
      setGuardandoRevision(false);
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
    setEnviandoReporte(true);
    try {
      await Promise.all(camposReporte.map(campo =>
        api.reportesEntrada.crear({ compraId, entradaId: entrada.id, campo, descripcion: descripcionReporte.trim() })
      ));
      setEntradasReportadas(prev => [...prev, entrada.id]);
      cancelarReporte();
      avisos.exito('Admin va a revisar los datos y corregirlos.', { titulo: 'Reporte enviado' });
    } catch (err) {
      avisos.error(err.message, { titulo: 'No se pudo enviar el reporte' });
    } finally {
      setEnviandoReporte(false);
    }
  };

  // El correo de tu propia entrada (titular) es el de tu cuenta, con la que ya iniciaste
  // sesión — no tiene sentido "reportarlo mal puesto"; solo se puede reportar en invitados.
  const camposReportables = entradaReportando?.entrada?.isTitular
    ? Object.keys(ETIQUETA_CAMPO).filter(c => c !== 'correo')
    : Object.keys(ETIQUETA_CAMPO);

  // Formulario reutilizado tanto dentro de "Revisar mi solicitud" como en Mis Entradas.
  const formularioReporte = (
    <div className="pi-usr-form-reporte">
      <fieldset className="input-group input-group--fieldset">
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
      <div className="input-group">
        <label htmlFor="usr-reporte-desc">Cuéntale a Admin cuáles son los datos correctos</label>
        <textarea
          id="usr-reporte-desc"
          rows={3}
          placeholder="Ej: el nombre correcto es Juan Pérez y el celular es 71234567"
          value={descripcionReporte}
          onChange={(e) => setDescripcionReporte(e.target.value)}
          autoFocus
        />
      </div>
      <div className="modal-actions">
        <Boton variante="secundario" onClick={cancelarReporte}>Cancelar</Boton>
        <Boton
          icono={FaExclamationTriangle}
          onClick={enviarReporte}
          cargando={enviandoReporte}
          disabled={camposReporte.length === 0 || !descripcionReporte.trim()}
        >
          Enviar reporte
        </Boton>
      </div>
    </div>
  );

  // Card compacta de una compra para la vista "Tarjetas" de Mis Entradas: fondo con la
  // imagen del evento (para diferenciarlas de un vistazo) y sin mostrar el QR ahí mismo;
  // el QR y los datos de cada persona se ven al entrar a "Ver detalles".
  // Estado de una compra/entrada -> Insignia (un solo lugar para tarjetas y tabla).
  const insigniaEstado = (estado, motivoRechazo, solida = false) => {
    if (estado === 'confirmado') return <Insignia tono="ok" icono={FaCheckCircle} solida={solida}>Aprobada</Insignia>;
    if (estado === 'pendiente') return <Insignia tono="warn" punto latido solida={solida}>En revisión</Insignia>;
    if (estado === 'rechazado') {
      return <Insignia tono="danger" icono={FaExclamationTriangle} solida={solida} title={motivoRechazo || ''}>Rechazada</Insignia>;
    }
    return null;
  };

  // Tarjetas: el componente global EventoCard (el mismo de Gestión de
  // eventos, Recargador, Supervisor...). Toda la tarjeta es el botón.
  const renderCompraCard = (compra) => {
    const jornadas = [...new Map(
      (compra.entradas || []).map(e => e.diaEvento).filter(mostrarJornada).map(d => [d.id, d])
    ).values()];
    const numeros = compra.entradas.map(e => e.numero).filter(n => n != null).sort((a, b) => a - b);
    return (
      <EventoCard
        key={`compra-${compra.id}`}
        evento={{ ...compra.evento, imagen: imagenEvento(compra.evento) }}
        badges={insigniaEstado(compra.estado, compra.motivoRechazo)}
        meta={[
          <><FaUserTag aria-hidden="true" /> Tu compra</>,
          <><FaTicketAlt aria-hidden="true" /> {compra.entradas.length} entrada{compra.entradas.length === 1 ? '' : 's'} · Bs {compra.montoTotal}</>,
          jornadas.length > 0 && <><FaMoon aria-hidden="true" /> {jornadas.map(d => nombreJornada(d)).join(', ')}</>,
          numeros.length > 0 && <><FaIdCard aria-hidden="true" /> N.º {numeros.join(', ')}</>,
        ].filter(Boolean)}
        cta="Ver detalles"
        onClick={() => abrirRevision(compra)}
      />
    );
  };

  // Entrada que compró otra persona a mi nombre: la tarjeta abre su QR.
  const renderEntradaInvitadoCard = (entrada) => (
    <EventoCard
      key={`invitado-${entrada.id}`}
      evento={{ ...entrada.evento, imagen: imagenEvento(entrada.evento) }}
      badges={insigniaEstado('confirmado')}
      meta={[
        <><FaUserPlus aria-hidden="true" /> Te invitaron</>,
        entrada.categoriaTicket && <><FaTicketAlt aria-hidden="true" /> {entrada.categoriaTicket.nombre}</>,
        mostrarJornada(entrada.diaEvento) && <><FaMoon aria-hidden="true" /> {nombreJornada(entrada.diaEvento)}</>,
        entrada.numero != null && <><FaIdCard aria-hidden="true" /> N.º {entrada.numero}</>,
      ].filter(Boolean)}
      cta={entrada.codigoQrVinculado ? 'Ver mi QR' : 'Manilla sin vincular'}
      onClick={() => setEntradaInvitadaQr(entrada)}
    />
  );

  return (
    <>
      {/* =========================================================
          PESTAÑA: MIS ENTRADAS (tu manilla destacada, otras solicitudes y las pasadas)
      ========================================================= */}
        <div className="pi-usr-mis-entradas">
          {entradaDestacada && (
            <section className="pi-me-manilla" aria-label="Tu manilla para el próximo evento">
              <div className="pi-me-manilla-fondo" style={{ backgroundImage: `url(${imagenEvento(entradaDestacada.evento)})` }} aria-hidden="true" />
              <div className="pi-me-manilla-velo" aria-hidden="true" />

              {/* QR: tocarlo lo abre grande (ModalQr). */}
              <button
                type="button"
                className={`pi-me-manilla-qr${entradaDestacada.codigoQrVinculado ? '' : ' pendiente'}`}
                onClick={() => setVerQrDestacada(true)}
                aria-label={entradaDestacada.codigoQrVinculado ? 'Ver mi código QR en grande' : 'Manilla aún sin vincular'}
              >
                {entradaDestacada.codigoQrVinculado ? (
                  <img width="140" height="140" src={qrDe(entradaDestacada.codigoQrVinculado.codigo)} alt="" />
                ) : (
                  <><FaHourglassHalf aria-hidden="true" /><span>Aún sin vincular</span></>
                )}
                {entradaDestacada.codigoQrVinculado && <span className="pi-me-manilla-qr-ver">Tocar para ampliar</span>}
              </button>

              <div className="pi-me-manilla-corte" aria-hidden="true" />

              <div className="pi-me-manilla-info">
                <Insignia tono="info" solida icono={FaQrcode}>Tu manilla</Insignia>
                <h2>{entradaDestacada.evento.nombre}</h2>
                <div className="pi-me-manilla-datos">
                  <span><FaCalendarAlt aria-hidden="true" /> {formatearFecha(entradaDestacada.evento.fecha)}</span>
                  <span><FaMapMarkerAlt aria-hidden="true" /> {entradaDestacada.evento.lugar}</span>
                </div>
                <div className="pi-me-manilla-insignias">
                  {mostrarJornada(entradaDestacada.diaEvento) && (
                    <Insignia tono="marca" solida icono={FaMoon}>{nombreJornada(entradaDestacada.diaEvento)}</Insignia>
                  )}
                  {entradaDestacada.categoriaTicket && (
                    <Insignia tono="info" solida icono={FaTicketAlt}>{entradaDestacada.categoriaTicket.nombre}</Insignia>
                  )}
                  {entradaDestacada.numero != null && (
                    <Insignia tono="neutro" solida icono={FaIdCard}>N.º {entradaDestacada.numero}</Insignia>
                  )}
                </div>
              </div>

              <CuentaRegresiva fecha={entradaDestacada.evento.fecha} variante="oscura" titulo="Falta para el evento" className="pi-me-manilla-cuenta" />
            </section>
          )}

          <div className="pi-me-cabecera">
            <h2 className="pi-me-subtitulo">
              Todas tus entradas
              {filasMisEntradas.length > 0 && <Insignia tono="neutro">{filasMisEntradas.length}</Insignia>}
            </h2>
            <Pestanas
              variante="segmento"
              etiqueta="Cambiar vista de Mis Entradas"
              activo={vistaMisEntradas}
              onCambio={setVistaMisEntradas}
              items={[
                { id: 'tarjetas', etiqueta: 'Tarjetas', icono: FaTh },
                { id: 'tabla', etiqueta: 'Tabla', icono: FaList },
              ]}
            />
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

          {filasMisEntradas.length === 0 ? (
            <Card>
              <EstadoVacio
                icono={FaTicketAlt}
                titulo="Todavía no tenés entradas"
                mensaje="Cuando compres o alguien te regale una entrada, la vas a ver acá con tu código QR."
                accion={<Boton icono={FaCalendarAlt} onClick={() => navigate('/usuarionormal/eventos')}>Ver eventos</Boton>}
              />
            </Card>
          ) : filasMisEntradasFiltradas.length === 0 ? (
            <Card>
              <EstadoVacio
                compacto
                icono={FaSearch}
                titulo="Ninguna entrada coincide"
                mensaje="Probá con otra búsqueda o quitá los filtros."
              />
            </Card>
          ) : vistaMisEntradas === 'tabla' ? (
            <Tabla
              columnas={['Origen', 'Evento', 'Lugar / Detalle', 'Estado', 'Entradas', 'Fecha', { texto: 'Acción', align: 'center' }]}
              datos={filasMisEntradasFiltradas}
              renderFila={(fila) => (
                <tr key={fila.key}>
                  <td>
                    <span className="pi-usr-tipo-celda">
                      {fila.tipo === 'invitado' ? <><FaUserPlus color="var(--info-text)" aria-hidden="true" /> Te invitaron</> : <><FaUserTag color="var(--action)" aria-hidden="true" /> Tu compra</>}
                    </span>
                  </td>
                  <td>{fila.evento.nombre}</td>
                  <td>
                    <span className="pi-usr-detalle-consumo">
                      <span><FaMapMarkerAlt aria-hidden="true" /> {fila.evento.lugar}</span>
                      {fila.jornadas.length > 0 && <span><FaMoon aria-hidden="true" /> {fila.jornadas.map(d => nombreJornada(d)).join(', ')}</span>}
                    </span>
                  </td>
                  <td>
                    <span className="pi-me-celda-estado">
                      {insigniaEstado(fila.estado, fila.motivoRechazo)}
                      {!fila.vigente && <Insignia tono="neutro">Evento pasado</Insignia>}
                    </span>
                  </td>
                  <td>
                    <span className="pi-usr-detalle-consumo">
                      <strong>{fila.cantidad} entrada{fila.cantidad === 1 ? '' : 's'}{fila.monto != null && ` · Bs ${fila.monto}`}</strong>
                      {fila.numeros.length > 0 && <span><FaIdCard aria-hidden="true" /> N.º {fila.numeros.join(', ')}</span>}
                    </span>
                  </td>
                  <td className="pi-me-celda-fecha">{formatearFecha(fila.evento.fecha)}</td>
                  <td style={{ textAlign: 'center' }}>
                    {fila.tipo === 'compra' ? (
                      <Boton variante="secundario" tamano="sm" icono={FaSearch} onClick={() => abrirRevision(fila.raw)}>Ver detalles</Boton>
                    ) : (
                      <Boton variante="secundario" tamano="sm" icono={FaQrcode} onClick={() => setEntradaInvitadaQr(fila.raw)}>Ver QR</Boton>
                    )}
                  </td>
                </tr>
              )}
            />
          ) : (
            <GrillaEventos eventos={filasMisEntradasFiltradas} gridClassName="pi-me-grid">
              {(fila) => (fila.tipo === 'compra' ? renderCompraCard(fila.raw) : renderEntradaInvitadoCard(fila.raw))}
            </GrillaEventos>
          )}
        </div>

      {/* --- REPORTAR ERROR DE DATOS (desde Mis Entradas) --- */}
      {entradaReportando && !compraEnRevision && (
        <Modal
          titulo={<><FaExclamationTriangle color="var(--ambar-aviso-texto)" aria-hidden="true" /> Reportar error de datos</>}
          onCerrar={cancelarReporte}
        >
            <div className="pi-me-modal-cuerpo">
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
          tamano="lg"
        >
            <div className="pi-me-modal-cuerpo">
              <p className="texto-ayuda">
                Lote de {compraEnRevision.entradas.length} entrada(s) · {formatearFecha(compraEnRevision.createdAt)}
              </p>

              {compraEnRevision.estado === 'rechazado' && (
                <>
                  <AvisoFijo tono="error" titulo="Esta solicitud fue rechazada">
                    {compraEnRevision.motivoRechazo || null}
                  </AvisoFijo>
                  <p className="texto-ayuda">Si crees que fue un error, contacta al organizador o realiza una nueva compra.</p>
                  <div className="modal-actions">
                    <Boton variante="secundario" onClick={cerrarRevision}>Cerrar</Boton>
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
                          <CamposEntrada
                            entrada={ent}
                            errores={erroresRevision[ent.id]}
                            onCambio={(campo, valor) => actualizarEntradaEdicion(ent.id, campo, valor)}
                            prefijo="rev"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {errorRevision && (
                    <p className="form-nota form-nota--error" role="alert">
                      <FaExclamationTriangle aria-hidden="true" /> {errorRevision}
                    </p>
                  )}

                  <div className="modal-actions">
                    <Boton variante="secundario" onClick={cerrarRevision}>Cerrar</Boton>
                    <Boton icono={FaSave} onClick={guardarRevision} cargando={guardandoRevision}>
                      Guardar cambios
                    </Boton>
                  </div>
                </>
              ) : compraEnRevision.estado === 'confirmado' ? (
                <>
                  <p className="texto-ayuda">
                    Tu solicitud ya fue aprobada, así que los datos no se pueden editar directamente. Si el nombre,
                    correo o celular de alguna entrada está mal, repórtalo para que Admin lo corrija.
                  </p>

                  {!esVigente(compraEnRevision.evento || proximosEventos[0]) && (
                    <AvisoFijo tono="aviso">
                      El evento de esta solicitud ya pasó, así que ya no se pueden reportar datos.
                    </AvisoFijo>
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
                                <Insignia tono="warn" icono={FaExclamationTriangle}>Reportado</Insignia>
                              ) : !reportando && (
                                <Boton variante="peligro-suave" tamano="sm" icono={FaExclamationTriangle} onClick={() => iniciarReporte(compraEnRevision.id, ent)}>
                                  Reportar error
                                </Boton>
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

                  <div className="modal-actions">
                    <Boton variante="secundario" onClick={cerrarRevision}>Cerrar</Boton>
                  </div>
                </>
              ) : null}
            </div>
        </Modal>
      )}

      {/* --- VER QR de una entrada de invitado (tarjetas o tabla) --- */}
      {entradaInvitadaQr && (
        <ModalQr
          codigo={entradaInvitadaQr.codigoQrVinculado?.codigo}
          titulo={entradaInvitadaQr.evento?.nombre}
          etiquetas={[entradaInvitadaQr.categoriaTicket?.nombre]}
          textoSinCodigo="Vas a poder verla apenas se vincule tu manilla (a más tardar el día del evento)."
          onCerrar={() => setEntradaInvitadaQr(null)}
        />
      )}

      {/* --- VER QR de tu manilla destacada --- */}
      {verQrDestacada && entradaDestacada && (
        <ModalQr
          codigo={entradaDestacada.codigoQrVinculado?.codigo}
          titulo={entradaDestacada.evento.nombre}
          etiquetas={[entradaDestacada.categoriaTicket?.nombre, mostrarJornada(entradaDestacada.diaEvento) && nombreJornada(entradaDestacada.diaEvento)]}
          nota="Mostralo en la puerta para entrar y en los puestos para pagar."
          onCerrar={() => setVerQrDestacada(false)}
        />
      )}
    </>
  );
}
