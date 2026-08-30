/* ============================================================================
 * MisEntradasPanel — las entradas del usuario en sesión. Arriba, la próxima
 * (destacada, con su QR grande). Debajo, las demás próximas y, opcionalmente,
 * las de eventos ya pasados.
 * ========================================================================= */

import { useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useMisEntradas } from '../compras';
import { EntradaConQr } from './EntradaConQr';
import styles from './MisEntradasPanel.module.css';

export function MisEntradasPanel() {
  const { data, isPending, isError, refetch } = useMisEntradas();
  const [verPasadas, setVerPasadas] = useState(false);

  const { destacada, otrasProximas, pasadas } = useMemo(() => {
    const ahora = Date.now();
    const proximas = (data ?? [])
      .filter((e) => !e.eventoFecha || +new Date(e.eventoFecha) >= ahora)
      .sort((a, b) => +new Date(a.eventoFecha) - +new Date(b.eventoFecha));
    return {
      destacada: proximas[0] ?? null,
      otrasProximas: proximas.slice(1),
      pasadas: (data ?? []).filter(
        (e) => e.eventoFecha && +new Date(e.eventoFecha) < ahora,
      ),
    };
  }, [data]);

  if (isPending) return <EstadoCargando filas={3} />;
  if (isError)
    return <EstadoError mensaje="No pudimos cargar tus entradas." onReintentar={refetch} />;

  if (!data || data.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no tienes entradas"
        descripcion="Cuando una compra sea aprobada, tus entradas y su QR aparecerán aquí."
      />
    );
  }

  return (
    <div className={styles.panel}>
      {destacada && (
        <section>
          <h3 className={styles.h3}>Tu próxima entrada</h3>
          <EntradaConQr entrada={destacada} destacada />
        </section>
      )}

      {otrasProximas.length > 0 && (
        <section>
          <h3 className={styles.h3}>Otras entradas</h3>
          <div className={styles.grid}>
            {otrasProximas.map((e) => (
              <EntradaConQr key={e.id} entrada={e} />
            ))}
          </div>
        </section>
      )}

      {pasadas.length > 0 && (
        <section>
          <Button
            variante="terciario"
            onClick={() => setVerPasadas((v) => !v)}
            aria-expanded={verPasadas}
          >
            {verPasadas
              ? 'Ocultar entradas pasadas'
              : `Ver entradas pasadas (${pasadas.length})`}
          </Button>
          {verPasadas && (
            <div className={styles.grid}>
              {pasadas.map((e) => (
                <EntradaConQr key={e.id} entrada={e} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
