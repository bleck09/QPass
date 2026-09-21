import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import CalendarioEventos from '../../components/CalendarioEventos.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  FaPlus, FaArrowLeft, FaArrowRight, FaMapMarkerAlt,
  FaUsers, FaTrash, FaUserPlus, FaTicketAlt, FaCog, FaMapMarkedAlt, FaQrcode,
  FaCheckCircle, FaBan, FaFileAlt, FaClipboardList, FaArchive, FaUndo, FaExclamationTriangle, FaPen,
  FaRegCircle, FaRocket, FaEyeSlash, FaCalendarAlt, FaListUl
} from 'react-icons/fa';
import { ROLE_LABELS } from '../../constants/roles.js';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import { formatearFecha, estadoEvento, filtrarEventos, FILTROS_ESTADO_EVENTO } from '../../utils/eventos.js';
import { useDetalleUrl } from '../../utils/useDetalleUrl.js';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import AdminCrearTickets from './AdminCrearTickets.jsx';
import AdminJornadas from './AdminJornadas.jsx';
import AdminCrearQr from './AdminCrearQr.jsx';
import AdminConfigurarPagina from './AdminConfigurarPagina.jsx';
import Mapa from './Mapa.jsx';
import Admin from './Admin.jsx';
import FormularioEventoPasos from './FormularioEventoPasos.jsx';
import Boton from '../../components/Boton.jsx';
import './AdminGestionEventos.css';
import './GestionEventosNav.css';

// Pestañas del detalle de evento (todo se ve acá mismo, sin cambiar de página),
// en dos grupos:
//  - "Preparar el evento": el flujo sugerido para armarlo de punta a punta,
//    en orden (primero cuándo es, después qué se vende y con qué acceso, y al
//    final el mapa, que es opcional). Cada paso muestra si ya está listo.
//  - "Operación": lo que se usa una vez armado (gente, reportes, compras).
// `paso` = clave de progresoEvento.pasos que lo da por listo (backend).
const PESTANAS = [
  { id: 'jornadas', label: 'Jornadas', icono: <FaCalendarAlt />, grupo: 'preparar' },
  { id: 'tickets', label: 'Tickets', icono: <FaTicketAlt />, grupo: 'preparar', paso: 'tickets' },
  { id: 'qr', label: 'Códigos QR', icono: <FaQrcode />, grupo: 'preparar', paso: 'qr' },
  { id: 'config', label: 'Página pública', icono: <FaCog />, grupo: 'preparar', paso: 'landing' },
  { id: 'mapa', label: 'Mapa', icono: <FaMapMarkedAlt />, grupo: 'preparar', opcional: true },
  { id: 'asignados', label: 'Usuarios asignados', icono: <FaUsers />, grupo: 'operacion' },
  { id: 'reportes', label: 'Reportes', icono: <FaExclamationTriangle />, grupo: 'operacion' },
  { id: 'solicitudes', label: 'Solicitudes de entradas', icono: <FaClipboardList />, grupo: 'operacion' },
];

// Qué hace cada paso de "Preparar", para el checklist de publicación.
const TEXTO_PASO = {
  tickets: 'Crear al menos un tipo de entrada',
  qr: 'Generar los códigos QR',
  landing: 'Configurar la página del evento',
};

const ROLES_ASIGNABLES = ['Cliente', 'Supervisor', 'UsuarioNegocio', 'Recargador', 'Devolucion'];
const FORM_EVENTO_VACIO = {
  nombre: '', lugar: '', coordenadas: '',
  // diaInicio/diaFin: 'YYYY-MM-DD' del calendario, tanto al Crear como al
  // Editar (sin hora — eso se ajusta por jornada). Ver handleGuardarEvento.
  diaInicio: '', diaFin: '',
  // Con un rango de 2+ días elegido AL CREAR: ¿una sola jornada para todo el
  // rango, o una jornada por cada día? Solo tiene sentido al crear (recién
  // ahí el evento nace con una única jornada sin nada enganchado todavía) —
  // ver handleGuardarEvento.
  dividirJornadas: false,
  imagen: '', tipoManilla: 'fisica', clienteId: '', diasParaRetiro: '',
};

// Lista de 'YYYY-MM-DD' desde `desdeISO` hasta `hastaISO`, ambos inclusive —
// para crear una jornada por día cuando el Admin elige "dividir" el rango.
const diasEntre = (desdeISO, hastaISO) => {
  const dias = [];
  const cursor = new Date(`${desdeISO}T00:00`);
  const fin = new Date(`${hastaISO}T00:00`);
  while (cursor <= fin) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    dias.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
};
const MAX_IMAGEN_BYTES = 3 * 1024 * 1024; // 3 MB

