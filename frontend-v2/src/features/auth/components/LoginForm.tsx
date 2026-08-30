/* ============================================================================
 * LoginForm — port fiel del Login del frontend original (panel glass oscuro,
 * inputs con icono, toggle de contraseña, botón ENTRAR, divisor, REGISTRARME).
 * Lógica: react-hook-form + zod + hook useLogin.
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { FaBuilding } from 'react-icons/fa';
import {
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { RUTAS } from '@/shared/constants/rutas';
import { loginSchema, type LoginFormValues } from '../schemas/auth.schemas';
import { useLogin } from '../hooks/useAuthMutations';
import { CampoAuth } from './CampoAuth';
import styles from './authDark.module.css';

export function LoginForm() {
  const login = useLogin();
  const navigate = useNavigate();
  const [verPass, setVerPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit((v) => login.mutate(v))}
      noValidate
    >
      {login.isError && <p className={styles.errorBox}>{login.error.mensaje}</p>}

      <CampoAuth
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        autoFocus
        placeholder="usuario@qpass.com"
        iconoIzq={<MdEmail size={20} />}
        error={errors.email?.message}
        {...register('email')}
      />

      <CampoAuth
        label="Contraseña"
        type={verPass ? 'text' : 'password'}
        autoComplete="current-password"
        placeholder="••••••••"
        iconoIzq={<MdLock size={20} />}
        adornoDer={
          <button
            type="button"
            className={styles.ojo}
            onClick={() => setVerPass((v) => !v)}
            aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {verPass ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
          </button>
        }
        error={errors.password?.message}
        {...register('password')}
      />

      <div className={styles.opciones}>
        <label className={styles.check}>
          <input type="checkbox" /> Recordarme
        </label>
        <Link to={RUTAS.RECUPERAR} className={styles.olvide}>
          ¿Olvidó su contraseña?
        </Link>
      </div>

      <button type="submit" className={styles.btnEntrar} disabled={login.isPending}>
        {login.isPending ? 'Entrando…' : 'ENTRAR →'}
      </button>

      <div className={styles.divider}>
        <span>o</span>
      </div>

      <button
        type="button"
        className={styles.btnSecundario}
        onClick={() => navigate(RUTAS.REGISTRO)}
      >
        REGISTRARME <FaBuilding />
      </button>
    </form>
  );
}
