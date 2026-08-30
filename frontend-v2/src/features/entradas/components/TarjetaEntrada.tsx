/* Ficha de una Entrada escaneada: foto, nombre, categoría, saldo y estado. */

import type { ReactNode } from 'react';
import { Badge } from '@/shared/components/ui';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import type { Entrada } from '../entradas';
import styles from './TarjetaEntrada.module.css';

const ESTADO: Record<string, { tono: 'exito' | 'neutro' | 'aviso'; texto: string }> = {
  pendiente: { tono: 'neutro', texto: 'Sin ingresar' },
  ingresado: { tono: 'exito', texto: 'Adentro' },
  salio: { tono: 'aviso', texto: 'Salió' },
};

interface TarjetaEntradaProps {
  entrada: Entrada;
  /** Muestra el saldo de la billetera (Recargador / Ayudante / Devolución). */
  mostrarSaldo?: boolean;
  children?: ReactNode;
}

export function TarjetaEntrada({
  entrada,
  mostrarSaldo = false,
  children,
}: TarjetaEntradaProps) {
  const est = ESTADO[entrada.estadoIngreso];
  const foto = entrada.foto ?? entrada.usuario?.foto ?? null;

  return (
    <div className={styles.tarjeta}>
      <div className={styles.cabecera}>
        {foto ? (
          <img className={styles.foto} src={foto} alt="" />
        ) : (
          <div className={styles.foto} aria-hidden="true">
            {entrada.nombre.charAt(0)}
          </div>
        )}
        <div>
          <p className={styles.nombre}>{entrada.nombre}</p>
          <p className={styles.sub}>
            {entrada.categoriaTicket?.nombre ?? 'Sin categoría'}
            {entrada.codigoQrVinculado
              ? ` · ${entrada.codigoQrVinculado.codigo}`
              : ''}
          </p>
        </div>
      </div>

      <div className={styles.meta}>
        <Badge tono={est.tono}>{est.texto}</Badge>
        {mostrarSaldo && entrada.usuario && (
          <span className={styles.saldo}>
            Saldo: <strong>{formatearMoneda(entrada.usuario.saldo)}</strong>
          </span>
        )}
      </div>

      {children && <div className={styles.acciones}>{children}</div>}
    </div>
  );
}
