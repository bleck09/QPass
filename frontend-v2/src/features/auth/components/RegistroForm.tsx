/* ============================================================================
 * RegistroForm — alta de un Usuario normal. Manual 8.4: campos opcionales
 * marcados, no los obligatorios. type/autocomplete correctos por campo.
 * ========================================================================= */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Alert, Button, Input } from '@/shared/components/ui';
import { ROLES } from '@/shared/constants/roles';
import { RUTAS } from '@/shared/constants/rutas';
import { registroSchema, type RegistroFormValues } from '../schemas/auth.schemas';
import { useRegistro } from '../hooks/useAuthMutations';
import styles from './authForm.module.css';

export function RegistroForm() {
  const registro = useRegistro();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistroFormValues>({
    resolver: zodResolver(registroSchema),
    mode: 'onBlur',
  });

  const onSubmit = (v: RegistroFormValues) => {
    registro.mutate({
      rol: ROLES.USUARIO_NORMAL,
      nombre: v.nombre,
      apellidoPaterno: v.apellidoPaterno,
      apellidoMaterno: v.apellidoMaterno,
      email: v.email,
      ci: v.ci,
      password: v.password,
      celular: v.celular || undefined,
      fechaNacimiento: v.fechaNacimiento || undefined,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {registro.isError && <Alert tipo="error">{registro.error.mensaje}</Alert>}

      <Input
        label="Nombre(s)"
        autoComplete="given-name"
        autoFocus
        error={errors.nombre?.message}
        {...register('nombre')}
      />

      <div className={styles.fila2}>
        <Input
          label="Apellido paterno"
          autoComplete="family-name"
          error={errors.apellidoPaterno?.message}
          {...register('apellidoPaterno')}
        />
        <Input
          label="Apellido materno"
          error={errors.apellidoMaterno?.message}
          {...register('apellidoMaterno')}
        />
      </div>

      <Input
        label="Documento de identidad (C.I.)"
        inputMode="numeric"
        error={errors.ci?.message}
        {...register('ci')}
      />

      <Input
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <div className={styles.fila2}>
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 6 caracteres"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Repetir contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmar?.message}
          {...register('confirmar')}
        />
      </div>

      <div className={styles.fila2}>
        <Input
          label="Celular"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          opcional
          error={errors.celular?.message}
          {...register('celular')}
        />
        <Input
          label="Fecha de nacimiento"
          type="date"
          opcional
          error={errors.fechaNacimiento?.message}
          {...register('fechaNacimiento')}
        />
      </div>

      <div className={styles.pie}>
        <Button type="submit" anchoCompleto cargando={registro.isPending}>
          {registro.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
        <p className={styles.enlaceFila}>
          ¿Ya tienes cuenta?{' '}
          <Link to={RUTAS.LOGIN} className={styles.enlace}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </form>
  );
}
