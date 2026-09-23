import { useCallback, useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import Insignia from '../../components/Insignia.jsx';
import StatCard from '../../components/StatCard.jsx';
import SubirImagen from '../../components/SubirImagen.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { enfocarPrimero, MIN_CONTRASENA } from '../../utils/validacion.js';
import { erroresAyudante } from '../../utils/ayudantes.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import {
  FaPlus, FaUsers, FaCheckSquare, FaUserTie, FaEnvelope, FaSave, FaSquare, FaMapMarkerAlt,
  FaPen, FaKey, FaUnlink, FaSearch, FaCheck,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { ROLES } from '../../constants/roles.js';
import './MisAyudantes.css';

const FORM_CREAR = { nombre: '', email: '', password: '', foto: '', puestosAsignados: [] };
const FORM_EDITAR = { nombre: '', foto: '' };

/**
 * Selector de puestos en acordeón: toda la sección colapsada; al abrirla,
 * un grupo por evento (también colapsable). Evita el listado larguísimo.
 *
 * @param {{eventoId, eventoNombre, puestos:{id,nombre}[]}[]} grupos
 * @param {(puestoId:string)=>boolean} estaSeleccionado
 * @param {(puesto)=>void} onToggle
 * @param {boolean} defaultOpen  abre la sección de entrada (modal de asignar)
 */
function SelectorPuestos({ grupos, estaSeleccionado, onToggle, defaultOpen = false }) {
  const [seccionAbierta, setSeccionAbierta] = useState(defaultOpen);
  const [gruposAbiertos, setGruposAbiertos] = useState(
    () => new Set(grupos.filter(g => g.puestos.some(p => estaSeleccionado(p.id))).map(g => g.eventoId)),
  );

  if (!grupos.length) {
    return <EstadoVacio compacto icono={FaMapMarkerAlt} titulo="Todavía no tenés puestos" mensaje="Activá un puesto en un evento para poder asignarlo." />;
  }

  const total = grupos.reduce((n, g) => n + g.puestos.length, 0);
  const nSel = grupos.reduce((n, g) => n + g.puestos.filter(p => estaSeleccionado(p.id)).length, 0);
  const toggleGrupo = (id, abierto) => setGruposAbiertos(prev => {
    const n = new Set(prev);
    if (abierto) n.add(id); else n.delete(id);
    return n;
  });

  return (
    <details className="pi-ma-selector" open={seccionAbierta} onToggle={(e) => setSeccionAbierta(e.currentTarget.open)}>
      <summary>
        <FaMapMarkerAlt aria-hidden="true" /> Puestos
        <Insignia tono={nSel ? 'info' : 'neutro'}>{nSel} de {total} seleccionados</Insignia>
      </summary>
      <div className="pi-ma-selector-cuerpo">
        {grupos.map(g => {
          const gSel = g.puestos.filter(p => estaSeleccionado(p.id)).length;
          return (
            <details
              key={g.eventoId}
              className="pi-ma-grupo"
              open={gruposAbiertos.has(g.eventoId)}
              onToggle={(e) => toggleGrupo(g.eventoId, e.currentTarget.open)}
            >
              <summary>{g.eventoNombre} <span className="celda-secundaria">· {gSel}/{g.puestos.length}</span></summary>
              <div className="checkbox-grid">
                {g.puestos.map(p => {
                  const on = estaSeleccionado(p.id);
                  return (
                    <label key={p.id} className={`checkbox-item${on ? ' selected' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => onToggle(p)} />
                      {on ? <FaCheckSquare aria-hidden="true" /> : <FaSquare aria-hidden="true" />}
                      {p.nombre}
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </details>
  );
}

export default function MisAyudantes() {
  useTituloPagina('Mis ayudantes');
  const avisos = useAvisos();
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const cargarAyudantes = useCallback(() => api.puestoAyudantes.misAyudantes(), []);
  const {
    data: ayudantes,
    cargando: cargandoAyudantes,
    error: errorAyudantes,
    recargar: recargarAyudantes,
  } = useApi(cargarAyudantes, { inicial: [] });

  const cargarPuestos = useCallback(() => api.puestos.mios(), []);
  const { data: puestos } = useApi(cargarPuestos, { inicial: [] });

  // Puestos agrupados por evento para los checkboxes.
  const puestosPorEvento = useMemo(() => {
    const map = new Map();
    for (const p of puestos) {
      const g = map.get(p.eventoId) || { eventoId: p.eventoId, eventoNombre: p.evento?.nombre || 'Evento', puestos: [] };
      g.puestos.push(p);
      map.set(p.eventoId, g);
    }
    return [...map.values()];
  }, [puestos]);

  const [busqueda, setBusqueda] = useState('');
  const [showCrear, setShowCrear] = useState(false);
  const [formCrear, setFormCrear] = useState(FORM_CREAR);
  const [editandoId, setEditandoId] = useState(null);
  const [formEditar, setFormEditar] = useState(FORM_EDITAR);
  const [asignandoId, setAsignandoId] = useState(null);
  const [reseteandoId, setReseteandoId] = useState(null);
  const [passNueva, setPassNueva] = useState('');
  // Error del servidor dentro del modal abierto; los de cada campo, junto al campo.
  const [err, setErr] = useState('');
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const asignando = ayudantes.find(a => a.id === asignandoId) || null;
  const reseteando = ayudantes.find(a => a.id === reseteandoId) || null;

  const ayudantesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return ayudantes;
    return ayudantes.filter(a => a.nombre.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [ayudantes, busqueda]);

  const erroresCrear = intento && showCrear ? erroresAyudante(formCrear, 'ma') : {};
  const erroresEditar = intento && editandoId ? erroresAyudante(formEditar, 'me', { conCorreo: false, conClave: false }) : {};
  const erroresReset = intento && reseteandoId ? erroresAyudante({ nombre: 'x', password: passNueva.trim() }, 'mr', { conCorreo: false }) : {};

  const abrir = (accion) => { setErr(''); setIntento(false); accion(); };

  // Envuelve cada guardado: spinner, error del servidor en el modal.
  const conGuardado = async (fn) => {
    setGuardando(true);
    try {
      await fn();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  // ---------- CREAR ----------
  const crearAyudante = (e) => {
    e.preventDefault();
    setErr('');
    setIntento(true);
    const errs = erroresAyudante(formCrear, 'ma');
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['ma-nombre', 'ma-email', 'ma-pass']);
    conGuardado(async () => {
      const nuevo = await api.auth.registro({
        rol: ROLES.AYUDANTE, nombre: formCrear.nombre.trim(), email: formCrear.email.trim(),
        password: formCrear.password, foto: formCrear.foto || undefined,
      });
      await Promise.all(formCrear.puestosAsignados.map(puestoId =>
        api.puestoAyudantes.asignar({ puestoId, ayudanteId: nuevo.id })
      ));
      await recargarAyudantes();
      setShowCrear(false);
      avisos.exito(`${formCrear.nombre.trim()} ya puede entrar con su correo y la contraseña temporal.`, { titulo: 'Ayudante creado' });
      setFormCrear(FORM_CREAR);
    });
  };

  // ---------- EDITAR ----------
  const abrirEditar = (a) => abrir(() => {
    setEditandoId(a.id);
    setFormEditar({ nombre: a.nombre, foto: a.foto || '' });
  });
  const guardarEdicion = (e) => {
    e.preventDefault();
    setErr('');
    setIntento(true);
    if (Object.keys(erroresAyudante(formEditar, 'me', { conCorreo: false, conClave: false })).length) {
      return document.getElementById('me-nombre')?.focus();
    }
    conGuardado(async () => {
      await api.puestoAyudantes.editarAyudante(editandoId, {
        nombre: formEditar.nombre.trim(),
        foto: formEditar.foto || null,
      });
      await recargarAyudantes();
      setEditandoId(null);
      avisos.exito('Los datos del ayudante quedaron guardados.');
    });
  };

  // ---------- RESET PASSWORD (acción sensible: se confirma) ----------
  const confirmarReset = async (e) => {
    e.preventDefault();
    setErr('');
    setIntento(true);
    if (Object.keys(erroresAyudante({ nombre: 'x', password: passNueva.trim() }, 'mr', { conCorreo: false })).length) {
      return document.getElementById('mr-pass')?.focus();
    }
    const ok = await confirmar({
      titulo: `¿Cambiar la contraseña de ${reseteando.nombre}?`,
      mensaje: 'La contraseña actual deja de funcionar. Pasale la nueva: al entrar la va a tener que cambiar.',
      textoConfirmar: 'Sí, cambiarla',
    });
    if (!ok) return;
    conGuardado(async () => {
      await api.puestoAyudantes.resetPassword(reseteandoId, { passwordNueva: passNueva.trim() });
      avisos.exito(`${reseteando.nombre} ya puede entrar con la contraseña nueva.`, { titulo: 'Contraseña cambiada' });
      setReseteandoId(null);
      setPassNueva('');
    });
  };

  // ---------- ASIGNAR A PUESTOS (se guarda al instante) ----------
  const togglePuesto = async (puesto) => {
    const existente = asignando.asignaciones.find(x => x.puestoId === puesto.id);
    try {
      if (existente) await api.puestoAyudantes.quitar(existente.id);
      else await api.puestoAyudantes.asignar({ puestoId: puesto.id, ayudanteId: asignando.id });
      await recargarAyudantes();
      avisos.exito(existente ? `Quitado de ${puesto.nombre}.` : `Asignado a ${puesto.nombre}.`, { duracion: 2500 });
    } catch (e2) {
      setErr(e2.message);
    }
  };

  // ---------- DESVINCULAR ----------
  const desvincular = async (a) => {
    const ok = await confirmar({
      titulo: `¿Desvincular a ${a.nombre}?`,
      mensaje: 'Dejará de pertenecer a tu negocio y de estar en todos tus puestos. Sus ventas ya registradas NO se borran. Podés volver a crearlo/invitarlo después.',
      textoConfirmar: 'Desvincular',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.puestoAyudantes.desvincular(a.id);
      await recargarAyudantes();
      avisos.exito(`${a.nombre} ya no forma parte de tu negocio.`);
    } catch (e2) {
      avisos.error(e2.message, { titulo: 'No se pudo desvincular' });
    }
  };

  const pieModal = (onCancelar, texto, icono = FaSave) => (
    <div className="modal-actions">
      <Boton variante="secundario" onClick={onCancelar} disabled={guardando}>Cancelar</Boton>
      <Boton type="submit" icono={icono} cargando={guardando}>{texto}</Boton>
    </div>
  );

  return (
    <div className="pi-ayudante-container">
      <EncabezadoPagina
        titulo="Mis ayudantes"
        subtitulo="El personal de tu negocio. Son tuyos, no de un evento: acá los creás, editás y asignás a tus puestos."
        icono={FaUsers}
        acciones={<StatCard icon={<FaUsers />} tono="info" valor={ayudantes.length} label="Total de ayudantes" />}
      />

      <div className="pi-ayudante-action-bar">
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar por nombre o email…" />
        <Boton icono={FaPlus} onClick={() => abrir(() => { setFormCrear(FORM_CREAR); setShowCrear(true); })}>
          Crear nuevo ayudante
        </Boton>
      </div>

      {errorAyudantes ? (
        <EstadoError onReintentar={recargarAyudantes} />
      ) : cargandoAyudantes ? (
        <EstadoCarga filas={4} />
      ) : ayudantesFiltrados.length === 0 ? (
        busqueda
          ? <EstadoVacio compacto icono={FaSearch} titulo="Ningún ayudante coincide con la búsqueda" />
          : (
            <EstadoVacio
              icono={FaUsers}
              titulo="Aún no tenés ayudantes"
              mensaje="Creá a tu personal para que pueda cobrar en tus puestos."
              accion={<Boton icono={FaPlus} onClick={() => abrir(() => { setFormCrear(FORM_CREAR); setShowCrear(true); })}>Crear nuevo ayudante</Boton>}
            />
          )
      ) : (
        <Tabla
          card
          columnas={['Ayudante', 'Puestos', { texto: 'Acciones', align: 'center' }]}
          datos={ayudantesFiltrados}
          renderFila={a => {
            const eventos = [...new Set(a.asignaciones.map(x => x.eventoNombre).filter(Boolean))];
            return (
              <tr key={a.id}>
                <td>
                  <div className="item-info">
                    {a.foto ? (
                      <img width="40" height="40" src={a.foto} alt="" className="item-img item-img--avatar" />
                    ) : (
                      <div className="item-no-img item-img--avatar"><FaUserTie aria-hidden="true" /></div>
                    )}
                    <div>
                      <div className="fila-nombre">{a.nombre}</div>
                      <div className="celda-normal">{a.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {a.asignaciones.length === 0 ? (
                    <Insignia tono="warn" punto>Sin asignar</Insignia>
                  ) : a.asignaciones.length === 1 ? (
                    <Insignia tono="info" icono={FaMapMarkerAlt}>
                      {a.asignaciones[0].puestoNombre}
                      {a.asignaciones[0].eventoNombre ? ` · ${a.asignaciones[0].eventoNombre}` : ''}
                    </Insignia>
                  ) : (
                    <Insignia tono="info" icono={FaMapMarkerAlt}>
                      {a.asignaciones.length} puestos
                      {eventos.length > 0 && ` · ${eventos.length === 1 ? eventos[0] : `${eventos.length} eventos`}`}
                    </Insignia>
                  )}
                </td>
                <td>
                  <div className="btn-acciones">
                    <Boton variante="secundario" tamano="sm" icono={FaMapMarkerAlt} onClick={() => abrir(() => setAsignandoId(a.id))} title="Asignar a puestos">Puestos</Boton>
                    <Boton variante="secundario" tamano="sm" icono={FaPen} onClick={() => abrirEditar(a)} title="Editar nombre / foto">Editar</Boton>
                    <Boton variante="secundario" tamano="sm" icono={FaKey} onClick={() => abrir(() => { setReseteandoId(a.id); setPassNueva(''); })} title="Cambiar la contraseña">Contraseña</Boton>
                    <Boton variante="peligro-suave" tamano="sm" icono={FaUnlink} onClick={() => desvincular(a)} title="Desvincular del negocio">Desvincular</Boton>
                  </div>
                </td>
              </tr>
            );
          }}
        />
      )}

      {/* CREAR */}
      {showCrear && (
        <Modal titulo={<><FaUserTie aria-hidden="true" /> Registrar nuevo ayudante</>} onCerrar={() => setShowCrear(false)}>
          <form onSubmit={crearAyudante} className="formulario" noValidate>
            <Campo
              id="ma-nombre" etiqueta="Nombre completo" icono={FaUserTie} autoComplete="name" placeholder="Ej: Juan Pérez"
              value={formCrear.nombre} onChange={(e) => setFormCrear(f => ({ ...f, nombre: e.target.value }))}
              error={erroresCrear['ma-nombre']}
            />
            <Campo
              id="ma-email" etiqueta="Correo electrónico" icono={FaEnvelope} type="email" autoComplete="email" placeholder="Ej: juan.perez@email.com"
              value={formCrear.email} onChange={(e) => setFormCrear(f => ({ ...f, email: e.target.value }))}
              error={erroresCrear['ma-email']}
            />
            <Campo
              id="ma-pass" etiqueta="Contraseña temporal" contrasena autoComplete="new-password"
              placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`}
              ayuda="Se la das al ayudante; al entrar la va a tener que cambiar."
              value={formCrear.password} onChange={(e) => setFormCrear(f => ({ ...f, password: e.target.value }))}
              error={erroresCrear['ma-pass']}
            />

            <fieldset className="input-group input-group--fieldset">
              <legend className="input-group__etiqueta"><FaMapMarkerAlt aria-hidden="true" /> Puestos (opcional)</legend>
              <SelectorPuestos
                grupos={puestosPorEvento}
                estaSeleccionado={(id) => formCrear.puestosAsignados.includes(id)}
                onToggle={(p) => setFormCrear(f => ({
                  ...f,
                  puestosAsignados: f.puestosAsignados.includes(p.id)
                    ? f.puestosAsignados.filter(x => x !== p.id)
                    : [...f.puestosAsignados, p.id],
                }))}
              />
            </fieldset>

            <SubirImagen
              id="ma-foto" etiqueta="Foto de perfil (opcional)" carpeta="perfiles" texto="Hacé clic para subir una foto" avatar
              valor={formCrear.foto} onCambio={(url) => setFormCrear(f => ({ ...f, foto: url }))}
            />
            {err && <AvisoFijo tono="error">{err}</AvisoFijo>}
            {pieModal(() => setShowCrear(false), 'Crear ayudante')}
          </form>
        </Modal>
      )}

      {/* EDITAR */}
      {editandoId && (
        <Modal titulo={<><FaPen aria-hidden="true" /> Editar ayudante</>} onCerrar={() => setEditandoId(null)}>
          <form onSubmit={guardarEdicion} className="formulario" noValidate>
            <Campo
              id="me-nombre" etiqueta="Nombre completo" icono={FaUserTie}
              value={formEditar.nombre} onChange={(e) => setFormEditar(f => ({ ...f, nombre: e.target.value }))}
              error={erroresEditar['me-nombre']}
            />
            <SubirImagen
              id="me-foto" etiqueta="Foto de perfil" carpeta="perfiles" texto="Subir una foto" avatar
              valor={formEditar.foto} onCambio={(url) => setFormEditar(f => ({ ...f, foto: url }))}
            />
            {err && <AvisoFijo tono="error">{err}</AvisoFijo>}
            {pieModal(() => setEditandoId(null), 'Guardar')}
          </form>
        </Modal>
      )}

      {/* CAMBIAR CONTRASEÑA */}
      {reseteando && (
        <Modal titulo={<><FaKey aria-hidden="true" /> Cambiar contraseña: {reseteando.nombre}</>} onCerrar={() => setReseteandoId(null)}>
          <form onSubmit={confirmarReset} className="formulario" noValidate>
            <p className="texto-ayuda">Se le pone una contraseña temporal. Al entrar, el ayudante deberá cambiarla.</p>
            <Campo
              id="mr-pass" etiqueta="Nueva contraseña temporal" contrasena autoComplete="new-password"
              placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`} autoFocus
              value={passNueva} onChange={(e) => setPassNueva(e.target.value)}
              error={erroresReset['mr-pass']}
            />
            {err && <AvisoFijo tono="error">{err}</AvisoFijo>}
            {pieModal(() => setReseteandoId(null), 'Cambiar contraseña', FaKey)}
          </form>
        </Modal>
      )}

      {/* ASIGNAR A PUESTOS */}
      {asignando && (
        <Modal titulo={<><FaMapMarkerAlt aria-hidden="true" /> Asignar puestos: {asignando.nombre}</>} onCerrar={() => setAsignandoId(null)}>
          <div className="formulario">
            <p className="texto-ayuda">Marcá en qué puestos puede trabajar. Se guarda al instante.</p>
            <SelectorPuestos
              grupos={puestosPorEvento}
              defaultOpen
              estaSeleccionado={(id) => asignando.asignaciones.some(x => x.puestoId === id)}
              onToggle={togglePuesto}
            />
            {err && <AvisoFijo tono="error">{err}</AvisoFijo>}
            <div className="modal-actions">
              <Boton icono={FaCheck} onClick={() => setAsignandoId(null)}>Listo</Boton>
            </div>
          </div>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
