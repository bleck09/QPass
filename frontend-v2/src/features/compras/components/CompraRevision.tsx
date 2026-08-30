/* Revisión de una compra por el Admin: comprobante + entradas, y aprobar
 * (muestra las contraseñas generadas para invitados) o rechazar. */

import { useState } from 'react';
import { Alert, Button, Textarea } from '@/shared/components/ui';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { EstadoCompraBadge } from './EstadoCompraBadge';
import type { Compra } from '../compras';
import styles from './CompraRevision.module.css';

interface CompraRevisionProps {
  compra: Compra;
  aprobando?: boolean;
  rechazando?: boolean;
  errorApi?: string;
  passwordsGeneradas?: Record<string, string> | null;
  onAprobar: () => void;
  onRechazar: (motivo: string) => void;
}

export function CompraRevision({
  compra,
  aprobando,
  rechazando,
  errorApi,
  passwordsGeneradas,
  onAprobar,
  onRechazar,
}: CompraRevisionProps) {
  const [motivo, setMotivo] = useState('');
  const pendiente = compra.estado === 'pendiente';

  return (
    <div className={styles.detalle}>
      {errorApi && <Alert tipo="error">{errorApi}</Alert>}

      <div className={styles.cabecera}>
        <EstadoCompraBadge estado={compra.estado} />
        <span className={styles.comprador}>
          {compra.comprador?.nombre} · {compra.comprador?.email}
        </span>
      </div>

      {compra.comprobanteUrl && (
        <div>
          <p className={styles.label}>Comprobante</p>
          <img
            className={styles.comprobante}
            src={compra.comprobanteUrl}
            alt="Comprobante de pago"
          />
        </div>
      )}

      <div>
        <p className={styles.label}>
          Entradas ({compra.entradas.length}) · Total{' '}
          {formatearMoneda(compra.montoTotal)}
        </p>
        <ul className={styles.entradas}>
          {compra.entradas.map((e) => (
            <li key={e.id}>
              <span>
                <strong>{e.nombre}</strong>
                {e.isTitular && ' · titular'} · {e.correo}
                {e.categoriaTicket && ` · ${e.categoriaTicket.nombre}`}
              </span>
              {passwordsGeneradas?.[e.id] && (
                <code className={styles.pass}>{passwordsGeneradas[e.id]}</code>
              )}
            </li>
          ))}
        </ul>
      </div>

      {passwordsGeneradas && Object.keys(passwordsGeneradas).length > 0 && (
        <Alert tipo="aviso" titulo="Contraseñas generadas">
          Anótalas y compártelas con cada invitado: no se vuelven a mostrar (no
          hay envío de correo).
        </Alert>
      )}

      {compra.estado === 'rechazado' && compra.motivoRechazo && (
        <Alert tipo="error" titulo="Motivo del rechazo">
          {compra.motivoRechazo}
        </Alert>
      )}

      {pendiente && (
        <div className={styles.acciones}>
          <Textarea
            label="Motivo (solo si rechazas)"
            rows={2}
            opcional
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className={styles.botones}>
            <Button
              variante="destructivo"
              cargando={rechazando}
              onClick={() => onRechazar(motivo.trim())}
            >
              Rechazar
            </Button>
            <Button onClick={onAprobar} cargando={aprobando}>
              Aprobar compra
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
