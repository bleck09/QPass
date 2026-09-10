import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import Migas from '../../components/Migas.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
import Tabla from '../../components/Tabla.jsx';
import Buscador from '../../components/Buscador.jsx';
import Paginador from '../../components/Paginador.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { usePaginacion } from '../../utils/usePaginacion.js';
import { useApi } from '../../utils/useApi.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaPlus, FaTimes, FaImage, FaUpload, FaBoxOpen,
  FaDollarSign, FaHamburger, FaPen, FaArchive, FaTrash, FaSave, FaCalendarAlt,
  FaThLarge, FaListUl,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import './UsuarioNegocio.css';
import './MiCatalogo.css';

const FORM_PRODUCTO = { nombre: '', precio: '', imagen: '', categoria: '' };
const FORM_PUESTO = { nombre: '', descripcion: '', logo: '' };
// Categorías comunes para el <select>. Cualquier otra se escribe eligiendo "Otro…".
const CATEGORIAS_PRODUCTO = ['Bebida', 'Comida', 'Postre', 'Snack'];

/**
 * Campo de categoría: <select> con las comunes + "Otro…" que despliega un input
 * libre. Evita que se escriban variantes distintas de lo mismo.
 */
function SelectorCategoria({ id, valor, onCambio }) {
  const [otro, setOtro] = useState(valor !== '' && !CATEGORIAS_PRODUCTO.includes(valor));
  return (
    <>
      <select
        id={id}
        value={otro ? 'Otro' : valor}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'Otro') { setOtro(true); onCambio(''); }
          else { setOtro(false); onCambio(v); }
        }}
      >
        <option value="">Sin categoría</option>
        {CATEGORIAS_PRODUCTO.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="Otro">Otro…</option>
      </select>
      {otro && (
        <input
          type="text"
          placeholder="Nombre de la categoría"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          autoFocus
        />
      )}
    </>
  );
}

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

  // Vista de la lista de productos: tarjetas o tabla (se recuerda por navegador).
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem('mcat-vista-productos') || 'cards'; } catch { return 'cards'; }
  });
  useEffect(() => {
    try { localStorage.setItem('mcat-vista-productos', vista); } catch { /* ignore */ }
  }, [vista]);

  const [busquedaProd, setBusquedaProd] = useState('');
  const productosFiltrados = useMemo(() => {
    const q = busquedaProd.trim().toLowerCase();
    const lista = puesto?.productos || [];
    if (!q) return lista;
    return lista.filter(pr =>
      pr.nombre.toLowerCase().includes(q) || (pr.categoria || '').toLowerCase().includes(q),
    );
  }, [puesto, busquedaProd]);

  // Paginación de la vista TARJETAS (la de tabla la pagina <Tabla> sola).
  const cardsPag = usePaginacion(productosFiltrados, 12);

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
            <div className="pi-mcat-card__chips pi-mcat-card__chips--mt">
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
        <p className="pi-unegocio-nota pi-unegocio-nota--error">{err}</p>
      )}

      <div className="pi-mcat-prod-bar">
        <h2><FaBoxOpen aria-hidden="true" /> Productos del catálogo</h2>
        <div className="qp-btn-group">
          <div className="pi-mcat-vista-toggle" role="group" aria-label="Ver productos como">
            <button
              type="button"
              className={vista === 'cards' ? 'activo' : ''}
              aria-pressed={vista === 'cards'}
              onClick={() => setVista('cards')}
              title="Ver como tarjetas"
            >
              <FaThLarge aria-hidden="true" />
            </button>
            <button
              type="button"
              className={vista === 'tabla' ? 'activo' : ''}
              aria-pressed={vista === 'tabla'}
              onClick={() => setVista('tabla')}
              title="Ver como tabla"
            >
              <FaListUl aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="btn-primario" onClick={abrirAgregar}>
            <FaPlus /> Añadir producto
          </button>
        </div>
      </div>

      {puesto.productos.length > 0 && (
        <div className="pi-mcat-prod-buscador">
          <Buscador
            valor={busquedaProd}
            onCambio={setBusquedaProd}
            placeholder="Buscar producto por nombre o categoría…"
            etiqueta="Buscar producto"
          />
        </div>
      )}

      {vista === 'tabla' ? (
        <div className="pi-unegocio-card">
          <Tabla
            columnas={['Producto', 'Categoría', 'Precio base', { texto: 'Acciones', align: 'center' }]}
            datos={productosFiltrados}
            porPagina={8}
            vacio={busquedaProd.trim()
              ? 'Ningún producto coincide con la búsqueda.'
              : 'Todavía no hay productos en este puesto. Agregá el primero con “Añadir producto”.'}
            renderFila={pr => (
              <tr key={pr.id}>
                <td>
                  <div className="item-info">
                    {pr.imagen ? (
                      <img width="48" height="48" src={pr.imagen} alt="" className="item-img img-cuadrada" />
                    ) : (
                      <div className="item-no-img img-cuadrada"><FaHamburger /></div>
                    )}
                    <span className="fila-nombre">{pr.nombre}</span>
                  </div>
                </td>
                <td>{pr.categoria || '—'}</td>
                <td className="fila-nombre">Bs. {Number(pr.precio).toFixed(2)}</td>
                <td className="td-centro">
                  <div className="btn-acciones">
                    <button type="button" className="btn-secundario-sm" onClick={() => abrirEditarProducto(pr)} title="Editar producto">
                      <FaPen aria-hidden="true" /> Editar
                    </button>
                    <button type="button" className="btn-secundario-sm btn-secundario-sm--peligro" onClick={() => eliminarProducto(pr)} title="Quitar producto">
                      <FaTrash aria-hidden="true" /> Quitar
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
        </div>
      ) : productosFiltrados.length === 0 ? (
        <p className="tabla-vacia">
          {busquedaProd.trim()
            ? 'Ningún producto coincide con la búsqueda.'
            : 'Todavía no hay productos en este puesto. Agregá el primero con “Añadir producto”.'}
        </p>
      ) : (
        <>
        <div className="pi-mcat-prod-grid">
          {cardsPag.slice.map(pr => (
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
        <Paginador
          pagina={cardsPag.paginaActual}
          totalPaginas={cardsPag.totalPaginas}
          onCambio={cardsPag.setPagina}
          total={cardsPag.total}
          unidad="productos"
        />
        </>
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
                <SelectorCategoria
                  id="mcp-ag-cat"
                  valor={formProducto.categoria}
                  onCambio={(v) => setFormProducto(f => ({ ...f, categoria: v }))}
                />
              </div>
              <div className="input-group">
                <label htmlFor="mcp-ag-foto"><FaImage aria-hidden="true" /> Foto (opcional)</label>
                {!formProducto.imagen ? (
                  <div className="upload-zone">
                    <FaUpload className="upload-icon" />
                    <span className="upload-text">Haz clic para subir una foto</span>
                    <span className="upload-subtext">PNG, JPG hasta 2MB</span>
                    <input id="mcp-ag-foto" type="file" accept="image/*" onChange={subirFotoProducto} className="upload-input-hidden" />
                  </div>
                ) : (
                  <div className="preview-zone">
                    <img width="200" height="200" src={formProducto.imagen} alt="Vista previa" className="img-preview" />
                    <button type="button" className="btn-quitar-imagen" onClick={() => setFormProducto(f => ({ ...f, imagen: '' }))}><FaTimes /> Quitar imagen</button>
                  </div>
                )}
              </div>
              {err && <p className="pi-unegocio-nota pi-unegocio-nota--error">{err}</p>}
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
                <SelectorCategoria
                  id="mcp-ed-cat"
                  valor={formProdEditar.categoria}
                  onCambio={(v) => setFormProdEditar(f => ({ ...f, categoria: v }))}
                />
              </div>
              <div className="input-group">
                <label htmlFor="mcp-ed-foto"><FaImage aria-hidden="true" /> Foto (opcional)</label>
                {!formProdEditar.imagen ? (
                  <div className="upload-zone">
                    <FaUpload className="upload-icon" />
                    <span className="upload-text">Haz clic para subir una foto</span>
                    <span className="upload-subtext">PNG, JPG hasta 2MB</span>
                    <input id="mcp-ed-foto" type="file" accept="image/*" onChange={subirFotoProdEditar} className="upload-input-hidden" />
                  </div>
                ) : (
                  <div className="preview-zone">
                    <img width="200" height="200" src={formProdEditar.imagen} alt="Vista previa" className="img-preview" />
                    <button type="button" className="btn-quitar-imagen" onClick={() => setFormProdEditar(f => ({ ...f, imagen: '' }))}><FaTimes /> Quitar imagen</button>
                  </div>
                )}
              </div>
              {err && <p className="pi-unegocio-nota pi-unegocio-nota--error">{err}</p>}
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
              {err && <p className="pi-unegocio-nota pi-unegocio-nota--error">{err}</p>}
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
