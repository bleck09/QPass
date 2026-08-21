import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FaStore, FaPlus, FaTrash, FaTimes, FaDollarSign,
  FaImage, FaListUl, FaUsers, FaBoxOpen, FaUpload, FaUserTie, FaHamburger,
  FaUserFriends, FaCalendarAlt
} from 'react-icons/fa';
import './UsuarioNegocio.css';
import UsuNegoCreaAyudante from './UsuNegoCreaAyudante';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';

const initialStateFormPuesto = { nombre: '', descripcion: '', logo: '' };
const initialStateFormProducto = { nombre: '', precio: '', imagen: '' };

export default function UsuarioNegocio() {
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

  const [eventos, setEventos] = useState([]);
  const [eventoId, setEventoId] = useState('');
  const [puestos, setPuestos] = useState([]);

  const [showModalPuesto, setShowModalPuesto] = useState(false);
  const [showModalCatalogo, setShowModalCatalogo] = useState(false);
  const [showModalAyudantesPuesto, setShowModalAyudantesPuesto] = useState(false); // New modal for managing ayudantes per puesto
  const [puestoSeleccionado, setPuestoSeleccionado] = useState(null);

  // Estados de los formularios
  const [formPuesto, setFormPuesto] = useState(initialStateFormPuesto);
  const [formProducto, setFormProducto] = useState(initialStateFormProducto);

  useEffect(() => {
    api.eventos.listar().then(lista => {
      setEventos(lista);
      setEventoId(prev => prev || lista[0]?.id || '');
    });
  }, []);

  const recargarPuestos = () => {
    if (!eventoId) return;
    api.puestos.listar({ eventoId, negocioId: sesion.id }).then(setPuestos);
  };

  useEffect(() => { recargarPuestos(); }, [eventoId]);

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

  return (
    <div className="pi-unegocio-container">
      
      {/* Cabecera y KPI */}
      <div className="pi-unegocio-header-wrapper">
        <div className="pi-unegocio-header">
          <h2>Panel de Negocio</h2>
          <p>
            {activeTab === 'puestos' 
              ? 'Crea sucursales, administra sus menús y revisa su personal asignado.'
              : 'Gestiona a todo el personal que trabaja en tus puestos.'}
          </p>
        </div>
        
        <div className="pi-unegocio-selector-evento">
          <FaCalendarAlt />
          <select value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
            {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
          </select>
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
          <button className={activeTab === 'puestos' ? 'activo' : ''} onClick={() => setActiveTab('puestos')}>
            <FaStore /> Mis Puestos
          </button>
          <button className={activeTab === 'ayudantes' ? 'activo' : ''} onClick={() => setActiveTab('ayudantes')}>
            <FaUserFriends /> Mis Ayudantes
          </button>
        </div>

        {activeTab === 'puestos' && (
          <button className="btn-primario" onClick={() => setShowModalPuesto(true)}>
            <FaPlus /> Crear Nuevo Puesto
          </button>
        )}
      </div>

      {activeTab === 'puestos' && (
      <div className="pi-unegocio-card">
        <div className="pi-unegocio-table-wrapper">
          <table className="pi-unegocio-table">
            <thead>
              <tr>
                <th>Detalles del Puesto</th>
                <th>Catálogo</th>
                <th style={{ textAlign: 'center' }}>Ayudantes</th>
              </tr>
            </thead>
            <tbody>
              {puestos.map(puesto => (
                <tr key={puesto.id}>
                  <td>
                    <div className="item-info">
                      {puesto.logo ? (
                        <img src={puesto.logo} alt="Logo" className="item-img" />
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
                      <button className="btn-secundario-sm" onClick={() => abrirCatalogo(puesto)}>
                        <FaListUl /> Ver Catálogo
                      </button>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="info-catalogo" style={{ alignItems: 'center' }}>
                      <span className="badge-ayudantes">{puesto.ayudantes.length} Asignados</span>
                      <button className="btn-secundario-sm" onClick={() => abrirModalAyudantesPuesto(puesto)}>
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
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2><FaStore color="var(--indigo-profundo)" /> Registrar Puesto</h2>
              <button className="btn-close-modal" onClick={() => setShowModalPuesto(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={crearPuesto} className="formulario">
                <div className="input-group">
                  <label>Nombre del Puesto</label>
                  <input type="text" name="nombre" value={formPuesto.nombre} onChange={handlePuestoChange} placeholder="Ej: Pollos Doña María" required />
                </div>
                <div className="input-group">
                  <label>Breve Descripción</label>
                  <input type="text" name="descripcion" value={formPuesto.descripcion} onChange={handlePuestoChange} placeholder="Ej: Venta de comida rápida y gaseosas" />
                </div>
                <div className="input-group">
                  <label><FaImage /> Logo o Foto del Puesto (Opcional)</label>
                  {!formPuesto.logo ? (
                    <div className="upload-zone">
                      <FaUpload className="upload-icon" />
                      <span className="upload-text">Haz clic para subir el logo</span>
                      <span className="upload-subtext">PNG, JPG hasta 2MB</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="upload-input-hidden" />
                    </div>
                  ) : (
                    <div className="preview-zone">
                      <img src={formPuesto.logo} alt="Vista previa" className="img-preview" />
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
        <div className="modal-overlay">
          <div className="modal modal-grande">
            
            <div className="modal-header">
              <h2><FaBoxOpen color="var(--indigo-profundo)" /> Catálogo: {puestoSeleccionado.nombre}</h2>
              <button className="btn-close-modal" onClick={() => setShowModalCatalogo(false)}>
                <FaTimes />
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
                          <img src={formProducto.imagen} alt="Preview" />
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
                        <th>Producto</th>
                        <th>Precio</th>
                        <th style={{ textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {puestoSeleccionado.productos.map(producto => (
                        <tr key={producto.id}>
                          <td>
                            <div className="item-info">
                              {producto.imagen ? (
                                <img src={producto.imagen} alt="Prod" className="item-img img-cuadrada" />
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
                            <button className="btn-eliminar" onClick={() => eliminarProducto(producto.id)} title="Eliminar producto">
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
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2><FaUsers color="var(--indigo-profundo)" /> Equipo: {puestoSeleccionado.nombre}</h2>
              <button className="btn-close-modal" onClick={() => setShowModalAyudantesPuesto(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body bg-gris">
              <div className="pi-unegocio-card no-margin">
                <div className="pi-unegocio-table-wrapper">
                  <table className="pi-unegocio-table">
                    <thead>
                      <tr>
                        <th>Nombre del Ayudante</th>
                        <th>Turno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {puestoSeleccionado.ayudantes.map(asignacion => (
                        <tr key={asignacion.id}>
                          <td>
                            <div className="item-info">
                              {asignacion.ayudante.foto ? (
                                <img src={asignacion.ayudante.foto} alt="Ayudante" className="item-img" style={{borderRadius: '50%', width: '40px', height: '40px'}} />
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