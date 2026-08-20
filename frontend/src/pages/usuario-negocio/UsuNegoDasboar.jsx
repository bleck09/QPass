import { useState, useEffect } from 'react';
import { 
  FaStore, FaDollarSign, FaUsers, FaShoppingCart, 
  FaChartBar, FaTrophy, FaMedal, FaArrowLeft, FaBoxOpen, FaEye, 
  FaUserTie, FaSearch, FaRegClock, FaTag
} from 'react-icons/fa';
import './UsuNegoDasboar.css';

// ==============================================================
// DATOS DE PRUEBA
// ==============================================================
const mockDashboardData = {
  totalIngresos: 3630,
  totalVentas: 310,
  puestosActivos: 3,
  totalAyudantes: 7,
  topProductos: [
    { id: 101, nombre: 'Combo Pizza Familiar', ventas: 45, ingresos: 900 },
    { id: 102, nombre: 'Pollo Entero a la Leña', ventas: 38, ingresos: 760 },
    { id: 103, nombre: 'Cerveza Artesanal', ventas: 60, ingresos: 300 }
  ],
  // AHORA LOS AYUDANTES TIENEN UN ARRAY DE SUCURSALES (Pueden estar en varias)
  listaAyudantes: [
    { id: 1, nombre: 'Carlos Ruiz', sucursales: ['Pizzas El Paso', 'Pollos Doña María'], rol: 'Ayudante', avatar: 'CR' },
    { id: 2, nombre: 'Ana Gómez', sucursales: ['Pizzas El Paso'], rol: 'Ayudante', avatar: 'AG' },
    { id: 3, nombre: 'Luis Arce', sucursales: ['Pollos Doña María'], rol: 'Ayudante', avatar: 'LA' },
    { id: 4, nombre: 'María Paz', sucursales: ['Pollos Doña María', 'Licoreria'], rol: 'Ayudante', avatar: 'MP' },
    { id: 5, nombre: 'Jorge Luna', sucursales: ['Bebidas Oasis', 'Pizzas El Paso'], rol: 'Ayudante', avatar: 'JL' },
    { id: 6, nombre: 'Erick Maldonado', sucursales: ['Licoreria'], rol: 'Ayudante', avatar: 'MP' }
  ],
  ventasPorPuesto: [
    { 
      id: 1, nombre: 'Pizzas El Paso', ingresos: 1650, ventas: 120, ayudantes: 2,
      productos: [
        { 
          id: 101, nombre: 'Combo Pizza Familiar', precio: 20, ventas: 45, ingresos: 900,
          historial: [
            { idVenta: 'V-1001', hora: '19:30', vendedor: 'Carlos Ruiz', precio: 20 },
            { idVenta: 'V-1005', hora: '20:15', vendedor: 'Ana Gómez', precio: 20 },
            { idVenta: 'V-1012', hora: '21:00', vendedor: 'Carlos Ruiz', precio: 20 }
          ]
        },
        { 
          id: 104, nombre: 'Pizza Personal', precio: 15, ventas: 50, ingresos: 750,
          historial: [
            { idVenta: 'V-1002', hora: '19:35', vendedor: 'Ana Gómez', precio: 15 }
          ]
        }
      ]
    },
    { 
      id: 2, nombre: 'Pollos Doña María', ingresos: 720, ventas: 95, ayudantes: 2,
      productos: [
        { 
          id: 102, nombre: 'Pollo Entero a la Leña', precio: 20, ventas: 38, ingresos: 100,
          historial: [
            { vendedor: 'Juan Miguel', hora: '18:45', Comprador: 'Luis Arce', precio: 20 },
            { vendedor: 'Juan Perez', hora: '19:20', Comprador: 'María Paz', precio: 20 }
          ]
        },
        { 
          id: 102, nombre: 'Pollo Entero a la Leña', precio: 20, ventas: 38, ingresos: 420,
          historial: [
            { vendedor: 'Juan Miguel', hora: '18:45', Comprador: 'Luis Arce', precio: 20 },
            { vendedor: 'Juan Perez', hora: '19:20', Comprador: 'María Paz', precio: 20 }
          ]
        },
        { 
          id: 102, nombre: 'Pollo Entero a la Leña', precio: 20, ventas: 38, ingresos: 200,
          historial: [
            { vendedor: 'Juan Miguel', hora: '18:45', Comprador: 'Luis Arce', precio: 20 },
            { vendedor: 'Juan Perez', hora: '19:20', Comprador: 'María Paz', precio: 20 }
          ]
        }
      ]
    },
    { 
      id: 3, nombre: 'Licoreria', ingresos: 1260, ventas: 95, ayudantes: 3,
      productos: [
        { 
          id: 102, nombre: 'Coca cola', precio: 20, ventas: 38, ingresos: 760,
          historial: [
            { vendedor: 'Juan Miguel', hora: '18:45', Comprador: 'Luis Arce', precio: 20 },
            { vendedor: 'Juan Perez', hora: '19:20', Comprador: 'María Paz', precio: 20 }
          ]
        },
        { 
          id: 103, nombre: 'wisky', precio: 20, ventas: 38, ingresos: 500,
          historial: [
            { vendedor: 'Juan Miguel', hora: '18:45', Comprador: 'Luis Arce', precio: 20 },
            { vendedor: 'Juan Perez', hora: '19:20', Comprador: 'María Paz', precio: 20 }
          ]
        }
      ]
    }
  ]
};

