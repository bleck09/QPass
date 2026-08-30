/* ============================================================================
 * UsuarioInicioPage (/usuario) — el asistente: compra entradas, ve sus entradas
 * con su QR y consulta su saldo. Tres pestañas.
 * ========================================================================= */

import { useState } from 'react';
import { Button, Card, Modal, Tabs, type Tab } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { useSesion } from '@/features/auth';
import { useEventos } from '@/features/eventos';
import {
  ComprarEntradasForm,
  MisComprasLista,
  MisEntradasPanel,
  RevisarMiCompra,
  useCrearCompra,
  useMisCompras,
  type Compra,
} from '@/features/compras';
import { MiSaldoPanel } from '@/features/transacciones';
import { ReportarDatoModal } from '@/features/reportes-entrada';
import styles from './UsuarioInicioPage.module.css';

const TABS: Tab[] = [
  { id: 'eventos', label: 'Eventos y compras' },
  { id: 'entradas', label: 'Mis entradas' },
  { id: 'saldo', label: 'Mi saldo' },
];

export function UsuarioInicioPage() {
  useTituloPagina('Inicio');
  const { usuario } = useSesion();

  const [tab, setTab] = useState('eventos');
  const eventos = useEventos();
  const compras = useMisCompras();
  const crear = useCrearCompra();

  const [comprarEn, setComprarEn] = useState<string | null>(null);
  const [revisar, setRevisar] = useState<Compra | null>(null);
  const [reportar, setReportar] = useState<{ compraId: string; entradaId: string } | null>(
    null,
  );

  const activos = eventos.data?.filter((e) => e.estado === 'activo') ?? [];

  const cerrarComprar = () => {
    setComprarEn(null);
    crear.reset();
  };

  return (
    <div className={styles.pagina}>
      <Tabs tabs={TABS} activa={tab} onCambiar={setTab}>
        {tab === 'eventos' && (
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
                      <Button
                        variante="compra"
                        tamano="sm"
                        onClick={() => setComprarEn(e.id)}
                      >
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
                  onRevisar={setRevisar}
                  onReportar={(compraId, entradaId) =>
                    setReportar({ compraId, entradaId })
                  }
                />
              )}
            </section>
          </div>
        )}

        {tab === 'entradas' && <MisEntradasPanel />}

        {tab === 'saldo' &&
          (usuario ? (
            <MiSaldoPanel usuarioId={usuario.id} />
          ) : (
            <EstadoError mensaje="Vuelve a iniciar sesión." />
          ))}
      </Tabs>

      <Modal
        abierto={comprarEn !== null}
        onCerrar={cerrarComprar}
        titulo="Comprar entradas"
        acciones={null}
        bloquearCierreFuera
      >
        {comprarEn && (
          <ComprarEntradasForm
            eventoId={comprarEn}
            cargando={crear.isPending}
            errorApi={crear.error?.mensaje}
            onCancelar={cerrarComprar}
            onGuardar={(dto) => crear.mutate(dto, { onSuccess: cerrarComprar })}
          />
        )}
      </Modal>

      <Modal
        abierto={revisar !== null}
        onCerrar={() => setRevisar(null)}
        titulo="Revisar mi compra"
        acciones={null}
        bloquearCierreFuera
      >
        {revisar && (
          <RevisarMiCompra compra={revisar} onListo={() => setRevisar(null)} />
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
