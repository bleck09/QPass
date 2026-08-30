/* ============================================================================
 * MapaRecintoPublico — el plano del recinto en la landing del evento. Solo
 * lectura: al tocar un elemento se abre su ficha con los productos del puesto.
 * Reutiliza PlanoRecinto (mismo layout que el Diseñador del Admin).
 * ========================================================================= */

import { useState } from 'react';
import { Modal } from '@/shared/components/ui';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { PlanoRecinto } from './PlanoRecinto';
import type { Puesto } from '../puestos';
import styles from './MapaRecintoPublico.module.css';

export function MapaRecintoPublico({ puestos }: { puestos: Puesto[] }) {
  const [seleccion, setSeleccion] = useState<Puesto | null>(null);

  return (
    <>
      <PlanoRecinto
        puestos={puestos}
        modoDiseno={false}
        onSeleccionar={setSeleccion}
      />

      <Modal
        abierto={seleccion !== null}
        onCerrar={() => setSeleccion(null)}
        titulo={seleccion?.nombre ?? ''}
        acciones={undefined}
      >
        {seleccion?.descripcion && (
          <p className={styles.desc}>{seleccion.descripcion}</p>
        )}
        {seleccion && seleccion.productos.length === 0 ? (
          <p className={styles.desc}>Este puesto todavía no publicó productos.</p>
        ) : (
          <ul className={styles.productos}>
            {seleccion?.productos.map((p) => (
              <li key={p.id}>
                <span>{p.nombre}</span>
                <span className={styles.precio}>{formatearMoneda(p.precio)}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
