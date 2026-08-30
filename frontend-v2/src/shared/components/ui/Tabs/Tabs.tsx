/* ============================================================================
 * Tabs — pestañas accesibles (role=tablist/tab/tabpanel, flechas para navegar).
 * Pestaña activa: texto + subrayado (Manual 3.1). Controlado por el padre.
 * ========================================================================= */

import { useId, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';
import styles from './Tabs.module.css';

export interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activa: string;
  onCambiar: (id: string) => void;
  children: ReactNode;
}

export function Tabs({ tabs, activa, onCambiar, children }: TabsProps) {
  const base = useId();

  const alTecla = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const siguiente = (i + delta + tabs.length) % tabs.length;
    onCambiar(tabs[siguiente].id);
  };

  return (
    <div>
      <div className={styles.lista} role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`${base}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={t.id === activa}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={t.id === activa ? 0 : -1}
            className={cn(styles.tab, t.id === activa && styles.activa)}
            onClick={() => onCambiar(t.id)}
            onKeyDown={(e) => alTecla(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel-${activa}`}
        aria-labelledby={`${base}-tab-${activa}`}
        className={styles.panel}
      >
        {children}
      </div>
    </div>
  );
}
