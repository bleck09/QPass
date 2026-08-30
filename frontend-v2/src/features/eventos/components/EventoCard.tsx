/* ============================================================================
 * EventoCard — Manual 8.5. Jerarquía: imagen → nombre → metadatos → acciones.
 * Todas las tarjetas de una fila con la misma altura (grid en la página).
 * ========================================================================= */

import { Link } from 'react-router-dom';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { Button } from '@/shared/components/ui';
import { RUTAS } from '@/shared/constants/rutas';
import { EventoEstadoBadge } from './EventoEstadoBadge';
import type { Evento } from '../types/eventos.types';
import styles from './EventoCard.module.css';

interface EventoCardProps {
  evento: Evento;
  onEditar: (evento: Evento) => void;
  onFinalizar: (evento: Evento) => void;
}

export function EventoCard({ evento, onEditar, onFinalizar }: EventoCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.medios}>
        {evento.imagen ? (
          <img src={evento.imagen} alt="" loading="lazy" />
        ) : (
          <div className={styles.sinImagen} aria-hidden="true">
            {evento.nombre.charAt(0)}
          </div>
        )}
        <span className={styles.badge}>
          <EventoEstadoBadge estado={evento.estado} />
        </span>
      </div>

      <div className={styles.cuerpo}>
        <h3 className={styles.titulo}>{evento.nombre}</h3>
        <dl className={styles.meta}>
          <div>
            <dt>Lugar</dt>
            <dd>{evento.lugar}</dd>
          </div>
          <div>
            <dt>Inicio</dt>
            <dd>{formatearFechaHora(evento.fecha)}</dd>
          </div>
          {evento.precioDesde != null && (
            <div>
              <dt>Entradas desde</dt>
              <dd>{formatearMoneda(evento.precioDesde)}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className={styles.acciones}>
        <Link to={RUTAS.ADMIN_EVENTO_DETALLE(evento.id)}>
          <Button variante="secundario" tamano="sm">
            Configurar
          </Button>
        </Link>
        <Button variante="terciario" tamano="sm" onClick={() => onEditar(evento)}>
          Editar
        </Button>
        {evento.estado === 'activo' && (
          <Button variante="terciario" tamano="sm" onClick={() => onFinalizar(evento)}>
            Finalizar
          </Button>
        )}
      </div>
    </article>
  );
}
