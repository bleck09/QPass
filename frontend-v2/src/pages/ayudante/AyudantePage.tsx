/* ============================================================================
 * AyudantePage (/ayudante) — el Ayudante cobra: elige su puesto, escanea la
 * manilla del cliente, arma el pedido y cobra contra el saldo de esa entrada.
 * ========================================================================= */

import { useMemo, useState } from 'react';
import { Alert, Button, Select } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { useSesion } from '@/features/auth';
import { EscanerEntrada, TarjetaEntrada, type Entrada } from '@/features/entradas';
import { useMisPuestosComoAyudante, useProductosDePuesto } from '@/features/puestos';
import { useCrearVenta } from '@/features/ventas';
import styles from './AyudantePage.module.css';

export function AyudantePage() {
  useTituloPagina('Cobrar');
  const { usuario } = useSesion();

  const misPuestos = useMisPuestosComoAyudante(usuario?.id);
  const [puestoId, setPuestoId] = useState('');
  const productos = useProductosDePuesto(puestoId || undefined);

  const [entrada, setEntrada] = useState<Entrada | null>(null);
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const venta = useCrearVenta();

  const total = useMemo(() => {
    if (!productos.data) return 0;
    return Object.entries(carrito).reduce((s, [id, cant]) => {
      const p = productos.data!.find((x) => x.id === id);
      return s + (p ? Number(p.precio) * cant : 0);
    }, 0);
  }, [carrito, productos.data]);

  const cambiar = (id: string, delta: number) => {
    setCarrito((c) => {
      const n = Math.max(0, (c[id] ?? 0) + delta);
      const sig = { ...c, [id]: n };
      if (n === 0) delete sig[id];
      return sig;
    });
  };

  const cobrar = () => {
    if (!entrada || !puestoId) return;
    const items = Object.entries(carrito).map(([productoId, cantidad]) => ({
      productoId,
      cantidad,
    }));
    if (items.length === 0) return;
    venta.mutate(
      { puestoId, entradaId: entrada.id, items },
      {
        onSuccess: () => {
          setCarrito({});
          setEntrada(null);
        },
      },
    );
  };

  if (misPuestos.isPending) return <EstadoCargando filas={2} />;
  if (misPuestos.isError)
    return <EstadoError onReintentar={misPuestos.refetch} />;
  if (!misPuestos.data || misPuestos.data.length === 0)
    return (
      <EstadoVacio
        titulo="Todavía no estás asignado a ningún puesto"
        descripcion="Pide a tu negocio que te asigne a un puesto."
      />
    );

  return (
    <div className={styles.pagina}>
      <div className={styles.selector}>
        <Select
          label="Puesto"
          value={puestoId}
          onChange={(e) => {
            setPuestoId(e.target.value);
            setCarrito({});
          }}
        >
          <option value="">Elige tu puesto…</option>
          {misPuestos.data.map((pa) => (
            <option key={pa.id} value={pa.puestoId}>
              {pa.puesto?.nombre ?? pa.puestoId}
            </option>
          ))}
        </Select>
      </div>

      {puestoId && (
        <>
          <EscanerEntrada
            onEncontrada={(e) => {
              setEntrada(e);
              venta.reset();
            }}
          />

          {entrada && (
            <TarjetaEntrada entrada={entrada} mostrarSaldo>
              {venta.isError && <Alert tipo="error">{venta.error.mensaje}</Alert>}
              {venta.isSuccess && <Alert tipo="exito">Cobro registrado.</Alert>}

              {productos.isPending && <EstadoCargando filas={3} />}
              {productos.data && productos.data.length === 0 && (
                <Alert tipo="aviso">Este puesto no tiene productos cargados.</Alert>
              )}

              <ul className={styles.productos}>
                {productos.data?.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>{p.nombre}</strong>
                      <span className={styles.precio}>
                        {' '}
                        {formatearMoneda(p.precio)}
                      </span>
                    </div>
                    <div className={styles.stepper}>
                      <Button
                        variante="secundario"
                        tamano="sm"
                        onClick={() => cambiar(p.id, -1)}
                        aria-label={`Quitar uno de ${p.nombre}`}
                      >
                        −
                      </Button>
                      <span className={styles.cant}>{carrito[p.id] ?? 0}</span>
                      <Button
                        variante="secundario"
                        tamano="sm"
                        onClick={() => cambiar(p.id, 1)}
                        aria-label={`Agregar uno de ${p.nombre}`}
                      >
                        +
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className={styles.total}>
                <span>Total</span>
                <strong>{formatearMoneda(total)}</strong>
              </div>

              <Button
                onClick={cobrar}
                cargando={venta.isPending}
                disabled={total <= 0}
                anchoCompleto
              >
                Cobrar {formatearMoneda(total)}
              </Button>
            </TarjetaEntrada>
          )}
        </>
      )}
    </div>
  );
}
