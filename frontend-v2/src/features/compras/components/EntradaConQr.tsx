/* ============================================================================
 * EntradaConQr — una entrada del usuario con su manilla (QR) para presentar en
 * el evento. `destacada` la muestra en grande (la próxima del usuario).
 * ========================================================================= */

import { Badge, Card, CodigoQr } from '@/shared/components/ui';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { ContadorRegresivo } from '@/features/eventos';
import type { MiEntrada } from '../compras';
import styles from './EntradaConQr.module.css';

interface Props {
  entrada: MiEntrada;
  destacada?: boolean;
}

export function EntradaConQr({ entrada, destacada = false }: Props) {
  const tamano = destacada ? 200 : 128;

  return (
    <Card className={destacada ? styles.destacada : undefined}>
      <div className={styles.cuerpo}>
        <div className={styles.qrZona}>
          {entrada.codigoQrVinculado ? (
            <CodigoQr
              valor={entrada.codigoQrVinculado.codigo}
              tamano={tamano}
              alt={`Manilla de ${entrada.nombre} para ${entrada.eventoNombre}`}
            />
          ) : (
            <p className={styles.sinManilla}>
              Manilla aún sin vincular. Te la entregan en el ingreso al evento.
            </p>
          )}
        </div>

        <div className={styles.info}>
          <h3 className={styles.titulo}>{entrada.eventoNombre}</h3>
          <p className={styles.meta}>{entrada.eventoLugar}</p>
          {entrada.eventoFecha && (
            <p className={styles.meta}>{formatearFechaHora(entrada.eventoFecha)}</p>
          )}
          {destacada && entrada.eventoFecha && (
            <div className={styles.contador}>
              <ContadorRegresivo fecha={entrada.eventoFecha} compacto />
            </div>
          )}
          <p className={styles.persona}>
            {entrada.nombre}
            {entrada.isTitular && <span className={styles.tag}> · titular</span>}
          </p>
          <div className={styles.badges}>
            {entrada.categoriaTicket && (
              <Badge tono="marca">{entrada.categoriaTicket.nombre}</Badge>
            )}
            <Badge tono={entrada.estadoIngreso === 'ingresado' ? 'exito' : 'neutro'}>
              {entrada.estadoIngreso === 'ingresado'
                ? 'Adentro'
                : entrada.estadoIngreso === 'salio'
                  ? 'Salió'
                  : 'Sin ingresar'}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
