import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaChevronDown, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import { RUTAS } from '@/shared/constants/rutas';
import { useSesion, type UsuarioAutenticado } from '@/features/auth';
import styles from './Header.module.css';

interface HeaderProps {
  titulo: string;
  usuario: UsuarioAutenticado;
  rolLabel: string;
  onAbrirMovil: () => void;
}

export function Header({ titulo, usuario, rolLabel, onAbrirMovil }: HeaderProps) {
  const { cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);

  const iniciales = (usuario.nombre || usuario.email).substring(0, 2).toUpperCase();

  const salir = () => {
    cerrarSesion();
    navigate(RUTAS.INICIO);
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.btnMovil}
          onClick={onAbrirMovil}
          aria-label="Abrir menú"
        >
          <FaBars size={20} />
        </button>
        <h1 className={styles.titulo}>{titulo}</h1>
      </div>

      <div className={styles.right}>
        <button
          type="button"
          className={styles.perfilBtn}
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
        >
          <span className={styles.avatar}>
            {usuario.foto ? (
              <img src={usuario.foto} alt="" />
            ) : (
              iniciales
            )}
          </span>
          <span className={styles.infoPerfil}>
            <span className={styles.nombre}>{usuario.nombre || 'Usuario'}</span>
            <span className={styles.rol}>{rolLabel}</span>
          </span>
          <FaChevronDown size={12} />
        </button>

        {abierto && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHead}>
              <strong>{usuario.nombre || 'Usuario'}</strong>
              <span>{usuario.email}</span>
            </div>
            <div className={styles.dropdownBody}>
              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  navigate(RUTAS.PERFIL);
                }}
              >
                <FaUserCircle /> Mi Perfil
              </button>
              <button type="button" className={styles.btnLogout} onClick={salir}>
                <FaSignOutAlt /> Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
