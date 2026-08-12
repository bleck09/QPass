import { useState, useEffect } from 'react';
import { 
  FaStore, FaDollarSign, FaUsers, FaShoppingCart, 
  FaChartBar, FaTrophy, FaMedal
} from 'react-icons/fa';
import './UsuNegoDasboar.css';

// Datos de prueba simulando las ventas en tiempo real de la fiesta
const mockDashboardData = {
  totalIngresos: 4580.50,
  totalVentas: 312,
  puestosActivos: 3,
  totalAyudantes: 5,
  // Rendimiento de cada puesto
  ventasPorPuesto: [
    { id: 1, nombre: 'Pizzas El Paso', ingresos: 2100.00, ventas: 120, ayudantes: 2 },
    { id: 2, nombre: 'Pollos Doña María', ingresos: 1850.50, ventas: 95, ayudantes: 2 },
    { id: 3, nombre: 'Bebidas Oasis', ingresos: 630.00, ventas: 97, ayudantes: 1 }
  ],
  // Los productos más vendidos
  topProductos: [
    { id: 101, nombre: 'Combo Pizza Familiar', ventas: 45, ingresos: 900 },
    { id: 102, nombre: 'Pollo Entero a la Leña', ventas: 38, ingresos: 760 },
    { id: 103, nombre: 'Cerveza Artesanal', ventas: 60, ingresos: 300 }
  ]
};

export default function UsuNegoDasboar() {
  const [data] = useState(mockDashboardData);
  const [cargarGrafico, setCargarGrafico] = useState(false);

  // Efecto para animar las barras del gráfico al entrar a la pantalla
  useEffect(() => {
    setTimeout(() => setCargarGrafico(true), 100);
  }, []);

  // Lógica para el gráfico de barras: Encontrar el ingreso máximo para calcular las alturas relativas
  const maxIngreso = Math.max(...data.ventasPorPuesto.map(p => p.ingresos), 1); // Evitar división por cero

  return (
    <div className="pi-dashboard-container">
      
      {/* Cabecera */}
      <div className="pi-dashboard-header">
        <h2>Dashboard de Negocio</h2>
        <p>Resumen en tiempo real del rendimiento de tus puestos y productos.</p>
      </div>

      {/* =========================================
          1. KPIs GENERALES (Tarjetas superiores)
      ========================================= */}
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
            <span className="micro-etiqueta">Ventas Realizadas</span>
            <h3 className="numero-grande">{data.totalVentas}</h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper icon-puestos"><FaStore /></div>
          <div className="kpi-info">
            <span className="micro-etiqueta">Puestos Activos</span>
            <h3 className="numero-grande">{data.puestosActivos}</h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper icon-ayudantes"><FaUsers /></div>
          <div className="kpi-info">
            <span className="micro-etiqueta">Personal Asignado</span>
            <h3 className="numero-grande">{data.totalAyudantes}</h3>
          </div>
        </div>

      </div>

      {/* =========================================
          2. GRÁFICOS Y TOP PRODUCTOS
      ========================================= */}
      <div className="pi-dashboard-charts-grid">
        
        {/* Gráfico de Barras CSS Puro */}
        <div className="pi-dashboard-card chart-section">
          <div className="card-header">
            <h3><FaChartBar className="icon-title" /> Ingresos por Puesto</h3>
          </div>
          
          <div className="css-bar-chart">
            {data.ventasPorPuesto.map((puesto) => {
              // Calculamos qué porcentaje de altura debe tener la barra
              const alturaPorcentaje = cargarGrafico ? (puesto.ingresos / maxIngreso) * 100 : 0;
              
              return (
                <div key={puesto.id} className="bar-column">
                  <span className="bar-value">Bs. {puesto.ingresos.toFixed(0)}</span>
                  <div className="bar-track">
                    <div 
                      className="bar-fill" 
                      style={{ height: `${alturaPorcentaje}%` }}
                    ></div>
                  </div>
                  <span className="bar-label">{puesto.nombre}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking de Productos */}
        <div className="pi-dashboard-card top-section">
          <div className="card-header">
            <h3><FaTrophy className="icon-title" color="var(--ambar-aviso)" /> Top Productos</h3>
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
                <div className="top-ingreso">
                  Bs. {prod.ingresos.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* =========================================
          3. TABLA DE RENDIMIENTO POR PUESTO
      ========================================= */}
      <div className="pi-dashboard-card">
        <div className="card-header">
          <h3><FaStore className="icon-title" /> Rendimiento Detallado por Sucursal</h3>
        </div>

        <div className="pi-dashboard-table-wrapper">
          <table className="pi-dashboard-table">
            <thead>
              <tr>
                <th>Nombre del Puesto</th>
                <th style={{ textAlign: 'center' }}>Ayudantes</th>
                <th style={{ textAlign: 'center' }}>Cant. Ventas</th>
                <th style={{ textAlign: 'right' }}>Total Recaudado</th>
              </tr>
            </thead>
            <tbody>
              {data.ventasPorPuesto.map(puesto => (
                <tr key={puesto.id}>
                  <td className="fila-nombre">
                    <FaStore style={{ color: 'var(--gris-medio)', marginRight: '8px' }}/>
                    {puesto.nombre}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge-ayudante">{puesto.ayudantes}</span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--texto-principal)' }}>
                    {puesto.ventas}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="badge-ingreso">Bs. {puesto.ingresos.toFixed(2)}</span>
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