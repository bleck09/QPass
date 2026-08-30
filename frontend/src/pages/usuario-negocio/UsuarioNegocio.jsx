import { useCallback, useState, useEffect, useRef } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useFocoModal } from '../../utils/useFocoModal.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { useLocation } from 'react-router-dom';
import {
  FaStore, FaPlus, FaTrash, FaTimes, FaDollarSign,
  FaImage, FaListUl, FaUsers, FaBoxOpen, FaUpload, FaUserTie, FaHamburger,
  FaUserFriends, FaMapMarkerAlt, FaArrowLeft
} from 'react-icons/fa';
import './UsuarioNegocio.css';
import '../supervisor/GestionEntrega.css';
import UsuNegoCreaAyudante from './UsuNegoCreaAyudante';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { formatearFecha } from '../../utils/eventos.js';

const initialStateFormPuesto = { nombre: '', descripcion: '', logo: '' };
const initialStateFormProducto = { nombre: '', precio: '', imagen: '' };

export default function UsuarioNegocio() {
  useTituloPagina('Mi negocio');
  const location = useLocation();
  const sesion = leerSesion();

  // /usuarionegocio/ayudantes entra directo a la pestaña "Mis Ayudantes" (accesible también
  // desde el menú lateral como "Crear ayudante").
  const [activeTab, setActiveTab] = useState(location.pathname.endsWith('/ayudantes') ? 'ayudantes' : 'puestos'); // 'puestos' o 'ayudantes'

  // Si se navega entre /usuarionegocio y /usuarionegocio/ayudantes sin que el componente
  // se vuelva a montar, esto ajusta la pestaña para que siga reflejando la URL actual
  // (ajuste durante el render, no en un efecto, para no disparar un render extra).
  const [ultimaRutaSincronizada, setUltimaRutaSincronizada] = useState(location.pathname);
  if (location.pathname !== ultimaRutaSincronizada) {
    setUltimaRutaSincronizada(location.pathname);
    setActiveTab(location.pathname.endsWith('/ayudantes') ? 'ayudantes' : 'puestos');
  }

  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const eventoId = eventoSeleccionado?.id || '';

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

  const [showModalPuesto, setShowModalPuesto] = useState(false);
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPuesto({ ...formPuesto, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const quitarImagen = () => setFormPuesto({ ...formPuesto, logo: '' });

  const crearPuesto = async (e) => {
    e.preventDefault();
    await api.puestos.crear({
      eventoId, nombre: formPuesto.nombre, descripcion: formPuesto.descripcion, logo: formPuesto.logo || null,
    });
    recargarPuestos();
    setFormPuesto({ nombre: '', descripcion: '', logo: '' });
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

  const cerrarModales = () => {
    setShowModalPuesto(false);
    setShowModalCatalogo(false);
    setShowModalAyudantesPuesto(false);
  };

  // Algún modal abierto: ESC lo cierra y el fondo no scrollea (Manual 8.6).
  const hayModalAbierto = showModalPuesto || showModalCatalogo || showModalAyudantesPuesto;

  // Foco de cada modal (A1 / Manual 8.6)
  const modalPuestoRef = useRef(null);
  const modalCatalogoRef = useRef(null);
  const modalAyudantesRef = useRef(null);
  useFocoModal(modalPuestoRef, showModalPuesto);
  useFocoModal(modalCatalogoRef, showModalCatalogo);
  useFocoModal(modalAyudantesRef, showModalAyudantesPuesto);
  useEffect(() => {
    if (!hayModalAbierto) return;
    const alTecla = (e) => { if (e.key === 'Escape') cerrarModales(); };
    window.addEventListener('keydown', alTecla);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', alTecla);
      document.body.style.overflow = '';
    };
  }, [hayModalAbierto]);

  const handleProductoChange = (e) => {
    setFormProducto({ ...formProducto, [e.target.name]: e.target.value });
  };

  const handleProductoImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormProducto({ ...formProducto, imagen: reader.result });
      };
      reader.readAsDataURL(file);
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
    });

    const productosActualizados = [...puestoSeleccionado.productos, nuevoProducto];
    setPuestos(prev => prev.map(p => p.id === puestoSeleccionado.id ? { ...p, productos: productosActualizados } : p));
    setPuestoSeleccionado({ ...puestoSeleccionado, productos: productosActualizados });
    setFormProducto({ nombre: '', precio: '', imagen: '' });
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
          <div className="pi-entrega-eventos-grid">
            {eventos.map(ev => (
              <button key={ev.id} className="pi-entrega-evento-card" onClick={() => setEventoSeleccionado(ev)}>
                <img src={ev.imagen} alt={ev.nombre} width="320" height="120" loading="lazy" className="pi-entrega-evento-imagen" />
                <div className="pi-entrega-evento-info">
                  <strong>{ev.nombre}</strong>
                  <span><FaMapMarkerAlt /> {ev.lugar} · {formatearFecha(ev.fecha)}</span>
                </div>
              </button>
            ))}
          </div>
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
          <p>
            {activeTab === 'puestos'
              ? 'Crea sucursales, administra sus menús y revisa su personal asignado.'
              : 'Gestiona a todo el personal que trabaja en tus puestos.'}
          </p>
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
        {/* TABS para cambiar entre Puestos y Ayudantes */}
        <div className="pi-unegocio-tabs">
          <button type="button" className={activeTab === 'puestos' ? 'activo' : ''} aria-current={activeTab === 'puestos' ? 'page' : undefined} onClick={() => setActiveTab('puestos')}>
            <FaStore aria-hidden="true" /> Mis Puestos
          </button>
          <button type="button" className={activeTab === 'ayudantes' ? 'activo' : ''} aria-current={activeTab === 'ayudantes' ? 'page' : undefined} onClick={() => setActiveTab('ayudantes')}>
            <FaUserFriends aria-hidden="true" /> Mis Ayudantes
          </button>
        </div>

        {activeTab === 'puestos' && (
          <button type="button" className="btn-primario" onClick={() => setShowModalPuesto(true)}>
            <FaPlus /> Crear Nuevo Puesto
          </button>
        )}
      </div>

      {activeTab === 'puestos' && errorPuestos && <EstadoError onReintentar={recargarPuestos} />}
      {activeTab === 'puestos' && !errorPuestos && cargandoPuestos && <EstadoCarga filas={4} />}
      {activeTab === 'puestos' && !errorPuestos && !cargandoPuestos && (
      <div className="pi-unegocio-card">
        <div className="pi-unegocio-table-wrapper">
          <table className="pi-unegocio-table">
            <thead>
              <tr>
                <th scope="col">Detalles del Puesto</th>
                <th scope="col">Catálogo</th>
                <th scope="col" style={{ textAlign: 'center' }}>Ayudantes</th>
              </tr>
            </thead>
            <tbody>
              {puestos.map(puesto => (
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
                </tr>
              ))}
              {puestos.length === 0 && (
                <tr>
                  <td colSpan="4" className="tabla-vacia">
                    Aún no has creado ningún puesto. ¡Empieza creando uno!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'ayudantes' && (
        <UsuNegoCreaAyudante puestos={puestos} onCambio={recargarPuestos} />
      )}

      {/* =========================================
          MODAL 1: CREAR NUEVO PUESTO
      ========================================= */}
      {showModalPuesto && (
        <div className="modal-overlay" onClick={() => setShowModalPuesto(false)}>
          <div ref={modalPuestoRef} tabIndex={-1} className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="neg-modal-puesto-titulo">
            <div className="modal-header">
              <h2 id="neg-modal-puesto-titulo"><FaStore color="var(--indigo-profundo)" aria-hidden="true" /> Registrar Puesto</h2>
              <button type="button" className="btn-close-modal" onClick={() => setShowModalPuesto(false)} aria-label="Cerrar">
                <FaTimes aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={crearPuesto} className="formulario">
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
                  <button type="button" className="btn-cancelar" onClick={() => setShowModalPuesto(false)}>Cancelar</button>
                  <button type="submit" className="btn-primario">Guardar Puesto</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 2: GESTIONAR CATÁLOGO (PRODUCTOS CON FOTO)
      ========================================= */}
      {showModalCatalogo && puestoSeleccionado && (
        <div className="modal-overlay" onClick={() => setShowModalCatalogo(false)}>
          <div ref={modalCatalogoRef} tabIndex={-1} className="modal modal-grande" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="neg-modal-catalogo-titulo">
            
            <div className="modal-header">
              <h2 id="neg-modal-catalogo-titulo"><FaBoxOpen color="var(--indigo-profundo)" aria-hidden="true" /> Catálogo: {puestoSeleccionado.nombre}</h2>
              <button type="button" className="btn-close-modal" onClick={() => setShowModalCatalogo(false)} aria-label="Cerrar">
                <FaTimes aria-hidden="true" />
              </button>
            </div>

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
                <div className="pi-unegocio-table-wrapper">
                  <table className="pi-unegocio-table">
                    <thead>
                      <tr>
                        <th scope="col">Producto</th>
                        <th scope="col">Precio</th>
                        <th scope="col" style={{ textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {puestoSeleccionado.productos.map(producto => (
                        <tr key={producto.id}>
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
                          <td>
                            <span className="badge-precio">Bs. {Number(producto.precio).toFixed(2)}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button type="button" className="btn-eliminar" onClick={() => eliminarProducto(producto.id)} title="Eliminar producto">
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {puestoSeleccionado.productos.length === 0 && (
                        <tr>
                          <td colSpan="3" className="tabla-vacia">No hay productos en el menú de este puesto.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 3: VER EQUIPO (AYUDANTES ASIGNADOS) ¡NUEVO!
      ========================================= */}
      {showModalAyudantesPuesto && puestoSeleccionado && (
        <div className="modal-overlay" onClick={() => setShowModalAyudantesPuesto(false)}>
          <div ref={modalAyudantesRef} tabIndex={-1} className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="neg-modal-ayudantes-titulo">
            <div className="modal-header">
              <h2 id="neg-modal-ayudantes-titulo"><FaUsers color="var(--indigo-profundo)" aria-hidden="true" /> Equipo: {puestoSeleccionado.nombre}</h2>
              <button type="button" className="btn-close-modal" onClick={() => setShowModalAyudantesPuesto(false)} aria-label="Cerrar">
                <FaTimes aria-hidden="true" />
              </button>
            </div>
            
            <div className="modal-body bg-gris">
              <div className="pi-unegocio-card no-margin">
                <div className="pi-unegocio-table-wrapper">
                  <table className="pi-unegocio-table">
                    <thead>
                      <tr>
                        <th scope="col">Nombre del Ayudante</th>
                        <th scope="col">Turno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {puestoSeleccionado.ayudantes.map(asignacion => (
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
                                <div className="celda-secundaria">{asignacion.ayudante.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge-info">{asignacion.turno}</span>
                          </td>
                        </tr>
                      ))}
                      {puestoSeleccionado.ayudantes.length === 0 && (
                        <tr>
                          <td colSpan="2" className="tabla-vacia">
                            Aún no hay ayudantes asignados a esta sucursal.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-primario" onClick={() => {
                  setShowModalAyudantesPuesto(false);
                  setActiveTab('ayudantes');
                }}>
                  Ir a Mis Ayudantes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}