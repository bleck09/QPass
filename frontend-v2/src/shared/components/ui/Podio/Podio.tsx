/* Podio top-3 — port de Admin.jsx. Coral/cian con texto azul-noche (contraste),
 * índigo con texto blanco. */

import styles from './Podio.module.css';

export interface ItemPodio {
  id: string | number;
  nombre: string;
  valor: string;
}

const ESTILOS = [
  { fondo: 'var(--coral)', texto: 'var(--azul-noche)' },
  { fondo: 'var(--indigo)', texto: '#fff' },
  { fondo: 'var(--cian)', texto: 'var(--azul-noche)' },
];

export function Podio({ items }: { items: ItemPodio[] }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.podio}>
      {items.slice(0, 3).map((item, i) => (
        <div className={styles.item} key={item.id}>
          <div
            className={styles.puesto}
            style={{ background: ESTILOS[i].fondo, color: ESTILOS[i].texto }}
          >
            {i + 1}
          </div>
          <span className={styles.nombre}>{item.nombre}</span>
          <span className={styles.valor}>{item.valor}</span>
        </div>
      ))}
    </div>
  );
}
