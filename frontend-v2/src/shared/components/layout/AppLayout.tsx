/* ============================================================================
 * AppLayout — cascarón de las pantallas privadas: sidebar + header + <main>.
 * El título lo pone cada página con useTituloPagina() vía LayoutContext
 * (React Context propio: sirve a cualquier profundidad de <Outlet> anidado).
 * ========================================================================= */

import { createContext, useContext, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSesion } from '@/features/auth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import styles from './AppLayout.module.css';

interface LayoutCtx {
  setTitulo: (t: string) => void;
}

const LayoutContext = createContext<LayoutCtx | null>(null);

/** Cada página llama `useLayout().setTitulo('...')` (normalmente vía useTituloPagina). */
export function useLayout(): LayoutCtx {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout debe usarse dentro de <AppLayout>');
  return ctx;
}

export function AppLayout() {
  const { usuario } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');

  const valor = useMemo<LayoutCtx>(() => ({ setTitulo }), []);

  if (!usuario) return null;

  return (
    <LayoutContext.Provider value={valor}>
      <div className={styles.shell}>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>

        <Sidebar
          rol={usuario.rol}
          abiertoMovil={menuAbierto}
          onCerrar={() => setMenuAbierto(false)}
        />

        <div>
          <Header titulo={titulo} onAbrirMenu={() => setMenuAbierto(true)} />
          <main id="contenido" className={styles.main}>
            <div className={styles.contenido}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </LayoutContext.Provider>
  );
}