// ISO -> valor para <input type="datetime-local"> (YYYY-MM-DDTHH:mm, hora local).
const isoADatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminGestionEventos() {
  useTituloPagina('Gestión de eventos');
  const location = useLocation();

  // Carga primaria (4 listas en paralelo) con cargando/error/reintentar (Manual 8.9).
  const cargarTodo = useCallback(async () => {
    const [eventos, usuarios, asignaciones, solicitudes] = await Promise.all([
      api.eventos.listarTodos(),
      api.usuarios.listar(),
      api.asignaciones.listar(),
      api.solicitudesEvento.listar({ estado: 'pendiente' }),
    ]);
    return { eventos, usuarios, asignaciones, solicitudes };
  }, []);
  const {
    data: datos,
    setData: setDatos,
    cargando: cargandoDatos,
    error: errorDatos,
    recargar: recargarDatos,
  } = useApi(cargarTodo, { inicial: { eventos: [], usuarios: [], asignaciones: [], solicitudes: [] } });
  const { eventos, usuarios, asignaciones, solicitudes } = datos;
  const clientes = usuarios.filter(u => u.rol === 'Cliente');
  // Helpers para conservar las actualizaciones optimistas que había con setState.
  const setEventos = (fn) => setDatos(d => ({ ...d, eventos: typeof fn === 'function' ? fn(d.eventos) : fn }));
  const setAsignaciones = (fn) => setDatos(d => ({ ...d, asignaciones: typeof fn === 'function' ? fn(d.asignaciones) : fn }));
  const setSolicitudes = (fn) => setDatos(d => ({ ...d, solicitudes: typeof fn === 'function' ? fn(d.solicitudes) : fn }));

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstadoEvento, setFiltroEstadoEvento] = useState('todos');
  // El detalle de evento vive en la URL (?evento=<id>): así el botón "Atrás" del
  // navegador vuelve a la lista en vez de salir de la página, y el enlace es
  // compartible / sobrevive un refresco.
  const [eventoIdDetalle, abrirEventoUrl, cerrarDetalle] = useDetalleUrl('evento');
  // 'auto' = se decide sola al abrir un evento (ver pestanaActiva más abajo).
  const [pestana, setPestana] = useState('auto');
  // Crear/editar evento vivía en un modal; ahora es su propia vista de página
  // (?formulario=crear o ?formulario=<id>), con el mismo soporte de "Atrás".
  const [formularioParam, abrirFormularioUrl, cerrarFormularioUrl] = useDetalleUrl('formulario');
  const editandoId = formularioParam && formularioParam !== 'crear' ? formularioParam : null;
  // Acceso directo SOLO para la transición "crear evento -> abrir su detalle":
  // cerrar el formulario (useDetalleUrl('formulario')) y abrir el detalle
  // (useDetalleUrl('evento')) son dos setSearchParams separados: llamados uno
  // tras otro en el mismo tick, cada uno parte del mismo `location.search`
  // "viejo" (React todavía no re-renderizó entre medio), así que el segundo
  // pisa al primero y el resultado termina siendo "los dos parámetros puestos"
  // en vez de "uno cerrado, el otro abierto" — quedaba el formulario reabierto
  // (vacío) como si crear no hubiera hecho nada, aunque el evento sí se creó.
  // Acá se hace UNA sola navegación combinada para evitar la carrera.
  const [, setSearchParams] = useSearchParams();

  // Compat.: si se llega con location.state.eventoId (accesos rápidos de otra
  // página) y aún no está en la URL, lo abrimos.
  useEffect(() => {
    if (location.state?.eventoId && !eventoIdDetalle) abrirEventoUrl(location.state.eventoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirDetalle = (id) => {
    setPestana('auto');
    abrirEventoUrl(id);
  };
  const [modalSolicitudesAbierto, setModalSolicitudesAbierto] = useState(false);
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const [formEvento, setFormEvento] = useState(FORM_EVENTO_VACIO);
  const [errorImagen, setErrorImagen] = useState('');
  const [errorFormEvento, setErrorFormEvento] = useState('');
  const [previewFallo, setPreviewFallo] = useState(false);
  // Falta la ubicación (obligatoria): remarca el campo del mapa y lo trae a
  // la vista en vez de solo mostrar un texto de error al fondo del formulario
  // — si no, con un formulario largo parece que el botón "no hizo nada".
  const [faltaUbicacion, setFaltaUbicacion] = useState(false);

  const abrirCrearEvento = () => abrirFormularioUrl('crear');
  const abrirEditarEvento = (ev) => abrirFormularioUrl(ev.id);

  // Sincroniza el formulario con la URL DURANTE EL RENDER (no en un efecto —
  // "adjusting state when a prop changes", ver docs de React): así el
  // formulario también se puebla solo si se llega directo por link o refresco,
  // sin esperar a que `eventos` termine de cargar (reintenta en cada render
  // hasta encontrar el evento).
  const [formularioParamAplicado, setFormularioParamAplicado] = useState(formularioParam);
  if (formularioParam !== formularioParamAplicado) {
    if (formularioParam === 'crear') {
      setFormularioParamAplicado(formularioParam);
      setFormEvento(FORM_EVENTO_VACIO);
      setErrorImagen('');
      setErrorFormEvento('');
      setFaltaUbicacion(false);
      setPreviewFallo(false);
    } else if (formularioParam) {
      const ev = eventos.find(e => e.id === formularioParam);
      if (ev) {
        setFormularioParamAplicado(formularioParam);
        setFormEvento({
          nombre: ev.nombre || '',
          lugar: ev.lugar || '',
          coordenadas: ev.coordenadas || '',
          imagen: ev.imagen || '',
          tipoManilla: ev.tipoManilla || 'fisica',
          // Mismo calendario que Crear (ver más abajo): se parte del rango
          // actual del evento, sin la hora (eso lo maneja cada jornada).
          diaInicio: isoADatetimeLocal(ev.fecha).slice(0, 10),
          diaFin: isoADatetimeLocal(ev.fechaFin).slice(0, 10),
          dividirJornadas: false,
          clienteId: ev.clienteId != null ? String(ev.clienteId) : '',
          diasParaRetiro: ev.diasParaRetiro != null ? String(ev.diasParaRetiro) : '',
        });
        setErrorImagen('');
        setErrorFormEvento('');
        setFaltaUbicacion(false);
        setPreviewFallo(false);
      }
      // si el evento todavía no está en `eventos` (aún cargando), no se marca
      // aplicado: se reintenta en el próximo render.
    } else {
      setFormularioParamAplicado(formularioParam); // formulario cerrado
    }
  }
  // Panel de asignar: filtro por rol + búsqueda por nombre/correo (ya no se elige rol).
  const [filtroRolAsignar, setFiltroRolAsignar] = useState('');
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [comprasPendientes, setComprasPendientes] = useState(0);

  useEffect(() => {
    if (!eventoIdDetalle) return;
    api.compras.listar({ eventoId: eventoIdDetalle }).then(lista =>
      setComprasPendientes(lista.filter(c => c.estado === 'pendiente').length)
    );
  }, [eventoIdDetalle]);

  const [errorSolicitudes, setErrorSolicitudes] = useState('');

  const aprobarSolicitud = async (s) => {
    const ok = await confirmar({
      titulo: '¿Aprobar la solicitud?',
      mensaje: `Se creará el evento real "${s.nombreEvento}" a partir de esta solicitud.`,
      textoConfirmar: 'Aprobar y crear',
    });
    if (!ok) return;
    setErrorSolicitudes('');
    try {
      const nuevo = await api.solicitudesEvento.aprobar(s.id);
      setEventos(prev => [nuevo, ...prev]);
      setSolicitudes(prev => prev.filter(x => x.id !== s.id));
      abrirDetalle(nuevo.id);
    } catch (err) {
      // Ej.: las fechas propuestas se cruzan con otro evento activo ("un
      // evento a la vez") — hay que editar la solicitud o rechazarla.
      setErrorSolicitudes(err.message);
    }
  };

  const rechazarSolicitud = async (s) => {
    const motivo = await confirmar({
      titulo: '¿Rechazar la solicitud?',
      mensaje: `Se rechazará "${s.nombreEvento}". El cliente verá el motivo que escribas.`,
      campoNota: { etiqueta: 'Motivo del rechazo', placeholder: 'Ej. faltan datos del lugar y la fecha', requerido: true },
      textoConfirmar: 'Rechazar solicitud',
      peligroso: true,
    });
    if (motivo === null) return;
    await api.solicitudesEvento.rechazar(s.id, motivo);
    setSolicitudes(prev => prev.filter(x => x.id !== s.id));
  };

  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busqueda, filtroEstadoEvento),
    [eventos, busqueda, filtroEstadoEvento],
  );
  const [vistaEventos, setVistaEventos] = useState('lista'); // 'lista' | 'calendario'

  const eventoDetalle = eventos.find(ev => ev.id === eventoIdDetalle) || null;
  // Si la manilla pasó a digital estando en la pestaña "Generar QR" (que ahí
  // deja de mostrarse), no dejar al Admin viendo una pestaña fantasma.
  if (eventoDetalle && pestana === 'qr' && eventoDetalle.tipoManilla === 'digital') {
    setPestana('jornadas');
  }
  const pestanasVisibles = eventoDetalle
    ? PESTANAS.filter(p => p.id !== 'qr' || eventoDetalle.tipoManilla !== 'digital')
    : PESTANAS;
  const pasosPreparar = pestanasVisibles.filter(p => p.grupo === 'preparar');

  // Qué le falta al evento para poder publicarse (tickets, QR, página, mapa).
  // Se recarga cada vez que se cambia de pestaña: es el punto natural en el que
  // el admin "vuelve" después de completar un paso en otra pestaña.
  const cargarProgreso = useCallback(async () => {
    if (!eventoDetalle) return null;
    return api.eventos.progreso(eventoDetalle.id).catch(() => null);
  }, [eventoDetalle?.id]);
  const { data: progresoEvento, recargar: recargarProgreso } = useApi(cargarProgreso, {
    inicial: null,
    activo: !!eventoDetalle,
  });
  useEffect(() => { recargarProgreso(); }, [pestana, recargarProgreso]);

  // Estado de un paso de "Preparar": 'listo' | 'pendiente' | 'opcional'.
  // Jornadas siempre está lista (el evento nace con una).
  const estadoPaso = (p) => {
    if (p.opcional) return 'opcional';
    if (!p.paso) return 'listo';
    return progresoEvento?.pasos?.[p.paso] ? 'listo' : 'pendiente';
  };

  // Al abrir un evento sin elegir pestaña: si está en borrador, el primer
  // paso que falta (es lo que el Admin viene a hacer); si ya se publicó,
  // la operación del día a día.
  const pestanaActiva = pestana !== 'auto' ? pestana
    : !eventoDetalle ? 'asignados'
    : eventoDetalle.publicadoEn || eventoDetalle.archivadoEn ? 'asignados'
    : (pasosPreparar.find(p => estadoPaso(p) === 'pendiente')?.id ?? 'jornadas');
  const indicePaso = pasosPreparar.findIndex(p => p.id === pestanaActiva);
  const pasoSiguiente = indicePaso >= 0 ? pasosPreparar[indicePaso + 1] : null;

  const asignacionesDelEvento = useMemo(
    () => asignaciones.filter(a => a.eventoId === eventoIdDetalle),
    [asignaciones, eventoIdDetalle]
  );

  const contarAsignados = (eventoId) => asignaciones.filter(a => a.eventoId === eventoId).length;

  // Candidatos para asignar: solo roles operativos, que no estén ya en el evento,
  // filtrados por el rol elegido y por el texto de búsqueda.
  const usuariosAsignables = useMemo(() => {
    const idsYaEnEvento = new Set(asignacionesDelEvento.map(a => a.usuarioId));
    const termino = busquedaUsuario.trim().toLowerCase();
    return usuarios
      .filter(u => ROLES_ASIGNABLES.includes(u.rol))
      .filter(u => !idsYaEnEvento.has(u.id))
      .filter(u => !filtroRolAsignar || u.rol === filtroRolAsignar)
      .filter(u =>
        !termino ||
        u.nombre.toLowerCase().includes(termino) ||
        (u.email || '').toLowerCase().includes(termino)
      );
  }, [usuarios, asignacionesDelEvento, filtroRolAsignar, busquedaUsuario]);

  const handleChangeFormEvento = (e) => {
    setFormEvento({ ...formEvento, [e.target.name]: e.target.value });
  };

  // La imagen se sube como archivo real a /uploads y en el formulario solo se guarda
  // la URL devuelta (antes se codificaba entera en base64 dentro del propio formulario).
  const handleImagenUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorImagen('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > MAX_IMAGEN_BYTES) {
      setErrorImagen('La imagen no debe superar los 3 MB.');
      return;
    }
    try {
      setErrorImagen('Subiendo imagen...');
      const url = await subirImagenDeInput(file, 'eventos');
      setErrorImagen('');
      setPreviewFallo(false);
      setFormEvento(f => ({ ...f, imagen: url }));
    } catch (err) {
      setErrorImagen(err.message);
    }
  };

  const handleGuardarEvento = async (e) => {
    e.preventDefault();
    if (!formEvento.nombre.trim() || !formEvento.lugar.trim()) return;
    // Los días se eligen en el calendario, tanto al crear como al editar (sin
    // hora — eso se ajusta por jornada, ver AdminJornadas para el detalle).
    if (!formEvento.diaInicio || !formEvento.diaFin) return;
    if (!formEvento.coordenadas) {
      setFaltaUbicacion(true);
      return;
    }
    setFaltaUbicacion(false);
    setErrorFormEvento('');

    // clienteId / diasParaRetiro vacíos -> se omiten (el backend usa el default).
    const { clienteId, diasParaRetiro, diaInicio, diaFin, dividirJornadas, ...resto } = formEvento;
    const payload = {
      ...resto,
      // Sin hora todavía: abarca el/los día(s) completo(s) elegidos en el
      // calendario; la hora real de cada noche se define en Jornadas.
      fecha: `${diaInicio}T00:00`,
      fechaFin: `${diaFin}T23:59`,
      ...(clienteId ? { clienteId: Number(clienteId) } : {}),
      ...(diasParaRetiro ? { diasParaRetiro: Number(diasParaRetiro) } : {}),
    };

    try {
      if (editandoId) {
        const actualizado = await api.eventos.actualizar(editandoId, payload);
        setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
        cerrarFormularioUrl();
        return;
      }

      const nuevo = await api.eventos.crear(payload);
      setEventos(prev => [nuevo, ...prev]);

      // "Una jornada por cada día": el evento nace con UNA jornada que
      // abarca todo el rango (ver EventosService.crear) — acá se la achica a
      // solo el primer día y se agrega una más por cada día siguiente, en
      // vez de una entrada que sirva para cualquier día del rango.
      if (dividirJornadas && diaInicio !== diaFin) {
        const dias = diasEntre(diaInicio, diaFin);
        const [jornadaUnica] = await api.diasEvento.listar(nuevo.id);
        if (jornadaUnica) {
          await api.diasEvento.actualizar(jornadaUnica.id, {
            inicio: new Date(`${dias[0]}T00:00`).toISOString(),
            fin: new Date(`${dias[0]}T23:59`).toISOString(),
          });
          for (const dia of dias.slice(1)) {
            await api.diasEvento.crear({
              eventoId: nuevo.id,
              inicio: new Date(`${dia}T00:00`).toISOString(),
              fin: new Date(`${dia}T23:59`).toISOString(),
            });
          }
        }
      }

      setFormEvento(FORM_EVENTO_VACIO);
      // Recién creado, el primer paso del flujo es Jornadas (confirmar/editar
      // la única noche que ya trae por defecto, o agregar más si hace falta).
      setPestana('jornadas');
      // Cierra el formulario Y abre el detalle en una sola navegación (ver
      // comentario junto a `setSearchParams` más arriba) — evita la carrera
      // que dejaba el formulario reabierto como si crear no hubiera hecho nada.
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('formulario');
        next.set('evento', nuevo.id);
        return next;
      });
    } catch (err) {
      // El backend rechaza fechas que se cruzan con otro evento activo ("un
      // evento a la vez"): el mensaje ya viene listo para mostrar tal cual.
      setErrorFormEvento(err.message);
    }
  };

  const handleAsignar = async (usuario) => {
    if (!eventoIdDetalle) return;
    // El backend deriva el rol del evento del rol de la cuenta; se manda igual por compat.
    await api.asignaciones.asignar({ eventoId: eventoIdDetalle, usuarioId: usuario.id, rol: usuario.rol });
    setAsignaciones(await api.asignaciones.listar());
  };

  const handleQuitarAsignacion = async (id) => {
    const ok = await confirmar({
      titulo: '¿Quitar al usuario?',
      mensaje: 'Este usuario dejará de tener acceso a este evento con su rol asignado.',
      textoConfirmar: 'Quitar del evento',
      peligroso: true,
    });
    if (!ok) return;
    await api.asignaciones.quitar(id);
    setAsignaciones(prev => prev.filter(a => a.id !== id));
  };

  const handleArchivar = async () => {
    if (!eventoDetalle) return;
    const ok = await confirmar({
      titulo: '¿Archivar este evento?',
      mensaje: `"${eventoDetalle.nombre}" quedará de SOLO LECTURA: nadie podrá registrar recargas, devoluciones, ingresos, incidencias ni editar nada. Se puede desarchivar después.`,
      textoConfirmar: 'Archivar evento',
      peligroso: true,
    });
    if (!ok) return;
    const actualizado = await api.eventos.archivar(eventoDetalle.id);
    setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
  };

  const handleDesarchivar = async () => {
    if (!eventoDetalle) return;
    const ok = await confirmar({
      titulo: '¿Desarchivar este evento?',
      mensaje: `"${eventoDetalle.nombre}" volverá a admitir cambios.`,
      textoConfirmar: 'Desarchivar',
    });
    if (!ok) return;
    const actualizado = await api.eventos.desarchivar(eventoDetalle.id);
    setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
  };

  const [errorPublicar, setErrorPublicar] = useState('');

  const handlePublicar = async () => {
    if (!eventoDetalle) return;
    setErrorPublicar('');
    try {
      const actualizado = await api.eventos.publicar(eventoDetalle.id);
      setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
    } catch (err) {
      setErrorPublicar(err.message);
    }
  };

  const handleDespublicar = async () => {
    if (!eventoDetalle) return;
    const ok = await confirmar({
      titulo: '¿Volver a borrador?',
      mensaje: `"${eventoDetalle.nombre}" dejará de verse en la página pública y no se podrán comprar más entradas hasta que lo publiques de nuevo.`,
      textoConfirmar: 'Volver a borrador',
      peligroso: true,
    });
    if (!ok) return;
    const actualizado = await api.eventos.despublicar(eventoDetalle.id);
    setEventos(prev => prev.map(ev => (ev.id === actualizado.id ? { ...ev, ...actualizado } : ev)));
  };

  // Borrado real (no archivar): solo tiene sentido para un borrador que
  // resultó ser un error/prueba, antes de que nadie compre nada — el
  // backend rechaza si ya está publicado o si ya tiene compras.
  const [errorEliminar, setErrorEliminar] = useState('');
  const handleEliminar = async () => {
    if (!eventoDetalle) return;
    const ok = await confirmar({
      titulo: '¿Eliminar este evento?',
      mensaje: `"${eventoDetalle.nombre}" se borra por completo (jornadas, tickets, mapa, página, usuarios asignados...) — no se puede deshacer. Si preferís conservarlo como referencia, usá "Archivar" en vez de esto.`,
      textoConfirmar: 'Eliminar evento',
      peligroso: true,
    });
    if (!ok) return;
    setErrorEliminar('');
    try {
      await api.eventos.eliminar(eventoDetalle.id);
      setEventos(prev => prev.filter(ev => ev.id !== eventoDetalle.id));
      cerrarDetalle();
    } catch (err) {
      setErrorEliminar(err.message);
    }
  };

  if (errorDatos) {
    return (
      <div className="pi-ges-container">
        <div className="pi-ges-header"><h1>Gestión de eventos</h1></div>
        <EstadoError onReintentar={recargarDatos} />
      </div>
    );
  }
  if (cargandoDatos) {
    return (
      <div className="pi-ges-container">
        <div className="pi-ges-header"><h1>Gestión de eventos</h1></div>
        <EstadoCarga filas={5} />
      </div>
    );
  }

  return (
    <div className="pi-ges-container">
      {formularioParam ? (
        <>
          <button type="button" className="pi-ges-btn-volver" onClick={cerrarFormularioUrl}>
            <FaArrowLeft /> {editandoId ? 'Volver al evento' : 'Volver a Gestión de Eventos'}
          </button>

          <div className="pi-ges-header">
            <div>
              <h1>{editandoId ? <><FaPen aria-hidden="true" /> Editar Evento</> : <><FaPlus aria-hidden="true" /> Crear Evento</>}</h1>
              <p>{editandoId ? `Estás editando "${formEvento.nombre}". Podés saltar a cualquier paso.` : 'Te guiamos en 5 pasos. Lo que completes se ve en la vista previa.'}</p>
            </div>
          </div>

          <FormularioEventoPasos
            key={formularioParam}
            formEvento={formEvento}
            setFormEvento={setFormEvento}
            onChange={handleChangeFormEvento}
            editando={!!editandoId}
            onImagen={handleImagenUpload}
            onQuitarImagen={() => { setErrorImagen(''); setFormEvento(f => ({ ...f, imagen: '' })); }}
            errorImagen={errorImagen}
            previewFallo={previewFallo}
            setPreviewFallo={setPreviewFallo}
            errorGuardar={errorFormEvento}
            faltaUbicacion={faltaUbicacion}
            setFaltaUbicacion={setFaltaUbicacion}
            eventosOtros={eventos.filter(ev => ev.id !== editandoId)}
            clientes={clientes}
            onGuardar={handleGuardarEvento}
            onCancelar={cerrarFormularioUrl}
          />
        </>
      ) : eventoDetalle ? (
        <>
          <button type="button" className="pi-ges-btn-volver" onClick={cerrarDetalle}>
            <FaArrowLeft /> Volver a Gestión de Eventos
          </button>

          <div className="pi-ges-detalle-header">
            <img width="96" height="96" src={eventoDetalle.imagen} alt={eventoDetalle.nombre} className="pi-ges-detalle-imagen" />
            <div className="pi-ges-detalle-info">
              <h1>
                {eventoDetalle.nombre} <BadgeEstadoEvento evento={eventoDetalle} />{' '}
                <span className={`pi-ges-badge-publicacion ${eventoDetalle.publicadoEn ? 'publicado' : 'borrador'}`}>
                  {eventoDetalle.publicadoEn ? <><FaCheckCircle /> Publicado</> : <><FaEyeSlash /> Borrador</>}
                </span>{' '}
                <span className="pi-ges-badge-manilla">
                  {eventoDetalle.tipoManilla === 'digital' ? <><FaQrcode /> Manilla digital</> : <><FaTicketAlt /> Manilla física</>}
                </span>
              </h1>
              <span>
                <FaMapMarkerAlt /> {eventoDetalle.lugar}
                {eventoDetalle.coordenadas ? ` (${eventoDetalle.coordenadas})` : ''} · {formatearFecha(eventoDetalle.fecha)}
              </span>
            </div>
            <div className="pi-ges-detalle-acciones">
              {!eventoDetalle.archivadoEn && (
                eventoDetalle.publicadoEn ? (
                  <button type="button" className="pi-ges-btn-despublicar" onClick={handleDespublicar}>
                    <FaEyeSlash /> Volver a borrador
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pi-ges-btn-publicar"
                    onClick={handlePublicar}
                    disabled={progresoEvento ? !progresoEvento.listoParaPublicar : true}
                    title={progresoEvento && !progresoEvento.listoParaPublicar ? 'Completa los pasos de abajo antes de publicar' : undefined}
                  >
                    <FaRocket /> Publicar evento
                  </button>
                )
              )}
              {!eventoDetalle.archivadoEn && (
                <button type="button" className="pi-ges-btn-editar" onClick={() => abrirEditarEvento(eventoDetalle)}>
                  <FaPen /> Editar
                </button>
              )}
              {eventoDetalle.archivadoEn ? (
                <button type="button" className="pi-ges-btn-desarchivar" onClick={handleDesarchivar}>
                  <FaUndo /> Desarchivar
                </button>
              ) : (
                <button
                  type="button"
                  className="pi-ges-btn-archivar"
                  onClick={handleArchivar}
                  disabled={estadoEvento(eventoDetalle) !== 'finalizado'}
                  title={estadoEvento(eventoDetalle) !== 'finalizado' ? 'Solo se archiva un evento finalizado' : undefined}
                >
                  <FaArchive /> Archivar
                </button>
              )}
              {/* Borrado real: solo para un borrador (nunca publicado), a
                  diferencia de "Archivar" que es para uno que ya terminó. */}
              {!eventoDetalle.archivadoEn && !eventoDetalle.publicadoEn && (
                <button type="button" className="pi-ges-btn-eliminar" onClick={handleEliminar}>
                  <FaTrash /> Eliminar
                </button>
              )}
            </div>
          </div>

          {errorEliminar && (
            <p className="pi-ges-progreso-error"><FaExclamationTriangle /> {errorEliminar}</p>
          )}

          {eventoDetalle.archivadoEn && (
            <p className="pi-ges-aviso-archivado">
              <FaArchive /> Evento archivado — solo lectura. Desarchívalo para volver a hacer cambios.
            </p>
          )}

          {!eventoDetalle.archivadoEn && !eventoDetalle.publicadoEn && progresoEvento && (
            <div className="pi-ges-progreso">
              <div className="pi-ges-progreso-encabezado">
                <p className="pi-ges-progreso-titulo">
                  Este evento está en <strong>borrador</strong>: nadie lo ve en la página pública ni puede comprar
                  entradas hasta que lo publiques.
                </p>
                <span className="pi-ges-progreso-fraccion">
                  {Object.values(progresoEvento.pasos).filter(Boolean).length} de {Object.keys(progresoEvento.pasos).length}
                </span>
              </div>
              <div className="pi-ges-progreso-barra">
                <div
                  className="pi-ges-progreso-barra-relleno"
                  style={{
                    width: `${(Object.values(progresoEvento.pasos).filter(Boolean).length / Object.keys(progresoEvento.pasos).length) * 100}%`,
                  }}
                />
              </div>
              <ul className="pi-ges-progreso-lista">
                {Object.entries(progresoEvento.pasos).map(([clave, listo]) => {
                  const destino = PESTANAS.find(p => p.paso === clave);
                  const texto = clave === 'qr' && eventoDetalle.tipoManilla === 'digital'
                    ? 'Códigos QR: automáticos (manilla digital)'
                    : TEXTO_PASO[clave] ?? clave;
                  const irAlPaso = destino && !(clave === 'qr' && eventoDetalle.tipoManilla === 'digital');
                  return (
                    <li key={clave} className={listo ? 'listo' : ''}>
                      {irAlPaso ? (
                        <button type="button" onClick={() => setPestana(destino.id)}>
                          {listo ? <FaCheckCircle aria-hidden="true" /> : <FaRegCircle aria-hidden="true" />}
                          <span>{texto}</span>
                          {!listo && <em>Ir ahora <FaArrowRight aria-hidden="true" /></em>}
                        </button>
                      ) : (
                        <span className="pi-ges-progreso-item">
                          {listo ? <FaCheckCircle aria-hidden="true" /> : <FaRegCircle aria-hidden="true" />}
                          <span>{texto}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {progresoEvento.listoParaPublicar && (
                <div className="pi-ges-progreso-listo">
                  <span><FaRocket aria-hidden="true" /> ¡Todo listo! Ya podés publicar el evento.</span>
                  <button type="button" className="pi-ges-btn-publicar" onClick={handlePublicar}>
                    <FaRocket aria-hidden="true" /> Publicar ahora
                  </button>
                </div>
              )}
              <p className="pi-ges-progreso-nota">
                El mapa es opcional: los puestos los activa cada Usuario Negocio y podés armarlo
                antes o después de publicar. Si queda sin configurar, simplemente no se muestra en la página del evento.
              </p>
              {errorPublicar && (
                <p className="pi-ges-progreso-error"><FaExclamationTriangle /> {errorPublicar}</p>
              )}
            </div>
          )}

          <nav className="pi-ges-nav" aria-label="Secciones del evento">
            {[
              { grupo: 'preparar', titulo: 'Preparar el evento' },
              { grupo: 'operacion', titulo: 'Operación' },
            ].map(({ grupo, titulo }) => (
              <div key={grupo} className={`pi-ges-nav-grupo pi-ges-nav-grupo--${grupo}`}>
                <span className="pi-ges-nav-titulo">{titulo}</span>
                <div className="pi-ges-tabs" role="tablist" aria-label={titulo}>
                  {pestanasVisibles.filter(p => p.grupo === grupo).map((p, i) => {
                    const est = grupo === 'preparar' ? estadoPaso(p) : null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="tab"
                        aria-selected={pestanaActiva === p.id}
                        className={`pi-ges-tab${pestanaActiva === p.id ? ' activo' : ''}${est ? ` paso-${est}` : ''}`}
                        onClick={() => setPestana(p.id)}
                      >
                        {grupo === 'preparar' && (
                          <span className="pi-ges-tab-num" aria-hidden="true">
                            {est === 'listo' ? <FaCheckCircle /> : i + 1}
                          </span>
                        )}
                        {grupo === 'operacion' && p.icono}
                        {p.label}
                        {est === 'opcional' && <small className="pi-ges-tab-opcional">opcional</small>}
                        {est === 'pendiente' && <span className="sr-only"> (pendiente)</span>}
                        {est === 'listo' && <span className="sr-only"> (listo)</span>}
                        {p.id === 'solicitudes' && comprasPendientes > 0 && (
                          <span className="pi-ges-badge-contador">{comprasPendientes}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div key={pestanaActiva} className="pi-ges-panel-pestana">
          {pestanaActiva === 'jornadas' && <AdminJornadas eventoId={eventoDetalle.id} soloLectura={!!eventoDetalle.archivadoEn} />}
          {pestanaActiva === 'tickets' && <AdminCrearTickets eventoId={eventoDetalle.id} embebido />}
          {pestanaActiva === 'qr' && <AdminCrearQr eventoId={eventoDetalle.id} tipoManilla={eventoDetalle.tipoManilla} embebido />}
          {pestanaActiva === 'config' && (
            <AdminConfigurarPagina
              eventoId={eventoDetalle.id}
              eventoNombre={eventoDetalle.nombre}
              eventoImagen={eventoDetalle.imagen}
              evento={eventoDetalle}
              embebido
            />
          )}
          {pestanaActiva === 'mapa' && <Mapa eventoId={eventoDetalle.id} embebido />}
          {pestanaActiva === 'reportes' && <Admin eventoIdFijo={eventoDetalle.id} vistaFija="incidencias" />}
          {pestanaActiva === 'solicitudes' && <Admin eventoIdFijo={eventoDetalle.id} vistaFija="solicitudesEntradas" />}

          {pestanaActiva === 'asignados' && (
          <section className="pi-ges-seccion">
            <h3 className="pi-ges-seccion-titulo"><FaUsers /> Usuarios asignados</h3>

            <Tabla
              columnas={['Usuario', 'Correo', 'Rol en el evento', { texto: 'Acciones', srOnly: true }]}
              datos={asignacionesDelEvento}
              vacio="Aún no hay usuarios asignados a este evento."
              renderFila={a => {
                const usuario = usuarios.find(u => u.id === a.usuarioId);
                if (!usuario) return null;
                return (
                  <tr key={a.id}>
                    <td>{usuario.nombre}</td>
                    <td>{usuario.email}</td>
                    <td><span className="pi-ges-badge">{ROLE_LABELS[a.rol] || a.rol}</span></td>
                    <td>
                      <button type="button" className="pi-ges-btn-quitar" onClick={() => handleQuitarAsignacion(a.id)} title="Quitar del evento">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              }}
            />

            <div className="pi-ges-asignar-panel">
              <h4 className="pi-ges-asignar-titulo"><FaUserPlus /> Asignar usuario al evento</h4>
              <p className="pi-ges-asignar-ayuda">
                El rol en el evento es el mismo rol de la cuenta. Elegí a la persona.
              </p>

              <Buscador
                valor={busquedaUsuario}
                onCambio={setBusquedaUsuario}
                placeholder="Buscar por nombre o correo…"
                etiquetaFiltros="Filtrar por rol"
                filtroActivo={filtroRolAsignar}
                onFiltro={(v) => setFiltroRolAsignar(f => (f === v ? '' : v))}
                filtros={[
                  { valor: '', texto: 'Todos' },
                  ...ROLES_ASIGNABLES.map(rol => ({ valor: rol, texto: ROLE_LABELS[rol] || rol })),
                ]}
              />

              <Tabla
                columnas={['Usuario', 'Correo', 'Rol', { texto: 'Acciones', srOnly: true }]}
                datos={usuariosAsignables}
                porPagina={8}
                vacio="No hay usuarios que coincidan (o ya están todos asignados)."
                renderFila={u => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.email}</td>
                    <td><span className="pi-ges-badge">{ROLE_LABELS[u.rol] || u.rol}</span></td>
                    <td>
                      <button type="button" className="pi-ges-btn-asignar" onClick={() => handleAsignar(u)}>
                        <FaUserPlus /> Asignar
                      </button>
                    </td>
                  </tr>
                )}
              />
            </div>
          </section>
          )}

          {pasoSiguiente && (
            <div className="pi-ges-siguiente-paso">
              <span>
                Paso {indicePaso + 1} de {pasosPreparar.length}
                {estadoPaso(pasosPreparar[indicePaso]) === 'listo' && <> · <FaCheckCircle aria-hidden="true" /> listo</>}
              </span>
              <Boton iconoDerecha={FaArrowRight} onClick={() => { setPestana(pasoSiguiente.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                Siguiente: {pasoSiguiente.label}
              </Boton>
            </div>
          )}
          </div>
        </>
      ) : (
        <>
          <div className="pi-ges-header">
            <div>
              <h1>Gestión de eventos</h1>
              <p>Crea eventos y asigna usuarios con su rol para cada uno.</p>
            </div>
            <div className="pi-ges-header-acciones">
              {solicitudes.length > 0 && (
                <button
                  type="button"
                  className="pi-ges-btn-solicitudes"
                  onClick={() => { setErrorSolicitudes(''); setModalSolicitudesAbierto(true); }}
                >
                  <FaFileAlt /> Solicitudes de clientes
                  <span className="pi-ges-solicitudes-contador">{solicitudes.length}</span>
                </button>
              )}
              <button type="button" className="pi-ges-btn-crear" onClick={abrirCrearEvento}>
                <FaPlus /> Crear Evento
              </button>
            </div>
          </div>

          <Buscador
            valor={busqueda}
            onCambio={setBusqueda}
            placeholder="Buscar evento por nombre o lugar…"
            filtros={FILTROS_ESTADO_EVENTO}
            filtroActivo={filtroEstadoEvento}
            onFiltro={setFiltroEstadoEvento}
            etiquetaFiltros="Filtrar eventos por estado"
          />

          <div className="pi-ges-vista-tabs" role="group" aria-label="Vista de eventos">
            <button type="button" className={vistaEventos === 'lista' ? 'activo' : ''} onClick={() => setVistaEventos('lista')}>
              <FaListUl aria-hidden="true" /> Lista
            </button>
            <button type="button" className={vistaEventos === 'calendario' ? 'activo' : ''} onClick={() => setVistaEventos('calendario')}>
              <FaCalendarAlt aria-hidden="true" /> Calendario
            </button>
          </div>

          {vistaEventos === 'calendario' ? (
            <CalendarioEventos eventos={eventosFiltrados} onSeleccionar={abrirDetalle} />
          ) : (
            <GrillaEventos
              eventos={eventosFiltrados}
              gridClassName="pi-ges-eventos-grid"
              vacio="No se encontraron eventos."
            >
              {ev => (
                <EventoCard
                  key={ev.id}
                  evento={ev}
                  onClick={() => abrirDetalle(ev.id)}
                  cta="Gestionar"
                  badges={
                    <span className={`pi-ges-badge-publicacion ${ev.publicadoEn ? 'publicado' : 'borrador'}`}>
                      {ev.publicadoEn ? <><FaCheckCircle /> Publicado</> : <><FaEyeSlash /> Borrador</>}
                    </span>
                  }
                  meta={<><FaUsers /> {contarAsignados(ev.id)} usuarios asignados</>}
                />
              )}
            </GrillaEventos>
          )}
        </>
      )}

      {modalSolicitudesAbierto && (
        <Modal
          titulo={<><FaFileAlt aria-hidden="true" /> Solicitudes de clientes pendientes</>}
          onCerrar={() => setModalSolicitudesAbierto(false)}
          tamano="lg"
        >
          {errorSolicitudes && (
            <p className="pi-ges-error-fechas"><FaExclamationTriangle aria-hidden="true" /> {errorSolicitudes}</p>
          )}
          {solicitudes.length === 0 ? (
            <p className="pi-ges-modal-vacio">No hay solicitudes pendientes.</p>
          ) : (
            <Tabla
              columnas={['Evento propuesto', 'Cliente', 'Lugar', 'Fecha', { texto: 'Acciones', srOnly: true }]}
              datos={solicitudes}
              porPagina={8}
              renderFila={s => (
                <tr key={s.id}>
                  <td>{s.nombreEvento}</td>
                  <td>{s.cliente?.nombre} ({s.cliente?.email})</td>
                  <td>{s.lugar}</td>
                  <td>{formatearFecha(s.fecha)}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="pi-ges-btn-asignar" onClick={() => aprobarSolicitud(s)}>
                      <FaCheckCircle /> Aprobar
                    </button>
                    <button type="button" className="pi-ges-btn-quitar" onClick={() => rechazarSolicitud(s)} title="Rechazar">
                      <FaBan />
                    </button>
                  </td>
                </tr>
              )}
            />
          )}
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
