import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import Migas from '../../components/Migas.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaPlus, FaTimes, FaImage, FaUpload, FaBoxOpen,
  FaDollarSign, FaHamburger, FaPen, FaArchive, FaTrash, FaSave, FaCalendarAlt,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import './UsuarioNegocio.css';
import './MiCatalogo.css';

const FORM_PRODUCTO = { nombre: '', precio: '', imagen: '', categoria: '' };
const FORM_PUESTO = { nombre: '', descripcion: '', logo: '' };
const CATEGORIAS_PRODUCTO = ['Bebida', 'Comida', 'Postre', 'Snack', 'Otro'];

export default function MiCatalogoPuesto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const cargar = useCallback(() => api.puestosBase.obtener(id), [id]);
  const {
    data: puesto,
    setData: setPuesto,
    cargando,
    error,
    recargar,
  } = useApi(cargar, { inicial: null });

  useTituloPagina(puesto ? `Catálogo · ${puesto.nombre}` : 'Catálogo');

  const [showAgregar, setShowAgregar] = useState(false);
  const [formProducto, setFormProducto] = useState(FORM_PRODUCTO);
  const [prodEditandoId, setProdEditandoId] = useState(null);
  const [formProdEditar, setFormProdEditar] = useState(FORM_PRODUCTO);
  const [showEditarPuesto, setShowEditarPuesto] = useState(false);
  const [formPuesto, setFormPuesto] = useState(FORM_PUESTO);
  const [err, setErr] = useState('');

  const setProductos = (productos) => setPuesto(p => (p ? { ...p, productos } : p));

  // ---------- AÑADIR PRODUCTO (botón → modal) ----------
  const abrirAgregar = () => { setFormProducto(FORM_PRODUCTO); setErr(''); setShowAgregar(true); };

  const subirFotoProducto = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'productos');
      setFormProducto(f => ({ ...f, imagen: url }));
    } catch (e2) { setErr(e2.message); }
  };

  const agregarProducto = async (e) => {
    e.preventDefault();
    if (!formProducto.nombre || formProducto.precio === '') return;
    setErr('');
    try {
      const nuevo = await api.puestosBase.crearProducto(id, {
        nombre: formProducto.nombre,
        precio: parseFloat(formProducto.precio),
        imagen: formProducto.imagen || null,
        categoria: formProducto.categoria || null,
      });
      setProductos([...(puesto.productos || []), nuevo]);
      setShowAgregar(false);
    } catch (e2) { setErr(e2.message); }
  };

  // ---------- EDITAR / BORRAR PRODUCTO ----------
  const abrirEditarProducto = (pr) => {
    setProdEditandoId(pr.id);
    setFormProdEditar({
      nombre: pr.nombre,
      precio: String(Number(pr.precio)),
      imagen: pr.imagen || '',
      categoria: pr.categoria || '',
    });
    setErr('');
  };

  const subirFotoProdEditar = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'productos');
      setFormProdEditar(f => ({ ...f, imagen: url }));
    } catch (e2) { setErr(e2.message); }
  };

  const guardarEdicionProducto = async (e) => {
    e.preventDefault();
    if (!formProdEditar.nombre || formProdEditar.precio === '') return;
    setErr('');
    try {
      const actualizado = await api.puestosBase.actualizarProducto(prodEditandoId, {
        nombre: formProdEditar.nombre,
        precio: parseFloat(formProdEditar.precio),
        imagen: formProdEditar.imagen || null,
        categoria: formProdEditar.categoria || null,
      });
      setProductos(puesto.productos.map(pr => pr.id === prodEditandoId ? { ...pr, ...actualizado } : pr));
      setProdEditandoId(null);
    } catch (e2) { setErr(e2.message); }
  };

  const eliminarProducto = async (pr) => {
    const ok = await confirmar({
      titulo: `¿Eliminar "${pr.nombre}"?`,
      mensaje: 'Si ya se vendió alguna vez, se archiva (no se borra) para conservar el historial.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.puestosBase.eliminarProducto(pr.id);
      setProductos(puesto.productos.filter(x => x.id !== pr.id));
    } catch (e2) { setErr(e2.message); }
  };

  // ---------- EDITAR / ARCHIVAR PUESTO ----------
  const abrirEditarPuesto = () => {
    setFormPuesto({ nombre: puesto.nombre, descripcion: puesto.descripcion || '', logo: puesto.logo || '' });
    setErr('');
    setShowEditarPuesto(true);
  };

  const subirLogo = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'puestos');
      setFormPuesto(f => ({ ...f, logo: url }));
    } catch (e2) { setErr(e2.message); }
  };

  const guardarPuesto = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api.puestosBase.actualizar(id, {
        nombre: formPuesto.nombre,
        descripcion: formPuesto.descripcion || null,
        logo: formPuesto.logo || null,
      });
      await recargar();
      setShowEditarPuesto(false);
    } catch (e2) { setErr(e2.message); }
  };

  const archivarPuesto = async () => {
    const ok = await confirmar({
      titulo: `¿Archivar "${puesto.nombre}"?`,
      mensaje: 'Dejará de aparecer en tu catálogo y no podrás activarlo en nuevos eventos. Los eventos donde ya está activado y sus ventas no se tocan.',
      textoConfirmar: 'Archivar',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.puestosBase.archivar(id);
      navigate('/usuarionegocio/catalogo');
    } catch (e2) { setErr(e2.message); }
  };

  const volverAlCatalogo = () => navigate('/usuarionegocio/catalogo');
  const migas = [
    { texto: 'Mi Catálogo', to: '/usuarionegocio/catalogo' },
    { texto: puesto?.nombre || 'Puesto', actual: true },
  ];

  if (error) {
    return (
      <div className="pi-unegocio-container">
        <BotonVolver onClick={volverAlCatalogo}>Volver a Mi Catálogo</BotonVolver>
        <Migas items={migas} />
        <EstadoError onReintentar={recargar} />
      </div>
    );
  }
  if (cargando || !puesto) {
    return (
      <div className="pi-unegocio-container">
        <BotonVolver onClick={volverAlCatalogo}>Volver a Mi Catálogo</BotonVolver>
        <Migas items={migas} />
        <EstadoCarga filas={4} />
      </div>
    );
  }

  return (
    <div className="pi-unegocio-container">
      <BotonVolver onClick={volverAlCatalogo}>Volver a Mi Catálogo</BotonVolver>
      <Migas items={migas} />

      <div className="pi-unegocio-header-wrapper">
        <div className="pi-mcat-detalle-head">
          <div
            className="pi-mcat-detalle-media"
            style={puesto.logo ? { backgroundImage: `url(${puesto.logo})` } : undefined}
          >
            {!puesto.logo && <FaStore aria-hidden="true" />}
          </div>
          <div>
            <h1>{puesto.nombre}</h1>
            {puesto.descripcion && <p>{puesto.descripcion}</p>}
            <div className="pi-mcat-card__chips" style={{ marginTop: 6 }}>
              <span className="pi-mcat-card__chip"><FaBoxOpen aria-hidden="true" /> {puesto.productos.length} producto{puesto.productos.length === 1 ? '' : 's'}</span>
              <span className="pi-mcat-card__chip"><FaCalendarAlt aria-hidden="true" /> activo en {puesto._count?.puestos ?? 0} evento{(puesto._count?.puestos ?? 0) === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>

        <div className="pi-mcat-detalle-acciones">
          <button type="button" className="btn-secundario-sm" onClick={abrirEditarPuesto}>
            <FaPen /> Editar puesto
          </button>
          <button type="button" className="btn-secundario-sm pi-mcat-danger" onClick={archivarPuesto}>
            <FaArchive /> Archivar
          </button>
        </div>
      </div>

      {err && !showEditarPuesto && !prodEditandoId && !showAgregar && (
        <p className="pi-unegocio-nota" style={{ color: 'var(--rojo-error-texto)' }}>{err}</p>
      )}

      <div className="pi-mcat-prod-bar">
        <h2><FaBoxOpen aria-hidden="true" /> Productos del catálogo</h2>
        <button type="button" className="btn-primario" onClick={abrirAgregar}>
          <FaPlus /> Añadir producto
        </button>
      </div>

      {puesto.productos.length === 0 ? (
        <p className="tabla-vacia">Todavía no hay productos en este puesto. Agregá el primero con “Añadir producto”.</p>
      ) : (
        <div className="pi-mcat-prod-grid">
          {puesto.productos.map(pr => (
            <div key={pr.id} className="pi-mcat-prod-card">
              <div
                className="pi-mcat-prod-card__media"
                style={pr.imagen ? { backgroundImage: `url(${pr.imagen})` } : undefined}
              >
                {!pr.imagen && <FaHamburger aria-hidden="true" />}
              </div>
              <div className="pi-mcat-prod-card__body">
                <span className="pi-mcat-prod-card__nombre">{pr.nombre}</span>
                <span className="pi-mcat-prod-card__cat">{pr.categoria || 'Sin categoría'}</span>
                <span className="pi-mcat-prod-card__precio">Bs. {Number(pr.precio).toFixed(2)}</span>
              </div>
              <div className="pi-mcat-prod-card__acciones">
                <button type="button" onClick={() => abrirEditarProducto(pr)}>
                  <FaPen aria-hidden="true" /> Editar
                </button>
                <button type="button" className="pi-mcat-danger" onClick={() => eliminarProducto(pr)}>
                  <FaTrash aria-hidden="true" /> Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AÑADIR PRODUCTO */}
      {showAgregar && (
        <Modal
          titulo={<><FaPlus color="var(--indigo-profundo)" aria-hidden="true" /> Añadir producto</>}
          onCerrar={() => setShowAgregar(false)}
        >
          <div className="modal-body">
            <form onSubmit={agregarProducto} className="formulario">
              <div className="input-group">
                <label htmlFor="mcp-ag-nombre">Nombre del producto</label>
                <input id="mcp-ag-nombre" type="text" value={formProducto.nombre} onChange={(e) => setFormProducto(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Hamburguesa simple" required />
              </div>
              <div className="input-group">
                <label htmlFor="mcp-ag-precio">Precio base (Bs.)</label>
                <div className="input-monto-wrapper">
                  <FaDollarSign className="icon-monto" />
                  <input id="mcp-ag-precio" type="number" step="0.50" min="0" value={formProducto.precio} onChange={(e) => setFormProducto(f => ({ ...f, precio: e.target.value }))} placeholder="0.00" className="input-monto" required />
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="mcp-ag-cat">Categoría (opcional)</label>
                <input id="mcp-ag-cat" type="text" list="mcp-cat-productos" value={formProducto.categoria} onChange={(e) => setFormProducto(f => ({ ...f, categoria: e.target.value }))} placeholder="Bebida, Comida…" />
                <datalist id="mcp-cat-productos">
                  {CATEGORIAS_PRODUCTO.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="input-group">
                <label><FaImage aria-hidden="true" /> Foto (opcional)</label>
                {!formProducto.imagen ? (
                  <label className="btn-upload-small">
                    <FaUpload /> Subir foto
                    <input type="file" accept="image/*" onChange={subirFotoProducto} hidden />
                  </label>
                ) : (
                  <div className="preview-small">
                    <img width="400" height="225" src={formProducto.imagen} alt="Preview" />
                    <button type="button" onClick={() => setFormProducto(f => ({ ...f, imagen: '' }))} title="Quitar foto"><FaTimes /></button>
                  </div>
                )}
              </div>
              {err && <p className="pi-unegocio-nota" style={{ color: 'var(--rojo-error-texto)' }}>{err}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setShowAgregar(false)}>Cancelar</button>
                <button type="submit" className="btn-primario"><FaPlus /> Añadir</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* EDITAR UN PRODUCTO */}
      {prodEditandoId && (
        <Modal
          titulo={<><FaPen color="var(--indigo-profundo)" aria-hidden="true" /> Editar producto</>}
          onCerrar={() => setProdEditandoId(null)}
        >
          <div className="modal-body">
            <form onSubmit={guardarEdicionProducto} className="formulario">
              <div className="input-group">
                <label htmlFor="mcp-ed-nombre">Nombre del producto</label>
                <input id="mcp-ed-nombre" type="text" value={formProdEditar.nombre} onChange={(e) => setFormProdEditar(f => ({ ...f, nombre: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label htmlFor="mcp-ed-precio">Precio base (Bs.)</label>
                <div className="input-monto-wrapper">
                  <FaDollarSign className="icon-monto" />
                  <input id="mcp-ed-precio" type="number" step="0.50" min="0" value={formProdEditar.precio} onChange={(e) => setFormProdEditar(f => ({ ...f, precio: e.target.value }))} className="input-monto" required />
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="mcp-ed-cat">Categoría (opcional)</label>
                <input id="mcp-ed-cat" type="text" list="mcp-cat-productos" value={formProdEditar.categoria} onChange={(e) => setFormProdEditar(f => ({ ...f, categoria: e.target.value }))} placeholder="Bebida, Comida…" />
              </div>
              <div className="input-group">
                <label><FaImage aria-hidden="true" /> Foto (opcional)</label>
                {!formProdEditar.imagen ? (
                  <label className="btn-upload-small">
                    <FaUpload /> Subir foto
                    <input type="file" accept="image/*" onChange={subirFotoProdEditar} hidden />
                  </label>
                ) : (
                  <div className="preview-small">
                    <img width="400" height="225" src={formProdEditar.imagen} alt="Preview" />
                    <button type="button" onClick={() => setFormProdEditar(f => ({ ...f, imagen: '' }))} title="Quitar foto"><FaTimes /></button>
                  </div>
                )}
              </div>
              {err && <p className="pi-unegocio-nota" style={{ color: 'var(--rojo-error-texto)' }}>{err}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setProdEditandoId(null)}>Cancelar</button>
                <button type="submit" className="btn-primario"><FaSave /> Guardar cambios</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* EDITAR EL PUESTO */}
      {showEditarPuesto && (
        <Modal
          titulo={<><FaStore color="var(--indigo-profundo)" aria-hidden="true" /> Editar puesto base</>}
          onCerrar={() => setShowEditarPuesto(false)}
        >
          <div className="modal-body">
            <form onSubmit={guardarPuesto} className="formulario">
              <div className="input-group">
                <label htmlFor="mcp-nombre">Nombre del puesto</label>
                <input id="mcp-nombre" type="text" value={formPuesto.nombre} onChange={(e) => setFormPuesto(f => ({ ...f, nombre: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label htmlFor="mcp-desc">Breve descripción</label>
                <input id="mcp-desc" type="text" value={formPuesto.descripcion} onChange={(e) => setFormPuesto(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <div className="input-group">
                <label htmlFor="mcp-logo"><FaImage aria-hidden="true" /> Logo o foto del puesto (opcional)</label>
                {!formPuesto.logo ? (
                  <div className="upload-zone">
                    <FaUpload className="upload-icon" />
                    <span className="upload-text">Haz clic para subir el logo</span>
                    <span className="upload-subtext">PNG, JPG hasta 2MB</span>
                    <input id="mcp-logo" type="file" accept="image/*" onChange={subirLogo} className="upload-input-hidden" />
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
                <button type="button" className="btn-cancelar" onClick={() => setShowEditarPuesto(false)}>Cancelar</button>
                <button type="submit" className="btn-primario"><FaSave /> Guardar cambios</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
