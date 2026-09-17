import { useCallback, useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaPlus, FaTimes, FaImage, FaUsers, FaUpload, FaCheckSquare,
  FaUserTie, FaEnvelope, FaLock, FaSave, FaSquare, FaMapMarkerAlt,
  FaPen, FaKey, FaUnlink,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import { ROLES } from '../../constants/roles.js';
import './UsuNegoCreaAyudante.css';
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

  if (!grupos.length) return <p className="tabla-vacia">No tenés puestos todavía.</p>;

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
        <FaMapMarkerAlt aria-hidden="true" /> <span className="btn-acciones__texto">Puestos</span>
        <span className="celda-secundaria">· {nSel} de {total} seleccionados</span>
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
  const [err, setErr] = useState('');

  const asignando = ayudantes.find(a => a.id === asignandoId) || null;
  const reseteando = ayudantes.find(a => a.id === reseteandoId) || null;

  const ayudantesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return ayudantes;
    return ayudantes.filter(a => a.nombre.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [ayudantes, busqueda]);

  // ---------- CREAR ----------
  const subirFoto = async (e, setForm) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'perfiles');
      setForm(f => ({ ...f, foto: url }));
    } catch (e2) { setErr(e2.message); }
  };

  const crearAyudante = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const nuevo = await api.auth.registro({
        rol: ROLES.AYUDANTE, nombre: formCrear.nombre, email: formCrear.email,
        password: formCrear.password, foto: formCrear.foto || undefined,
      });
      await Promise.all(formCrear.puestosAsignados.map(puestoId =>
        api.puestoAyudantes.asignar({ puestoId, ayudanteId: nuevo.id })
      ));
      await recargarAyudantes();
      setShowCrear(false);
      setFormCrear(FORM_CREAR);
    } catch (e2) { setErr(e2.message); }
  };

  // ---------- EDITAR ----------
  const abrirEditar = (a) => {
    setEditandoId(a.id);
    setFormEditar({ nombre: a.nombre, foto: a.foto || '' });
    setErr('');
  };
  const guardarEdicion = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api.puestoAyudantes.editarAyudante(editandoId, {
        nombre: formEditar.nombre,
        foto: formEditar.foto || null,
      });
      await recargarAyudantes();
      setEditandoId(null);
    } catch (e2) { setErr(e2.message); }
  };

  // ---------- RESET PASSWORD ----------
  const confirmarReset = async (e) => {
    e.preventDefault();
    if (passNueva.trim().length < 6) { setErr('La contraseña debe tener al menos 6 caracteres.'); return; }
    setErr('');
    try {
      await api.puestoAyudantes.resetPassword(reseteandoId, { passwordNueva: passNueva.trim() });
      setReseteandoId(null);
      setPassNueva('');
    } catch (e2) { setErr(e2.message); }
  };

  // ---------- ASIGNAR A PUESTOS ----------
  const togglePuesto = async (puesto) => {
    const existente = asignando.asignaciones.find(x => x.puestoId === puesto.id);
    try {
      if (existente) await api.puestoAyudantes.quitar(existente.id);
      else await api.puestoAyudantes.asignar({ puestoId: puesto.id, ayudanteId: asignando.id });
      await recargarAyudantes();
    } catch (e2) { setErr(e2.message); }
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
    } catch (e2) { setErr(e2.message); }
  };

  return (
    <div className="pi-ayudante-container">
      <div className="pi-ayudante-header-wrapper">
        <div className="pi-ayudante-header">
          <h1>Mis ayudantes</h1>
          <p>El personal de tu negocio. Son tuyos, no de un evento: acá los creás, editás y asignás a tus puestos.</p>
        </div>
        <div className="pi-ayudante-kpi">
          <span className="micro-etiqueta">Total de Ayudantes</span>
          <div className="kpi-valor">
            <FaUsers className="kpi-icon" />
            <span className="numero-grande">{ayudantes.length}</span>
          </div>
        </div>
      </div>

      <div className="pi-ayudante-action-bar">
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar por nombre o email…" />
        <button type="button" className="btn-primario" onClick={() => { setFormCrear(FORM_CREAR); setShowCrear(true); setErr(''); }}>
          <FaPlus /> Crear Nuevo Ayudante
        </button>
      </div>

      {err && !showCrear && !editandoId && !reseteandoId && (
        <p className="pi-ayudante-nota pi-ayudante-nota--error">{err}</p>
      )}

      {errorAyudantes ? (
        <EstadoError onReintentar={recargarAyudantes} />
      ) : cargandoAyudantes ? (
        <EstadoCarga filas={4} />
      ) : (
        <div className="pi-ayudante-card">
          <Tabla
            columnas={['Ayudante', 'Puestos', { texto: 'Acciones', align: 'center' }]}
            datos={ayudantesFiltrados}
            vacio={busqueda ? 'No se encontraron ayudantes.' : 'Aún no tenés ayudantes.'}
            renderFila={a => {
              const eventos = [...new Set(a.asignaciones.map(x => x.eventoNombre).filter(Boolean))];
              return (
              <tr key={a.id}>
                <td>
                  <div className="item-info">
                    {a.foto ? (
                      <img width="48" height="48" src={a.foto} alt={a.nombre} className="item-img" />
                    ) : (
                      <div className="item-no-img"><FaUserTie /></div>
                    )}
                    <div>
                      <div className="fila-nombre">{a.nombre}</div>
                      <div className="celda-normal">{a.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {a.asignaciones.length === 0 ? (
                    <span className="badge-sin-puesto">Sin asignar</span>
                  ) : a.asignaciones.length === 1 ? (
                    <span className="badge-puesto" title={a.asignaciones[0].eventoNombre}>
                      {a.asignaciones[0].puestoNombre}
                      {a.asignaciones[0].eventoNombre ? <em> · {a.asignaciones[0].eventoNombre}</em> : null}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="badge-puesto badge-puesto--btn"
                      onClick={() => { setAsignandoId(a.id); setErr(''); }}
                      title="Ver / editar puestos"
                    >
                      <FaMapMarkerAlt aria-hidden="true" /> {a.asignaciones.length} puestos
                      {eventos.length > 0 && (
                        <em> · {eventos.length === 1 ? eventos[0] : `${eventos.length} eventos`}</em>
                      )}
                    </button>
                  )}
                </td>
                <td>
                  <div className="btn-acciones">
                    <button type="button" className="btn-secundario-sm" onClick={() => { setAsignandoId(a.id); setErr(''); }} title="Asignar a puestos">
                      <FaMapMarkerAlt aria-hidden="true" /> <span className="btn-acciones__texto">Puestos</span>
                    </button>
                    <button type="button" className="btn-secundario-sm" onClick={() => abrirEditar(a)} title="Editar nombre / foto">
                      <FaPen aria-hidden="true" /> <span className="btn-acciones__texto">Editar</span>
                    </button>
                    <button type="button" className="btn-secundario-sm" onClick={() => { setReseteandoId(a.id); setPassNueva(''); setErr(''); }} title="Resetear contraseña">
                      <FaKey aria-hidden="true" /> <span className="btn-acciones__texto">Contraseña</span>
                    </button>
                    <button type="button" className="btn-secundario-sm btn-secundario-sm--peligro" onClick={() => desvincular(a)} title="Desvincular del negocio">
                      <FaUnlink aria-hidden="true" /> <span className="btn-acciones__texto">Desvincular</span>
                    </button>
                  </div>
                </td>
              </tr>
              );
            }}
          />
        </div>
      )}

      {/* CREAR */}
      {showCrear && (
        <Modal titulo={<><FaUserTie color="var(--indigo-profundo)" aria-hidden="true" /> Registrar Nuevo Ayudante</>} onCerrar={() => setShowCrear(false)}>
          <div className="pi-usr-modal-body">
            <form onSubmit={crearAyudante} className="formulario">
              <div className="input-group">
                <label htmlFor="ma-nombre"><FaUserTie aria-hidden="true" /> Nombre completo</label>
                <input id="ma-nombre" type="text" autoComplete="name" value={formCrear.nombre} onChange={(e) => setFormCrear(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Juan Pérez" required />
              </div>
              <div className="input-group">
                <label htmlFor="ma-email"><FaEnvelope aria-hidden="true" /> Correo electrónico</label>
                <input id="ma-email" type="email" autoComplete="email" value={formCrear.email} onChange={(e) => setFormCrear(f => ({ ...f, email: e.target.value }))} placeholder="Ej: juan.perez@email.com" required />
              </div>
              <div className="input-group">
                <label htmlFor="ma-pass"><FaLock aria-hidden="true" /> Contraseña temporal</label>
                <input id="ma-pass" type="text" autoComplete="new-password" value={formCrear.password} onChange={(e) => setFormCrear(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>

              <fieldset className="input-group input-group--fieldset">
                <legend><FaMapMarkerAlt aria-hidden="true" /> Puestos (opcional)</legend>
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

              <div className="input-group">
                <label htmlFor="ma-foto"><FaImage aria-hidden="true" /> Foto de perfil (opcional)</label>
                {!formCrear.foto ? (
                  <div className="upload-zone">
                    <FaUpload className="upload-icon" aria-hidden="true" />
                    <span className="upload-text">Haz clic para subir una foto</span>
                    <input id="ma-foto" type="file" accept="image/*" onChange={(e) => subirFoto(e, setFormCrear)} className="upload-input-hidden" />
                  </div>
                ) : (
                  <div className="preview-zone">
                    <img width="80" height="80" src={formCrear.foto} alt="Vista previa" className="img-preview-avatar" />
                    <button type="button" className="btn-quitar-imagen" onClick={() => setFormCrear(f => ({ ...f, foto: '' }))}><FaTimes aria-hidden="true" /> Quitar foto</button>
                  </div>
                )}
              </div>
              {err && <p className="pi-ayudante-nota pi-ayudante-nota--error">{err}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setShowCrear(false)}>Cancelar</button>
                <button type="submit" className="btn-primario"><FaSave /> Crear Ayudante</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* EDITAR */}
      {editandoId && (
        <Modal titulo={<><FaPen color="var(--indigo-profundo)" aria-hidden="true" /> Editar ayudante</>} onCerrar={() => setEditandoId(null)}>
          <div className="pi-usr-modal-body">
            <form onSubmit={guardarEdicion} className="formulario">
              <div className="input-group">
                <label htmlFor="me-nombre"><FaUserTie aria-hidden="true" /> Nombre completo</label>
                <input id="me-nombre" type="text" value={formEditar.nombre} onChange={(e) => setFormEditar(f => ({ ...f, nombre: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label htmlFor="me-foto"><FaImage aria-hidden="true" /> Foto de perfil</label>
                {!formEditar.foto ? (
                  <div className="upload-zone">
                    <FaUpload className="upload-icon" aria-hidden="true" />
                    <span className="upload-text">Subir una foto</span>
                    <input id="me-foto" type="file" accept="image/*" onChange={(e) => subirFoto(e, setFormEditar)} className="upload-input-hidden" />
                  </div>
                ) : (
                  <div className="preview-zone">
                    <img width="80" height="80" src={formEditar.foto} alt="Vista previa" className="img-preview-avatar" />
                    <button type="button" className="btn-quitar-imagen" onClick={() => setFormEditar(f => ({ ...f, foto: '' }))}><FaTimes aria-hidden="true" /> Quitar foto</button>
                  </div>
                )}
              </div>
              {err && <p className="pi-ayudante-nota pi-ayudante-nota--error">{err}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setEditandoId(null)}>Cancelar</button>
                <button type="submit" className="btn-primario"><FaSave /> Guardar</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* RESET PASSWORD */}
      {reseteando && (
        <Modal titulo={<><FaKey color="var(--indigo-profundo)" aria-hidden="true" /> Resetear contraseña: {reseteando.nombre}</>} onCerrar={() => setReseteandoId(null)}>
          <div className="pi-usr-modal-body">
            <form onSubmit={confirmarReset} className="formulario">
              <p className="pi-ayudante-nota">Se le pone una contraseña temporal. Al entrar, el ayudante deberá cambiarla.</p>
              <div className="input-group">
                <label htmlFor="mr-pass"><FaLock aria-hidden="true" /> Nueva contraseña temporal</label>
                <input id="mr-pass" type="text" value={passNueva} onChange={(e) => setPassNueva(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} autoFocus />
              </div>
              {err && <p className="pi-ayudante-nota pi-ayudante-nota--error">{err}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setReseteandoId(null)}>Cancelar</button>
                <button type="submit" className="btn-primario"><FaSave /> Resetear</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ASIGNAR A PUESTOS */}
      {asignando && (
        <Modal titulo={<><FaMapMarkerAlt color="var(--indigo-profundo)" aria-hidden="true" /> Asignar Puestos: {asignando.nombre}</>} onCerrar={() => setAsignandoId(null)}>
          <div className="pi-usr-modal-body">
            <p className="pi-ayudante-nota">Marcá en qué puestos puede trabajar. Se guarda al instante.</p>
            <SelectorPuestos
              grupos={puestosPorEvento}
              defaultOpen
              estaSeleccionado={(id) => asignando.asignaciones.some(x => x.puestoId === id)}
              onToggle={togglePuesto}
            />
            {err && <p className="pi-ayudante-nota pi-ayudante-nota--error">{err}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-primario" onClick={() => setAsignandoId(null)}>Listo</button>
            </div>
          </div>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
