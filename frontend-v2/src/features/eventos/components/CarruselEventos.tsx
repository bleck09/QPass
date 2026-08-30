/* ============================================================================
 * CarruselEventos — coverflow 3D con arrastre (mouse + touch). Port fiel del
 * componente del frontend original. Reutilizado en la home pública y en el
 * panel del Usuario. Las matemáticas de posición se inyectan por CSS vars.
 * ========================================================================= */

import { useState, type CSSProperties } from 'react';
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaExpandArrowsAlt,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import { cn } from '@/shared/utils/cn';
import { formatearFecha } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { imagenEvento } from '../utils';
import type { Evento } from '../types/eventos.types';
import styles from './CarruselEventos.module.css';

interface CarruselEventosProps {
  eventos: Evento[];
  onAdquirir: (evento: Evento) => void;
}

export function CarruselEventos({ eventos, onAdquirir }: CarruselEventosProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [inicioX, setInicioX] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const siguiente = () => setActiveIdx((p) => (p + 1) % eventos.length);
  const anterior = () =>
    setActiveIdx((p) => (p - 1 + eventos.length) % eventos.length);

  const alEmpezarArrastre = (
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    setArrastrando(true);
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setInicioX(x);
  };

  const alTerminarArrastre = (
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    setArrastrando(false);
    if (inicioX === null) return;
    const x =
      'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const dif = inicioX - x;
    if (dif > 50) siguiente();
    else if (dif < -50) anterior();
    setInicioX(null);
  };

  if (eventos.length === 0) return null;

  const activo = eventos[activeIdx];

  return (
    <>
      <div
        className={styles.contenedor}
        onMouseDown={alEmpezarArrastre}
        onMouseUp={alTerminarArrastre}
        onMouseLeave={alTerminarArrastre}
        onTouchStart={alEmpezarArrastre}
        onTouchEnd={alTerminarArrastre}
      >
        {eventos.map((evento, index) => {
          const offset = index - activeIdx;
          const absOffset = Math.abs(offset);
          const dir = Math.sign(offset);
          const isActive = offset === 0;

          return (
            <div
              key={evento.id}
              className={cn(styles.card, isActive && styles.active)}
              style={
                {
                  '--offset': offset,
                  '--abs-offset': absOffset,
                  '--dir': dir,
                  zIndex: 10 - absOffset,
                } as CSSProperties
              }
              onClick={() => setActiveIdx(index)}
              onMouseEnter={() => {
                if (!arrastrando) setActiveIdx(index);
              }}
            >
              <div className={styles.imagen}>
                <img src={imagenEvento(evento)} alt={evento.nombre} />
                <div className={styles.gradiente} />
              </div>

              <button className={styles.btnExpandir} type="button" aria-hidden="true">
                <FaExpandArrowsAlt />
              </button>

              <div className={styles.contenido}>
                <h3>{evento.nombre}</h3>
                <p className={styles.desc}>
                  Vive la mejor experiencia con tecnología Cashless. Evita filas y
                  recarga desde tu celular.
                </p>

                <div className={styles.footer}>
                  <div className={styles.footerInfo}>
                    <span>
                      <FaMapMarkerAlt /> {evento.lugar}
                    </span>
                    <span>
                      <FaCalendarAlt /> {formatearFecha(evento.fecha)}
                    </span>
                  </div>
                  <div className={styles.footerPrecio}>
                    <span>Desde</span>
                    <strong>
                      {evento.precioDesde != null
                        ? formatearMoneda(evento.precioDesde)
                        : 'Consultar'}
                    </strong>
                  </div>
                </div>

                {isActive && (
                  <button
                    type="button"
                    className={styles.btnFull}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdquirir(evento);
                    }}
                  >
                    Adquirir entradas
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.pill}>
        <button type="button" onClick={anterior} aria-label="Anterior">
          <FaChevronLeft />
        </button>
        <div className={styles.pillInfo}>
          <img src={imagenEvento(activo)} alt="" />
          <div className={styles.pillTexto}>
            <strong>{activo.nombre}</strong>
            <span>{activo.lugar}</span>
          </div>
        </div>
        <button type="button" onClick={siguiente} aria-label="Siguiente">
          <FaChevronRight />
        </button>
      </div>
    </>
  );
}
