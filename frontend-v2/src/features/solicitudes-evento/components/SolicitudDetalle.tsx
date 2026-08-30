/* ============================================================================
 * SolicitudDetalle — vista de revisión del Admin: datos completos + acciones
 * aprobar / rechazar (con motivo obligatorio).
 * ========================================================================= */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Textarea } from '@/shared/components/ui';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { SolicitudEstadoBadge } from './SolicitudEstadoBadge';
import { rechazoSchema, type RechazoFormValues } from '../schemas/solicitud.schema';
import type { SolicitudEvento } from '../types/solicitudes.types';
import styles from './SolicitudDetalle.module.css';

interface SolicitudDetalleProps {
  solicitud: SolicitudEvento;
  aprobando?: boolean;
  rechazando?: boolean;
  errorApi?: string;
  onAprobar: () => void;
  onRechazar: (motivo: string) => void;
}

export function SolicitudDetalle({
  solicitud,
  aprobando,
  rechazando,
  errorApi,
  onAprobar,
  onRechazar,
}: SolicitudDetalleProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RechazoFormValues>({ resolver: zodResolver(rechazoSchema) });

  const pendiente = solicitud.estado === 'pendiente';

  return (
    <div className={styles.detalle}>
      {errorApi && <Alert tipo="error">{errorApi}</Alert>}

      <div className={styles.cabecera}>
        <SolicitudEstadoBadge estado={solicitud.estado} />
        {solicitud.cliente && (
          <span className={styles.cliente}>
            {solicitud.cliente.nombre} · {solicitud.cliente.email}
          </span>
        )}
      </div>

      <dl className={styles.datos}>
        <div>
          <dt>Nombre</dt>
          <dd>{solicitud.nombreEvento}</dd>
        </div>
        <div>
          <dt>Lugar</dt>
          <dd>{solicitud.lugar}</dd>
        </div>
        <div>
          <dt>Inicio</dt>
          <dd>{formatearFechaHora(solicitud.fecha)}</dd>
        </div>
        <div>
          <dt>Fin</dt>
          <dd>{formatearFechaHora(solicitud.fechaFin)}</dd>
        </div>
        <div className={styles.ancho}>
          <dt>Descripción</dt>
          <dd>{solicitud.descripcion}</dd>
        </div>
      </dl>

      <div className={styles.bloque}>
        <h4>Actividades</h4>
        <ul>
          {solicitud.actividades.map((a, i) => (
            <li key={i}>
              <strong>{a.titulo}</strong> — {a.descripcion}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.bloque}>
        <h4>Cronograma</h4>
        <ul>
          {solicitud.cronograma.map((c, i) => (
            <li key={i}>
              <strong>{c.hora}</strong> — {c.actividad}
            </li>
          ))}
        </ul>
      </div>

      {solicitud.estado === 'rechazado' && solicitud.motivoRechazo && (
        <Alert tipo="error" titulo="Motivo del rechazo">
          {solicitud.motivoRechazo}
        </Alert>
      )}
      {solicitud.estado === 'aprobado' && (
        <Alert tipo="exito">
          Aprobada. Se creó el evento correspondiente.
        </Alert>
      )}

      {pendiente && (
        <form
          className={styles.acciones}
          onSubmit={handleSubmit((v) => onRechazar(v.motivoRechazo))}
          noValidate
        >
          <Textarea
            label="Motivo (solo si rechazas)"
            rows={2}
            opcional
            error={errors.motivoRechazo?.message}
            {...register('motivoRechazo')}
          />
          <div className={styles.botones}>
            <Button variante="destructivo" type="submit" cargando={rechazando}>
              Rechazar
            </Button>
            <Button type="button" onClick={onAprobar} cargando={aprobando}>
              Aprobar y crear evento
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
