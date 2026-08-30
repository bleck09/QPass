import { Alert, Button, Card } from '@/shared/components/ui';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { SolicitudEstadoBadge } from './SolicitudEstadoBadge';
import type { SolicitudEvento } from '../types/solicitudes.types';
import styles from './SolicitudCard.module.css';

interface SolicitudCardProps {
  solicitud: SolicitudEvento;
  onEditar: (solicitud: SolicitudEvento) => void;
}

export function SolicitudCard({ solicitud, onEditar }: SolicitudCardProps) {
  const editable = solicitud.estado !== 'aprobado';

  return (
    <Card>
      <div className={styles.cabecera}>
        <h3 className={styles.titulo}>{solicitud.nombreEvento}</h3>
        <SolicitudEstadoBadge estado={solicitud.estado} />
      </div>

      <dl className={styles.meta}>
        <div>
          <dt>Lugar</dt>
          <dd>{solicitud.lugar}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{formatearFechaHora(solicitud.fecha)}</dd>
        </div>
      </dl>

      {solicitud.estado === 'rechazado' && solicitud.motivoRechazo && (
        <Alert tipo="error" titulo="Motivo del rechazo">
          {solicitud.motivoRechazo}
        </Alert>
      )}
      {solicitud.estado === 'aprobado' && (
        <Alert tipo="exito">Aprobada. Tu evento ya está activo.</Alert>
      )}

      {editable && (
        <div className={styles.pie}>
          <Button variante="secundario" tamano="sm" onClick={() => onEditar(solicitud)}>
            {solicitud.estado === 'rechazado' ? 'Editar y reenviar' : 'Editar'}
          </Button>
        </div>
      )}
    </Card>
  );
}
