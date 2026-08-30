/* ============================================================================
 * LoginForm — Manual 8.3/8.4. Una columna, labels arriba, autocomplete,
 * permite pegar la contraseña, no borra lo escrito ante un error (WCAG 3.3.8).
 * ========================================================================= */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Alert, Button, Input } from '@/shared/components/ui';
import { RUTAS } from '@/shared/constants/rutas';
import { loginSchema, type LoginFormValues } from '../schemas/auth.schemas';
import { useLogin } from '../hooks/useAuthMutations';
import styles from './authForm.module.css';

export function LoginForm() {
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = (valores: LoginFormValues) => {
    login.mutate(valores);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {login.isError && (
        <Alert tipo="error">{login.error.mensaje}</Alert>
      )}

      <Input
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        autoFocus
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <div className={styles.pie}>
        <Button type="submit" anchoCompleto cargando={login.isPending}>
          {login.isPending ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>

        <p className={styles.enlaceFila}>
          <Link to={RUTAS.RECUPERAR} className={styles.enlace}>
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
        <p className={styles.enlaceFila}>
          ¿No tienes cuenta?{' '}
          <Link to={RUTAS.REGISTRO} className={styles.enlace}>
            Crear cuenta
          </Link>
        </p>
      </div>
    </form>
  );
}
