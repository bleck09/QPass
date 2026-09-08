import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import { filtrarEventos, FILTROS_ESTADO_EVENTO } from '../../utils/eventos.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaPlus, FaTrash, FaTimes, FaDollarSign,
  FaImage, FaListUl, FaUsers, FaBoxOpen, FaUpload, FaUserTie, FaHamburger,
  FaArrowLeft, FaCheckCircle, FaBan, FaPen
} from 'react-icons/fa';
import './UsuarioNegocio.css';
import '../supervisor/GestionEntrega.css';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';

const initialStateFormPuesto = { nombre: '', descripcion: '', logo: '' };
const initialStateFormProducto = { nombre: '', precio: '', imagen: '', stock: '', categoria: '' };
const CATEGORIAS_PRODUCTO = ['Bebida', 'Comida', 'Postre', 'Snack', 'Otro'];

export default function UsuarioNegocio() {
  useTituloPagina('Mi negocio');
  const sesion = leerSesion();
  const navigate = useNavigate();

  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const eventoId = eventoSeleccionado?.id || '';
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');

  // Cargas con estados cargando/error/reintentar (Manual 8.9): eventos asignados
  // y puestos del evento. setPuestos (alias de setData) conserva las
  // actualizaciones optimistas del catálogo de productos.
  const cargarEventos = useCallback(
    () => api.eventos.misAsignados(sesion.id, sesion.rol),
    [sesion.id, sesion.rol],
  );
  const {
    data: eventos,
    cargando: cargandoEventos,
    error: errorEventos,
    recargar: recargarEventos,
  } = useApi(cargarEventos, { inicial: [] });

  const cargarPuestos = useCallback(
    () => api.puestos.listar({ eventoId, negocioId: sesion.id }),
    [eventoId, sesion.id],
  );
  const {
    data: puestos,
    setData: setPuestos,
    cargando: cargandoPuestos,
    error: errorPuestos,
    recargar: recargarPuestos,
  } = useApi(cargarPuestos, { inicial: [], activo: !!eventoId });

  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busquedaEvento, filtroEvento),
    [eventos, busquedaEvento, filtroEvento],
  );

  const [showModalPuesto, setShowModalPuesto] = useState(false);
  const [puestoEditandoId, setPuestoEditandoId] = useState(null); // null = crear
  const [showModalCatalogo, setShowModalCatalogo] = useState(false);
  const [showModalAyudantesPuesto, setShowModalAyudantesPuesto] = useState(false); // New modal for managing ayudantes per puesto
  const [puestoSeleccionado, setPuestoSeleccionado] = useState(null);

  // Estados de los formularios
  const [formPuesto, setFormPuesto] = useState(initialStateFormPuesto);
  const [formProducto, setFormProducto] = useState(initialStateFormProducto);

  const volverALista = () => setEventoSeleccionado(null);

  // --- LÓGICA DE PUESTOS ---
  const handlePuestoChange = (e) => {
    setFormPuesto({ ...formPuesto, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'puestos');
      setFormPuesto(f => ({ ...f, logo: url }));
    } catch (err) {
      window.alert(err.message);
    }
  };

  const quitarImagen = () => setFormPuesto({ ...formPuesto, logo: '' });

  const abrirEditarPuesto = (puesto) => {
    setPuestoEditandoId(puesto.id);
    setFormPuesto({
      nombre: puesto.nombre || '',
      descripcion: puesto.descripcion || '',
      logo: puesto.logo || '',
    });
    setShowModalPuesto(true);
  };

  const guardarPuesto = async (e) => {
    e.preventDefault();
    const datos = {
      nombre: formPuesto.nombre,
      descripcion: formPuesto.descripcion,
      logo: formPuesto.logo || null,
    };
    if (puestoEditandoId) {
      await api.puestos.actualizar(puestoEditandoId, datos);
    } else {
      await api.puestos.crear({ eventoId, ...datos });
    }
    recargarPuestos();
    setFormPuesto(initialStateFormPuesto);
    setPuestoEditandoId(null);
    setShowModalPuesto(false);
  };

  // --- LÓGICA DE CATÁLOGO Y PRODUCTOS ---
  const abrirCatalogo = (puesto) => {
    setPuestoSeleccionado(puesto);
    setShowModalCatalogo(true);
  };

  // ¡CORRECCIÓN 2! Agregamos la función para abrir el modal de ayudantes
  const abrirModalAyudantesPuesto = (puesto) => {
    setPuestoSeleccionado(puesto);
    setShowModalAyudantesPuesto(true);
  };


  const handleProductoChange = (e) => {
    setFormProducto({ ...formProducto, [e.target.name]: e.target.value });
  };

  const handleProductoImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'productos');
      setFormProducto(f => ({ ...f, imagen: url }));
    } catch (err) {
      window.alert(err.message);
    }
  };

  const quitarImagenProducto = () => setFormProducto({ ...formProducto, imagen: '' });

  const agregarProducto = async (e) => {
    e.preventDefault();
    if (!formProducto.nombre || !formProducto.precio) return;

    const nuevoProducto = await api.productos.crear({
      puestoId: puestoSeleccionado.id,
      nombre: formProducto.nombre,
      precio: parseFloat(formProducto.precio),
      imagen: formProducto.imagen || null,
      stock: formProducto.stock === '' ? null : Number(formProducto.stock),
      categoria: formProducto.categoria || null,
    });

    const productosActualizados = [...puestoSeleccionado.productos, nuevoProducto];
    setPuestos(prev => prev.map(p => p.id === puestoSeleccionado.id ? { ...p, productos: productosActualizados } : p));
    setPuestoSeleccionado({ ...puestoSeleccionado, productos: productosActualizados });
    setFormProducto(initialStateFormProducto);
  };

  // Edita en caliente activo/stock/categoría de un producto del catálogo (§5.4).
  const cambiarProducto = async (idProducto, cambios) => {
    const actualizado = await api.productos.actualizar(idProducto, cambios);
    const productosActualizados = puestoSeleccionado.productos.map(prod =>
      prod.id === idProducto ? { ...prod, ...actualizado } : prod,
    );
    setPuestos(prev => prev.map(p => p.id === puestoSeleccionado.id ? { ...p, productos: productosActualizados } : p));
    setPuestoSeleccionado({ ...puestoSeleccionado, productos: productosActualizados });
  };

  const eliminarProducto = async (idProducto) => {
    await api.productos.eliminar(idProducto);
    const productosActualizados = puestoSeleccionado.productos.filter(prod => prod.id !== idProducto);
    setPuestos(prev => prev.map(p => p.id === puestoSeleccionado.id ? { ...p, productos: productosActualizados } : p));
    setPuestoSeleccionado({ ...puestoSeleccionado, productos: productosActualizados });
  };

  if (!eventoSeleccionado) {
    return (
      <div className="pi-unegocio-container">
        <div className="pi-unegocio-header-wrapper">
          <div className="pi-unegocio-header">
            <h1>Panel de negocio</h1>
            <p>Elige el evento en el que quieres administrar tus puestos.</p>
          </div>
        </div>
        {errorEventos ? (
          <EstadoError onReintentar={recargarEventos} />
        ) : cargandoEventos ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <p className="pi-entrega-sin-eventos">Todavía no tienes ningún evento asignado. Pídele a Admin que te asigne uno.</p>
        ) : (
          <>
            <Buscador
              valor={busquedaEvento}
              onCambio={setBusquedaEvento}
              placeholder="Buscar evento por nombre o lugar…"
              etiqueta="Buscar evento"
              filtros={FILTROS_ESTADO_EVENTO}
              filtroActivo={filtroEvento}
              onFiltro={setFiltroEvento}
              etiquetaFiltros="Filtrar eventos por estado"
            />
            <GrillaEventos eventos={eventosFiltrados} gridClassName="pi-entrega-eventos-grid">
              {ev => (
                <EventoCard
                  key={ev.id}
                  evento={ev}
                  onClick={() => setEventoSeleccionado(ev)}
                  cta="Abrir negocio"
                />
              )}
            </GrillaEventos>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pi-unegocio-container">

      {/* Cabecera y KPI */}
      <div className="pi-unegocio-header-wrapper">
        <div className="pi-unegocio-header">
          <button type="button" className="pi-entrega-btn-volver" style={{ marginBottom: '8px' }} onClick={volverALista}>
            <FaArrowLeft /> Cambiar de evento
          </button>
          <h1>{eventoSeleccionado.nombre}</h1>
          <p>Crea puestos, administra sus menús y revisa su personal asignado.</p>
        </div>

        <div className="pi-unegocio-kpi">
          <span className="micro-etiqueta">Total de Puestos Activos</span>
          <div className="kpi-valor">
            <FaStore className="kpi-icon" />
            <span className="numero-grande">{puestos.length}</span>
          </div>
        </div>
      </div>

      <div className="pi-unegocio-action-bar">
        <h2 className="pi-unegocio-subtitulo"><FaStore aria-hidden="true" /> Mis Puestos</h2>
        <button type="button" className="btn-primario" onClick={() => { setPuestoEditandoId(null); setFormPuesto(initialStateFormPuesto); setShowModalPuesto(true); }}>
          <FaPlus /> Crear Nuevo Puesto
        </button>
      </div>

      {errorPuestos && <EstadoError onReintentar={recargarPuestos} />}
      {!errorPuestos && cargandoPuestos && <EstadoCarga filas={4} />}
      {!errorPuestos && !cargandoPuestos && (
      <div className="pi-unegocio-card">
        <Tabla
          columnas={['Detalles del Puesto', 'Catálogo', { texto: 'Ayudantes', align: 'center' }, { texto: 'Acciones', align: 'center' }]}
          datos={puestos}
          vacio="Aún no has creado ningún puesto. ¡Empieza creando uno!"
          renderFila={puesto => (
            <tr key={puesto.id}>
              <td>
                <div className="item-info">
                  {puesto.logo ? (
                    <img width="48" height="48" src={puesto.logo} alt="Logo" className="item-img" />
                  ) : (
                    <div className="item-no-img"><FaStore /></div>
                  )}
                  <div>
                    <div className="fila-nombre">{puesto.nombre}</div>
                    <div className="celda-secundaria">{puesto.descripcion}</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="info-catalogo">
                  <span className="badge-info">{puesto.productos.length} Productos</span>
                  <button type="button" className="btn-secundario-sm" onClick={() => abrirCatalogo(puesto)}>
                    <FaListUl /> Ver Catálogo
                  </button>
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                <div className="info-catalogo" style={{ alignItems: 'center' }}>
                  <span className="badge-ayudantes">{puesto.ayudantes.length} Asignados</span>
                  <button type="button" className="btn-secundario-sm" onClick={() => abrirModalAyudantesPuesto(puesto)}>
                    <FaUsers /> Ver Equipo
                  </button>
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                <button type="button" className="btn-secundario-sm" onClick={() => abrirEditarPuesto(puesto)}>
                  <FaPen /> Editar
                </button>
              </td>
            </tr>
          )}
        />
      </div>
      )}

      {/* =========================================
          MODAL 1: CREAR / EDITAR PUESTO
      ========================================= */}
      {showModalPuesto && (
        <Modal
          titulo={<><FaStore color="var(--indigo-profundo)" aria-hidden="true" /> {puestoEditandoId ? 'Editar Puesto' : 'Registrar Puesto'}</>}
          onCerrar={() => { setShowModalPuesto(false); setPuestoEditandoId(null); }}
        >
            <div className="modal-body">
              <form onSubmit={guardarPuesto} className="formulario">
                <div className="input-group">
                  <label htmlFor="neg-puesto-nombre">Nombre del puesto</label>
                  <input id="neg-puesto-nombre" type="text" name="nombre" value={formPuesto.nombre} onChange={handlePuestoChange} placeholder="Ej: Pollos Doña María" required />
                </div>
                <div className="input-group">
                  <label htmlFor="neg-puesto-desc">Breve descripción</label>
                  <input id="neg-puesto-desc" type="text" name="descripcion" value={formPuesto.descripcion} onChange={handlePuestoChange} placeholder="Ej: Venta de comida rápida y gaseosas" />
                </div>
                <div className="input-group">
                  <label htmlFor="neg-puesto-logo"><FaImage aria-hidden="true" /> Logo o foto del puesto (opcional)</label>
                  {!formPuesto.logo ? (
                    <div className="upload-zone">
                      <FaUpload className="upload-icon" />
                      <span className="upload-text">Haz clic para subir el logo</span>
                      <span className="upload-subtext">PNG, JPG hasta 2MB</span>
                      <input id="neg-puesto-logo" type="file" accept="image/*" onChange={handleImageUpload} className="upload-input-hidden" />
                    </div>
                  ) : (
                    <div className="preview-zone">
                      <img width="200" height="200" src={formPuesto.logo} alt="Vista previa" className="img-preview" />
                      <button type="button" className="btn-quitar-imagen" onClick={quitarImagen}><FaTimes /> Quitar imagen</button>
                    </div>
                  )}
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-cancelar" onClick={() => { setShowModalPuesto(false); setPuestoEditandoId(null); }}>Cancelar</button>
                  <button type="submit" className="btn-primario">{puestoEditandoId ? 'Guardar cambios' : 'Guardar Puesto'}</button>
                </div>
              </form>
            </div>
        </Modal>
      )}

      {/* =========================================
          MODAL 2: GESTIONAR CATÁLOGO (PRODUCTOS CON FOTO)
      ========================================= */}
      {showModalCatalogo && puestoSeleccionado && (
        <Modal
          titulo={<><FaBoxOpen color="var(--indigo-profundo)" aria-hidden="true" /> Catálogo: {puestoSeleccionado.nombre}</>}
          onCerrar={() => setShowModalCatalogo(false)}
          tamano="lg"
          className="modal-grande"
        >
            <div className="modal-body bg-gris">
              
              <div className="form-añadir-producto">
                <h3 className="titulo-seccion-pequeño">Añadir Nuevo Producto</h3>
                <form onSubmit={agregarProducto}>
                  <div className="producto-grid">
                    
                    <div className="input-group">
                      <label>Nombre del Producto</label>
                      <input 
                        type="text" name="nombre" 
                        value={formProducto.nombre} onChange={handleProductoChange} 
                        placeholder="Ej: Hamburguesa Simple" required 
                      />
                    </div>

                    <div className="input-group">
                      <label>Precio (Bs.)</label>
                      <div className="input-monto-wrapper">
                        <FaDollarSign className="icon-monto" />
                        <input
                          type="number" step="0.50" min="0" name="precio"
                          value={formProducto.precio} onChange={handleProductoChange}
                          placeholder="0.00" className="input-monto" required
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label>Categoría (opcional)</label>
                      <input
                        type="text" name="categoria" list="cat-productos"
                        value={formProducto.categoria} onChange={handleProductoChange}
                        placeholder="Bebida, Comida…"
                      />
                      <datalist id="cat-productos">
                        {CATEGORIAS_PRODUCTO.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>

                    <div className="input-group">
                      <label>Stock inicial (opcional)</label>
                      <input
                        type="number" min="0" step="1" name="stock"
                        value={formProducto.stock} onChange={handleProductoChange}
                        placeholder="sin control de inventario"
                      />
                    </div>

                    <div className="input-group">
                      <label>Foto (Opcional)</label>
                      {!formProducto.imagen ? (
                        <label className="btn-upload-small">
                          <FaUpload /> Subir Foto
                          <input type="file" accept="image/*" onChange={handleProductoImageUpload} hidden />
                        </label>
                      ) : (
                        <div className="preview-small">
                          <img width="400" height="225" src={formProducto.imagen} alt="Preview" />
                          <button type="button" onClick={quitarImagenProducto} title="Quitar foto">
                            <FaTimes />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                  
                  <div className="producto-actions">
                    <button type="submit" className="btn-primario">
                      <FaPlus /> Añadir al Menú
                    </button>
                  </div>
                </form>
              </div>

              <div className="pi-unegocio-card no-margin">
                <Tabla
                  columnas={['Producto', 'Categoría', 'Precio', { texto: 'Stock', align: 'center' }, { texto: 'Estado', align: 'center' }, { texto: 'Acción', align: 'center' }]}
                  datos={puestoSeleccionado.productos}
                  porPagina={8}
                  vacio="No hay productos en el menú de este puesto."
                  renderFila={producto => (
                    <tr key={producto.id} className={producto.activo === false ? 'pi-unegocio-prod-inactivo' : ''}>
                      <td>
                        <div className="item-info">
                          {producto.imagen ? (
                            <img width="48" height="48" src={producto.imagen} alt="Prod" className="item-img img-cuadrada" />
                          ) : (
                            <div className="item-no-img img-cuadrada"><FaHamburger /></div>
                          )}
                          <span className="fila-nombre">{producto.nombre}</span>
                        </div>
                      </td>
                      <td>{producto.categoria || '—'}</td>
                      <td>
                        <span className="badge-precio">Bs. {Number(producto.precio).toFixed(2)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {producto.stock == null ? (
                          <span className="pi-unegocio-nota">sin control</span>
                        ) : (
                          <input
                            type="number" min="0" step="1"
                            className="pi-unegocio-stock-input"
                            defaultValue={producto.stock}
                            onBlur={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isNaN(n) && n !== producto.stock) cambiarProducto(producto.id, { stock: n });
                            }}
                          />
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={producto.activo === false ? 'pi-unegocio-toggle inactivo' : 'pi-unegocio-toggle activo'}
                          onClick={() => cambiarProducto(producto.id, { activo: producto.activo === false })}
                          title={producto.activo === false ? 'Marcar como disponible' : 'Marcar como agotado'}
                        >
                          {producto.activo === false ? <><FaBan /> Agotado</> : <><FaCheckCircle /> Activo</>}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button type="button" className="btn-eliminar" onClick={() => eliminarProducto(producto.id)} title="Eliminar producto">
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

      {/* =========================================
          MODAL 3: VER EQUIPO (AYUDANTES ASIGNADOS) ¡NUEVO!
      ========================================= */}
      {showModalAyudantesPuesto && puestoSeleccionado && (
        <Modal
          titulo={<><FaUsers color="var(--indigo-profundo)" aria-hidden="true" /> Equipo: {puestoSeleccionado.nombre}</>}
          onCerrar={() => setShowModalAyudantesPuesto(false)}
        >
            <div className="modal-body bg-gris">
              <div className="pi-unegocio-card no-margin">
                <Tabla
                  columnas={['Nombre del Ayudante', 'Correo']}
                  datos={puestoSeleccionado.ayudantes}
                  porPagina={8}
                  vacio="Aún no hay ayudantes asignados a este puesto."
                  renderFila={asignacion => (
                    <tr key={asignacion.id}>
                      <td>
                        <div className="item-info">
                          {asignacion.ayudante.foto ? (
                            <img width="48" height="48" src={asignacion.ayudante.foto} alt="Ayudante" className="item-img" style={{borderRadius: '50%', width: '40px', height: '40px'}} />
                          ) : (
                            <div className="item-no-img" style={{borderRadius: '50%', width: '40px', height: '40px'}}><FaUserTie /></div>
                          )}
                          <div>
                            <div className="fila-nombre">{asignacion.ayudante.nombre}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="celda-secundaria">{asignacion.ayudante.email}</span></td>
                    </tr>
                  )}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-primario" onClick={() => navigate('/usuarionegocio/ayudantes')}>
                  Ir a Mis Ayudantes
                </button>
              </div>
            </div>
        </Modal>
      )}

    </div>
  );
}