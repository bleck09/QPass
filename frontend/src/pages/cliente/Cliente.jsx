import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaCalendarAlt, FaPalette, FaImage, FaMapMarkedAlt, FaMapMarkerAlt,
  FaListUl, FaClock, FaPlus, FaTrash, FaPaperPlane, FaEye, FaFileAlt, FaChartPie,
  FaSave, FaPen, FaCheck, FaSearch, FaCheckCircle, FaTimesCircle, FaArrowRight,
} from 'react-icons/fa';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import Boton from '../../components/Boton.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
import Migas from '../../components/Migas.jsx';
import Campo from '../../components/Campo.jsx';
import Card from '../../components/Card.jsx';
import Insignia from '../../components/Insignia.jsx';
import SubirImagen from '../../components/SubirImagen.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import { Tablero, FilaKpis, TileKpi, Panel, BarraMeta } from '../../components/Tablero.jsx';
import {
  SeguimientoSolicitud, PanelPropuesta, PanelColores, PanelCronograma, PanelActividades, PanelVistaPrevia,
} from '../../components/SolicitudEvento.jsx';
import VistaPreviaPagina from '../admin/VistaPreviaPagina.jsx';
import EditorColores from '../../components/EditorColores.jsx';
import { PALETAS_LANDING, esAjusteDefecto } from '../../constants/landingEvento.js';
import AjusteImagen from '../admin/AjusteImagen.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import { useApi } from '../../utils/useApi.js';
import { errorObligatorio, limpiarErrores, enfocarPrimero } from '../../utils/validacion.js';
import { formatearFecha } from '../../utils/eventos.js';
import api from '../../api/index.js';
import {
  ESTADO_SOLICITUD, solicitudEditable, CAMPOS_SOLO_LECTURA, haceCuanto, configPreviaDe,
} from '../../constants/solicitudesEvento.js';
import './Cliente.css';

/*
  "Mis propuestas" del organizador (rol Cliente). Tres vistas, según la URL:
    /Cliente                          -> lista de propuestas con su seguimiento
    /Cliente?propuesta=<id>           -> detalle de una propuesta (solo lectura)
    /Cliente?propuesta=nueva          -> formulario nuevo
    /Cliente?propuesta=<id>&editar=1  -> formulario para editar / corregir y reenviar
  El botón Atrás del navegador recorre esas vistas.
*/

const [PALETA_BASE] = PALETAS_LANDING;

const SOLICITUD_VACIA = {
  nombreEvento: '', lugar: '', fecha: '', fechaFin: '', descripcion: '', aforoEstimado: '',
  // Colores de arranque = la primera paleta lista (la misma base que usa Admin).
  colorPrimario: PALETA_BASE.colorPrimario, colorBoton: PALETA_BASE.colorBoton, colorFondo: PALETA_BASE.colorFondo,
  colorTextoTitulo: PALETA_BASE.colorTextoTitulo, colorTextoP: PALETA_BASE.colorTextoP,
  imagenPortada: '', imagenAjuste: null, mapaLugar: '',
  actividades: [{ titulo: '', descripcion: '' }],
  cronograma: [{ hora: '', actividad: '' }],
};

// Los inputs datetime-local necesitan "YYYY-MM-DDTHH:mm"; el backend devuelve ISO completo.
const paraInputFecha = (iso) => (iso ? iso.slice(0, 16) : '');

const validarSolicitud = (s) => limpiarErrores({
  'sol-nombreEvento': errorObligatorio(s.nombreEvento, 'Escribí el nombre del evento.'),
  'sol-lugar': errorObligatorio(s.lugar, 'Escribí dónde se hace.'),
  'sol-fecha': errorObligatorio(s.fecha, 'Elegí cuándo empieza.'),
  'sol-fechaFin': !s.fechaFin ? 'Elegí cuándo termina.'
    : s.fecha && s.fechaFin <= s.fecha ? 'Tiene que terminar después de empezar.' : null,
  'sol-descripcion': errorObligatorio(s.descripcion, 'Contá de qué trata el evento.'),
});
const ORDEN_CAMPOS = ['sol-nombreEvento', 'sol-lugar', 'sol-fecha', 'sol-fechaFin', 'sol-descripcion'];

function InsigniaEstado({ estado }) {
  const e = ESTADO_SOLICITUD[estado];
  return e ? <Insignia tono={e.tono} icono={e.icono}>{e.texto}</Insignia> : null;
}