export default function UsuNegoDasboar() {
  const [data] = useState(mockDashboardData);
  const [cargarGrafico, setCargarGrafico] = useState(false);
  
  // SISTEMA DE VISTAS (PANTALLA COMPLETA)
  // 'GENERAL' | 'SUCURSAL' | 'AYUDANTES' | 'PRODUCTO'
  const [vistaActual, setVistaActual] = useState('GENERAL');
  
  // Datos temporales de la vista seleccionada
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // Efecto para animar barras sin error de React
  useEffect(() => {
    const timer = setTimeout(() => setCargarGrafico(true), 100);
    return () => {
      clearTimeout(timer);
      setCargarGrafico(false);
    };
  }, [vistaActual]);

  // ==============================================================
  // RENDER: 1. VISTA DASHBOARD GENERAL
  // ==============================================================
  if (vistaActual === 'GENERAL') {
    const maxIngresoGeneral = Math.max(...data.ventasPorPuesto.map(p => p.ingresos), 1);

    return (
      <div className="pi-dashboard-container animate-fade">
        <div className="pi-dashboard-header">
          <h2>Dashboard General</h2>
          <p>Resumen global de todos tus puestos y personal asignado.</p>
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
          
          <h2 className="pi-fullpage-title">Personal Asignado</h2>
          
          <div className="pi-search-bar-dummy">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Buscar por nombre o sucursal..." />
          </div>

          <div className="pi-dashboard-table-wrapper">
            <table className="pi-dashboard-table clean-table">
              <thead>
                <tr>
                  <th>Ayudante</th>
                  <th>Rol</th>
                  <th>Sucursales Asignadas</th>
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
                    <td style={{ color: 'var(--texto-secundario)' }}>{ayudante.rol}</td>
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
            <h2 style={{marginTop: '15px'}}>{sucursalSeleccionada.nombre}</h2>
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
                  <th>Producto Vendido</th>
                  <th style={{ textAlign: 'center' }}>Precio Unit.</th>
                  <th style={{ textAlign: 'center' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Total Generado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
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
          
          <h2 className="pi-fullpage-title">Historial: {productoSeleccionado.nombre}</h2>
          
          <div className="pi-search-bar-dummy">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Buscar por vendedor o ID de venta..." />
          </div>

          <div className="pi-dashboard-table-wrapper">
            {productoSeleccionado.historial && productoSeleccionado.historial.length > 0 ? (
              <table className="pi-dashboard-table clean-table">
                <thead>
                  <tr>
                    <th>ID Venta</th>
                    <th>Vendedor</th>
                    <th>Hora</th>
                    <th style={{textAlign: 'right'}}>Precio Pagado</th>
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