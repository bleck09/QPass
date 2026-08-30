/* ============================================================================
 * DashboardNegocio — resumen de ventas de un negocio en un evento: KPIs,
 * ingresos por puesto y productos más vendidos. Solo agregación en el cliente
 * sobre lo que ya devuelven usePuestos y useVentas.
 * ========================================================================= */

import { useMemo } from 'react';
import { Card, Table, Td, Th } from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { usePuestos } from '@/features/puestos';
import { useVentas } from '../ventas';
import styles from './DashboardNegocio.module.css';

interface Props {
  eventoId: string;
  negocioId: number;
}

export function DashboardNegocio({ eventoId, negocioId }: Props) {
  const puestos = usePuestos(eventoId, negocioId);
  const ventas = useVentas({ eventoId });

  const resumen = useMemo(() => {
    const misPuestos = puestos.data ?? [];
    const idsMisPuestos = new Set(misPuestos.map((p) => p.id));
    const misVentas = (ventas.data ?? []).filter(
      (v) => idsMisPuestos.has(v.puestoId) || v.puesto?.negocioId === negocioId,
    );

    const ingresosPorPuesto = misPuestos
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        total: misVentas
          .filter((v) => v.puestoId === p.id)
          .reduce((s, v) => s + Number(v.montoTotal), 0),
        ventas: misVentas.filter((v) => v.puestoId === p.id).length,
      }))
      .sort((a, b) => b.total - a.total);

    const porProducto = new Map<string, { nombre: string; cantidad: number; total: number }>();
    for (const v of misVentas) {
      for (const it of v.items) {
        const prev = porProducto.get(it.nombreProducto) ?? {
          nombre: it.nombreProducto,
          cantidad: 0,
          total: 0,
        };
        prev.cantidad += it.cantidad;
        prev.total += Number(it.precioUnitario) * it.cantidad;
        porProducto.set(it.nombreProducto, prev);
      }
    }
    const topProductos = [...porProducto.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalIngresos: misVentas.reduce((s, v) => s + Number(v.montoTotal), 0),
      totalVentas: misVentas.length,
      puestosActivos: misPuestos.filter((p) => p.estadoActivo).length,
      totalAyudantes: misPuestos.reduce((s, p) => s + p.ayudantes.length, 0),
      ingresosPorPuesto,
      topProductos,
      hayPuestos: misPuestos.length > 0,
    };
  }, [puestos.data, ventas.data, negocioId]);

  if (puestos.isPending || ventas.isPending) return <EstadoCargando filas={5} />;
  if (puestos.isError || ventas.isError)
    return (
      <EstadoError
        mensaje="No pudimos cargar el resumen."
        onReintentar={() => {
          void puestos.refetch();
          void ventas.refetch();
        }}
      />
    );

  if (!resumen.hayPuestos)
    return (
      <EstadoVacio
        titulo="Sin puestos en este evento"
        descripcion="Crea un puesto y carga productos para ver ventas aquí."
      />
    );

  return (
    <div className={styles.panel}>
      <div className={styles.kpis}>
        <Card>
          <p className={styles.kpiLabel}>Ingresos</p>
          <p className={styles.kpiValor}>{formatearMoneda(resumen.totalIngresos)}</p>
        </Card>
        <Card>
          <p className={styles.kpiLabel}>Ventas</p>
          <p className={styles.kpiValor}>{resumen.totalVentas}</p>
        </Card>
        <Card>
          <p className={styles.kpiLabel}>Puestos activos</p>
          <p className={styles.kpiValor}>{resumen.puestosActivos}</p>
        </Card>
        <Card>
          <p className={styles.kpiLabel}>Ayudantes</p>
          <p className={styles.kpiValor}>{resumen.totalAyudantes}</p>
        </Card>
      </div>

      <section>
        <h3 className={styles.h3}>Ingresos por puesto</h3>
        <Table>
          <thead>
            <tr>
              <Th>Puesto</Th>
              <Th numerico>Ventas</Th>
              <Th numerico>Ingresos</Th>
            </tr>
          </thead>
          <tbody>
            {resumen.ingresosPorPuesto.map((p) => (
              <tr key={p.id}>
                <Td>{p.nombre}</Td>
                <Td numerico>{p.ventas}</Td>
                <Td numerico>{formatearMoneda(p.total)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      <section>
        <h3 className={styles.h3}>Productos más vendidos</h3>
        {resumen.topProductos.length === 0 ? (
          <p className={styles.vacio}>Todavía no hay ventas.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th numerico>Unidades</Th>
                <Th numerico>Ingresos</Th>
              </tr>
            </thead>
            <tbody>
              {resumen.topProductos.map((p) => (
                <tr key={p.nombre}>
                  <Td>{p.nombre}</Td>
                  <Td numerico>{p.cantidad}</Td>
                  <Td numerico>{formatearMoneda(p.total)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