export default function Cliente() {
  useTituloPagina('Mis propuestas');
  const [params, setParams] = useSearchParams();
  const propuesta = params.get('propuesta'); // null | 'nueva' | id
  const editar = params.get('editar') === '1';
  // Una sola navegación por cambio de vista (dos setSearchParams seguidos se pisan).
  const ir = useCallback((p = null, conEditar = false) => {
    setParams(() => {
      const next = new URLSearchParams();
      if (p) next.set('propuesta', p);
      if (conEditar) next.set('editar', '1');
      return next;
    });
  }, [setParams]);

  const cargar = useCallback(() => api.solicitudesEvento.listar(), []);
  const { data: solicitudes, cargando, error, recargar } = useApi(cargar, { inicial: [] });

  if (error) return <div className="pi-cliente-container"><EstadoError onReintentar={recargar} /></div>;
  if (cargando) return <div className="pi-cliente-container"><EstadoCarga filas={4} /></div>;

  if (propuesta === 'nueva') {
    return (
      <FormularioPropuesta
        key="nueva"
        onVolver={() => ir()}
        onGuardada={async (s) => { await recargar(); ir(s.id); }}
      />
    );
  }

  if (propuesta) {
    const s = solicitudes.find((x) => x.id === propuesta);
    if (!s) {
      return (
        <div className="pi-cliente-container">
          <EstadoVacio
            icono={FaFileAlt}
            titulo="No encontramos esa propuesta"
            accion={<Boton onClick={() => ir()}>Ver mis propuestas</Boton>}
          />
        </div>
      );
    }
    if (editar && solicitudEditable(s.estado)) {
      return (
        <FormularioPropuesta
          key={s.id}
          inicial={s}
          onVolver={() => ir(s.id)}
          onGuardada={async () => { await recargar(); ir(s.id); }}
        />
      );
    }
    return <DetallePropuesta solicitud={s} onVolver={() => ir()} onEditar={() => ir(s.id, true)} onNueva={() => ir('nueva')} />;
  }

  return <ListaPropuestas solicitudes={solicitudes} onAbrir={(id) => ir(id)} onEditar={(id) => ir(id, true)} onNueva={() => ir('nueva')} />;
}

/* ============================ LISTA ============================ */

