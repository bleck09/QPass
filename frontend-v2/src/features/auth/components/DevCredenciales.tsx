/* Acordeón con las cuentas de prueba del seed (password 123456). Port de Login.jsx. */

import { useState } from 'react';
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';
import { ROL_LABEL } from '@/shared/constants/roles';
import styles from './authDark.module.css';

const CUENTAS = [
  'admin',
  'cliente',
  'recargador',
  'supervisor',
  'devolucion',
  'normal',
  'negocio',
  'ayudante',
] as const;

const ROL_POR_CUENTA: Record<string, keyof typeof ROL_LABEL> = {
  admin: 'Admin',
  cliente: 'Cliente',
  recargador: 'Recargador',
  supervisor: 'Supervisor',
  devolucion: 'Devolucion',
  normal: 'UsuarioNormal',
  negocio: 'UsuarioNegocio',
  ayudante: 'Ayudante',
};

export function DevCredenciales() {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className={styles.dev}>
      <button
        type="button"
        className={styles.devBtn}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <b>Ver credenciales de prueba (Dev)</b>
        <span>{abierto ? <MdKeyboardArrowUp size={24} /> : <MdKeyboardArrowDown size={24} />}</span>
      </button>

      {abierto && (
        <div className={styles.devContent}>
          <table className={styles.devTable}>
            <thead>
              <tr>
                <th>Rol</th>
                <th>Usuario</th>
                <th>Contraseña</th>
              </tr>
            </thead>
            <tbody>
              {CUENTAS.map((c) => (
                <tr key={c}>
                  <td>{ROL_LABEL[ROL_POR_CUENTA[c]]}</td>
                  <td>{c}@qpass.com</td>
                  <td>123456</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
