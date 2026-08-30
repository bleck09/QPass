import { useCallback, useState, useEffect } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaDollarSign, FaUsers, FaShoppingCart,
  FaChartBar, FaTrophy, FaMedal, FaArrowLeft, FaBoxOpen, FaEye,
  FaUserTie, FaSearch, FaRegClock, FaTag, FaMapMarkerAlt
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { formatearFecha } from '../../utils/eventos.js';
import './UsuNegoDasboar.css';
import '../supervisor/GestionEntrega.css';

const iniciales = (nombre = '') => nombre.substring(0, 2).toUpperCase();

const DATA_VACIA = { totalIngresos: 0, totalVentas: 0, puestosActivos: 0, totalAyudantes: 0, topProductos: [], listaAyudantes: [], ventasPorPuesto: [] };

// Construye el mismo shape que antes venía de mock, pero desde /puestos + /ventas + /puesto-ayudantes reales.
const construirDashboard = async (eventoId, negocioId) => {
  const puestos = await api.puestos.listar({ eventoId, negocioId });
  if (puestos.length === 0) return DATA_VACIA;

  const ventasPorPuestoRaw = await Promise.all(puestos.map(p => api.ventas.listar({ puestoId: p.id })));

  const ayudantesPorId = new Map();
  const ventasPorPuesto = puestos.map((puesto, idx) => {
    const ventas = ventasPorPuestoRaw[idx];
    const productosPorId = new Map(puesto.productos.map(p => [p.id, { id: p.id, nombre: p.nombre, precio: Number(p.precio), ventas: 0, ingresos: 0, historial: [] }]));

    ventas.forEach(venta => {
      puesto.ayudantes.forEach(a => ayudantesPorId.set(a.ayudante.id, { ...a.ayudante, sucursales: new Set([...(ayudantesPorId.get(a.ayudante.id)?.sucursales || []), puesto.nombre]) }));

      venta.items.forEach(item => {
        const prod = productosPorId.get(item.productoId) || { id: item.productoId, nombre: item.nombreProducto, precio: Number(item.precioUnitario), ventas: 0, ingresos: 0, historial: [] };
        prod.ventas += item.cantidad;
        prod.ingresos += Number(item.precioUnitario) * item.cantidad;
        prod.historial.push({
          idVenta: venta.id, hora: new Date(venta.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
          vendedor: venta.ayudante?.nombre || '—', precio: Number(item.precioUnitario),
        });
        productosPorId.set(prod.id, prod);
      });
    });

    return {
      id: puesto.id, nombre: puesto.nombre,
      ingresos: ventas.reduce((s, v) => s + Number(v.montoTotal), 0),
      ventas: ventas.length,
      ayudantes: puesto.ayudantes.length,
      productos: [...productosPorId.values()],
    };
  });

  const productosGlobales = new Map();
  ventasPorPuesto.forEach(p => p.productos.forEach(prod => {
    const actual = productosGlobales.get(prod.nombre) || { id: prod.id, nombre: prod.nombre, ventas: 0, ingresos: 0 };
    actual.ventas += prod.ventas;
    actual.ingresos += prod.ingresos;
    productosGlobales.set(prod.nombre, actual);
  }));

  return {
    totalIngresos: ventasPorPuesto.reduce((s, p) => s + p.ingresos, 0),
    totalVentas: ventasPorPuesto.reduce((s, p) => s + p.ventas, 0),
    puestosActivos: puestos.length,
    totalAyudantes: ayudantesPorId.size,
    topProductos: [...productosGlobales.values()].sort((a, b) => b.ingresos - a.ingresos).slice(0, 5),
    listaAyudantes: [...ayudantesPorId.values()].map(a => ({ ...a, sucursales: [...a.sucursales], avatar: iniciales(a.nombre) })),
    ventasPorPuesto,
  };
};

export default function UsuNegoDasboar() {
  useTituloPagina('Dashboard de negocio');
  const sesion = leerSesion();
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const eventoId = eventoSeleccionado?.id || '';
  const [cargarGrafico, setCargarGrafico] = useState(false);

  // Carga primaria (eventos asignados) y dashboard del evento, cada uno con sus
  // estados cargando/error/reintentar (Manual 8.9).
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

  const cargarDashboard = useCallback(
    () => construirDashboard(eventoId, sesion.id),
    [eventoId, sesion.id],
  );
  const {
    data,
    cargando: cargandoData,
    error: errorData,
    recargar: recargarDashboard,
  } = useApi(cargarDashboard, { inicial: DATA_VACIA, activo: !!eventoId });

  // SISTEMA DE VISTAS (PANTALLA COMPLETA)
  // 'GENERAL' | 'SUCURSAL' | 'AYUDANTES' | 'PRODUCTO'
  const [vistaActual, setVistaActual] = useState('GENERAL');

  // Datos temporales de la vista seleccionada
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const volverALista = () => setEventoSeleccionado(null);

  // Efecto para animar barras sin error de React
  useEffect(() => {
    const timer = setTimeout(() => setCargarGrafico(true), 100);
    return () => {
      clearTimeout(timer);
      setCargarGrafico(false);
    };
  }, [vistaActual]);

  // ==============================================================
  // RENDER: 0. SELECCIÓN DE EVENTO (antes de mostrar cualquier vista)
  // ==============================================================
  if (!eventoSeleccionado) {
    return (
      <div className="pi-dashboard-container animate-fade">
        <div className="pi-dashboard-header">
          <div>
            <h1>Dashboard general</h1>
            <p>Elige el evento del que quieres ver el resumen.</p>
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

  // Estados de la carga del dashboard (Manual 8.9), antes de cualquier vista.
  if (errorData || cargandoData) {
    return (
      <div className="pi-dashboard-container animate-fade">
        <div className="pi-dashboard-header">
          <div>
            <button className="pi-entrega-btn-volver" style={{ marginBottom: '8px' }} onClick={volverALista}>
              <FaArrowLeft /> Cambiar de evento
            </button>
            <h1>{eventoSeleccionado.nombre}</h1>
          </div>
        </div>
        {errorData
          ? <EstadoError onReintentar={recargarDashboard} />
          : <EstadoCarga filas={5} />}
      </div>
    );
  }

  // ==============================================================
  // RENDER: 1. VISTA DASHBOARD GENERAL
  // ==============================================================
  if (vistaActual === 'GENERAL') {
    const maxIngresoGeneral = Math.max(...data.ventasPorPuesto.map(p => p.ingresos), 1);

    return (
      <div className="pi-dashboard-container animate-fade">
        <div className="pi-dashboard-header">
          <div>
            <button className="pi-entrega-btn-volver" style={{ marginBottom: '8px' }} onClick={volverALista}>
              <FaArrowLeft /> Cambiar de evento
            </button>
            <h1>{eventoSeleccionado.nombre}</h1>
            <p>Resumen global de todos tus puestos y personal asignado.</p>
          </div>
        </div>

        <div className="pi-dashboard-kpi-grid">
          <div className="kpi-card card-ingresos">
            <div className="kpi-icon-wrapper"><FaDollarSign /></div>
            <div className="kpi-info">
              <span className="micro-etiqueta">Ingresos Totales</span>
              <h3 className="numero-grande">Bs. {data.totalIngresos.toFixed(2)}</h3>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-wrapper icon-ventas"><FaShoppingCart /></div>
            <div className="kpi-info">
              <span className="micro-etiqueta">Ventas Globales</span>
              <h3 className="numero-grande">{data.totalVentas}</h3>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-wrapper icon-puestos"><FaStore /></div>
            <div className="kpi-info">
              <span className="micro-etiqueta">Sucursales</span>
              <h3 className="numero-grande">{data.puestosActivos}</h3>
            </div>
          </div>
          
          {/* TARJETA AYUDANTES CLICKABLE -> LLEVA A VISTA AYUDANTES */}
          <div 
            className="kpi-card kpi-clickable" 
            onClick={() => setVistaActual('AYUDANTES')}
            title="Ver lista de personal"
          >
            <div className="kpi-icon-wrapper icon-ayudantes"><FaUsers /></div>
            <div className="kpi-info">
              <span className="micro-etiqueta">Total Ayudantes (Ver Todo)</span>
              <h3 className="numero-grande">{data.totalAyudantes}</h3>
            </div>
          </div>
        </div>

        <div className="pi-dashboard-charts-grid">
          <div className="pi-dashboard-card chart-section">
            <div className="card-header">
              <h3><FaChartBar className="icon-title" /> Ingresos por Sucursal</h3>
            </div>
            <div className="css-bar-chart">
              {data.ventasPorPuesto.map((puesto) => {
                const alturaPorcentaje = cargarGrafico ? (puesto.ingresos / maxIngresoGeneral) * 100 : 0;
                return (
                  <div key={puesto.id} className="bar-column">
                    <span className="bar-value">Bs. {puesto.ingresos.toFixed(0)}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ height: `${alturaPorcentaje}%` }}></div>
                    </div>
                    <span className="bar-label">{puesto.nombre}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pi-dashboard-card top-section">
            <div className="card-header">
              <h3><FaTrophy className="icon-title" color="var(--ambar-aviso)" /> Top Global</h3>
            </div>
            <div className="top-productos-list">
              {data.topProductos.map((prod, index) => (
                <div key={prod.id} className="top-producto-item">
                  <div className="top-rank">
                    {index === 0 ? <FaMedal color="#F59E0B" size={24} /> : 
                     index === 1 ? <FaMedal color="#9CA3AF" size={24} /> : 
                                   <FaMedal color="#B45309" size={24} />}
                  </div>
                  <div className="top-info">
                    <span className="top-nombre">{prod.nombre}</span>
                    <span className="top-ventas">{prod.ventas} vendidos</span>
                  </div>
                  <div className="top-ingreso">Bs. {prod.ingresos.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TARJETAS SUCURSALES -> LLEVA A VISTA SUCURSAL */}
        <div className="pi-dashboard-card" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '0' }}>
          <div className="card-header" style={{ marginBottom: '15px' }}>
            <h3><FaStore className="icon-title" /> Mis Sucursales (Click para detalles)</h3>
          </div>
          <div className="pi-sucursales-grid">
            {data.ventasPorPuesto.map(sucursal => (
              <div 
                key={sucursal.id} 
                className="pi-sucursal-card" 
                onClick={() => {
                  setSucursalSeleccionada(sucursal);
                  setVistaActual('SUCURSAL');
                }}
              >
                <div className="sucursal-card-header">
                  <div className="suc-icon"><FaStore /></div>
                  <h4>{sucursal.nombre}</h4>
                </div>
                <div className="sucursal-card-body">
                  <div className="suc-stat">
                    <span>Recaudado</span>
                    <strong>Bs. {sucursal.ingresos.toFixed(2)}</strong>
                  </div>
                  <div className="suc-stat">
                    <span>Ventas</span>
                    <strong>{sucursal.ventas}</strong>
                  </div>
                  <div className="suc-stat">
                    <span>Ayudantes</span>
                    <strong>{sucursal.ayudantes} <FaUsers size={12} color="var(--gris-medio)"/></strong>
                  </div>
                </div>
                <div className="sucursal-card-footer">
                  <span>Ver rendimiento detallado →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // RENDER: 2. VISTA TABLA DE AYUDANTES (PANTALLA COMPLETA)
  // ==============================================================
  if (vistaActual === 'AYUDANTES') {
    return (
      <div className="pi-dashboard-container animate-fade">
        <div className="pi-fullpage-card">
          
          <button className="pi-btn-back-clean" onClick={() => setVistaActual('GENERAL')}>
            <FaArrowLeft /> Volver al dashboard
          </button>
          
          <h1 className="pi-fullpage-title">Personal asignado</h1>
          
          <div className="pi-search-bar-dummy">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Buscar por nombre o sucursal..." />
          </div>

          <div className="pi-dashboard-table-wrapper">
            <table className="pi-dashboard-table clean-table">
              <thead>
                <tr>
                  <th scope="col">Ayudante</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Sucursales Asignadas</th>
                </tr>
              </thead>
              <tbody>
                {data.listaAyudantes.map(ayudante => (
                  <tr key={ayudante.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-small">{ayudante.avatar}</div>
                        <strong>{ayudante.nombre}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--texto-secundario)' }}>Ayudante</td>
                    <td>
                      <div className="badge-sucursal-container">
                        {ayudante.sucursales.map((suc, i) => (
                          <span key={i} className="badge-sucursal">{suc}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // RENDER: 3. VISTA SUCURSAL DETALLADA
  // ==============================================================
  if (vistaActual === 'SUCURSAL' && sucursalSeleccionada) {
    const maxIngresoProducto = Math.max(...sucursalSeleccionada.productos.map(p => p.ingresos), 1);

    return (
      <div className="pi-dashboard-container animate-fade">
        
        <div className="pi-dashboard-header header-sucursal">
          <div>
            <button className="pi-btn-back-clean" onClick={() => setVistaActual('GENERAL')}>
              <FaArrowLeft /> Volver al dashboard
            </button>
            <h1 style={{marginTop: '15px'}}>{sucursalSeleccionada.nombre}</h1>
            <p>Desglose de productos y rendimiento específico de este puesto.</p>
          </div>
        </div>

        <div className="pi-dashboard-kpi-grid">
          <div className="kpi-card card-ingresos">
            <div className="kpi-icon-wrapper"><FaDollarSign /></div>
            <div className="kpi-info">
              <span className="micro-etiqueta">Ingresos Sucursal</span>
              <h3 className="numero-grande">Bs. {sucursalSeleccionada.ingresos.toFixed(2)}</h3>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-wrapper icon-ventas"><FaShoppingCart /></div>
            <div className="kpi-info">
              <span className="micro-etiqueta">Ventas Sucursal</span>
              <h3 className="numero-grande">{sucursalSeleccionada.ventas}</h3>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-wrapper" style={{background: 'var(--indigo-profundo-suave)', color: 'var(--indigo-profundo)'}}><FaBoxOpen /></div>
            <div className="kpi-info">
              <span className="micro-etiqueta">Tipos de Productos</span>
              <h3 className="numero-grande">{sucursalSeleccionada.productos.length}</h3>
            </div>
          </div>
        </div>

        <div className="pi-dashboard-card chart-section" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3><FaChartBar className="icon-title" /> Rendimiento por Producto (Ganancia)</h3>
          </div>
          <div className="css-bar-chart">
            {sucursalSeleccionada.productos.map((prod) => {
              const alturaPorcentaje = cargarGrafico ? (prod.ingresos / maxIngresoProducto) * 100 : 0;
              return (
                <div key={prod.id} className="bar-column">
                  <span className="bar-value">Bs. {prod.ingresos.toFixed(0)}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ height: `${alturaPorcentaje}%` }}></div>
                  </div>
                  <span className="bar-label">{prod.nombre}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pi-dashboard-card">
          <div className="card-header">
            <h3><FaShoppingCart className="icon-title" /> Desglose de Ventas</h3>
          </div>
          <div className="pi-dashboard-table-wrapper">
            <table className="pi-dashboard-table">
              <thead>
                <tr>
                  <th scope="col">Producto Vendido</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Precio Unit.</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Cantidad</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Total Generado</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sucursalSeleccionada.productos.map(prod => (
                  <tr key={prod.id}>
                    <td className="fila-nombre">
                      <FaBoxOpen style={{ color: 'var(--gris-medio)', marginRight: '8px' }}/>
                      {prod.nombre}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--texto-secundario)' }}>
                      Bs. {prod.precio.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-ayudante">{prod.ventas} un.</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge-ingreso">Bs. {prod.ingresos.toFixed(2)}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {/* LLEVA A VISTA HISTORIAL PRODUCTO */}
                      <button 
                        className="btn-ver-detalles" 
                        onClick={() => {
                          setProductoSeleccionado(prod);
                          setVistaActual('PRODUCTO');
                        }}
                      >
                        <FaEye /> Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // RENDER: 4. VISTA HISTORIAL DEL PRODUCTO (PANTALLA COMPLETA)
  // ==============================================================
  if (vistaActual === 'PRODUCTO' && productoSeleccionado) {
    return (
      <div className="pi-dashboard-container animate-fade">
        <div className="pi-fullpage-card">
          
          <button className="pi-btn-back-clean" onClick={() => setVistaActual('SUCURSAL')}>
            <FaArrowLeft /> Volver a {sucursalSeleccionada.nombre}
          </button>
          
          <h1 className="pi-fullpage-title">Historial: {productoSeleccionado.nombre}</h1>
          
          <div className="pi-search-bar-dummy">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Buscar por vendedor o ID de venta..." />
          </div>

          <div className="pi-dashboard-table-wrapper">
            {productoSeleccionado.historial && productoSeleccionado.historial.length > 0 ? (
              <table className="pi-dashboard-table clean-table">
                <thead>
                  <tr>
                    <th scope="col">ID Venta</th>
                    <th scope="col">Vendedor</th>
                    <th scope="col">Hora</th>
                    <th scope="col" style={{textAlign: 'right'}}>Precio Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {productoSeleccionado.historial.map(venta => (
                    <tr key={venta.idVenta}>
                      <td style={{fontWeight: '700', color: 'var(--texto-principal)'}}>
                        <FaTag style={{color: 'var(--borde-medio)', marginRight: '6px'}}/>
                        {venta.idVenta}
                      </td>
                      <td>
                        <div className="user-cell">
                          <FaUserTie style={{color: 'var(--gris-medio)'}}/>
                          {venta.vendedor}
                        </div>
                      </td>
                      <td style={{color: 'var(--texto-secundario)'}}>
                        <FaRegClock style={{marginRight: '5px'}}/> {venta.hora}
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <span className="badge-ingreso">Bs. {venta.precio.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)'}}>
                <FaShoppingCart size={40} style={{opacity: 0.2, marginBottom: '15px'}}/>
                <p>No hay registro de ventas recientes para este producto.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}