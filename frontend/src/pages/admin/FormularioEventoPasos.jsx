import { useState } from 'react';
import {
  FaInfoCircle, FaCalendarAlt, FaMapMarkerAlt, FaQrcode, FaCheckCircle, FaRegCircle,
  FaArrowLeft, FaArrowRight, FaImage, FaTicketAlt, FaMobileAlt, FaPen, FaRocket, FaUserTie, FaUndoAlt,
} from 'react-icons/fa';
import CalendarioEventos from '../../components/CalendarioEventos.jsx';
import MapaSelector from '../../components/MapaSelector.jsx';
import Boton from '../../components/Boton.jsx';
import SubirImagen from '../../components/SubirImagen.jsx';
import { AvisoFijo } from '../../components/Avisos.jsx';
import Filtros from '../../components/Filtros.jsx';
import './FormularioEventoPasos.css';
import Pasos from '../../components/Pasos.jsx';

// 'YYYY-MM-DD' -> "domingo 13 de septiembre" (sin depender de formatearFecha,
// que espera un ISO con hora).
const diaLocalLegible = (diaISO) => diaISO
  ? new Date(`${diaISO}T00:00`).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })
  : '';

const PASOS = [
  { id: 'basico', titulo: 'Lo básico', detalle: 'Nombre, lugar e imagen', icono: FaInfoCircle },
  { id: 'fechas', titulo: 'Fechas', detalle: 'Qué días abarca', icono: FaCalendarAlt },
  { id: 'ubicacion', titulo: 'Ubicación', detalle: 'Dónde queda en el mapa', icono: FaMapMarkerAlt },
  { id: 'acceso', titulo: 'Acceso y ajustes', detalle: 'Manilla, cliente, devolución', icono: FaQrcode },
  { id: 'revisar', titulo: 'Revisar', detalle: 'Confirmá antes de guardar', icono: FaCheckCircle },
];

const DIAS_RETIRO_RAPIDOS = [15, 30, 60, 90];

// Lo que sigue después de crear: da contexto de que el formulario es solo el
// primer paso del armado (mismo orden que las pestañas del detalle).
const DESPUES_DE_CREAR = [
  'Ajustar la hora de cada jornada',
  'Crear los tipos de entrada',
  'Generar los códigos QR (manilla física)',
  'Configurar la página pública',
  'Publicar',
];

/** Paso inválido (índice) según los datos, o -1 si todo está completo. */
function primerPasoIncompleto(f) {
  if (!f.nombre.trim() || !f.lugar.trim()) return 0;
  if (!f.diaInicio || !f.diaFin) return 1;
  if (!f.coordenadas) return 2;
  return -1;
}

const pasoCompleto = (f, i) => {
  const primero = primerPasoIncompleto(f);
  return primero === -1 || i < primero;
};

/**
 * Crear / editar evento como asistente por pasos, con vista previa en vivo.
 *
 * Crear: se avanza paso a paso (no se puede saltar a uno posterior si el
 * actual está incompleto). Editar: los pasos se recorren libremente y
 * "Guardar cambios" está siempre a mano.
 *
 * El estado del formulario sigue viviendo en AdminGestionEventos (URL,
 * guardado, jornadas); este componente solo lo presenta.
 */
