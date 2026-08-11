import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChartLine, FaClock } from 'react-icons/fa';
import './App.css'; 

// PALETA DE COLORES ELEGANTE Y DE ALTO CONTRASTE
const defaultLandingData = {
  titulo: 'Plataforma de Gestión Financiera',
  informacion: 'Sistema centralizado para el control, monitoreo y auditoría de ingresos diarios. Optimiza los procesos de recarga y devoluciones con total transparencia y eficacia en tiempo real.',
  imagen: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  colorPrimario: '#2563eb',     // Azul Rey (Resalta muy bien en botones y detalles)
  colorFondo: '#f8fafc',        // Gris ultra claro (Casi blanco, da aspecto limpio)
  colorTextoTitulo: '#0f172a',  // Azul pizarra muy oscuro (Casi negro, excelente lectura)
  colorTextoP: '#334155',       // Gris oscuro (Perfecto para párrafos)
  actividades: [
    { icono: '💵', titulo: 'Recaudación Diaria', descripcion: 'Registro exacto de todos los ingresos generados en los puntos de recarga.' },
    { icono: '📊', titulo: 'Auditoría Continua', descripcion: 'Supervisión de transacciones para garantizar que no existan descuadres.' },
    { icono: '🔁', titulo: 'Gestión de Devoluciones', descripcion: 'Proceso rápido y documentado para cualquier ajuste o reembolso necesario.' }
  ],
  cronograma: [
    { hora: '08:00', actividad: 'Apertura del sistema y asignación de saldos iniciales' },
    { hora: '13:00', actividad: 'Arqueo de caja y revisión de medio turno' },
    { hora: '18:30', actividad: 'Cierre general, conciliación y envío de reportes finales' }
  ]
};

export default function App() {
  const navigate = useNavigate();

  // Leemos el localStorage
  const [data] = useState(() => {
    const dataGuardada = localStorage.getItem('pi_landing_config');
    return dataGuardada ? JSON.parse(dataGuardada) : defaultLandingData;
  });

  const handleLoginClick = () => {
    navigate('/login');
  };

  // Inyectamos TODOS los colores dinámicamente con la protección de fallbacks
  const estiloDinamico = {
    '--color-primario': data.colorPrimario || defaultLandingData.colorPrimario,
    '--color-fondo': data.colorFondo || defaultLandingData.colorFondo,
    '--color-texto-titulo': data.colorTextoTitulo || defaultLandingData.colorTextoTitulo,
    '--color-texto-p': data.colorTextoP || defaultLandingData.colorTextoP,
  };

  return (
    <div className="pi-landing-container" style={estiloDinamico}>
      
      {/* Barra de Navegación */}
      <nav className="pi-landing-navbar">
        <div className="pi-landing-logo" style={{ color: 'var(--color-primario)' }}>
          <FaChartLine size={28} />
          Proyecto de Ingresos
        </div>
        <button 
          className="pi-landing-btn-nav" 
          style={{ backgroundColor: 'var(--color-primario)' }}
          onClick={handleLoginClick}
        >
          Iniciar Sesión
        </button>
      </nav>

      {/* Sección Principal (Hero) - Aplicando colores de fondo y texto */}
      <header className="pi-landing-hero" style={{ backgroundColor: 'var(--color-fondo)' }}>
        <div className="pi-landing-hero-content">
          <h1 style={{ color: 'var(--color-texto-titulo)' }}>{data.titulo}</h1>
          <p style={{ color: 'var(--color-texto-p)' }}>{data.informacion}</p>
          <button 
            className="pi-landing-btn-primary" 
            style={{ backgroundColor: 'var(--color-primario)' }}
            onClick={handleLoginClick}
          >
            Ingresar al Portal
          </button>
        </div>
        <div className="pi-landing-hero-image">
          <img src={data.imagen} alt="Dashboard de Gestión" />
        </div>
      </header>

      {/* Sección de Actividades Dinámica */}
      <section className="pi-landing-section pi-landing-bg-white">
        <h2 className="pi-landing-section-title" style={{ color: 'var(--color-primario)' }}>
          Nuestras Actividades Clave
        </h2>
        <div className="pi-landing-grid">
          {data.actividades.map((actividad, index) => (
            <div 
              key={index} 
              className="pi-landing-card" 
              style={{ borderTopColor: 'var(--color-primario)' }}
            >
              <div className="pi-landing-card-icon">{actividad.icono}</div>
              <h3 style={{ color: 'var(--color-texto-titulo)' }}>{actividad.titulo}</h3>
              <p style={{ color: 'var(--color-texto-p)' }}>{actividad.descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sección de Cronograma Dinámica */}
      <section className="pi-landing-section pi-landing-bg-gray">
        <h2 className="pi-landing-section-title" style={{ color: 'var(--color-primario)' }}>
          Cronograma Diario
        </h2>
        <div className="pi-landing-table-wrapper">
          <table className="pi-landing-table">
            <thead>
              <tr>
                <th style={{ backgroundColor: 'var(--color-primario)', color: '#ffffff' }}>Hora</th>
                <th style={{ backgroundColor: 'var(--color-primario)', color: '#ffffff' }}>Actividad Programada</th>
              </tr>
            </thead>
            <tbody>
              {data.cronograma.map((item, index) => (
                <tr key={index}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--color-texto-titulo)' }}>
                      <FaClock color="var(--color-primario)" /> {item.hora}
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-texto-p)' }}>{item.actividad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="pi-landing-footer">
        <p>&copy; {new Date().getFullYear()} Proyecto de Ingresos. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}