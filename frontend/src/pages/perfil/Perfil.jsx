import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import {
  FaCamera, FaSave, FaCheckCircle, FaUserShield, FaCalendarAlt, FaIdBadge, FaPhone,
  FaMapMarkerAlt, FaUserEdit, FaIdCard, FaBirthdayCake, FaEdit, FaTimes, FaCheck,
  FaEnvelope, FaQuoteLeft, FaUser, FaQrcode, FaTicketAlt, FaMoon, FaChevronDown, FaLock, FaHistory,
  FaVenusMars, FaGlobeAmericas,
} from 'react-icons/fa';
import { EVENTO_USUARIO_ACTUALIZADO } from '../../layout/MenuLateral';
import { leerSesion, guardarSesion } from '../../api/client.js';
import { ROLE_LABELS } from '../../constants/roles.js';
import { PAISES } from '../../constants/paises.js';
import { OPCIONES_SEXO } from '../../constants/perfil.js';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import Modal from '../../components/Modal.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import Insignia from '../../components/Insignia.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { formatearFecha, nombreJornada } from '../../utils/eventos.js';
import {
  errorObligatorio, errorContrasenaNueva, errorConfirmacion, errorCelular,
  errorFechaNacimiento, soloDigitos, limpiarErrores, enfocarPrimero, MIN_CONTRASENA,
} from '../../utils/validacion.js';
import './Perfil.css';

const getIniciales = (nombre = 'Usuario') => nombre.substring(0, 2).toUpperCase();

// El backend devuelve fechaNacimiento como datetime ISO; el <input type="date"> necesita solo la parte yyyy-mm-dd.
const soloFecha = (iso) => (iso ? iso.slice(0, 10) : '');

// Dato de solo lectura (modo "ver"). vacio: texto cuando no hay valor.
function Dato({ icono: Icono, etiqueta, valor, vacio, fijo = false, ancho = false }) {
  return (
    <div className={`pi-perfil-dato${ancho ? ' pi-perfil-dato--ancho' : ''}`}>
      <span className="pi-perfil-dato-etiqueta">
        <Icono aria-hidden="true" /> {etiqueta}
        {fijo && <FaLock className="pi-perfil-dato-fijo" title="Dato fijo: no se puede cambiar" aria-label="Dato fijo" />}
      </span>
      <span className={`pi-perfil-dato-valor${valor ? '' : ' vacio'}`}>{valor || vacio}</span>
    </div>
  );
}

