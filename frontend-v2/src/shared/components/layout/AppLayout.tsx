/* ============================================================================
 * AppLayout — cascarón de las pantallas privadas. Port de MenuLateral: sidebar
 * colapsable + panel principal como tarjeta clara sobre marco oscuro.
 * El título de cada pantalla se pone con useTituloPagina() (LayoutContext).
 * ========================================================================= */

import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSesion } from '@/features/auth';
import { ROL_LABEL } from '@/shared/constants/roles';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LayoutContext, type LayoutCtx } from './layout-context';
import styles from './AppLayout.module.css';

const CLAVE_COLAPSADO = 'qpass_sidebar_colapsado';

function leerColapsado(): boolean {
  try {
    return localStorage.getItem(CLAVE_COLAPSADO) === '1';
  } catch {
    return false;
  }
}

export function AppLayout() {
  const { usuario } = useSesion();
  const [colapsado, setColapsado] = useState(leerColapsado);
  const [movilAbierto, setMovilAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');

  const valor = useMemo<LayoutCtx>(() => ({ setTitulo }), []);

  if (!usuario) return null;

  const rolLabel = ROL_LABEL[usuario.rol];

  const alternarColapso = () => {
    setColapsado((v) => {
      const n = !v;
      try {
        localStorage.setItem(CLAVE_COLAPSADO, n ? '1' : '0');
      } catch {
        /* noop */
      }
      return n;
    });
  };

  return (
    <LayoutContext.Provider value={valor}>
      <div className={styles.contenedor}>
        {movilAbierto && (
          <div
            className={styles.overlay}
            onClick={() => setMovilAbierto(false)}
            aria-hidden="true"
          />
        )}

        <Sidebar
          rol={usuario.rol}
          rolLabel={rolLabel}
          colapsado={colapsado}
          movilAbierto={movilAbierto}
          onAlternarColapso={alternarColapso}
          onCerrarMovil={() => setMovilAbierto(false)}
        />

        <div className={styles.mainWrapper}>
          <div className={styles.main}>
            <a href="#contenido" className="skip-link">
              Saltar al contenido
            </a>
            <Header
              titulo={titulo || `Panel de ${rolLabel}`}
              usuario={usuario}
              rolLabel={rolLabel}
              onAbrirMovil={() => setMovilAbierto(true)}
            />
            <main id="contenido" className={styles.content}>
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </LayoutContext.Provider>
  );
}