export default function FormularioEventoPasos({
  formEvento, setFormEvento, onChange, editando,
  errorGuardar, faltaUbicacion, setFaltaUbicacion,
  eventosOtros, clientes, onGuardar, onCancelar,
}) {
  const [paso, setPaso] = useState(0);
  const [imagenRota, setImagenRota] = useState(false);
  const [errorPaso, setErrorPaso] = useState('');
  const esUltimo = paso === PASOS.length - 1;

  const irA = (i) => {
    // Al crear no se puede saltar por encima de un paso incompleto.
    if (!editando && i > paso) {
      const incompleto = primerPasoIncompleto(formEvento);
      if (incompleto !== -1 && incompleto < i) {
        setPaso(incompleto);
        marcarError(incompleto);
        return;
      }
    }
    setErrorPaso('');
    setPaso(i);
  };

  const marcarError = (i) => {
    if (i === 1) setErrorPaso('Elegí al menos un día en el calendario.');
    else if (i === 2) { setErrorPaso(''); setFaltaUbicacion(true); }
    else setErrorPaso('Completá el nombre y el lugar del evento.');
  };

  const enviar = (e) => {
    e.preventDefault();
    const incompleto = primerPasoIncompleto(formEvento);

    // Creando y sin llegar al final: Enter / "Siguiente" avanza.
    if (!editando && !esUltimo) {
      if (incompleto !== -1 && incompleto <= paso) { marcarError(incompleto); return; }
      irA(paso + 1);
      return;
    }
    // Guardar: si falta algo, se lleva al paso que falta.
    if (incompleto !== -1) {
      setPaso(incompleto);
      marcarError(incompleto);
      return;
    }
    onGuardar(e);
  };

  const cantidadDias = formEvento.diaInicio && formEvento.diaFin
    ? Math.round((new Date(`${formEvento.diaFin}T00:00`) - new Date(`${formEvento.diaInicio}T00:00`)) / 86400000) + 1
    : 0;
  const textoFechas = !formEvento.diaInicio ? ''
    : formEvento.diaInicio === formEvento.diaFin
      ? diaLocalLegible(formEvento.diaInicio)
      : `Del ${diaLocalLegible(formEvento.diaInicio)} al ${diaLocalLegible(formEvento.diaFin)}`;
  const cliente = clientes.find((c) => String(c.id) === formEvento.clienteId);
  const digital = formEvento.tipoManilla === 'digital';
  const completos = PASOS.slice(0, 4).filter((_, i) => pasoCompleto(formEvento, i)).length;

  return (
    <div className="pi-fev">
      {/* ---------- Pasos (componente global) ---------- */}
      <Pasos
        variante="riel"
        etiqueta="Pasos para crear el evento"
        actual={paso}
        onIr={(i) => irA(i)}
        pasos={PASOS.map(({ id, titulo, detalle, icono }, i) => ({
          id, titulo, detalle, icono,
          estado: (pasoCompleto(formEvento, i) && i < 4) || i < paso ? 'listo' : 'pendiente',
        }))}
      />

      <div className="pi-fev__cuerpo">
        <form className="pi-fev__form" onSubmit={enviar} noValidate={false}>
          <div key={paso} className="pi-fev__contenido">
            <p className="pi-fev__contador">Paso {paso + 1} de {PASOS.length}</p>
            <h2 className="pi-fev__titulo">{PASOS[paso].titulo}</h2>

            {/* ===== 1. LO BÁSICO ===== */}
            {paso === 0 && (
              <>
                <div className="pi-ges-input-group">
                  <label htmlFor="ev-nombre">Nombre del evento</label>
                  <input
                    id="ev-nombre" type="text" name="nombre" value={formEvento.nombre} onChange={onChange}
                    placeholder="Ej: Festival de Verano 2027" required autoFocus
                  />
                  <p className="pi-ges-ayuda-campo">Es el título que se ve en la cartelera y en la página del evento.</p>
                </div>
                <div className="pi-ges-input-group">
                  <label htmlFor="ev-lugar">Lugar</label>
                  <input
                    id="ev-lugar" type="text" name="lugar" value={formEvento.lugar} onChange={onChange}
                    placeholder="Ej: Campo Ferial, Cbba" required
                  />
                </div>
                <SubirImagen
                  id="ev-imagen"
                  etiqueta="Imagen del evento (opcional)"
                  carpeta="eventos"
                  valor={formEvento.imagen}
                  onCambio={(url) => setFormEvento(f => ({ ...f, imagen: url }))}
                  texto="Hacé clic o arrastrá una foto"
                  subtexto="PNG o JPG hasta 3 MB · se ve en la cartelera"
                  maxBytes={3 * 1024 * 1024}
                  anchoVista={320}
                  altoVista={100}
                />
              </>
            )}

            {/* ===== 2. FECHAS ===== */}
            {paso === 1 && (
              <div className="pi-ges-input-group">
                <p className="pi-fev__guia">
                  <FaInfoCircle aria-hidden="true" />
                  <span>
                    Un clic marca un día; un segundo clic cierra el rango. Los días con otro
                    evento aparecen marcados: no se pueden cruzar. La hora de cada noche se
                    ajusta después en <b>Jornadas</b>.
                  </span>
                </p>
                <CalendarioEventos
                  eventos={eventosOtros}
                  modoSeleccion
                  rangoSeleccionado={formEvento.diaInicio ? { desde: formEvento.diaInicio, hasta: formEvento.diaFin } : null}
                  onCambiarRango={(rango) => {
                    setErrorPaso('');
                    setFormEvento((f) => ({ ...f, diaInicio: rango.desde, diaFin: rango.hasta }));
                  }}
                />
                {textoFechas && (
                  <p className="pi-fev__elegido">
                    <FaCalendarAlt aria-hidden="true" /> {textoFechas}
                    {cantidadDias > 1 && <em>{cantidadDias} días</em>}
                  </p>
                )}

                {!editando && cantidadDias > 1 && (
                  <div className="pi-ges-radio-jornadas">
                    <label className="pi-ges-radio-opcion">
                      <input
                        type="radio" name="dividirJornadas" checked={!formEvento.dividirJornadas}
                        onChange={() => setFormEvento((f) => ({ ...f, dividirJornadas: false }))}
                      />
                      <span>
                        <strong>Una sola jornada para todo el rango</strong>
                        <small>Una entrada sirve para cualquiera de esos días (ej. un pase de fin de semana).</small>
                      </span>
                    </label>
                    <label className="pi-ges-radio-opcion">
                      <input
                        type="radio" name="dividirJornadas" checked={formEvento.dividirJornadas}
                        onChange={() => setFormEvento((f) => ({ ...f, dividirJornadas: true }))}
                      />
                      <span>
                        <strong>Una jornada por cada día ({cantidadDias} jornadas)</strong>
                        <small>Entradas separadas por día (ej. solo viernes, solo sábado). La hora de cada una se ajusta en "Jornadas".</small>
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* ===== 3. UBICACIÓN ===== */}
            {paso === 2 && (
              <div className={`pi-ges-input-group${faltaUbicacion ? ' pi-ges-campo-error' : ''}`}>
                <p className="pi-fev__guia">
                  <FaMapMarkerAlt aria-hidden="true" />
                  <span>Hacé clic en el mapa para marcar dónde es <b>{formEvento.lugar || 'el evento'}</b>. Es lo que ven los asistentes en la página del evento.</span>
                </p>
                <MapaSelector
                  value={formEvento.coordenadas}
                  onChange={(coords) => {
                    setFormEvento((f) => ({ ...f, coordenadas: coords }));
                    if (coords) setFaltaUbicacion(false);
                  }}
                />
                {formEvento.coordenadas && (
                  <p className="pi-fev__elegido"><FaCheckCircle aria-hidden="true" /> Ubicación marcada ({formEvento.coordenadas})</p>
                )}
                {faltaUbicacion && (
                  <AvisoFijo tono="error">Marcá el lugar en el mapa: es obligatorio.</AvisoFijo>
                )}
              </div>
            )}

            {/* ===== 4. ACCESO Y AJUSTES ===== */}
            {paso === 3 && (
              <>
                <fieldset className="pi-fev__fieldset">
                  <legend>¿Cómo entran los asistentes?</legend>
                  <div className="pi-fev__opciones">
                    <label className={`pi-fev__opcion${!digital ? ' es-elegida' : ''}`}>
                      <input
                        type="radio" name="tipoManilla" value="fisica" checked={!digital} onChange={onChange}
                      />
                      <span className="pi-fev__opcion-ic" aria-hidden="true"><FaTicketAlt /></span>
                      <strong>Manilla física</strong>
                      <span>Generás un lote de QR imprimibles y el Supervisor entrega y vincula cada manilla en la puerta.</span>
                      <em>Ideal para festivales y eventos grandes.</em>
                    </label>
                    <label className={`pi-fev__opcion${digital ? ' es-elegida' : ''}`}>
                      <input
                        type="radio" name="tipoManilla" value="digital" checked={digital} onChange={onChange}
                      />
                      <span className="pi-fev__opcion-ic" aria-hidden="true"><FaMobileAlt /></span>
                      <strong>Manilla digital</strong>
                      <span>El QR aparece solo en el perfil del asistente al aprobar su compra. No hay nada que imprimir ni entregar.</span>
                      <em>Ideal para eventos chicos o sin punto de entrega.</em>
                    </label>
                  </div>
                </fieldset>

                <div className="pi-ges-input-group">
                  <label htmlFor="ev-cliente"><FaUserTie aria-hidden="true" /> Cliente organizador (opcional)</label>
                  <select id="ev-cliente" name="clienteId" value={formEvento.clienteId} onChange={onChange}>
                    <option value="">Sin cliente asignado</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre} ({c.email})</option>
                    ))}
                  </select>
                  <p className="pi-ges-ayuda-campo">El cliente ve el dashboard de ventas de su evento.</p>
                </div>

                <div className="pi-ges-input-group">
                  <label htmlFor="ev-retiro"><FaUndoAlt aria-hidden="true" /> Días para retirar el saldo tras el cierre</label>
                  <div className="pi-fev__chips">
                    <Filtros
                      etiqueta="Valores rápidos"
                      opciones={DIAS_RETIRO_RAPIDOS.map((d) => ({ valor: String(d), texto: `${d} días` }))}
                      activo={String(Number(formEvento.diasParaRetiro || 30))}
                      onCambio={(v) => setFormEvento((f) => ({ ...f, diasParaRetiro: v }))}
                    />
                    <input
                      id="ev-retiro" type="number" min="1" step="1" name="diasParaRetiro"
                      value={formEvento.diasParaRetiro} onChange={onChange}
                      placeholder="Otro" aria-label="Otra cantidad de días"
                    />
                  </div>
                  <p className="pi-ges-ayuda-campo">Pasado ese plazo, el saldo no retirado ya no se devuelve. Por defecto, 30 días.</p>
                </div>
              </>
            )}

            {/* ===== 5. REVISAR ===== */}
            {paso === 4 && (
              <>
                <dl className="pi-fev__resumen">
                  {[
                    { i: 0, t: 'Nombre y lugar', v: formEvento.nombre ? `${formEvento.nombre} · ${formEvento.lugar}` : null },
                    { i: 1, t: 'Fechas', v: textoFechas ? `${textoFechas}${cantidadDias > 1 && !editando ? ` · ${formEvento.dividirJornadas ? `${cantidadDias} jornadas` : '1 jornada'}` : ''}` : null },
                    { i: 2, t: 'Ubicación', v: formEvento.coordenadas ? 'Marcada en el mapa' : null },
                    { i: 3, t: 'Acceso', v: digital ? 'Manilla digital' : 'Manilla física' },
                    { i: 3, t: 'Cliente', v: cliente ? cliente.nombre : 'Sin cliente asignado' },
                    { i: 3, t: 'Retiro de saldo', v: `${formEvento.diasParaRetiro || 30} días después del cierre` },
                  ].map(({ i, t, v }) => (
                    <div key={t} className={v ? '' : 'falta'}>
                      <dt>{v ? <FaCheckCircle aria-hidden="true" /> : <FaRegCircle aria-hidden="true" />} {t}</dt>
                      <dd>{v || 'Falta completar'}</dd>
                      <Boton variante="fantasma" tamano="sm" icono={FaPen} onClick={() => irA(i)} aria-label={`Editar ${t}`} />
                    </div>
                  ))}
                </dl>

                {!editando && (
                  <div className="pi-fev__siguiente">
                    <strong><FaRocket aria-hidden="true" /> Después de crearlo</strong>
                    <p>El evento nace en <b>borrador</b> (nadie lo ve todavía). En su ficha vas a:</p>
                    <ol>{DESPUES_DE_CREAR.map((t) => <li key={t}>{t}</li>)}</ol>
                  </div>
                )}
              </>
            )}

            {errorPaso && (
              <AvisoFijo tono="error">{errorPaso}</AvisoFijo>
            )}
            {errorGuardar && (
              <AvisoFijo tono="error">{errorGuardar}</AvisoFijo>
            )}
          </div>

          {/* ---------- Navegación ---------- */}
          <div className="pi-fev__nav">
            <Boton variante="fantasma" onClick={onCancelar}>Cancelar</Boton>
            <span className="pi-fev__nav-der">
              {paso > 0 && (
                <Boton variante="secundario" icono={FaArrowLeft} onClick={() => irA(paso - 1)}>Atrás</Boton>
              )}
              {editando && !esUltimo && (
                <Boton variante="secundario" iconoDerecha={FaArrowRight} onClick={() => irA(paso + 1)}>Siguiente</Boton>
              )}
              {editando || esUltimo ? (
                <Boton type="submit" icono={editando ? null : FaRocket}>
                  {editando ? 'Guardar cambios' : 'Crear evento'}
                </Boton>
              ) : (
                <Boton type="submit" iconoDerecha={FaArrowRight}>Siguiente</Boton>
              )}
            </span>
          </div>
        </form>

        {/* ---------- Vista previa en vivo ---------- */}
        <aside className="pi-fev__preview" aria-label="Vista previa del evento">
          <span className="pi-fev__preview-tag">Vista previa</span>
          <div className="pi-fev__tarjeta">
            <div className="pi-fev__tarjeta-img">
              {formEvento.imagen && !imagenRota
                ? <img src={formEvento.imagen} alt="" width="320" height="180" onError={() => setImagenRota(true)} />
                : <span><FaImage aria-hidden="true" /> Sin imagen</span>}
              <em className={digital ? 'digital' : ''}>
                {digital ? <><FaMobileAlt aria-hidden="true" /> Digital</> : <><FaTicketAlt aria-hidden="true" /> Física</>}
              </em>
            </div>
            <div className="pi-fev__tarjeta-info">
              <strong className={formEvento.nombre ? '' : 'vacio'}>{formEvento.nombre || 'Nombre del evento'}</strong>
              <span className={formEvento.lugar ? '' : 'vacio'}><FaMapMarkerAlt aria-hidden="true" /> {formEvento.lugar || 'Lugar'}</span>
              <span className={textoFechas ? '' : 'vacio'}><FaCalendarAlt aria-hidden="true" /> {textoFechas || 'Fechas'}</span>
            </div>
          </div>

          <div className="pi-fev__avance">
            <span>{completos} de 4 secciones completas</span>
            <span className="pi-fev__avance-barra"><span style={{ width: `${(completos / 4) * 100}%` }} /></span>
          </div>
        </aside>
      </div>
    </div>
  );
}
