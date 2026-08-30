import { NavLink, useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import { MdAccountBalance, MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import { cn } from '@/shared/utils/cn';
import { config } from '@/lib/config';
import { RUTAS } from '@/shared/constants/rutas';
import type { Rol } from '@/shared/constants/roles';
import { useSesion } from '@/features/auth';
import { navegacionDe } from './navegacion';
import styles from './Sidebar.module.css';

interface SidebarProps {
  rol: Rol;
  rolLabel: string;
  colapsado: boolean;
  movilAbierto: boolean;
  onAlternarColapso: () => void;
  onCerrarMovil: () => void;
}

export function Sidebar({
  rol,
  rolLabel,
  colapsado,
  movilAbierto,
  onAlternarColapso,
  onCerrarMovil,
}: SidebarProps) {
  const items = navegacionDe(rol);
  const { cerrarSesion } = useSesion();
  const navigate = useNavigate();

  const salir = () => {
    cerrarSesion();
    navigate(RUTAS.INICIO);
  };

  return (
    <aside
      className={cn(
        styles.sidebar,
        colapsado && styles.colapsado,
        movilAbierto && styles.movilAbierto,
      )}
    >
      <div className={styles.logoSeccion}>
        <div className={styles.logo}>
          <div className={styles.logoIcono}>
            <MdAccountBalance size={24} />
          </div>
          {!colapsado && (
            <div className={styles.logoTexto}>
              <h2>{config.appNombre}</h2>
              <p>{rolLabel}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className={styles.btnColapsar}
          onClick={onAlternarColapso}
          aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
        >
          {colapsado ? (
            <MdKeyboardArrowRight size={20} />
          ) : (
            <MdKeyboardArrowLeft size={20} />
          )}
        </button>
      </div>

      <nav className={styles.nav}>
        {items.map((item) => (
          <NavLink
            key={item.ruta}
            to={item.ruta}
            end={item.exacta}
            onClick={onCerrarMovil}
            title={colapsado ? item.titulo : undefined}
            className={({ isActive }) =>
              cn(styles.item, isActive && styles.activo)
            }
          >
            <span className={styles.curvaTop} aria-hidden="true" />
            <span className={styles.curvaBottom} aria-hidden="true" />
            <span className={styles.itemContenido}>
              <span className={styles.itemIcono}>{item.icono}</span>
              {!colapsado && <span className={styles.itemTexto}>{item.titulo}</span>}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.logoutSeccion}>
        <button
          type="button"
          className={cn(styles.item, styles.logout)}
          onClick={salir}
          title={colapsado ? 'Cerrar sesión' : undefined}
        >
          <span className={styles.itemContenido}>
            <span className={styles.itemIcono}>
              <FaSignOutAlt />
            </span>
            {!colapsado && <span className={styles.itemTexto}>Cerrar sesión</span>}
          </span>
        </button>
      </div>
    </aside>
  );
}
