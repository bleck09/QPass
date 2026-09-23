import { useCallback, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import Card from '../../components/Card.jsx';
import Insignia from '../../components/Insignia.jsx';
import Pasos from '../../components/Pasos.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import SubirImagen from '../../components/SubirImagen.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { errorObligatorio, limpiarErrores, enfocarPrimero } from '../../utils/validacion.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaPalette, FaImage, FaMapMarkedAlt, FaMapMarkerAlt,
  FaListUl, FaClock, FaPlus, FaTrash, FaPaperPlane, FaEye, FaFileAlt, FaChartPie,
  FaCheckCircle, FaHourglassHalf, FaExclamationTriangle, FaSave,
} from 'react-icons/fa';
import api from '../../api/index.js';
import './Cliente.css';

const SOLICITUD_VACIA = {
  nombreEvento: '', lugar: '', fecha: '', fechaFin: '', descripcion: '', aforoEstimado: '',
  colorPrimario: '#1A2B6B', colorBoton: '#FFFFFF', colorFondo: '#F5F7FB',
  colorTextoTitulo: '#0A0E27', colorTextoP: '#8A94A6',
  imagenPortada: '', mapaLugar: '',
  actividades: [{ titulo: '', descripcion: '' }],
  cronograma: [{ hora: '', actividad: '' }],
};

const COLORES = [
  { campo: 'colorPrimario', etiqueta: 'Principal (botones)' },
  { campo: 'colorBoton', etiqueta: 'Texto del botón' },
  { campo: 'colorFondo', etiqueta: 'Fondo superior' },
  { campo: 'colorTextoTitulo', etiqueta: 'Color del título' },
  { campo: 'colorTextoP', etiqueta: 'Color de párrafos' },
];

