import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import Tabla from '../../components/Tabla.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import SelectorEvento from '../../components/SelectorEvento.jsx';
import Card from '../../components/Card.jsx';
import Insignia from '../../components/Insignia.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { limpiarErrores, enfocarPrimero } from '../../utils/validacion.js';
import ContornoRecinto from '../../components/ContornoRecinto.jsx';
import { useApi } from '../../utils/useApi.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import BotonVolver from '../../components/BotonVolver.jsx';
import { proyectarContorno } from '../../utils/contornoMapa.js';
import { TIPOS_ELEMENTO_MAPA, tipoElementoInfo } from '../../utils/elementosMapa.js';
import {
  FaStore, FaMap, FaListUl, FaDrawPolygon,
  FaSave, FaEdit, FaEyeSlash, FaCheck, FaLock, FaUnlock,
  FaInfoCircle, FaArrowsAltH, FaArrowsAltV, FaPlus, FaTrash
} from 'react-icons/fa';
import api from '../../api/index.js';
import './Mapa.css';

const FORM_ZONA_VACIO = { tipo: 'entrada', nombre: 'Entrada', nombreTocado: false };

const VISTAS = [
  { id: 'contorno', etiqueta: 'Contorno', icono: FaDrawPolygon },
  { id: 'plano', etiqueta: 'Plano visual', icono: FaMap },
  { id: 'tabla', etiqueta: 'Lista de elementos', icono: FaListUl },
];

// Los cuadros del plano se miden en px y no tiene sentido que sean invisibles:
// el motor de arrastre tampoco deja bajar de 50.
const MIN_LADO = 50;
const errorLado = (valor) => {
  const n = Number(valor);
  return String(valor).trim() && Number.isFinite(n) && n >= MIN_LADO
    ? null
    : `Tiene que ser ${MIN_LADO} o más.`;
};

