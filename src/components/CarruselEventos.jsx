import { useState } from 'react';
import {
  FaCalendarAlt, FaChevronLeft, FaChevronRight, FaMapMarkerAlt, FaExpandArrowsAlt
} from 'react-icons/fa';
import './PaginaPrincipal.css';

// Carrusel 3D de eventos reutilizado tanto en la home pública (PaginaPrincipal)
// como en la pestaña "Eventos" del panel privado del Usuario Normal.
export default function CarruselEventos({ eventos, onAdquirir }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const [touchStartX, setTouchStartX] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const nextSlide = () => setActiveIdx((prev) => (prev + 1) % eventos.length);
  const prevSlide = () => setActiveIdx((prev) => (prev - 1 + eventos.length) % eventos.length);

  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setTouchStartX(clientX);
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    if (touchStartX === null) return;

    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diferenciaX = touchStartX - clientX;

    if (diferenciaX > 50) {
      nextSlide();
    } else if (diferenciaX < -50) {
      prevSlide();
    }

    setTouchStartX(null);
  };

  if (eventos.length === 0) return null;

  return (
    <>
      <div
        className="carousel-3d-container"
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
      >
        {eventos.map((evento, index) => {
          const offset = index - activeIdx;
          const absOffset = Math.abs(offset);
          const direction = Math.sign(offset);
          const isActive = offset === 0;

          return (
            <div
              key={evento.id}
              className={`carousel-3d-card ${isActive ? 'active' : ''}`}
              style={{
                '--offset': offset,
                '--abs-offset': absOffset,
                '--dir': direction,
                zIndex: 10 - absOffset
              }}
              onClick={() => setActiveIdx(index)}
              onMouseEnter={() => {
                if (!isDragging) {
                  setActiveIdx(index);
                }
              }}
            >
              <div className="card-image-bg">
                <img src={evento.imagen} alt={evento.nombre} />
                <div className="card-overlay-gradient"></div>
              </div>

              <button className="btn-expand-icon glass-morphism"><FaExpandArrowsAlt/></button>

              <div className="card-3d-content">
                <h3>{evento.nombre}</h3>
                <p className="card-desc">Vive la mejor experiencia con tecnología Cashless. Evita filas y recarga desde tu celular.</p>

                <div className="card-3d-footer">
                  <div className="footer-info">
                    <span><FaMapMarkerAlt/> {evento.lugar}</span>
                    <span><FaCalendarAlt/> {evento.fecha}</span>
                  </div>
                  <div className="footer-price">
                    <span>Desde</span>
                    <strong>{evento.precio}</strong>
                  </div>
                </div>

                {isActive && (
                  <button className="btn-solid btn-full mt-15" onClick={(e) => { e.stopPropagation(); onAdquirir(evento); }}>
                    Adquirir Entradas
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="carousel-control-pill glass-morphism">
        <button onClick={prevSlide}><FaChevronLeft/></button>
        <div className="pill-info">
          <img src={eventos[activeIdx].imagen} alt="thumb" />
          <div className="pill-text">
            <strong>{eventos[activeIdx].nombre}</strong>
            <span>{eventos[activeIdx].categoria}</span>
          </div>
        </div>
        <button onClick={nextSlide}><FaChevronRight/></button>
      </div>
    </>
  );
}
