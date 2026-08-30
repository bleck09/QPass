import { useNavigate } from 'react-router-dom';
import { useSesion } from '@/features/auth';
import { useTema } from '@/shared/hooks/useTema';
import { RUTAS } from '@/shared/constants/rutas';
import { ROL_LABEL } from '@/shared/constants/roles';
import {
  IconoLuna,
  IconoMenu,
  IconoSalir,
  IconoSol,
} from '@/shared/components/ui/iconos';
import styles from './Header.module.css';

interface HeaderProps {
  titulo: string;
  onAbrirMenu: () => void;
}

export function Header({ titulo, onAbrirMenu }: HeaderProps) {
  const { usuario, cerrarSesion } = useSesion();
  const { tema, alternar } = useTema();
  const navigate = useNavigate();

  const salir = () => {
    cerrarSesion();
    navigate(RUTAS.LOGIN, { replace: true });
  };

  const iniciales = usuario?.nombre
    ?.split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.menuBtn}
        onClick={onAbrirMenu}
        aria-label="Abrir menú"
      >
        <IconoMenu />
      </button>

      <h1 className={styles.titulo}>{titulo}</h1>

      <div className={styles.espaciador} />

      <button
        type="button"
        className={styles.accion}
        onClick={alternar}
        aria-label={tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      >
        {tema === 'dark' ? <IconoSol /> : <IconoLuna />}
      </button>

      <span className={styles.usuario}>
        {usuario?.foto ? (
          <img className={styles.avatar} src={usuario.foto} alt="" />
        ) : (
          <span className={styles.avatar} aria-hidden="true">
            {iniciales}
          </span>
        )}
        <span className={styles.nombre}>
          {usuario?.nombre} · {usuario ? ROL_LABEL[usuario.rol] : ''}
        </span>
      </span>

      <button
        type="button"
        className={styles.accion}
        onClick={salir}
        aria-label="Cerrar sesión"
      >
        <IconoSalir />
      </button>
    </header>
  );
}