export default function Mapa({ eventoId: eventoIdProp = null, embebido = false } = {}) {
  useTituloPagina('Diseñador del recinto', !embebido);
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmar, DialogoConfirmar] = useConfirmar();
  const avisos = useAvisos();
  const [eventosDisponibles, setEventosDisponibles] = useState([]);
  const [eventoId, setEventoId] = useState(eventoIdProp || location.state?.eventoId || '');

  // Evento completo (no solo el nombre): acá salen latitud/longitud (centro del
  // mapa real en modo Contorno) y contornoMapa (la forma proyectada del modo Plano).
  // obtenerAdmin (no obtener): esta pantalla es de Admin, y el evento puede
  // seguir en borrador — el endpoint público 404-ea eventos sin publicar.
  const cargarEventoActual = useCallback(
    () => api.eventos.obtenerAdmin(eventoId),
    [eventoId],
  );
  const {
    data: eventoActual,
    setData: setEventoActual,
    cargando: cargandoEvento,
  } = useApi(cargarEventoActual, { inicial: null, activo: !!eventoId });

  // Puestos del plano con estados cargando/error/reintentar (Manual 8.9).
  // setPuestos (alias de setData) mantiene las actualizaciones optimistas del
  // modo diseño: arrastrar, redimensionar, crear y borrar sin recargar.
  const cargarPuestos = useCallback(
    () => api.puestos.listar({ eventoId }),
    [eventoId],
  );
  const {
    data: puestos,
    setData: setPuestos,
    cargando: cargandoPuestos,
    error: errorPuestos,
    recargar: recargarPuestos,
  } = useApi(cargarPuestos, { inicial: [], activo: !!eventoId });

  // Cuadros del plano que NO son un negocio (entrada, baños, escenario...).
  // A diferencia de Puesto, el Admin los crea y borra directo desde acá.
  const cargarElementos = useCallback(
    () => api.elementosMapa.listar(eventoId),
    [eventoId],
  );
  const { data: elementos, setData: setElementos } = useApi(cargarElementos, {
    inicial: [],
    activo: !!eventoId,
  });

  const [vistaActiva, setVistaActiva] = useState('plano');
  const [modoDiseno, setModoDiseno] = useState(false);
  // Guardados en curso: sin esto el doble clic mandaba dos veces la misma
  // tanda de PUTs (el plano son N puestos + N zonas en paralelo).
  const [guardando, setGuardando] = useState(null); // 'tamano'|'plano'|'zona'|'contorno'|null
  const [errorModal, setErrorModal] = useState('');

  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalZona, setMostrarModalZona] = useState(false);
  const [formZona, setFormZona] = useState(FORM_ZONA_VACIO);

  // Los puestos los crea el Usuario Negocio (activa uno de su catálogo). Acá el
  // Admin solo los ubica y escala en el plano: el modal edita tamaño, nada más.
  const [form, setForm] = useState({ id: '', nombre: '', ancho: 100, alto: 100 });
  const [intentoTamano, setIntentoTamano] = useState(false);
  const erroresTamano = intentoTamano
    ? limpiarErrores({ 'mapa-ancho': errorLado(form.ancho), 'mapa-alto': errorLado(form.alto) })
    : {};

  // Contorno del recinto: copia editable en el mapa real (modo Contorno). Se
  // resetea a lo guardado cada vez que cambia de evento — ajuste de estado
  // durante el render (no en un efecto: evita el doble render de
  // react-hooks/set-state-in-effect, ver comentario en utils/useApi.js).
  const [contornoBorrador, setContornoBorrador] = useState([]);
  const [eventoIdDelContorno, setEventoIdDelContorno] = useState(null);
  if (eventoActual && eventoActual.id !== eventoIdDelContorno) {
    setEventoIdDelContorno(eventoActual.id);
    setContornoBorrador(eventoActual.contornoMapa || []);
  }
  const contornoGuardado = useMemo(() => eventoActual?.contornoMapa || [], [eventoActual]);
  const contornoSucio = JSON.stringify(contornoBorrador) !== JSON.stringify(contornoGuardado);
  // El plano (modo Plano) se dibuja a partir de lo GUARDADO, no del borrador
  // que se esté editando en la otra pestaña sin confirmar todavía.
  const proyeccion = useMemo(() => proyectarContorno(contornoGuardado), [contornoGuardado]);

  useEffect(() => {
    if (!embebido) {
      api.eventos.listarTodos().then(lista => {
        setEventosDisponibles(lista);
        setEventoId(prev => prev || lista[0]?.id);
      });
    }
  }, [embebido]);


  const cambiarEvento = (nuevoId) => {
    setEventoId(nuevoId);
    setModoDiseno(false);
  };
  // Embebido o llegado desde Gestión de Eventos: evento fijo (sin selector/volver).
  const eventoBloqueado = embebido || !!location.state?.eventoId;

  // =========================================================
  // MOTOR NATIVO: ARRASTRE (DRAG) Y REDIMENSIONAMIENTO (RESIZE)
  // Comparten motor Puesto y ElementoMapa: { tipo: 'puesto'|'elemento', id }
  // dice cuál de las dos colecciones locales (setPuestos/setElementos) tocar.
  // =========================================================
  const [itemArrastrado, setItemArrastrado] = useState(null);
  const [offsetArrastre, setOffsetArrastre] = useState({ x: 0, y: 0 });

  // Nuevos estados para controlar el tamaño visual (Redimensionar)
  const [itemRedimensionando, setItemRedimensionando] = useState(null);
  const [datosResize, setDatosResize] = useState({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  const buscarItem = (tipo, id) => (tipo === 'puesto' ? puestos : elementos).find(it => it.id === id);
  const actualizarItemLocal = (tipo, id, cambios) => {
    const setter = tipo === 'puesto' ? setPuestos : setElementos;
    setter(prev => prev.map(it => (it.id === id ? { ...it, ...cambios } : it)));
  };

  // Iniciar Mover
  const iniciarArrastre = (e, tipo, item) => {
    if (!modoDiseno || itemRedimensionando) return; // Si está redimensionando, no arrastrar
    const rect = e.currentTarget.getBoundingClientRect();
    setOffsetArrastre({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setItemArrastrado({ tipo, id: item.id });
    e.target.setPointerCapture(e.pointerId);
  };

  // Iniciar Redimensionar (Hacer más grande/pequeño)
  const iniciarRedimension = (e, tipo, item) => {
    e.stopPropagation(); // Evita que se active el "Arrastrar" al mismo tiempo
    if (!modoDiseno) return;

    setItemRedimensionando({ tipo, id: item.id });
    setDatosResize({
      startX: e.clientX,
      startY: e.clientY,
      startWidth: item.ancho,
      startHeight: item.alto
    });
    e.target.setPointerCapture(e.pointerId);
  };

  // Lógica principal de movimiento del mouse sobre el lienzo
  const moverAccion = (e) => {
    if (!modoDiseno) return;

    if (itemRedimensionando) {
      // ESTAMOS REDIMENSIONANDO (Haciendo más grande o pequeño)
      const deltaX = e.clientX - datosResize.startX;
      const deltaY = e.clientY - datosResize.startY;

      // Tamaño mínimo de 50x50 para que no desaparezcan
      const nuevoAncho = Math.max(50, datosResize.startWidth + deltaX);
      const nuevoAlto = Math.max(50, datosResize.startHeight + deltaY);

      actualizarItemLocal(itemRedimensionando.tipo, itemRedimensionando.id, { ancho: nuevoAncho, alto: nuevoAlto });

    } else if (itemArrastrado) {
      // ESTAMOS ARRASTRANDO (Moviendo de lugar)
      const contenedor = e.currentTarget;
      const rectContenedor = contenedor.getBoundingClientRect();
      const actual = buscarItem(itemArrastrado.tipo, itemArrastrado.id);
      if (!actual) return;

      let nuevoX = e.clientX - rectContenedor.left - offsetArrastre.x;
      let nuevoY = e.clientY - rectContenedor.top - offsetArrastre.y;

      if (nuevoX < 0) nuevoX = 0;
      if (nuevoY < 0) nuevoY = 0;
      if (nuevoX > rectContenedor.width - actual.ancho) nuevoX = rectContenedor.width - actual.ancho;
      if (nuevoY > rectContenedor.height - actual.alto) nuevoY = rectContenedor.height - actual.alto;

      actualizarItemLocal(itemArrastrado.tipo, itemArrastrado.id, { x: nuevoX, y: nuevoY });
    }
  };

  const soltarAccion = () => {
    if (!modoDiseno) return;
    setItemArrastrado(null);
    setItemRedimensionando(null);
  };
  // =========================================================

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const guardarElemento = async (e) => {
    e.preventDefault();
    setIntentoTamano(true);
    const errs = limpiarErrores({ 'mapa-ancho': errorLado(form.ancho), 'mapa-alto': errorLado(form.alto) });
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['mapa-ancho', 'mapa-alto']);
    setGuardando('tamano');
    setErrorModal('');
    try {
      const actualizado = await api.puestos.actualizar(form.id, {
        ancho: Number(form.ancho), alto: Number(form.alto),
      });
      setPuestos(prev => prev.map(p => p.id === actualizado.id ? { ...p, ...actualizado } : p));
      avisos.exito('El tamaño quedó guardado.');
      cerrarModal();
    } catch (err) {
      setErrorModal(err?.message || 'No se pudo guardar el tamaño.');
    } finally {
      setGuardando(null);
    }
  };

  const editarPuesto = (puesto) => {
    setForm({
      id: puesto.id, nombre: puesto.nombre,
      ancho: puesto.ancho || 100, alto: puesto.alto || 100,
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setForm({ id: '', nombre: '', ancho: 100, alto: 100 });
    setIntentoTamano(false);
    setErrorModal('');
    setMostrarModal(false);
  };

  // Mostrar/ocultar un puesto del plano: reversible, no confirma (PLAN §2.4).
  const toggleEstadoPuesto = async (puesto) => {
    try {
      const actualizado = await api.puestos.actualizar(puesto.id, { estadoActivo: !puesto.estadoActivo });
      setPuestos(prev => prev.map(p => p.id === puesto.id ? { ...p, ...actualizado } : p));
      avisos.exito(actualizado.estadoActivo
        ? `"${puesto.nombre}" vuelve a verse en el plano.`
        : `"${puesto.nombre}" ya no se ve en el plano.`);
    } catch (err) {
      avisos.error(err?.message || 'No se pudo cambiar el estado.', { titulo: 'No se pudo guardar' });
    }
  };

  // Guardado en tanda de TODO el plano (N puestos + N zonas). Si algo falla el
  // modo diseño NO se cierra: antes la promesa se rompía sin decir nada y el
  // plano quedaba bloqueado como si se hubiera guardado bien.
  const guardarDiseñoPlano = async () => {
    setGuardando('plano');
    try {
      await Promise.all([
        ...puestos.map(p => api.puestos.actualizar(p.id, { x: p.x, y: p.y, ancho: p.ancho, alto: p.alto })),
        ...elementos.map(el => api.elementosMapa.actualizar(el.id, { x: el.x, y: el.y, ancho: el.ancho, alto: el.alto })),
      ]);
      setModoDiseno(false);
      avisos.exito('La distribución quedó guardada y bloqueada.');
    } catch (err) {
      avisos.error(err?.message || 'No se pudo guardar la distribución.', { titulo: 'No se pudo guardar' });
    } finally {
      setGuardando(null);
    }
  };

  // --- Zonas manuales (ElementoMapa): catálogo fijo, el Admin las crea directo. ---
  const cambiarTipoZona = (tipo) => {
    setFormZona(f => ({
      tipo,
      nombre: f.nombreTocado ? f.nombre : tipoElementoInfo(tipo).etiqueta,
      nombreTocado: f.nombreTocado,
    }));
  };

  const crearElementoZona = async (e) => {
    e.preventDefault();
    if (!formZona.nombre.trim()) return;
    setGuardando('zona');
    setErrorModal('');
    try {
      const nuevo = await api.elementosMapa.crear({ eventoId, tipo: formZona.tipo, nombre: formZona.nombre.trim() });
      setElementos(prev => [...prev, nuevo]);
      setMostrarModalZona(false);
      setFormZona(FORM_ZONA_VACIO);
      avisos.exito('Zona agregada: arrastrala a su lugar en el plano.');
    } catch (err) {
      setErrorModal(err?.message || 'No se pudo agregar la zona.');
    } finally {
      setGuardando(null);
    }
  };

  const eliminarElemento = async (elemento) => {
    const ok = await confirmar({
      titulo: '¿Eliminar esta zona del plano?',
      mensaje: `"${elemento.nombre}" se va a borrar del mapa. No se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.elementosMapa.eliminar(elemento.id);
      setElementos(prev => prev.filter(el => el.id !== elemento.id));
      avisos.exito(`La zona "${elemento.nombre}" se eliminó.`);
    } catch (err) {
      avisos.error(err?.message || 'No se pudo eliminar la zona.', { titulo: 'No se pudo eliminar' });
    }
  };

  // --- Contorno del recinto (modo Contorno) ---
  const guardarContorno = async () => {
    if (contornoBorrador.length > 0 && contornoBorrador.length < 3) {
      avisos.error('El contorno necesita al menos 3 vértices.');
      return;
    }
    setGuardando('contorno');
    try {
      const actualizado = await api.eventos.actualizarContorno(eventoId, contornoBorrador);
      setEventoActual(actualizado);
      avisos.exito('El contorno quedó guardado.');
    } catch (err) {
      avisos.error(err?.message || 'No se pudo guardar el contorno.', { titulo: 'No se pudo guardar' });
    } finally {
      setGuardando(null);
    }
  };

  // Descartar = perder lo dibujado sin guardar -> confirma (PLAN §2.4).
  const descartarContorno = async () => {
    const ok = await confirmar({
      titulo: '¿Descartar los cambios del contorno?',
      mensaje: 'El contorno vuelve a como estaba guardado; lo que dibujaste ahora se pierde.',
      textoConfirmar: 'Descartar cambios',
      peligroso: true,
    });
    if (!ok) return;
    setContornoBorrador(contornoGuardado);
  };

  const centroMapa = eventoActual?.latitud != null && eventoActual?.longitud != null
    ? [eventoActual.latitud, eventoActual.longitud]
    : null;

  const filasTabla = [
    ...puestos.map(p => ({ ...p, _tipo: 'puesto' })),
    ...elementos.map(el => ({ ...el, _tipo: 'elemento' })),
  ];

  return (
    <div className="pi-mapa-container">

      {!embebido && (
        <BotonVolver onClick={() => navigate('/admin/eventos', { state: { eventoId } })}>
          Volver al evento
        </BotonVolver>
      )}

      {!embebido && (
        <EncabezadoPagina
          titulo="Diseñador del recinto"
          subtitulo="Dibuja el contorno del recinto y ubica negocios y zonas dentro de él."
          icono={FaMap}
          acciones={
            <SelectorEvento
              id="mapa-evento"
              eventos={eventosDisponibles}
              valor={eventoId}
              onCambio={cambiarEvento}
              bloqueado={eventoBloqueado}
              nombre={eventosDisponibles.find(ev => ev.id === eventoId)?.nombre}
            />
          }
        />
      )}

      <Pestanas items={VISTAS} activo={vistaActiva} onCambio={setVistaActiva} etiqueta="Vistas del recinto" />

      {/* Estados de la carga de puestos (Manual 8.9) antes de cualquiera de las vistas */}
      {errorPuestos && <EstadoError onReintentar={recargarPuestos} />}
      {!errorPuestos && cargandoPuestos && <EstadoCarga filas={4} />}

      {/* =======================================================
          VISTA 0: CONTORNO DEL RECINTO (mapa real)
      ======================================================= */}
      {!errorPuestos && !cargandoPuestos && vistaActiva === 'contorno' && (
        <div className="pi-mapa-contorno-vista">
          <Card className="pi-mapa-contorno-card">
            <AvisoFijo tono="info">
              Hacé clic sobre el mapa para marcar cada esquina del recinto, en orden. Arrastrá un
              vértice para moverlo, o abrí su punto para eliminarlo (mínimo 3). El plano (pestaña
              "Plano visual") se ajusta a esta forma una vez guardada.
            </AvisoFijo>

            {!cargandoEvento && eventoActual && eventoActual.latitud == null && (
              <AvisoFijo tono="aviso">
                Este evento no tiene ubicación configurada — anda a Gestión de Eventos y marcala
                primero para centrar el mapa acá.
              </AvisoFijo>
            )}

            <ContornoRecinto centro={centroMapa} value={contornoBorrador} onChange={setContornoBorrador} />

            <div className="pi-mapa-contorno-acciones">
              <span className="texto-ayuda">
                {contornoBorrador.length === 0 && 'Sin contorno todavía.'}
                {contornoBorrador.length > 0 && contornoBorrador.length < 3 &&
                  `${contornoBorrador.length} vértice(s) — faltan al menos ${3 - contornoBorrador.length} más.`}
                {contornoBorrador.length >= 3 && `${contornoBorrador.length} vértices.`}
              </span>
              <div className="btn-acciones">
                <Boton variante="secundario" onClick={descartarContorno} disabled={!contornoSucio || guardando === 'contorno'}>
                  Descartar cambios
                </Boton>
                <Boton icono={FaSave} onClick={guardarContorno} disabled={!contornoSucio} cargando={guardando === 'contorno'}>
                  Guardar contorno
                </Boton>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* =======================================================
          VISTA 1: TABLA
      ======================================================= */}
      {!errorPuestos && !cargandoPuestos && vistaActiva === 'tabla' && (
        <div className="pi-mapa-tabla-vista">
          <Tabla
              card
              columnas={['Elemento', 'Categoría', 'Tamaño (AnxAl)', 'Estado', { texto: 'Acciones', srOnly: true }]}
              datos={filasTabla}
              vacio="No hay elementos registrados."
              renderFila={item => item._tipo === 'elemento' ? (
                <tr key={`el-${item.id}`}>
                  <td>
                    <div className="pi-mapa-item-info">
                      <div className="pi-mapa-miniatura" aria-hidden="true">{(() => { const I = tipoElementoInfo(item.tipo).Icono; return <I />; })()}</div>
                      <span className="fila-nombre">{item.nombre}</span>
                    </div>
                  </td>
                  <td>{tipoElementoInfo(item.tipo).etiqueta}</td>
                  <td><span className="celda-secundaria">{Math.round(item.ancho)}px × {Math.round(item.alto)}px</span></td>
                  <td><Insignia tono="info">Zona</Insignia></td>
                  <td className="td-derecha">
                    <Boton
                      variante="peligro-suave" tamano="sm" icono={FaTrash}
                      onClick={() => eliminarElemento(item)}
                      aria-label={`Eliminar la zona ${item.nombre}`}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={item.id} className={item.estadoActivo ? undefined : 'pi-mapa-fila--oculta'}>
                  <td>
                    <div className="pi-mapa-item-info">
                      {item.logo ? (
                        <img width="40" height="40" src={item.logo} alt="" className="pi-mapa-miniatura" />
                      ) : (
                        <div className="pi-mapa-miniatura" aria-hidden="true"><FaStore /></div>
                      )}
                      <span className="fila-nombre">{item.nombre}</span>
                    </div>
                  </td>
                  <td>{item.categoria}</td>
                  <td><span className="celda-secundaria">{Math.round(item.ancho)}px × {Math.round(item.alto)}px</span></td>
                  <td>
                    {item.estadoActivo ? <Insignia tono="ok">Visible</Insignia> : <Insignia tono="neutro">Oculto</Insignia>}
                  </td>
                  <td className="td-derecha">
                    <div className="btn-acciones">
                      <Boton
                        variante="secundario" tamano="sm" icono={FaEdit}
                        onClick={() => editarPuesto(item)}
                        aria-label={`Cambiar el tamaño de ${item.nombre}`}
                      />
                      <Boton
                        variante={item.estadoActivo ? 'peligro-suave' : 'secundario'} tamano="sm"
                        icono={item.estadoActivo ? FaEyeSlash : FaCheck}
                        onClick={() => toggleEstadoPuesto(item)}
                        aria-label={item.estadoActivo ? `Ocultar ${item.nombre} del plano` : `Mostrar ${item.nombre} en el plano`}
                      />
                    </div>
                  </td>
                </tr>
              )}
          />
        </div>
      )}

      {/* =======================================================
          VISTA 2: PLANO VISUAL INTERACTIVO
      ======================================================= */}
      {!errorPuestos && !cargandoPuestos && vistaActiva === 'plano' && (
        <div className="pi-mapa-plano-vista">

          <div className={`pi-mapa-toolbar ${modoDiseno ? 'pi-mapa-toolbar--diseno' : ''}`}>
            {!modoDiseno ? (
              <>
                <span className="texto-ayuda"><FaLock aria-hidden="true" /> El plano está bloqueado.</span>
                <Boton icono={FaUnlock} onClick={() => setModoDiseno(true)}>Editar distribución</Boton>
              </>
            ) : (
              <>
                <div className="btn-acciones">
                  <span className="texto-ayuda"><FaInfoCircle aria-hidden="true" /> Arrastrá del centro para mover, o de la esquina para agrandar.</span>
                  <Boton variante="secundario" icono={FaPlus} onClick={() => setMostrarModalZona(true)}>Agregar zona</Boton>
                </div>
                <Boton variante="exito" icono={FaSave} onClick={guardarDiseñoPlano} cargando={guardando === 'plano'}>
                  Guardar y bloquear
                </Boton>
              </>
            )}
          </div>

          {!proyeccion && (
            <AvisoFijo tono="info">
              Sin contorno del recinto todavía: el plano usa un tamaño por defecto.{' '}
              <Boton variante="fantasma" tamano="sm" onClick={() => setVistaActiva('contorno')}>
                Dibujalo en la pestaña Contorno
              </Boton>
            </AvisoFijo>
          )}

          {/* Con contorno, el lienzo pasa a medir lo que mida el recinto real
              (ver utils/contornoMapa.js) — puede ser más ancho que la pantalla,
              por eso el scroll horizontal acá en vez de encogerlo (encogerlo
              desalinearía las cajas, que están en px "reales" del proyectado). */}
          <div className="pi-mapa-plano-scroll">
          <div
            className={`pi-mapa-canvas ${modoDiseno ? 'pi-mapa-canvas--activo' : ''}`}
            style={proyeccion ? { width: `${proyeccion.ancho}px`, height: `${proyeccion.alto}px` } : undefined}
            onPointerMove={moverAccion}
            onPointerUp={soltarAccion}
            onPointerLeave={soltarAccion}
          >
            {proyeccion && (
              <svg className="pi-mapa-contorno-svg" viewBox={`0 0 ${proyeccion.ancho} ${proyeccion.alto}`} preserveAspectRatio="none" aria-hidden="true">
                <polygon points={proyeccion.puntos.map(([x, y]) => `${x},${y}`).join(' ')} />
              </svg>
            )}

            {puestos.filter(p => p.estadoActivo).map((puesto) => (
              <div
                key={puesto.id}
                onPointerDown={(e) => iniciarArrastre(e, 'puesto', puesto)}
                className={`pi-mapa-box ${modoDiseno ? 'pi-mapa-box--arrastrable' : ''} ${(itemArrastrado?.tipo === 'puesto' && itemArrastrado.id === puesto.id) || (itemRedimensionando?.tipo === 'puesto' && itemRedimensionando.id === puesto.id) ? 'pi-mapa-box--activo' : ''}`}
                style={{
                  left: `${puesto.x}px`, top: `${puesto.y}px`,
                  width: `${puesto.ancho}px`, height: `${puesto.alto}px`
                }}
              >
                {/* Contenido (Imagen o Icono) */}
                {puesto.logo ? (
                  <div className="pi-mapa-box-img" style={{ backgroundImage: `url(${puesto.logo})` }}>
                    <div className="pi-mapa-box-overlay">
                      <strong>{puesto.nombre}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="pi-mapa-box-color">
                    <FaStore className="pi-mapa-box-icono" />
                    <strong>{puesto.nombre}</strong>
                    <span>{puesto.categoria}</span>
                  </div>
                )}

                {/* --- BOTÓN DE REDIMENSIONAR (Solo visible en modo diseño) --- */}
                {modoDiseno && (
                  <div
                    className="pi-mapa-resize"
                    onPointerDown={(e) => iniciarRedimension(e, 'puesto', puesto)}
                  />
                )}

              </div>
            ))}

            {elementos.map((elemento) => {
              const info = tipoElementoInfo(elemento.tipo);
              const Icono = info.Icono;
              return (
                <div
                  key={elemento.id}
                  onPointerDown={(e) => iniciarArrastre(e, 'elemento', elemento)}
                  className={`pi-mapa-box pi-mapa-box--zona ${modoDiseno ? 'pi-mapa-box--arrastrable' : ''} ${(itemArrastrado?.tipo === 'elemento' && itemArrastrado.id === elemento.id) || (itemRedimensionando?.tipo === 'elemento' && itemRedimensionando.id === elemento.id) ? 'pi-mapa-box--activo' : ''}`}
                  style={{
                    left: `${elemento.x}px`, top: `${elemento.y}px`,
                    width: `${elemento.ancho}px`, height: `${elemento.alto}px`
                  }}
                >
                  <div className="pi-mapa-box-color">
                    <Icono className="pi-mapa-box-icono" />
                    <strong>{elemento.nombre}</strong>
                    <span>{info.etiqueta}</span>
                  </div>

                  {modoDiseno && (
                    <div
                      className="pi-mapa-resize"
                      onPointerDown={(e) => iniciarRedimension(e, 'elemento', elemento)}
                    />
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: TAMAÑO DE PUESTO
      ======================================================= */}
      {mostrarModal && (
        <Modal titulo={`Tamaño de ${form.nombre || 'elemento'}`} onCerrar={cerrarModal}>
          <form onSubmit={guardarElemento} className="formulario" noValidate>
            <AvisoFijo tono="info">
              El nombre y el logo se editan desde el catálogo del negocio. Acá solo se ajusta el
              tamaño en el plano.
            </AvisoFijo>

            <div className="form-inline">
              <Campo
                id="mapa-ancho" etiqueta="Ancho (px)" icono={FaArrowsAltH} className="flex-1"
                type="number" min={MIN_LADO} name="ancho" value={form.ancho} onChange={handleChange}
                error={erroresTamano['mapa-ancho']}
              />
              <Campo
                id="mapa-alto" etiqueta="Alto (px)" icono={FaArrowsAltV} className="flex-1"
                type="number" min={MIN_LADO} name="alto" value={form.alto} onChange={handleChange}
                error={erroresTamano['mapa-alto']}
              />
            </div>

            {errorModal && <AvisoFijo tono="error">{errorModal}</AvisoFijo>}

            <div className="modal-actions">
              <Boton variante="secundario" onClick={cerrarModal} disabled={guardando === 'tamano'}>Cancelar</Boton>
              <Boton type="submit" icono={FaSave} cargando={guardando === 'tamano'}>Guardar tamaño</Boton>
            </div>
          </form>
        </Modal>
      )}

      {/* =======================================================
          MODAL: AGREGAR ZONA (elemento que no es un negocio)
      ======================================================= */}
      {mostrarModalZona && (
        <Modal titulo="Agregar zona al plano" onCerrar={() => setMostrarModalZona(false)}>
          <form onSubmit={crearElementoZona} className="formulario" noValidate>
            <AvisoFijo tono="info">
              Se agrega centrada en el plano; después la arrastrás a su lugar.
            </AvisoFijo>

            <Campo id="zona-tipo" etiqueta="Tipo">
              <select id="zona-tipo" value={formZona.tipo} onChange={(e) => cambiarTipoZona(e.target.value)}>
                {TIPOS_ELEMENTO_MAPA.map(t => (
                  <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                ))}
              </select>
            </Campo>

            <Campo
              id="zona-nombre" etiqueta="Nombre" value={formZona.nombre} placeholder="Ej: Entrada Norte"
              onChange={(e) => setFormZona(f => ({ ...f, nombre: e.target.value, nombreTocado: true }))}
              error={formZona.nombre.trim() ? null : 'Poné un nombre para la zona.'}
            />

            {errorModal && <AvisoFijo tono="error">{errorModal}</AvisoFijo>}

            <div className="modal-actions">
              <Boton variante="secundario" onClick={() => setMostrarModalZona(false)} disabled={guardando === 'zona'}>Cancelar</Boton>
              <Boton type="submit" icono={FaSave} cargando={guardando === 'zona'}>Agregar</Boton>
            </div>
          </form>
        </Modal>
      )}

      {DialogoConfirmar}

    </div>
  );
}
