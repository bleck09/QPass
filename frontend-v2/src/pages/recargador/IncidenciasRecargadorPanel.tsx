/* ============================================================================
 * IncidenciasRecargadorPanel — incidencias que reportó este recargador en el
 * evento. Las resuelve el Admin; aquí solo se consultan.
 * ========================================================================= */

import { useMemo } from 'react';
import { Badge } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { useIncidencias } from '@/features/incidencias';
import styles from './RecargadorPage.module.css';

interface Props {
  eventoId: string;
  recargadorId: number;
}

export function IncidenciasRecargadorPanel({ eventoId, recargadorId }: Props) {
  const { data, isPending, isError, refetch } = useIncidencias({ eventoId });

  const mias = useMemo(
    () =>
      (data ?? [])
        .filter((i) => i.recargadorId === recargadorId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [data, recargadorId],
  );

  if (isPending) return <EstadoCargando filas={3} />;
  if (isError) return <EstadoError onReintentar={refetch} />;
  if (mias.length === 0)
    return <EstadoVacio titulo="No reportaste incidencias en este evento" />;

  return (
    <ul className={styles.incidencias}>
      {mias.map((i) => (
        <li key={i.id} className={styles.incidencia}>
          <div className={styles.incidenciaCabecera}>
            <strong>{i.entrada?.nombre ?? 'Participante'}</strong>
            <Badge tono={i.estado === 'pendiente' ? 'aviso' : 'exito'}>
              {i.estado === 'pendiente' ? 'Pendiente' : 'Resuelta'}
            </Badge>
          </div>
          <p className={styles.incidenciaNota}>{i.nota}</p>
          <p className={styles.incidenciaMeta}>
            Entregado {formatearMoneda(i.montoEntregado)}
            {i.montoSolicitado != null && ` · pedía ${formatearMoneda(i.montoSolicitado)}`}
            {i.ajusteAplicado != null &&
              ` · ajuste aplicado ${formatearMoneda(i.ajusteAplicado)}`}
            {' · '}
            {formatearFechaHora(i.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
