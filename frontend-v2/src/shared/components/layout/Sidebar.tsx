import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';
import { config } from '@/lib/config';
import { navegacionDe } from './navegacion';
import type { Rol } from '@/shared/constants/roles';
import styles from './Sidebar.module.css';

interface SidebarProps {
  rol: Rol;
  abiertoMovil: boolean;
  onCerrar: () => void;
}

export function Sidebar({ rol, abiertoMovil, onCerrar }: SidebarProps) {
  const items = navegacionDe(rol);

  return (
    <>
      {abiertoMovil && (
        <div className={styles.overlay} onClick={onCerrar} aria-hidden="true" />
      )}
      <nav
        className={cn(styles.sidebar, abiertoMovil && styles.abierto)}
        aria-label="Navegación principal"
      >
        <NavLink to="/" className={styles.marca} onClick={onCerrar}>
          <img src="/favicon.svg" alt="" />
          {config.appNombre}
        </NavLink>

        <div className={styles.nav}>
          {items.map((item) => (
            <NavLink
              key={item.ruta}
              to={item.ruta}
              end={item.exacta}
              onClick={onCerrar}
              className={({ isActive }) => cn(styles.item, isActive && styles.activo)}
            >
              {item.icono}
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
