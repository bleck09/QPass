/* ============================================================================
 * UsuarioInicioPage (/usuario) — el Usuario ve eventos activos, compra entradas
 * y consulta sus compras.
 * ========================================================================= */

import { useState } from 'react';
import { Button, Card, Modal } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { useEventos } from '@/features/eventos';
import {
  ComprarEntradasForm,
  MisComprasLista,
  useCrearCompra,
  useMisCompras,
} from '@/features/compras';
import { ReportarDatoModal } from '@/features/reportes-entrada';
import styles from './UsuarioInicioPage.module.css';

export function UsuarioInicioPage() {
  useTituloPagina('Inicio');

  const eventos = useEventos();
  const compras = useMisCompras();
  const crear = useCrearCompra();
  const [comprarEn, setComprarEn] = useState<string | null>(null);
  const [reportar, setReportar] = useState<{ compraId: string; entradaId: string } | null>(
    null,
  );

  const activos = eventos.data?.filter((e) => e.estado === 'activo') ?? [];

  const cerrar = () => {
    setComprarEn(null);
    crear.reset();
  };

  return (
    <div className={styles.pagina}>
      <section>
        <h2 className={styles.h2}>Eventos disponibles</h2>
        {eventos.isPending && <EstadoCargando filas={2} />}
        {eventos.isError && <EstadoError onReintentar={eventos.refetch} />}
        {eventos.data && activos.length === 0 && (
          <EstadoVacio titulo="No hay eventos activos por ahora" />
        )}
        <div className={styles.grid}>
          {activos.map((e) => (
            <Card key={e.id}>
              <h3 className={styles.titulo}>{e.nombre}</h3>
              <p className={styles.meta}>{e.lugar}</p>
              <p className={styles.meta}>{formatearFechaHora(e.fecha)}</p>
              {e.precioDesde != null && (
                <p className={styles.precio}>
                  Desde {formatearMoneda(e.precioDesde)}
                </p>
              )}
              <div className={styles.accion}>
                <Button tamano="sm" onClick={() => setComprarEn(e.id)}>
                  Comprar entradas
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.h2}>Mis compras</h2>
        {compras.isPending && <EstadoCargando filas={2} />}
        {compras.isError && <EstadoError onReintentar={compras.refetch} />}
        {compras.data && compras.data.length === 0 && (
          <EstadoVacio
            titulo="Todavía no compraste entradas"
            descripcion="Elige un evento disponible para empezar."
          />
        )}
        {compras.data && compras.data.length > 0 && (
          <MisComprasLista
            compras={compras.data}
            onReportar={(compraId, entradaId) => setReportar({ compraId, entradaId })}
          />
        )}
      </section>

      <Modal
        abierto={comprarEn !== null}
        onCerrar={cerrar}
        titulo="Comprar entradas"
        acciones={null}
        bloquearCierreFuera
      >
        {comprarEn && (
          <ComprarEntradasForm
            eventoId={comprarEn}
            cargando={crear.isPending}
            errorApi={crear.error?.mensaje}
            onCancelar={cerrar}
            onGuardar={(dto) => crear.mutate(dto, { onSuccess: cerrar })}
          />
        )}
      </Modal>

      {reportar && (
        <ReportarDatoModal
          abierto
          compraId={reportar.compraId}
          entradaId={reportar.entradaId}
          onCerrar={() => setReportar(null)}
        />
      )}
    </div>
  );
}