const ESTADO_SOLICITUD = {
  pendiente: { tono: 'warn', icono: FaHourglassHalf, texto: 'Pendiente' },
  aprobado: { tono: 'ok', icono: FaCheckCircle, texto: 'Aprobada' },
  rechazado: { tono: 'danger', icono: FaExclamationTriangle, texto: 'Rechazada' },
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

/**
 * Lista editable de filas (actividades / cronograma): la misma para las dos
 * (antes copiada). campos: [{ campo, placeholder, type }].
 */
function ListaFilas({ filas, campos, onCambio, onQuitar, soloLectura, etiquetaFila }) {
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
                disabled={soloLectura}
              />
            ))}
          </div>
          {!soloLectura && (
            <Boton
              variante="peligro-suave"
              tamano="sm"
              icono={FaTrash}
              onClick={() => onQuitar(i)}
              aria-label={`Quitar ${etiquetaFila} ${i + 1}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Cliente() {
  useTituloPagina('Mis eventos');
  const location = useLocation();
  const navigate = useNavigate();
  const avisos = useAvisos();
  const [confirmar, DialogoConfirmar] = useConfirmar();
  // El botón "Dashboard General" navega a /Cliente/dashboard, que renderiza
  // <ClienteDashboard/> (otra página). Acá solo vive el editor de propuestas.
  const pestana = location.pathname.endsWith('/dashboard') ? 'dashboard' : 'propuesta';

  const [showPreview, setShowPreview] = useState(false);
  const [solicitudId, setSolicitudId] = useState(null); // null = formulario en blanco (nueva)
  const [solicitud, setSolicitud] = useState(SOLICITUD_VACIA);
  // Copia de lo último guardado / abierto: para saber si hay cambios sin guardar.
  const [base, setBase] = useState(SOLICITUD_VACIA);
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');

  // Carga primaria (mis solicitudes) con estados cargando/error/reintentar (Manual 8.9).
  const cargarDatos = useCallback(
    () => api.solicitudesEvento.listar().then((solicitudes) => ({ solicitudes })),
    [],
  );
  const {
    data: datos,
    cargando: cargandoDatos,
    error: errorDatos,
    recargar: recargarSolicitudes,
  } = useApi(cargarDatos, { inicial: { solicitudes: [] } });
  const misSolicitudes = datos.solicitudes;

  const hayCambios = useMemo(() => JSON.stringify(solicitud) !== JSON.stringify(base), [solicitud, base]);
  const errores = intento ? validarSolicitud(solicitud) : {};

  // Salir de lo que se está editando con cambios sin guardar: se confirma (§2.4).
  const puedeDescartar = async () => {
    if (!hayCambios) return true;
    return confirmar({
      titulo: '¿Descartar los cambios?',
      mensaje: 'Tenés cambios sin guardar en esta solicitud. Si seguís, se pierden.',
      textoConfirmar: 'Descartar cambios',
      peligroso: true,
    });
  };

  const cargarEnFormulario = (s) => {
    const datosForm = {
      ...s,
      fecha: paraInputFecha(s.fecha),
      fechaFin: paraInputFecha(s.fechaFin),
      aforoEstimado: s.aforoEstimado ?? '',
    };
    setSolicitudId(s.id);
    setSolicitud(datosForm);
    setBase(datosForm);
    setIntento(false);
    setErrorEnvio('');
  };

  const abrirSolicitud = async (s) => {
    if (s.id === solicitudId || !(await puedeDescartar())) return;
    cargarEnFormulario(s);
  };

  const nuevaSolicitud = async () => {
    if (!(await puedeDescartar())) return;
    setSolicitudId(null);
    setSolicitud(SOLICITUD_VACIA);
    setBase(SOLICITUD_VACIA);
    setIntento(false);
    setErrorEnvio('');
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

    const { id, clienteId, estado, motivoRechazo, eventoId, resueltoPorId, resueltoEn, createdAt, updatedAt, aforoEstimado, ...datosEnvio } = solicitud;
    if (aforoEstimado !== '' && aforoEstimado != null) datosEnvio.aforoEstimado = Number(aforoEstimado);

    setEnviando(true);
    try {
      const guardada = solicitudId
        ? await api.solicitudesEvento.actualizar(solicitudId, datosEnvio)
        : await api.solicitudesEvento.crear(datosEnvio);
      cargarEnFormulario(guardada);
      await recargarSolicitudes();
      avisos.exito(
        solicitudId
          ? 'Los cambios de tu solicitud quedaron guardados.'
          : 'El Administrador la va a revisar y, al aprobarla, crea la página del evento.',
        { titulo: solicitudId ? 'Solicitud actualizada' : '¡Solicitud enviada!' },
      );
    } catch (err) {
      // Antes este error no se atrapaba: parecía que se había enviado.
      setErrorEnvio(err.message);
      avisos.error(err.message, { titulo: 'No se pudo enviar la solicitud' });
    } finally {
      setEnviando(false);
    }
  };

  const soloLectura = !!solicitudId && solicitud.estado !== 'pendiente';

  // Secciones del formulario como pasos: listo si está completa; tocar lleva a ella.
  const infoCompleta = Object.keys(validarSolicitud(solicitud)).length === 0;
  const pasos = [
    { id: 'sec-info', titulo: 'Información', estado: infoCompleta ? 'listo' : (intento ? 'falta' : 'pendiente') },
    { id: 'sec-colores', titulo: 'Colores', estado: 'listo' },
    { id: 'sec-multimedia', titulo: 'Portada y mapa', estado: solicitud.imagenPortada ? 'listo' : 'opcional' },
    { id: 'sec-actividades', titulo: 'Actividades', estado: solicitud.actividades.some((a) => a.titulo.trim()) ? 'listo' : 'opcional' },
    { id: 'sec-cronograma', titulo: 'Cronograma', estado: solicitud.cronograma.some((c) => c.hora && c.actividad.trim()) ? 'listo' : 'opcional' },
  ];

  const estadoActual = solicitudId ? ESTADO_SOLICITUD[solicitud.estado] : null;

  return (
    <div className="pi-cliente-container">

      {/* Propuestas / Dashboard General (otra página) */}
      <Pestanas
        navegacion
        etiqueta="Secciones del organizador"
        activo={pestana}
        onCambio={(id) => navigate(id === 'dashboard' ? '/Cliente/dashboard' : '/Cliente')}
        items={[
          { id: 'propuesta', etiqueta: 'Mis propuestas', icono: FaFileAlt },
          { id: 'dashboard', etiqueta: 'Dashboard general', icono: FaChartPie },
        ]}
      />

      {pestana === 'propuesta' && (
      <>
      {errorDatos && <EstadoError onReintentar={recargarSolicitudes} />}
      {!errorDatos && cargandoDatos && <EstadoCarga filas={3} />}
      {!errorDatos && !cargandoDatos && misSolicitudes.length > 0 && (
        <Card as="section" className="pi-cliente-solicitudes">
          <h3 className="pi-cliente-titulo"><FaFileAlt aria-hidden="true" /> Tus solicitudes</h3>
          <ul className="pi-cliente-lista">
            {misSolicitudes.map(s => {
              const est = ESTADO_SOLICITUD[s.estado];
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`pi-cliente-solicitud${s.id === solicitudId ? ' activa' : ''}`}
                    onClick={() => abrirSolicitud(s)}
                    aria-current={s.id === solicitudId || undefined}
                  >
                    <strong>{s.nombreEvento}</strong>
                    {est && (
                      <Insignia tono={est.tono} icono={est.icono}>
                        {est.texto}{s.estado === 'rechazado' && s.motivoRechazo ? `: ${s.motivoRechazo}` : ''}
                      </Insignia>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <EncabezadoPagina
        titulo={solicitudId ? 'Editar solicitud de evento' : 'Nueva solicitud de evento'}
        subtitulo="Proponé tu evento. El Administrador la revisa y, al aprobarla, crea la página web real."
        icono={FaCalendarAlt}
        acciones={(
          <div className="btn-acciones">
            {solicitudId && <Boton variante="secundario" icono={FaPlus} onClick={nuevaSolicitud}>Nueva solicitud</Boton>}
            <Boton variante="secundario" icono={FaEye} onClick={() => setShowPreview(true)}>Vista previa</Boton>
            {!soloLectura && (
              <Boton icono={solicitudId ? FaSave : FaPaperPlane} onClick={handleSubmit} cargando={enviando}>
                {solicitudId ? 'Guardar cambios' : 'Enviar solicitud'}
              </Boton>
            )}
          </div>
        )}
      />

      {estadoActual && solicitud.estado !== 'pendiente' && (
        <AvisoFijo tono={solicitud.estado === 'aprobado' ? 'exito' : 'error'} icono={estadoActual.icono} titulo={`Solicitud ${estadoActual.texto.toLowerCase()}`}>
          {solicitud.estado === 'aprobado'
            ? 'Ya no se puede editar: el Administrador creó el evento a partir de ella.'
            : `Ya no se puede editar${solicitud.motivoRechazo ? `. Motivo: ${solicitud.motivoRechazo}` : '.'} Podés crear una nueva.`}
        </AvisoFijo>
      )}
      {hayCambios && !soloLectura && (
        <AvisoFijo tono="info" icono={FaSave}>Tenés cambios sin guardar.</AvisoFijo>
      )}
      {errorEnvio && <AvisoFijo tono="error" titulo="No se pudo enviar">{errorEnvio}</AvisoFijo>}

      <Pasos
        variante="compacto"
        etiqueta="Secciones de la solicitud"
        className="pi-cliente-pasos"
        actual={-1}
        onIr={(_, paso) => document.getElementById(paso.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        pasos={pasos}
      />

      <form className="pi-cliente-grid" onSubmit={handleSubmit} noValidate>

        {/* COLUMNA IZQUIERDA */}
        <div className="pi-cliente-columna">

          <Card as="section" id="sec-info">
            <h3 className="pi-cliente-titulo"><FaCalendarAlt aria-hidden="true" /> Información principal</h3>
            <div className="formulario">
              <Campo id="sol-nombreEvento" etiqueta="Nombre del evento" name="nombreEvento" placeholder="Ej: Gran Feria Gastronómica 2026"
                value={solicitud.nombreEvento} onChange={handleChange} disabled={soloLectura} error={errores['sol-nombreEvento']} />
              <Campo id="sol-lugar" etiqueta="Lugar" icono={FaMapMarkerAlt} name="lugar" placeholder="Ej: Campo Ferial, Cochabamba"
                value={solicitud.lugar} onChange={handleChange} disabled={soloLectura} error={errores['sol-lugar']} />
              <div className="form-inline">
                <Campo id="sol-fecha" etiqueta="Inicio" type="datetime-local" name="fecha" className="flex-1"
                  value={solicitud.fecha} onChange={handleChange} disabled={soloLectura} error={errores['sol-fecha']} />
                <Campo id="sol-fechaFin" etiqueta="Cierre" type="datetime-local" name="fechaFin" className="flex-1"
                  min={solicitud.fecha || undefined}
                  value={solicitud.fechaFin} onChange={handleChange} disabled={soloLectura} error={errores['sol-fechaFin']} />
              </div>
              <Campo id="sol-descripcion" etiqueta="Descripción / objetivo" error={errores['sol-descripcion']}>
                <textarea
                  id="sol-descripcion" name="descripcion" rows="3"
                  placeholder="Contá de qué trata el evento, qué van a encontrar los invitados…"
                  value={solicitud.descripcion} onChange={handleChange} disabled={soloLectura}
                  aria-invalid={!!errores['sol-descripcion']}
                  aria-describedby={errores['sol-descripcion'] ? 'sol-descripcion-error' : undefined}
                />
              </Campo>
              <Campo id="sol-aforo" etiqueta="Asistentes estimados (opcional)" type="number" min="1" step="1" name="aforoEstimado"
                placeholder="¿Cuánta gente esperás?" value={solicitud.aforoEstimado ?? ''} onChange={handleChange} disabled={soloLectura} />
            </div>
          </Card>

          <Card as="section" id="sec-colores">
            <h3 className="pi-cliente-titulo"><FaPalette aria-hidden="true" /> Apariencia y colores</h3>
            <p className="texto-ayuda">Definí la paleta para que la página coincida con tu marca.</p>
            <div className="pi-cliente-colores">
              {COLORES.map(({ campo, etiqueta }) => (
                <label key={campo} className="pi-cliente-color" htmlFor={`sol-${campo}`}>
                  <input id={`sol-${campo}`} type="color" name={campo} value={solicitud[campo]} onChange={handleChange} disabled={soloLectura} />
                  <span>
                    <strong>{etiqueta}</strong>
                    <small>{solicitud[campo].toUpperCase()}</small>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card as="section" id="sec-multimedia">
            <h3 className="pi-cliente-titulo"><FaMapMarkedAlt aria-hidden="true" /> Multimedia y distribución</h3>
            {soloLectura ? (
              <div className="pi-cliente-imagenes">
                {solicitud.imagenPortada && <img width="640" height="360" src={solicitud.imagenPortada} alt="Portada" className="img-preview-rect" />}
                {solicitud.mapaLugar && <img width="640" height="360" src={solicitud.mapaLugar} alt="Mapa del lugar" className="img-preview-rect" />}
              </div>
            ) : (
              <div className="formulario">
                <SubirImagen
                  id="sol-portada" etiqueta="Foto de portada" carpeta="solicitudes-evento" texto="Subir foto de portada"
                  valor={solicitud.imagenPortada} onCambio={(url) => cambiar('imagenPortada', url)}
                />
                <p className="texto-ayuda"><FaImage aria-hidden="true" /> Subí el plano mostrando los puestos, el escenario, baños y estacionamiento.</p>
                <SubirImagen
                  id="sol-mapa" etiqueta="Boceto o mapa del lugar" carpeta="solicitudes-evento" texto="Subir mapa o boceto"
                  valor={solicitud.mapaLugar} onCambio={(url) => cambiar('mapaLugar', url)}
                />
              </div>
            )}
          </Card>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="pi-cliente-columna">
          <Card as="section" id="sec-actividades">
            <div className="pi-cliente-cab">
              <h3 className="pi-cliente-titulo"><FaListUl aria-hidden="true" /> Actividades principales</h3>
              {!soloLectura && (
                <Boton variante="secundario" tamano="sm" icono={FaPlus} onClick={() => agregarFila('actividades', { titulo: '', descripcion: '' })}>Fila</Boton>
              )}
            </div>
            <p className="texto-ayuda">Enumerá las atracciones principales que va a tener el evento.</p>
            <ListaFilas
              filas={solicitud.actividades}
              etiquetaFila="actividad"
              campos={[
                { campo: 'titulo', placeholder: 'Título (Ej: Concierto en vivo)' },
                { campo: 'descripcion', placeholder: 'Breve descripción…' },
              ]}
              onCambio={(i, campo, v) => actualizarFila('actividades', i, campo, v)}
              onQuitar={(i) => quitarFila('actividades', i)}
              soloLectura={soloLectura}
            />
          </Card>

          <Card as="section" id="sec-cronograma">
            <div className="pi-cliente-cab">
              <h3 className="pi-cliente-titulo"><FaClock aria-hidden="true" /> Cronograma de horarios</h3>
              {!soloLectura && (
                <Boton variante="secundario" tamano="sm" icono={FaPlus} onClick={() => agregarFila('cronograma', { hora: '', actividad: '' })}>Fila</Boton>
              )}
            </div>
            <p className="texto-ayuda">Definí las horas clave desde que abren puertas hasta que cierran.</p>
            <ListaFilas
              filas={solicitud.cronograma}
              etiquetaFila="horario"
              campos={[
                { campo: 'hora', placeholder: 'Hora', type: 'time' },
                { campo: 'actividad', placeholder: '¿Qué pasa a esta hora?' },
              ]}
              onCambio={(i, campo, v) => actualizarFila('cronograma', i, campo, v)}
              onQuitar={(i) => quitarFila('cronograma', i)}
              soloLectura={soloLectura}
            />
          </Card>
        </div>
      </form>

      {/* --- VISTA PREVIA --- */}
      {showPreview && (
        <Modal
          titulo={<><FaEye aria-hidden="true" /> Así va a lucir la página del evento</>}
          onCerrar={() => setShowPreview(false)}
          tamano="lg"
        >
          {/* Colores de la solicitud como variables: la vista previa no usa estilos en línea sueltos. */}
          <div
            className="pi-cliente-preview"
            style={{
              '--p-fondo': solicitud.colorFondo,
              '--p-titulo': solicitud.colorTextoTitulo,
              '--p-texto': solicitud.colorTextoP,
              '--p-boton': solicitud.colorPrimario,
              '--p-boton-texto': solicitud.colorBoton,
            }}
          >
            <div className="pi-cliente-preview-texto">
              <div className="pi-cliente-preview-titulo">{solicitud.nombreEvento || 'Título del evento'}</div>
              <p>{solicitud.descripcion || 'Descripción del evento…'}</p>
              <span className="pi-cliente-preview-boton" aria-hidden="true">Ingresar al evento</span>
            </div>
            <div className="pi-cliente-preview-imagen">
              {solicitud.imagenPortada
                ? <img width="400" height="225" src={solicitud.imagenPortada} alt="" />
                : <span>Sin imagen de portada</span>}
            </div>
          </div>
        </Modal>
      )}
      </>
      )}

      {DialogoConfirmar}
    </div>
  );
}