function ListaPropuestas({ solicitudes, onAbrir, onEditar, onNueva }) {
  const cuenta = (estado) => solicitudes.filter((s) => s.estado === estado).length;
  const conCambios = cuenta('cambios_solicitados');
  // Primero lo que necesita al cliente, después lo que está en curso, al final lo resuelto.
  const orden = { cambios_solicitados: 0, pendiente: 1, aprobado: 2, rechazado: 3 };
  const ordenadas = [...solicitudes].sort((a, b) =>
    orden[a.estado] - orden[b.estado] || new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div className="pi-cliente-container">
      <EncabezadoPagina
        titulo="Mis propuestas"
        subtitulo="Proponé tu evento y seguí su aprobación. Al aprobarse, se crea la página del evento."
        icono={FaFileAlt}
        acciones={<Boton icono={FaPlus} onClick={onNueva}>Nueva propuesta</Boton>}
      />

      {solicitudes.length === 0 ? (
        <EstadoVacio
          icono={FaCalendarAlt}
          titulo="Todavía no mandaste ninguna propuesta"
          mensaje="Contanos de qué trata tu evento, cuándo y dónde. El Administrador la revisa y, al aprobarla, crea la página y la venta de entradas."
          accion={<Boton icono={FaPlus} onClick={onNueva}>Crear mi primera propuesta</Boton>}
        />
      ) : (
        <>
          {conCambios > 0 && (
            <AvisoFijo tono="aviso" icono={FaPen} titulo={conCambios === 1 ? 'Una propuesta necesita cambios' : `${conCambios} propuestas necesitan cambios`}>
              El Administrador te pidió que corrijas algo antes de aprobarla. Abrila, corregí y reenviala.
            </AvisoFijo>
          )}

          <Tablero>
            <FilaKpis>
              <TileKpi icon={<FaSearch />} tono="info" label="En revisión" valor={cuenta('pendiente')} />
              <TileKpi icon={<FaPen />} tono={conCambios ? 'warn' : 'neutral'} label="Te pidieron cambios" valor={conCambios} />
              <TileKpi icon={<FaCheckCircle />} tono="ok" label="Aprobadas" valor={cuenta('aprobado')} />
              <TileKpi icon={<FaTimesCircle />} tono={cuenta('rechazado') ? 'danger' : 'neutral'} label="Rechazadas" valor={cuenta('rechazado')} />
            </FilaKpis>
          </Tablero>

          <ul className="pi-cliente-propuestas">
            {ordenadas.map((s) => {
              const corregir = s.estado === 'cambios_solicitados';
              return (
                // El clic en cualquier parte abre (mouse); el botón es el acceso por teclado.
                <li key={s.id} className={`pi-cliente-prop pi-cliente-prop--${s.estado}`} onClick={() => onAbrir(s.id)}>
                  <div className="pi-cliente-prop__cab">
                    <h3>{s.nombreEvento}</h3>
                    <InsigniaEstado estado={s.estado} />
                  </div>
                  <p className="pi-cliente-prop__meta">
                    <span><FaCalendarAlt aria-hidden="true" /> {formatearFecha(s.fecha)}</span>
                    <span><FaMapMarkerAlt aria-hidden="true" /> {s.lugar}</span>
                  </p>
                  <SeguimientoSolicitud solicitud={s} compacto />
                  {corregir && s.comentarioCambios && (
                    <p className="pi-cliente-prop__nota pi-cliente-prop__nota--aviso"><FaPen aria-hidden="true" /> {s.comentarioCambios}</p>
                  )}
                  {s.estado === 'rechazado' && s.motivoRechazo && (
                    <p className="pi-cliente-prop__nota pi-cliente-prop__nota--error"><FaTimesCircle aria-hidden="true" /> {s.motivoRechazo}</p>
                  )}
                  <div className="pi-cliente-prop__pie" onClick={(e) => e.stopPropagation()}>
                    <span className="pi-cliente-prop__cuando">Enviada {haceCuanto(s.createdAt)}</span>
                    {corregir ? (
                      <Boton tamano="sm" icono={FaPen} onClick={() => onEditar(s.id)}>Corregir y reenviar</Boton>
                    ) : (
                      <Boton variante="secundario" tamano="sm" iconoDerecha={FaArrowRight} onClick={() => onAbrir(s.id)}>Ver propuesta</Boton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/* ============================ DETALLE ============================ */

function DetallePropuesta({ solicitud: s, onVolver, onEditar, onNueva }) {
  const navigate = useNavigate();
  const editable = solicitudEditable(s.estado);

  return (
    <div className="pi-cliente-container">
      <div className="qp-nav">
        <BotonVolver onClick={onVolver}>Mis propuestas</BotonVolver>
        <Migas items={[{ texto: 'Mis propuestas', onClick: onVolver }, { texto: s.nombreEvento, actual: true }]} />
      </div>
      <EncabezadoPagina
        titulo={s.nombreEvento}
        subtitulo={`Enviada ${haceCuanto(s.createdAt)}${s.reenviadaEn ? ` · reenviada ${haceCuanto(s.reenviadaEn)}` : ''}`}
        icono={FaFileAlt}
        acciones={(
          <div className="btn-acciones">
            <InsigniaEstado estado={s.estado} />
            {editable && (
              <Boton variante={s.estado === 'cambios_solicitados' ? 'primario' : 'secundario'} icono={FaPen} onClick={onEditar}>
                {s.estado === 'cambios_solicitados' ? 'Corregir y reenviar' : 'Editar'}
              </Boton>
            )}
            {s.estado === 'aprobado' && (
              <Boton icono={FaChartPie} onClick={() => navigate('/Cliente/dashboard')}>Ver dashboard del evento</Boton>
            )}
          </div>
        )}
      />

      <Tablero>
        <Panel span={12} titulo="Seguimiento de tu propuesta">
          <SeguimientoSolicitud solicitud={s} />
          <QueSigue solicitud={s} onEditar={onEditar} onNueva={onNueva} />
        </Panel>

        <PanelPropuesta solicitud={s} />
        <PanelColores solicitud={s} />
        <PanelCronograma solicitud={s} span={6} />
        <PanelActividades solicitud={s} span={6} />
        <PanelVistaPrevia solicitud={s} subtitulo="Así queda la página pública cuando se apruebe y se publique." />
      </Tablero>
    </div>
  );
}

// Explicación de en qué punto está y qué tiene que hacer (o no) el cliente.
function QueSigue({ solicitud: s, onEditar, onNueva }) {
  if (s.estado === 'cambios_solicitados') {
    return (
      <AvisoFijo tono="aviso" icono={FaPen} titulo="El Administrador te pidió cambios">
        “{s.comentarioCambios}”
        <div className="pi-cliente-quesigue-accion">
          <Boton tamano="sm" icono={FaPen} onClick={onEditar}>Corregir y reenviar</Boton>
        </div>
      </AvisoFijo>
    );
  }
  if (s.estado === 'pendiente') {
    return (
      <AvisoFijo tono="info" icono={FaSearch} titulo="La está revisando el Administrador">
        Te avisamos por correo cuando la apruebe o si necesita que cambies algo. Mientras tanto todavía podés editarla.
      </AvisoFijo>
    );
  }
  if (s.estado === 'aprobado') {
    return (
      <AvisoFijo tono="exito" icono={FaCheck} titulo="¡Aprobada! Tu evento ya existe">
        {s.evento?.publicadoEn
          ? `La página está publicada desde el ${formatearFecha(s.evento.publicadoEn, false)}. Seguí las ventas y el ingreso desde el dashboard.`
          : 'El Administrador está preparando las entradas y la página. Cuando la publique, empieza la venta.'}
      </AvisoFijo>
    );
  }
  return (
    <AvisoFijo tono="error" icono={FaTimesCircle} titulo="No fue aprobada">
      {s.motivoRechazo ? `Motivo: ${s.motivoRechazo}` : 'El Administrador no indicó un motivo.'}
      <div className="pi-cliente-quesigue-accion">
        <Boton variante="secundario" tamano="sm" icono={FaPlus} onClick={onNueva}>Crear una nueva propuesta</Boton>
      </div>
    </AvisoFijo>
  );
}

/* ============================ FORMULARIO ============================ */

/**
 * Lista editable de filas (actividades / cronograma): la misma para las dos.
 * campos: [{ campo, placeholder, type }].
 */
function ListaFilas({ filas, campos, onCambio, onQuitar, etiquetaFila }) {
  return (
    <div className="pi-cliente-filas">
      {filas.map((fila, i) => (
        <div key={i} className="pi-cliente-fila">
          <div className={`pi-cliente-fila-inputs${campos[0].type === 'time' ? ' con-hora' : ''}`}>
            {campos.map(({ campo, placeholder, type = 'text' }) => (
              <input
                key={campo}
                type={type}
                placeholder={placeholder}
                aria-label={`${placeholder} (${etiquetaFila} ${i + 1})`}
                value={fila[campo]}
                onChange={(e) => onCambio(i, campo, e.target.value)}
              />
            ))}
          </div>
          <Boton
            variante="peligro-suave"
            tamano="sm"
            icono={FaTrash}
            onClick={() => onQuitar(i)}
            aria-label={`Quitar ${etiquetaFila} ${i + 1}`}
          />
        </div>
      ))}
    </div>
  );
}

function aFormulario(s) {
  return {
    ...s,
    fecha: paraInputFecha(s.fecha),
    fechaFin: paraInputFecha(s.fechaFin),
    aforoEstimado: s.aforoEstimado ?? '',
    imagenAjuste: s.imagenAjuste ?? null,
    actividades: s.actividades?.length ? s.actividades : SOLICITUD_VACIA.actividades,
    cronograma: s.cronograma?.length ? s.cronograma : SOLICITUD_VACIA.cronograma,
  };
}

function FormularioPropuesta({ inicial, onVolver, onGuardada }) {
  const avisos = useAvisos();
  const [confirmar, DialogoConfirmar] = useConfirmar();
  const base = useMemo(() => (inicial ? aFormulario(inicial) : SOLICITUD_VACIA), [inicial]);
  const [solicitud, setSolicitud] = useState(base);
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [verPrevia, setVerPrevia] = useState(false);

  const esNueva = !inicial;
  const pidieronCambios = inicial?.estado === 'cambios_solicitados';
  const hayCambios = JSON.stringify(solicitud) !== JSON.stringify(base);
  const errores = intento ? validarSolicitud(solicitud) : {};

  // Salir con cambios sin guardar: se confirma (§2.4).
  const volver = async () => {
    if (hayCambios) {
      const ok = await confirmar({
        titulo: '¿Descartar los cambios?',
        mensaje: 'Tenés cambios sin guardar en esta propuesta. Si salís, se pierden.',
        textoConfirmar: 'Descartar cambios',
        peligroso: true,
      });
      if (!ok) return;
    }
    onVolver();
  };

  const cambiar = (campo, valor) => setSolicitud((s) => ({ ...s, [campo]: valor }));
  const handleChange = (e) => cambiar(e.target.name, e.target.value);
  const actualizarFila = (clave, i, campo, valor) =>
    setSolicitud((s) => ({ ...s, [clave]: s[clave].map((f, j) => (j === i ? { ...f, [campo]: valor } : f)) }));
  const agregarFila = (clave, vacia) => setSolicitud((s) => ({ ...s, [clave]: [...s[clave], vacia] }));
  const quitarFila = (clave, i) => {
    const anterior = solicitud[clave];
    setSolicitud((s) => ({ ...s, [clave]: s[clave].filter((_, j) => j !== i) }));
    avisos.info('Quitaste una fila.', { accion: { texto: 'Deshacer', onClick: () => setSolicitud((s) => ({ ...s, [clave]: anterior })) } });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (enviando) return;
    setErrorEnvio('');
    setIntento(true);
    const errs = validarSolicitud(solicitud);
    if (Object.keys(errs).length) return enfocarPrimero(errs, ORDEN_CAMPOS);

    const { aforoEstimado, ...resto } = solicitud;
    const datosEnvio = Object.fromEntries(
      Object.entries(resto).filter(([campo]) => !CAMPOS_SOLO_LECTURA.includes(campo)),
    );
    if (aforoEstimado !== '' && aforoEstimado != null) datosEnvio.aforoEstimado = Number(aforoEstimado);

    setEnviando(true);
    try {
      const guardada = esNueva
        ? await api.solicitudesEvento.crear(datosEnvio)
        : await api.solicitudesEvento.actualizar(inicial.id, datosEnvio);
      avisos.exito(
        pidieronCambios
          ? 'El Administrador la vuelve a revisar con tus cambios.'
          : esNueva
            ? 'El Administrador la va a revisar. Te avisamos por correo.'
            : 'Los cambios de tu propuesta quedaron guardados.',
        { titulo: pidieronCambios ? 'Propuesta reenviada' : esNueva ? '¡Propuesta enviada!' : 'Propuesta actualizada' },
      );
      await onGuardada(guardada);
    } catch (err) {
      setErrorEnvio(err.message);
      avisos.error(err.message, { titulo: 'No se pudo enviar la propuesta' });
    } finally {
      setEnviando(false);
    }
  };

  // Progreso: la información es obligatoria; lo demás suma pero es opcional.
  const infoCompleta = Object.keys(validarSolicitud(solicitud)).length === 0;
  const secciones = [
    { id: 'sec-info', titulo: 'Información principal', listo: infoCompleta, obligatorio: true },
    { id: 'sec-colores', titulo: 'Colores de la página', listo: true },
    { id: 'sec-multimedia', titulo: 'Portada y mapa', listo: !!solicitud.imagenPortada },
    { id: 'sec-actividades', titulo: 'Actividades', listo: solicitud.actividades.some((a) => a.titulo.trim()) },
    { id: 'sec-cronograma', titulo: 'Cronograma', listo: solicitud.cronograma.some((c) => c.hora && c.actividad.trim()) },
  ];
  const pct = (secciones.filter((x) => x.listo).length / secciones.length) * 100;
  const irA = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const textoEnviar = pidieronCambios ? 'Guardar y reenviar' : esNueva ? 'Enviar propuesta' : 'Guardar cambios';
  const iconoEnviar = esNueva || pidieronCambios ? FaPaperPlane : FaSave;
  const titulo = esNueva ? 'Nueva propuesta' : pidieronCambios ? 'Corregir propuesta' : 'Editar propuesta';

  return (
    <div className="pi-cliente-container">
      <div className="qp-nav">
        <BotonVolver onClick={volver}>{esNueva ? 'Mis propuestas' : 'Volver a la propuesta'}</BotonVolver>
        <Migas items={[
          { texto: 'Mis propuestas', onClick: volver },
          ...(esNueva ? [] : [{ texto: inicial.nombreEvento, onClick: volver }]),
          { texto: titulo, actual: true },
        ]} />
      </div>
      <EncabezadoPagina
        titulo={titulo}
        subtitulo="Solo la información principal es obligatoria. Cuanto más completes, más rápido se aprueba."
        icono={esNueva ? FaPlus : FaPen}
        acciones={(
          <div className="btn-acciones">
            <Boton variante="secundario" icono={FaEye} onClick={() => setVerPrevia(true)}>Vista previa</Boton>
            <Boton icono={iconoEnviar} onClick={handleSubmit} cargando={enviando}>{textoEnviar}</Boton>
          </div>
        )}
      />

      {pidieronCambios && (
        <AvisoFijo tono="aviso" icono={FaPen} titulo="Lo que te pidió el Administrador">
          “{inicial.comentarioCambios}” Corregilo y tocá <strong>Guardar y reenviar</strong>.
        </AvisoFijo>
      )}
      {errorEnvio && <AvisoFijo tono="error" titulo="No se pudo enviar">{errorEnvio}</AvisoFijo>}

      <div className="pi-cliente-form">
        {/* ---------- Progreso ---------- */}
        <aside className="pi-cliente-form__lado">
          <Card className="pi-cliente-progreso">
            <h3 className="pi-cliente-titulo">Tu propuesta</h3>
            <BarraMeta tono={pct === 100 ? 'ok' : 'info'} label="Completada" pct={pct} />
            <ul className="pi-cliente-progreso__lista">
              {secciones.map((x) => {
                const falta = x.obligatorio && !x.listo;
                return (
                  <li key={x.id}>
                    <button type="button" onClick={() => irA(x.id)} className={`pi-cliente-progreso__item${x.listo ? ' es-listo' : falta ? ' es-falta' : ''}`}>
                      <span className="pi-cliente-progreso__marca" aria-hidden="true">{x.listo ? <FaCheck /> : null}</span>
                      <span className="pi-cliente-progreso__txt">
                        {x.titulo}
                        <small>{x.listo ? 'Listo' : x.obligatorio ? 'Obligatorio' : 'Opcional'}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {hayCambios && <p className="pi-cliente-progreso__nota"><FaSave aria-hidden="true" /> Tenés cambios sin guardar.</p>}
            <Boton icono={iconoEnviar} onClick={handleSubmit} cargando={enviando} anchoCompleto>{textoEnviar}</Boton>
          </Card>
        </aside>

        {/* ---------- Secciones ---------- */}
        <form className="pi-cliente-form__secciones" onSubmit={handleSubmit} noValidate>
          <Card as="section" id="sec-info">
            <h3 className="pi-cliente-titulo"><FaCalendarAlt aria-hidden="true" /> Información principal</h3>
            <div className="formulario">
              <Campo id="sol-nombreEvento" etiqueta="Nombre del evento" name="nombreEvento" placeholder="Ej: Gran Feria Gastronómica 2026"
                value={solicitud.nombreEvento} onChange={handleChange} error={errores['sol-nombreEvento']} />
              <Campo id="sol-lugar" etiqueta="Lugar" icono={FaMapMarkerAlt} name="lugar" placeholder="Ej: Campo Ferial, Cochabamba"
                value={solicitud.lugar} onChange={handleChange} error={errores['sol-lugar']} />
              <div className="form-inline">
                <Campo id="sol-fecha" etiqueta="Inicio" type="datetime-local" name="fecha" className="flex-1"
                  value={solicitud.fecha} onChange={handleChange} error={errores['sol-fecha']} />
                <Campo id="sol-fechaFin" etiqueta="Cierre" type="datetime-local" name="fechaFin" className="flex-1"
                  min={solicitud.fecha || undefined}
                  value={solicitud.fechaFin} onChange={handleChange} error={errores['sol-fechaFin']} />
              </div>
              <Campo id="sol-descripcion" etiqueta="Descripción / objetivo" error={errores['sol-descripcion']}>
                <textarea
                  id="sol-descripcion" name="descripcion" rows="4"
                  placeholder="Contá de qué trata el evento, qué van a encontrar los invitados…"
                  value={solicitud.descripcion} onChange={handleChange}
                  aria-invalid={!!errores['sol-descripcion']}
                  aria-describedby={errores['sol-descripcion'] ? 'sol-descripcion-error' : undefined}
                />
              </Campo>
              <Campo id="sol-aforo" etiqueta="Asistentes estimados (opcional)" type="number" min="1" step="1" name="aforoEstimado"
                placeholder="¿Cuánta gente esperás?" value={solicitud.aforoEstimado ?? ''} onChange={handleChange} />
            </div>
          </Card>

          <Card as="section" id="sec-colores">
            <h3 className="pi-cliente-titulo"><FaPalette aria-hidden="true" /> Colores de la página</h3>
            <EditorColores
              valores={solicitud}
              onCambio={(parcial) => setSolicitud((s) => ({ ...s, ...parcial }))}
              idBase="sol"
            />
          </Card>

          <Card as="section" id="sec-multimedia">
            <h3 className="pi-cliente-titulo"><FaMapMarkedAlt aria-hidden="true" /> Portada y mapa</h3>
            <div className="pi-cliente-imagenes">
              <SubirImagen
                id="sol-portada" etiqueta="Foto de portada" carpeta="solicitudes-evento" texto="Subir foto de portada"
                // Foto nueva = encuadre nuevo: el ajuste de la anterior no le sirve.
                valor={solicitud.imagenPortada} onCambio={(url) => setSolicitud((s) => ({ ...s, imagenPortada: url, imagenAjuste: null }))}
              />
              <div>
                <SubirImagen
                  id="sol-mapa" etiqueta="Boceto o mapa del lugar (opcional)" carpeta="solicitudes-evento" texto="Subir mapa o boceto"
                  valor={solicitud.mapaLugar} onCambio={(url) => cambiar('mapaLugar', url)}
                />
                <p className="texto-ayuda"><FaImage aria-hidden="true" /> Mostrá los puestos, el escenario, baños y estacionamiento.</p>
              </div>
            </div>
            {solicitud.imagenPortada && (
              <div className="pi-cliente-ajuste">
                <h4>Ajustar la portada</h4>
                <p className="texto-ayuda">Cómo se ve la foto en el encabezado de la página. El resultado se ve en "Vista previa".</p>
                <AjusteImagen
                  imagen={solicitud.imagenPortada}
                  ajuste={solicitud.imagenAjuste}
                  // Sin ajuste real se guarda null: no marca "cambios" de más.
                  onChange={(v) => cambiar('imagenAjuste', v && !esAjusteDefecto(v) ? v : null)}
                />
              </div>
            )}
          </Card>

          <Card as="section" id="sec-actividades">
            <div className="pi-cliente-cab">
              <h3 className="pi-cliente-titulo"><FaListUl aria-hidden="true" /> Actividades principales</h3>
              <Boton variante="secundario" tamano="sm" icono={FaPlus} onClick={() => agregarFila('actividades', { titulo: '', descripcion: '' })}>Agregar</Boton>
            </div>
            <p className="texto-ayuda">Las atracciones que va a tener el evento.</p>
            <ListaFilas
              filas={solicitud.actividades}
              etiquetaFila="actividad"
              campos={[
                { campo: 'titulo', placeholder: 'Título (Ej: Concierto en vivo)' },
                { campo: 'descripcion', placeholder: 'Breve descripción…' },
              ]}
              onCambio={(i, campo, v) => actualizarFila('actividades', i, campo, v)}
              onQuitar={(i) => quitarFila('actividades', i)}
            />
          </Card>

          <Card as="section" id="sec-cronograma">
            <div className="pi-cliente-cab">
              <h3 className="pi-cliente-titulo"><FaClock aria-hidden="true" /> Cronograma</h3>
              <Boton variante="secundario" tamano="sm" icono={FaPlus} onClick={() => agregarFila('cronograma', { hora: '', actividad: '' })}>Agregar</Boton>
            </div>
            <p className="texto-ayuda">Las horas clave, desde que abren puertas hasta que cierran.</p>
            <ListaFilas
              filas={solicitud.cronograma}
              etiquetaFila="horario"
              campos={[
                { campo: 'hora', placeholder: 'Hora', type: 'time' },
                { campo: 'actividad', placeholder: '¿Qué pasa a esta hora?' },
              ]}
              onCambio={(i, campo, v) => actualizarFila('cronograma', i, campo, v)}
              onQuitar={(i) => quitarFila('cronograma', i)}
            />
          </Card>
        </form>
      </div>

      {verPrevia && (
        <Modal titulo={<><FaEye aria-hidden="true" /> Así se va a ver la página del evento</>} onCerrar={() => setVerPrevia(false)} tamano="lg">
          <VistaPreviaPagina
            config={configPreviaDe(solicitud)}
            evento={{ nombre: solicitud.nombreEvento, lugar: solicitud.lugar, fecha: solicitud.fecha || null }}
          />
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