export default function Perfil() {
  useTituloPagina('Mi perfil');
  const avisos = useAvisos();
  const [confirmar, DialogoConfirmar] = useConfirmar();
  const sesion = leerSesion();
  const idSesion = sesion?.id;
  const [usuario, setUsuarioState] = useState(sesion);

  // Estados de datos
  const [foto, setFoto] = useState(sesion?.foto || '');
  const [celular, setCelular] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [biografia, setBiografia] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('');
  const [pais, setPais] = useState('');

  // Datos NO editables
  const nombre = usuario?.nombre || '';
  const ci = usuario?.ci || '';
  const email = usuario?.email || '';

  // Estados de contraseñas
  const [contraseñaActual, setContraseñaActual] = useState('');
  const [contraseñaNueva, setContraseñaNueva] = useState('');
  const [contraseñaConfirmar, setContraseñaConfirmar] = useState('');
  const [historialPassword, setHistorialPassword] = useState([]);

  // Estados de UI
  const [activeTab, setActiveTab] = useState('cuenta');
  // Móvil: el widget "Completa tu perfil" arranca plegado detrás de un botón.
  const [progresoAbierto, setProgresoAbierto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Errores por campo (tras el primer intento) y error del servidor, por pestaña.
  const [intentos, setIntentos] = useState({});
  const [errorServidor, setErrorServidor] = useState({});
  const inputFoto = useRef(null);

  // --- VERIFICAR QR (solo Usuario Normal): escáner libre de cualquier evento
  //     que solo devuelve nombre + evento + tipo de entrada, nada de saldo.
  const [escaneandoQr, setEscaneandoQr] = useState(false);
  const [buscandoQr, setBuscandoQr] = useState(false);
  const [resultadoQr, setResultadoQr] = useState(null);
  const [errorQr, setErrorQr] = useState('');

  const iniciarEscaneoQr = () => {
    setErrorQr('');
    setResultadoQr(null);
    setEscaneandoQr(true);
  };

  const handleCodigoQrDetectado = async (codigo) => {
    setEscaneandoQr(false);
    setBuscandoQr(true);
    try {
      setResultadoQr(await api.entradas.buscarBasico(codigo));
    } catch (err) {
      setErrorQr(err.message);
    } finally {
      setBuscandoQr(false);
    }
  };

  // Estados de la carga del perfil (Manual 8.9). El cuerpo de cargarPerfil()
  // arranca con la petición (no hay setState síncrono), así que el efecto que
  // la llama no dispara react-hooks/set-state-in-effect.
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState(false);

  // La sesión solo trae id/nombre/email/rol/foto; el resto del perfil se carga aparte.
  const cargarPerfil = useCallback(() => api.usuarios.obtener(idSesion)
    .then(completo => {
      setUsuarioState(completo);
      setFoto(completo.foto || '');
      setCelular(completo.celular || '');
      setCiudad(completo.ciudad || '');
      setBiografia(completo.biografia || '');
      setFechaNacimiento(soloFecha(completo.fechaNacimiento));
      setSexo(completo.sexo || '');
      setPais(completo.pais || '');
      return api.usuarios.historialPassword(idSesion);
    })
    .then(setHistorialPassword)
    .catch(() => setErrorPerfil(true))
    .finally(() => setCargandoPerfil(false)), [idSesion]);

  const reintentarPerfil = () => {
    setErrorPerfil(false);
    setCargandoPerfil(true);
    cargarPerfil();
  };

  useEffect(() => {
    if (idSesion) cargarPerfil();
  }, [idSesion, cargarPerfil]);

  // Fecha máxima para el calendario (HOY)
  const fechaHoyStr = new Date().toISOString().split('T')[0];

  // Progreso del perfil: 25% base por registrarse + 15% por cada dato opcional.
  const { progreso, pasos } = useMemo(() => {
    const steps = [
      { id: 'registro', label: 'Datos base', done: true, points: 25 },
      { id: 'foto', label: 'Foto de perfil', done: !!foto, points: 15 },
      { id: 'celular', label: 'Celular (+591)', done: !!celular, points: 15 },
      { id: 'fecha', label: 'Nacimiento', done: !!fechaNacimiento, points: 15 },
      { id: 'ciudad', label: 'Ubicación', done: !!ciudad, points: 15 },
      { id: 'bio', label: 'Biografía', done: !!biografia, points: 15 },
    ];
    return { progreso: steps.reduce((s, p) => s + (p.done ? p.points : 0), 0), pasos: steps };
  }, [foto, celular, fechaNacimiento, ciudad, biografia]);

  const circunferencia = 2 * Math.PI * 45;
  const strokeOffset = circunferencia - (progreso / 100) * circunferencia;

  if (!usuario) return null;

  const fechaCreacion = usuario?.createdAt ? formatearFecha(usuario.createdAt, false) : '';

  // --- Validación (reglas únicas: utils/validacion.js) ---
  const validarCuenta = () => limpiarErrores({
    'perfil-celular': errorCelular(celular),
    'perfil-nacimiento': errorFechaNacimiento(fechaNacimiento),
  });
  const validarSeguridad = () => limpiarErrores({
    'perfil-clave-actual': errorObligatorio(contraseñaActual, 'Escribí tu contraseña actual.'),
    'perfil-clave-nueva': errorContrasenaNueva(contraseñaNueva),
    'perfil-clave-confirmar': errorConfirmacion(contraseñaConfirmar, contraseñaNueva),
  });
  const erroresCuenta = intentos.cuenta ? validarCuenta() : {};
  const erroresSeguridad = intentos.seguridad ? validarSeguridad() : {};

  const handleFotoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      setFoto(await subirImagenDeInput(file, 'perfiles'));
    } catch (err) {
      avisos.error(err.message, { titulo: 'No se pudo subir la foto' });
    }
  };

  const cancelarEdicion = () => {
    setFoto(usuario?.foto || '');
    setCelular(usuario?.celular || '');
    setCiudad(usuario?.ciudad || '');
    setBiografia(usuario?.biografia || '');
    setFechaNacimiento(soloFecha(usuario?.fechaNacimiento));
    setSexo(usuario?.sexo || '');
    setPais(usuario?.pais || '');
    setIntentos((i) => ({ ...i, cuenta: false }));
    setErrorServidor((e) => ({ ...e, cuenta: '' }));
    setIsEditing(false);
  };

  const guardarCambios = async () => {
    setErrorServidor((e) => ({ ...e, cuenta: '' }));
    setIntentos((i) => ({ ...i, cuenta: true }));
    const errs = validarCuenta();
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['perfil-celular', 'perfil-nacimiento']);

    setGuardando(true);
    try {
      const actualizado = await api.usuarios.actualizar(usuario.id, {
        foto,
        fechaNacimiento: fechaNacimiento || undefined,
        celular: celular.trim(),
        ciudad: ciudad.trim(),
        biografia: biografia.trim(),
        sexo: sexo || undefined,
        pais: pais || undefined,
      });

      setUsuarioState(actualizado);
      guardarSesion({ ...sesion, foto: actualizado.foto });
      window.dispatchEvent(new Event(EVENTO_USUARIO_ACTUALIZADO));

      setIsEditing(false);
      setIntentos((i) => ({ ...i, cuenta: false }));
      avisos.exito('Tu perfil quedó actualizado.');
    } catch (err) {
      setErrorServidor((e) => ({ ...e, cuenta: err.message }));
      avisos.error(err.message, { titulo: 'No se pudieron guardar los cambios' });
    } finally {
      setGuardando(false);
    }
  };

  // Cambio de contraseña: acción sensible -> se confirma antes (PLAN §2.4).
  const guardarSeguridad = async (e) => {
    e.preventDefault();
    setErrorServidor((er) => ({ ...er, seguridad: '' }));
    setIntentos((i) => ({ ...i, seguridad: true }));
    const errs = validarSeguridad();
    if (Object.keys(errs).length) {
      return enfocarPrimero(errs, ['perfil-clave-actual', 'perfil-clave-nueva', 'perfil-clave-confirmar']);
    }

    const ok = await confirmar({
      titulo: '¿Cambiar tu contraseña?',
      mensaje: 'Vas a usar la nueva contraseña la próxima vez que inicies sesión.',
      textoConfirmar: 'Sí, cambiarla',
    });
    if (!ok) return;

    setGuardando(true);
    try {
      await api.usuarios.cambiarPassword(usuario.id, contraseñaActual, contraseñaNueva);
      setContraseñaActual('');
      setContraseñaNueva('');
      setContraseñaConfirmar('');
      setIntentos((i) => ({ ...i, seguridad: false }));
      setHistorialPassword(await api.usuarios.historialPassword(usuario.id));
      avisos.exito('Tu contraseña se cambió de forma segura.', { titulo: 'Contraseña actualizada' });
    } catch (err) {
      setErrorServidor((er) => ({ ...er, seguridad: err.message }));
      avisos.error(err.message, { titulo: 'No se pudo cambiar la contraseña' });
    } finally {
      setGuardando(false);
    }
  };

  const pestanas = [
    { id: 'cuenta', etiqueta: 'Información personal', icono: FaUserEdit },
    { id: 'seguridad', etiqueta: 'Seguridad y acceso', icono: FaUserShield },
    ...(usuario.rol === 'UsuarioNormal' ? [{ id: 'verificar', etiqueta: 'Verificar QR', icono: FaQrcode }] : []),
  ];

  const listo = !errorPerfil && !cargandoPerfil;

  return (
    <div className="pi-perfil-page">
      <div className="pi-perfil-cover" aria-hidden="true">
        <div className="pi-perfil-cover-pattern" />
      </div>

      <div className="pi-perfil-layout">

        <aside className="pi-perfil-sidebar">
          <div className="pi-perfil-avatar-wrapper">
            <div className="pi-perfil-avatar">
              {foto ? <img src={foto} alt={nombre} width="130" height="130" /> : <span>{getIniciales(nombre || email)}</span>}
            </div>
            {isEditing && (
              <>
                <Boton
                  variante="primario" icono={FaCamera} className="pi-perfil-avatar-cambiar"
                  onClick={() => inputFoto.current?.click()} aria-label="Cambiar foto de perfil" title="Cambiar foto de perfil"
                />
                <input ref={inputFoto} type="file" accept="image/*" onChange={handleFotoUpload} hidden />
              </>
            )}
          </div>

          {/* Único h1 de la pantalla: la página trata sobre esta persona (A3 / Manual 5.6) */}
          <h1 className="pi-perfil-nombre">{nombre}</h1>
          <Insignia tono="marca" icono={FaIdBadge}>{ROLE_LABELS[usuario.rol] || usuario.rol}</Insignia>
          {fechaCreacion && (
            <p className="pi-perfil-miembro"><FaCalendarAlt aria-hidden="true" /> Miembro desde {fechaCreacion}</p>
          )}

          <button
            type="button"
            className="pi-perfil-progreso-toggle"
            onClick={() => setProgresoAbierto(a => !a)}
            aria-expanded={progresoAbierto}
            aria-controls="pi-perfil-progreso"
          >
            <span>Completa tu perfil</span>
            <span className="pi-perfil-progreso-toggle-num">{progreso}%</span>
            <FaChevronDown className="pi-perfil-progreso-toggle-icono" aria-hidden="true" />
          </button>

          <div id="pi-perfil-progreso" className={`pi-perfil-progreso${progresoAbierto ? ' abierto' : ''}`}>
            <h2 className="pi-perfil-progreso-titulo">Completa tu perfil</h2>
            <div className={`pi-perfil-anillo${progreso === 100 ? ' completo' : ''}`}>
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle className="pi-perfil-anillo-fondo" cx="50" cy="50" r="45" />
                <circle
                  className="pi-perfil-anillo-barra"
                  cx="50" cy="50" r="45"
                  style={{ strokeDasharray: circunferencia, strokeDashoffset: strokeOffset }}
                />
              </svg>
              <span className="pi-perfil-anillo-num">{progreso}%</span>
            </div>

            <ul className="pi-perfil-pasos">
              {pasos.map(paso => (
                <li key={paso.id} className={paso.done ? 'hecho' : ''}>
                  {paso.done ? <FaCheck aria-hidden="true" /> : <FaTimes aria-hidden="true" />}
                  <span>{paso.label}</span>
                  {!paso.done && <small>+{paso.points}%</small>}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* <section> y no <main>: el layout ya aporta el <main> de la página (Manual 11, un solo landmark main) */}
        <section className="pi-perfil-principal" aria-label="Datos del perfil">
          <Pestanas
            items={pestanas}
            activo={activeTab}
            onCambio={setActiveTab}
            variante="linea"
            etiqueta="Secciones del perfil"
            idBase="perfil"
          />

          <div className="pi-perfil-contenido" role="tabpanel" id={`perfil-panel-${activeTab}`} aria-labelledby={`perfil-tab-${activeTab}`}>
            {errorPerfil && <EstadoError onReintentar={reintentarPerfil} />}
            {!errorPerfil && cargandoPerfil && <EstadoCarga filas={5} />}

            {/* PESTAÑA: INFORMACIÓN PERSONAL */}
            {listo && activeTab === 'cuenta' && (
              <div className="animate-fade">
                <div className="pi-perfil-seccion-cab">
                  <h2>Información personal</h2>
                  {!isEditing ? (
                    <Boton variante="secundario" icono={FaEdit} onClick={() => setIsEditing(true)}>Editar</Boton>
                  ) : (
                    <div className="btn-acciones">
                      <Boton variante="secundario" onClick={cancelarEdicion} disabled={guardando}>Cancelar</Boton>
                      <Boton icono={FaSave} onClick={guardarCambios} cargando={guardando}>Guardar</Boton>
                    </div>
                  )}
                </div>

                <div className="pi-perfil-grilla">
                  <Dato icono={FaUser} etiqueta="Nombre completo" valor={nombre} fijo={isEditing} />
                  <Dato icono={FaEnvelope} etiqueta="Correo electrónico" valor={email} fijo={isEditing} />
                  <Dato icono={FaIdCard} etiqueta="Documento de identidad (CI)" valor={ci} fijo={isEditing} />

                  {isEditing ? (
                    <>
                      <Campo
                        id="perfil-celular" etiqueta={<><FaPhone aria-hidden="true" /> Teléfono celular</>}
                        prefijo="🇧🇴 +591" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="12345678"
                        value={celular} onChange={(e) => setCelular(soloDigitos(e.target.value))}
                        error={erroresCuenta['perfil-celular']}
                      />
                      <Campo
                        id="perfil-nacimiento" etiqueta={<><FaBirthdayCake aria-hidden="true" /> Fecha de nacimiento</>}
                        type="date" max={fechaHoyStr}
                        value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)}
                        error={erroresCuenta['perfil-nacimiento']}
                      />
                      <Campo
                        id="perfil-ciudad" etiqueta={<><FaMapMarkerAlt aria-hidden="true" /> Ubicación / ciudad</>}
                        placeholder="Ej. Cochabamba, Bolivia"
                        value={ciudad} onChange={(e) => setCiudad(e.target.value)}
                      />
                      <Campo id="perfil-sexo" etiqueta={<><FaVenusMars aria-hidden="true" /> Sexo</>}>
                        <select id="perfil-sexo" value={sexo} onChange={(e) => setSexo(e.target.value)}>
                          <option value="">Prefiero no decir</option>
                          {OPCIONES_SEXO.map((o) => (
                            <option key={o.valor} value={o.valor}>{o.texto}</option>
                          ))}
                        </select>
                      </Campo>
                      <Campo id="perfil-pais" etiqueta={<><FaGlobeAmericas aria-hidden="true" /> País</>}>
                        <select id="perfil-pais" value={pais} onChange={(e) => setPais(e.target.value)}>
                          <option value="">Sin especificar</option>
                          {PAISES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </Campo>
                      <Campo id="perfil-bio" etiqueta={<><FaQuoteLeft aria-hidden="true" /> Biografía</>} className="pi-perfil-dato--ancho">
                        <textarea
                          id="perfil-bio" rows={3} placeholder="Escribí algo sobre vos…"
                          value={biografia} onChange={(e) => setBiografia(e.target.value)}
                        />
                      </Campo>
                    </>
                  ) : (
                    <>
                      <Dato icono={FaPhone} etiqueta="Teléfono celular" valor={celular && `🇧🇴 +591 ${celular}`} vacio="No registrado" />
                      <Dato icono={FaBirthdayCake} etiqueta="Fecha de nacimiento" valor={fechaNacimiento && fechaNacimiento.split('-').reverse().join('/')} vacio="No registrada" />
                      <Dato icono={FaMapMarkerAlt} etiqueta="Ubicación / ciudad" valor={ciudad} vacio="No registrada" />
                      <Dato icono={FaVenusMars} etiqueta="Sexo" valor={OPCIONES_SEXO.find((o) => o.valor === sexo)?.texto} vacio="No registrado" />
                      <Dato icono={FaGlobeAmericas} etiqueta="País" valor={pais} vacio="No registrado" />
                      <Dato icono={FaQuoteLeft} etiqueta="Biografía" valor={biografia} vacio='Sin biografía todavía. Tocá "Editar" para agregar una.' ancho />
                    </>
                  )}
                </div>

                {errorServidor.cuenta && <AvisoFijo tono="error">{errorServidor.cuenta}</AvisoFijo>}
              </div>
            )}

            {/* PESTAÑA: SEGURIDAD */}
            {listo && activeTab === 'seguridad' && (
              <div className="animate-fade pi-perfil-seguridad">
                <AvisoFijo tono="info" icono={FaUserShield} titulo="Cambio de contraseña">
                  Por seguridad, necesitás ingresar tu contraseña actual para establecer una nueva.
                </AvisoFijo>

                <form className="pi-perfil-grilla" onSubmit={guardarSeguridad} noValidate>
                  <Campo
                    id="perfil-clave-actual" etiqueta="Contraseña actual" contrasena autoComplete="current-password" maxLength={72}
                    placeholder="••••••••" className="pi-perfil-dato--ancho"
                    value={contraseñaActual} onChange={(e) => setContraseñaActual(e.target.value)}
                    error={erroresSeguridad['perfil-clave-actual']}
                  />
                  <Campo
                    id="perfil-clave-nueva" etiqueta="Nueva contraseña" contrasena autoComplete="new-password" maxLength={72}
                    placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`}
                    value={contraseñaNueva} onChange={(e) => setContraseñaNueva(e.target.value)}
                    error={erroresSeguridad['perfil-clave-nueva']}
                  />
                  <Campo
                    id="perfil-clave-confirmar" etiqueta="Confirmar contraseña" contrasena autoComplete="new-password" maxLength={72}
                    placeholder="Repetí la contraseña"
                    value={contraseñaConfirmar} onChange={(e) => setContraseñaConfirmar(e.target.value)}
                    error={erroresSeguridad['perfil-clave-confirmar']}
                  />
                  {errorServidor.seguridad && (
                    <AvisoFijo tono="error" className="pi-perfil-dato--ancho">{errorServidor.seguridad}</AvisoFijo>
                  )}
                  <div className="pi-perfil-dato--ancho pi-perfil-acciones">
                    <Boton type="submit" icono={FaSave} cargando={guardando}>Actualizar contraseña</Boton>
                  </div>
                </form>

                <div className="pi-perfil-historial">
                  <h3><FaHistory aria-hidden="true" /> Historial de cambios de contraseña</h3>
                  {historialPassword.length === 0 ? (
                    <EstadoVacio compacto icono={FaHistory} titulo="Todavía no cambiaste tu contraseña" />
                  ) : (
                    <ul>
                      {historialPassword.map(c => (
                        <li key={c.id}>
                          <span>{new Date(c.createdAt).toLocaleString('es-BO')}</span>
                          <Insignia tono={c.origen === 'recuperacion' ? 'warn' : 'neutro'}>
                            {c.origen === 'recuperacion' ? 'Por recuperación con código' : 'Cambio manual'}
                          </Insignia>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA: VERIFICAR QR (solo Usuario Normal) */}
            {listo && activeTab === 'verificar' && usuario.rol === 'UsuarioNormal' && (
              <div className="animate-fade pi-perfil-qr">
                <h2>Verificar una entrada</h2>
                <p className="texto-ayuda">
                  Escaneá el QR de una manilla de cualquier evento para ver a nombre de quién está
                  y qué tipo de entrada es. No se muestra saldo ni ningún otro dato.
                </p>

                {escaneandoQr ? (
                  <EscanerQr onDetectado={handleCodigoQrDetectado} onCancelar={() => setEscaneandoQr(false)} />
                ) : buscandoQr ? (
                  <EstadoCarga filas={2} etiqueta="Buscando la entrada…" />
                ) : (
                  <>
                    {errorQr && <AvisoFijo tono="error">{errorQr}</AvisoFijo>}
                    <Boton icono={FaQrcode} onClick={iniciarEscaneoQr}>
                      {resultadoQr || errorQr ? 'Escanear otro código' : 'Escanear código QR'}
                    </Boton>
                  </>
                )}

                {resultadoQr && (
                  <Modal titulo="Entrada verificada" onCerrar={() => setResultadoQr(null)} tamano="sm">
                    <div className="pi-perfil-qr-resultado">
                      <FaCheckCircle className="pi-perfil-qr-icono" aria-hidden="true" />
                      <p className="pi-perfil-qr-nombre">{resultadoQr.nombre}</p>
                      <dl className="pi-perfil-qr-datos">
                        <div>
                          <dt>Evento</dt>
                          <dd>{resultadoQr.eventoNombre}</dd>
                        </div>
                        {resultadoQr.diaEvento && (
                          <div>
                            <dt><FaMoon aria-hidden="true" /> Jornada</dt>
                            <dd>{nombreJornada(resultadoQr.diaEvento)}</dd>
                          </div>
                        )}
                        <div>
                          <dt><FaCalendarAlt aria-hidden="true" /> Fecha</dt>
                          <dd>{formatearFecha(resultadoQr.diaEvento?.inicio || resultadoQr.eventoFecha)}</dd>
                        </div>
                        {resultadoQr.eventoLugar && (
                          <div>
                            <dt><FaMapMarkerAlt aria-hidden="true" /> Lugar</dt>
                            <dd>{resultadoQr.eventoLugar}</dd>
                          </div>
                        )}
                        {resultadoQr.categoriaNombre && (
                          <div>
                            <dt><FaTicketAlt aria-hidden="true" /> Tipo de entrada</dt>
                            <dd>{resultadoQr.categoriaNombre}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    <div className="modal-actions">
                      <Boton variante="secundario" onClick={() => setResultadoQr(null)}>Cerrar</Boton>
                      <Boton icono={FaQrcode} onClick={iniciarEscaneoQr}>Escanear otro</Boton>
                    </div>
                  </Modal>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
      {DialogoConfirmar}
    </div>
  );
}
