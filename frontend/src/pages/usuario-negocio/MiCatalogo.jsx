import { useCallback, useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaPlus, FaTimes, FaImage, FaUpload, FaListUl, FaBoxOpen,
  FaDollarSign, FaHamburger, FaPen, FaArchive, FaTrash, FaSave,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import './UsuarioNegocio.css';

const FORM_PUESTO = { nombre: '', descripcion: '', logo: '' };
const FORM_PRODUCTO = { nombre: '', precio: '', imagen: '', categoria: '' };
const CATEGORIAS_PRODUCTO = ['Bebida', 'Comida', 'Postre', 'Snack', 'Otro'];

export default function MiCatalogo() {
  useTituloPagina('Mi catálogo');
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
  const [catalogoId, setCatalogoId] = useState(null);
  const [formProducto, setFormProducto] = useState(FORM_PRODUCTO);
  const [err, setErr] = useState('');

  const catalogo = puestosBase.find(p => p.id === catalogoId) || null;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return puestosBase;
    return puestosBase.filter(p => p.nombre.toLowerCase().includes(q));
  }, [puestosBase, busqueda]);

  // ---------- PUESTO BASE ----------
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

  // ---------- PRODUCTO BASE ----------
  const abrirCatalogo = (p) => { setCatalogoId(p.id); setFormProducto(FORM_PRODUCTO); setErr(''); };

  const subirFotoProducto = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'productos');
      setFormProducto(f => ({ ...f, imagen: url }));
    } catch (e2) { setErr(e2.message); }
  };

  const patchLocal = (puestoBaseId, productos) => {
    setPuestosBase(prev => prev.map(p => p.id === puestoBaseId ? { ...p, productos } : p));
  };

  const agregarProducto = async (e) => {
    e.preventDefault();
    if (!formProducto.nombre || formProducto.precio === '') return;
    setErr('');
    try {
      const nuevo = await api.puestosBase.crearProducto(catalogo.id, {
        nombre: formProducto.nombre,
        precio: parseFloat(formProducto.precio),
        imagen: formProducto.imagen || null,
        categoria: formProducto.categoria || null,
      });
      patchLocal(catalogo.id, [...catalogo.productos, nuevo]);
      setFormProducto(FORM_PRODUCTO);
    } catch (e2) { setErr(e2.message); }
  };

  const cambiarProducto = async (id, cambios) => {
    try {
      const actualizado = await api.puestosBase.actualizarProducto(id, cambios);
      patchLocal(catalogo.id, catalogo.productos.map(pr => pr.id === id ? { ...pr, ...actualizado } : pr));
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
      patchLocal(catalogo.id, catalogo.productos.filter(x => x.id !== pr.id));
    } catch (e2) { setErr(e2.message); }
  };

  return (
    <div className="pi-unegocio-container">
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

      {err && !showPuesto && !catalogo && (
        <p className="pi-unegocio-nota" style={{ color: 'var(--rojo-error-texto)' }}>{err}</p>
      )}

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando ? (
        <EstadoCarga filas={4} />
      ) : (
        <div className="pi-unegocio-card">
          <Tabla
            columnas={['Puesto', 'Catálogo', { texto: 'Eventos activos', align: 'center' }, { texto: 'Acciones', align: 'center' }]}
            datos={filtrados}
            vacio={busqueda ? 'No se encontraron puestos.' : 'Aún no tenés puestos en tu catálogo. Creá el primero.'}
            renderFila={p => (
              <tr key={p.id}>
                <td>
                  <div className="item-info">
                    {p.logo ? (
                      <img width="48" height="48" src={p.logo} alt="Logo" className="item-img" />
                    ) : (
                      <div className="item-no-img"><FaStore /></div>
                    )}
                    <div>
                      <div className="fila-nombre">{p.nombre}</div>
                      <div className="celda-secundaria">{p.descripcion}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="info-catalogo">
                    <span className="badge-info">{p.productos.length} Productos</span>
                    <button type="button" className="btn-secundario-sm" onClick={() => abrirCatalogo(p)}>
                      <FaListUl /> Ver catálogo
                    </button>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="badge-ayudantes">{p._count?.puestos ?? 0}</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div className="action-buttons" style={{ justifyContent: 'center' }}>
                    <button type="button" className="btn-secundario-sm" onClick={() => abrirEditar(p)}>
                      <FaPen /> Editar
                    </button>
                    <button type="button" className="btn-eliminar" onClick={() => archivarPuesto(p)} title="Archivar puesto">
                      <FaArchive />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
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

      {/* CATÁLOGO DE PRODUCTOS BASE */}
      {catalogo && (
        <Modal
          titulo={<><FaBoxOpen color="var(--indigo-profundo)" aria-hidden="true" /> Catálogo: {catalogo.nombre}</>}
          onCerrar={() => setCatalogoId(null)}
          tamano="lg"
          className="modal-grande"
        >
          <div className="modal-body bg-gris">
            <div className="form-añadir-producto">
              <h3 className="titulo-seccion-pequeño">Añadir producto</h3>
              <form onSubmit={agregarProducto}>
                <div className="producto-grid">
                  <div className="input-group">
                    <label>Nombre del producto</label>
                    <input type="text" value={formProducto.nombre} onChange={(e) => setFormProducto(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Hamburguesa simple" required />
                  </div>
                  <div className="input-group">
                    <label>Precio base (Bs.)</label>
                    <div className="input-monto-wrapper">
                      <FaDollarSign className="icon-monto" />
                      <input type="number" step="0.50" min="0" value={formProducto.precio} onChange={(e) => setFormProducto(f => ({ ...f, precio: e.target.value }))} placeholder="0.00" className="input-monto" required />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Categoría (opcional)</label>
                    <input type="text" list="mc-cat-productos" value={formProducto.categoria} onChange={(e) => setFormProducto(f => ({ ...f, categoria: e.target.value }))} placeholder="Bebida, Comida…" />
                    <datalist id="mc-cat-productos">
                      {CATEGORIAS_PRODUCTO.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className="input-group">
                    <label>Foto (opcional)</label>
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
                </div>
                <div className="producto-actions">
                  <button type="submit" className="btn-primario"><FaPlus /> Añadir al catálogo</button>
                </div>
              </form>
            </div>

            {err && <p className="pi-unegocio-nota" style={{ color: 'var(--rojo-error-texto)' }}>{err}</p>}

            <div className="pi-unegocio-card no-margin">
              <Tabla
                columnas={['Producto', 'Categoría', 'Precio base', { texto: 'Acción', align: 'center' }]}
                datos={catalogo.productos}
                porPagina={8}
                vacio="Todavía no hay productos en este puesto."
                renderFila={pr => (
                  <tr key={pr.id}>
                    <td>
                      <div className="item-info">
                        {pr.imagen ? (
                          <img width="48" height="48" src={pr.imagen} alt="Prod" className="item-img img-cuadrada" />
                        ) : (
                          <div className="item-no-img img-cuadrada"><FaHamburger /></div>
                        )}
                        <span className="fila-nombre">{pr.nombre}</span>
                      </div>
                    </td>
                    <td>{pr.categoria || '—'}</td>
                    <td>
                      <div className="input-monto-wrapper" style={{ maxWidth: 130 }}>
                        <FaDollarSign className="icon-monto" />
                        <input
                          type="number" min="0" step="0.50"
                          className="input-monto"
                          defaultValue={Number(pr.precio)}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (!Number.isNaN(n) && n !== Number(pr.precio)) cambiarProducto(pr.id, { precio: n });
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button type="button" className="btn-eliminar" onClick={() => eliminarProducto(pr)} title="Eliminar producto">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                )}
              />
            </div>
          </div>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
