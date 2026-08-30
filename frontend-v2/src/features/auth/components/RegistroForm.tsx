/* ============================================================================
 * RegistroForm — alta de un Usuario normal, sobre el panel glass oscuro.
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { FaBirthdayCake, FaIdCard, FaPhone, FaUser } from 'react-icons/fa';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { ROLES } from '@/shared/constants/roles';
import { RUTAS } from '@/shared/constants/rutas';
import { registroSchema, type RegistroFormValues } from '../schemas/auth.schemas';
import { useRegistro } from '../hooks/useAuthMutations';
import { CampoAuth } from './CampoAuth';
import styles from './authDark.module.css';

export function RegistroForm() {
  const registro = useRegistro();
  const [verPass, setVerPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistroFormValues>({
    resolver: zodResolver(registroSchema),
    mode: 'onBlur',
  });

  const onSubmit = (v: RegistroFormValues) =>
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

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {registro.isError && <p className={styles.errorBox}>{registro.error.mensaje}</p>}

      <CampoAuth
        label="Nombre(s)"
        autoComplete="given-name"
        autoFocus
        iconoIzq={<FaUser size={16} />}
        error={errors.nombre?.message}
        {...register('nombre')}
      />
      <div className={styles.fila2}>
        <CampoAuth
          label="Apellido paterno"
          autoComplete="family-name"
          iconoIzq={<FaUser size={16} />}
          error={errors.apellidoPaterno?.message}
          {...register('apellidoPaterno')}
        />
        <CampoAuth
          label="Apellido materno"
          iconoIzq={<FaUser size={16} />}
          error={errors.apellidoMaterno?.message}
          {...register('apellidoMaterno')}
        />
      </div>

      <CampoAuth
        label="Documento (C.I.)"
        inputMode="numeric"
        iconoIzq={<FaIdCard size={16} />}
        error={errors.ci?.message}
        {...register('ci')}
      />
      <CampoAuth
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        iconoIzq={<MdEmail size={20} />}
        error={errors.email?.message}
        {...register('email')}
      />

      <div className={styles.fila2}>
        <CampoAuth
          label="Contraseña"
          type={verPass ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          iconoIzq={<MdLock size={20} />}
          adornoDer={
            <button
              type="button"
              className={styles.ojo}
              onClick={() => setVerPass((x) => !x)}
              aria-label={verPass ? 'Ocultar' : 'Mostrar'}
            >
              {verPass ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />
        <CampoAuth
          label="Repetir contraseña"
          type="password"
          autoComplete="new-password"
          iconoIzq={<MdLock size={20} />}
          error={errors.confirmar?.message}
          {...register('confirmar')}
        />
      </div>

      <div className={styles.fila2}>
        <CampoAuth
          label="Celular"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          opcional
          iconoIzq={<FaPhone size={14} />}
          error={errors.celular?.message}
          {...register('celular')}
        />
        <CampoAuth
          label="Fecha de nacimiento"
          type="date"
          opcional
          iconoIzq={<FaBirthdayCake size={14} />}
          error={errors.fechaNacimiento?.message}
          {...register('fechaNacimiento')}
        />
      </div>

      <button type="submit" className={styles.btnEntrar} disabled={registro.isPending}>
        {registro.isPending ? 'Creando cuenta…' : 'CREAR CUENTA →'}
      </button>

      <p className={styles.enlaceFila}>
        ¿Ya tienes cuenta?{' '}
        <Link to={RUTAS.LOGIN} className={styles.enlace}>
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
