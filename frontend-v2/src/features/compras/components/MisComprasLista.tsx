/* Lista de compras del usuario, con estado, entradas y su QR vinculado. */

import { Alert, Badge, Button, Card } from '@/shared/components/ui';
import { formatearFecha } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { EstadoCompraBadge } from './EstadoCompraBadge';
import type { Compra } from '../compras';
import styles from './MisComprasLista.module.css';

const ESTADO_INGRESO: Record<string, string> = {
  pendiente: 'Sin ingresar',
  ingresado: 'Adentro',
  salio: 'Salió',
};

interface MisComprasListaProps {
  compras: Compra[];
  /** Habilita "Reportar dato" en las entradas de compras confirmadas. */
  onReportar?: (compraId: string, entradaId: string) => void;
}

export function MisComprasLista({ compras, onReportar }: MisComprasListaProps) {
  return (
    <div className={styles.lista}>
      {compras.map((c) => (
        <Card key={c.id}>
          <div className={styles.cabecera}>
            <div>
              <h3 className={styles.titulo}>{c.evento?.nombre ?? 'Evento'}</h3>
              <p className={styles.fecha}>Comprada el {formatearFecha(c.createdAt)}</p>
            </div>
            <EstadoCompraBadge estado={c.estado} />
          </div>

          {c.estado === 'rechazado' && c.motivoRechazo && (
            <Alert tipo="error" titulo="Motivo del rechazo">
              {c.motivoRechazo}
            </Alert>
          )}

          <ul className={styles.entradas}>
            {c.entradas.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{e.nombre}</strong>
                  {e.isTitular && <span className={styles.tag}> · titular</span>}
                  <span className={styles.cat}>
                    {e.categoriaTicket ? ` · ${e.categoriaTicket.nombre}` : ''}
                  </span>
                </div>
                <div className={styles.estados}>
                  {c.estado === 'confirmado' && (
                    <Badge tono={e.codigoQrVinculado ? 'exito' : 'neutro'}>
                      {e.codigoQrVinculado
                        ? `QR ${e.codigoQrVinculado.codigo}`
                        : 'Sin manilla'}
                    </Badge>
                  )}
                  <Badge tono="neutro">{ESTADO_INGRESO[e.estadoIngreso]}</Badge>
                  {onReportar && c.estado === 'confirmado' && !e.isTitular && (
                    <Button
                      variante="terciario"
                      tamano="sm"
                      onClick={() => onReportar(c.id, e.id)}
                    >
                      Reportar dato
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.total}>
            Total: <strong>{formatearMoneda(c.montoTotal)}</strong>
          </div>
        </Card>
      ))}
    </div>
  );
}
