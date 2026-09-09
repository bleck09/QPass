import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import Migas from '../../components/Migas.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaPlus, FaTimes, FaImage, FaUpload, FaListUl, FaBoxOpen,
  FaPen, FaArchive, FaSave, FaCalendarAlt,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import './UsuarioNegocio.css';
import './MiCatalogo.css';

const FORM_PUESTO = { nombre: '', descripcion: '', logo: '' };

export default function MiCatalogo() {
  useTituloPagina('Mi catálogo');
  const navigate = useNavigate();
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const cargar = useCallback(() => api.puestosBase.listar(), []);
  const {
    data: puestosBase,
    setData: setPuestosBase,
    cargando,
    error,
    recargar,
  } = useApi(cargar, { inicial: [] });

  const [busqueda, setBusqueda] = useState('');
  const [showPuesto, setShowPuesto] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // null = crear
  const [formPuesto, setFormPuesto] = useState(FORM_PUESTO);
  const [err, setErr] = useState('');

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return puestosBase;
    return puestosBase.filter(p => p.nombre.toLowerCase().includes(q));
  }, [puestosBase, busqueda]);

  const verCatalogo = (p) => navigate(`/usuarionegocio/catalogo/${p.id}`);

  // ---------- CREAR / EDITAR PUESTO BASE (pocos campos → modal) ----------
  const subirLogo = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'puestos');
      setFormPuesto(f => ({ ...f, logo: url }));
    } catch (e2) { setErr(e2.message); }
  };

  const abrirCrear = () => { setEditandoId(null); setFormPuesto(FORM_PUESTO); setErr(''); setShowPuesto(true); };
  const abrirEditar = (p) => {
    setEditandoId(p.id);
    setFormPuesto({ nombre: p.nombre, descripcion: p.descripcion || '', logo: p.logo || '' });
    setErr('');
    setShowPuesto(true);
  };

  const guardarPuesto = async (e) => {
    e.preventDefault();
    setErr('');
    const datos = {
      nombre: formPuesto.nombre,
      descripcion: formPuesto.descripcion || null,
      logo: formPuesto.logo || null,
    };
    try {
      if (editandoId) await api.puestosBase.actualizar(editandoId, datos);
      else await api.puestosBase.crear(datos);
      await recargar();
      setShowPuesto(false);
    } catch (e2) { setErr(e2.message); }
  };

  const archivarPuesto = async (p) => {
    const ok = await confirmar({
      titulo: `¿Archivar "${p.nombre}"?`,
      mensaje: 'Dejará de aparecer en tu catálogo y no podrás activarlo en nuevos eventos. Los eventos donde ya está activado y sus ventas no se tocan.',
      textoConfirmar: 'Archivar',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.puestosBase.archivar(p.id);
      setPuestosBase(prev => prev.filter(x => x.id !== p.id));
    } catch (e2) { setErr(e2.message); }
  };

  return (
    <div className="pi-unegocio-container">
      <Migas items={[{ texto: 'Mi Catálogo', actual: true }]} />
      <div className="pi-unegocio-header-wrapper">
        <div className="pi-unegocio-header">
          <h1>Mi catálogo</h1>
          <p>Definí tus puestos y sus productos una sola vez. Después los activás en cada evento sin volver a cargarlos.</p>
        </div>
        <div className="pi-unegocio-kpi">
          <span className="micro-etiqueta">Puestos en catálogo</span>
          <div className="kpi-valor">
            <FaStore className="kpi-icon" />
            <span className="numero-grande">{puestosBase.length}</span>
          </div>
        </div>
      </div>

      <div className="pi-unegocio-action-bar">
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar puesto por nombre…" />
        <button type="button" className="btn-primario" onClick={abrirCrear}>
          <FaPlus /> Nuevo puesto base
        </button>
      </div>

      {err && !showPuesto && (
        <p className="pi-unegocio-nota" style={{ color: 'var(--rojo-error-texto)' }}>{err}</p>
      )}

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando ? (
        <EstadoCarga filas={4} />
      ) : filtrados.length === 0 ? (
        <p className="tabla-vacia">
          {busqueda ? 'No se encontraron puestos.' : 'Aún no tenés puestos en tu catálogo. Creá el primero con “Nuevo puesto base”.'}
        </p>
      ) : (
        <div className="pi-mcat-grid">
          {filtrados.map(p => (
            <div
              key={p.id}
              className="pi-mcat-card"
              role="button"
              tabIndex={0}
              onClick={() => verCatalogo(p)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); verCatalogo(p); } }}
            >
              <div
                className="pi-mcat-card__media"
                style={p.logo ? { backgroundImage: `url(${p.logo})` } : undefined}
              >
                {!p.logo && <FaStore aria-hidden="true" />}
                {p.archivado && <span className="pi-mcat-card__archivada-tag">Archivado</span>}
              </div>

              <div className="pi-mcat-card__body">
                <span className="pi-mcat-card__nombre">{p.nombre}</span>
                {p.descripcion && <span className="pi-mcat-card__desc">{p.descripcion}</span>}
                <div className="pi-mcat-card__chips">
                  <span className="pi-mcat-card__chip"><FaBoxOpen aria-hidden="true" /> {p.productos.length} producto{p.productos.length === 1 ? '' : 's'}</span>
                  <span className="pi-mcat-card__chip"><FaCalendarAlt aria-hidden="true" /> {p._count?.puestos ?? 0} evento{(p._count?.puestos ?? 0) === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div className="pi-mcat-card__acciones">
                <button
                  type="button"
                  className="pi-mcat-flex-1"
                  onClick={(e) => { e.stopPropagation(); verCatalogo(p); }}
                >
                  <FaListUl aria-hidden="true" /> Ver catálogo
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); abrirEditar(p); }}
                  aria-label={`Editar ${p.nombre}`}
                  title="Editar nombre / foto"
                >
                  <FaPen aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="pi-mcat-danger"
                  onClick={(e) => { e.stopPropagation(); archivarPuesto(p); }}
                  aria-label={`Archivar ${p.nombre}`}
                  title="Archivar puesto"
                >
                  <FaArchive aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREAR / EDITAR PUESTO BASE */}
      {showPuesto && (
        <Modal
          titulo={<><FaStore color="var(--indigo-profundo)" aria-hidden="true" /> {editandoId ? 'Editar puesto base' : 'Nuevo puesto base'}</>}
          onCerrar={() => setShowPuesto(false)}
        >
          <div className="modal-body">
            <form onSubmit={guardarPuesto} className="formulario">
              <div className="input-group">
                <label htmlFor="mc-nombre">Nombre del puesto</label>
                <input id="mc-nombre" type="text" value={formPuesto.nombre} onChange={(e) => setFormPuesto(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Pollos Doña María" required />
              </div>
              <div className="input-group">
                <label htmlFor="mc-desc">Breve descripción</label>
                <input id="mc-desc" type="text" value={formPuesto.descripcion} onChange={(e) => setFormPuesto(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Comida rápida y gaseosas" />
              </div>
              <div className="input-group">
                <label htmlFor="mc-logo"><FaImage aria-hidden="true" /> Logo o foto del puesto (opcional)</label>
                {!formPuesto.logo ? (
                  <div className="upload-zone">
                    <FaUpload className="upload-icon" />
                    <span className="upload-text">Haz clic para subir el logo</span>
                    <span className="upload-subtext">PNG, JPG hasta 2MB</span>
                    <input id="mc-logo" type="file" accept="image/*" onChange={subirLogo} className="upload-input-hidden" />
                  </div>
                ) : (
                  <div className="preview-zone">
                    <img width="200" height="200" src={formPuesto.logo} alt="Vista previa" className="img-preview" />
                    <button type="button" className="btn-quitar-imagen" onClick={() => setFormPuesto(f => ({ ...f, logo: '' }))}><FaTimes /> Quitar imagen</button>
                  </div>
                )}
              </div>
              {err && <p className="pi-unegocio-nota" style={{ color: 'var(--rojo-error-texto)' }}>{err}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setShowPuesto(false)}>Cancelar</button>
                <button type="submit" className="btn-primario"><FaSave /> {editandoId ? 'Guardar cambios' : 'Crear puesto'}</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
