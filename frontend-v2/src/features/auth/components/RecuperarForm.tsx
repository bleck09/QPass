/* ============================================================================
 * RecuperarForm — 2 pasos (pedir código → nueva contraseña) sobre el panel
 * glass oscuro. El backend no envía correo: devuelve el código en la respuesta.
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { MdEmail, MdLock, MdPin } from 'react-icons/md';
import { RUTAS } from '@/shared/constants/rutas';
import {
  restablecerSchema,
  solicitarSchema,
  type RestablecerFormValues,
  type SolicitarFormValues,
} from '../schemas/auth.schemas';
import {
  useRecuperarRestablecer,
  useRecuperarSolicitar,
} from '../hooks/useAuthMutations';
import { CampoAuth } from './CampoAuth';
import styles from './authDark.module.css';

export function RecuperarForm() {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [codigoDemo, setCodigoDemo] = useState<string | null>(null);

  const solicitar = useRecuperarSolicitar();
  const restablecer = useRecuperarRestablecer();

  const f1 = useForm<SolicitarFormValues>({
    resolver: zodResolver(solicitarSchema),
    mode: 'onBlur',
  });
  const f2 = useForm<RestablecerFormValues>({
    resolver: zodResolver(restablecerSchema),
    mode: 'onBlur',
  });

  if (paso === 1) {
    return (
      <form
        className={styles.form}
        onSubmit={f1.handleSubmit((v) =>
          solicitar.mutate(v, {
            onSuccess: ({ codigoDemo }) => {
              setEmail(v.email);
              setCodigoDemo(codigoDemo);
              setPaso(2);
            },
          }),
        )}
        noValidate
      >
        <p className={styles.enlaceFila}>Paso 1 de 2</p>
        {solicitar.isError && (
          <p className={styles.errorBox}>{solicitar.error.mensaje}</p>
        )}

        <CampoAuth
          label="Correo de tu cuenta"
          type="email"
          autoComplete="email"
          autoFocus
          iconoIzq={<MdEmail size={20} />}
          error={f1.formState.errors.email?.message}
          {...f1.register('email')}
        />

        <button type="submit" className={styles.btnEntrar} disabled={solicitar.isPending}>
          {solicitar.isPending ? 'Enviando…' : 'ENVIAR CÓDIGO →'}
        </button>
        <p className={styles.enlaceFila}>
          <Link to={RUTAS.LOGIN} className={styles.enlace}>
            Volver a iniciar sesión
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={f2.handleSubmit((v) =>
        restablecer.mutate({
          email,
          codigo: v.codigo,
          passwordNueva: v.passwordNueva,
        }),
      )}
      noValidate
    >
      <p className={styles.enlaceFila}>Paso 2 de 2</p>
      {codigoDemo && (
        <p className={styles.okBox}>
          Modo desarrollo — tu código es <strong>{codigoDemo}</strong>
        </p>
      )}
      {restablecer.isError && (
        <p className={styles.errorBox}>{restablecer.error.mensaje}</p>
      )}

      <CampoAuth
        label="Código de 6 dígitos"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        iconoIzq={<MdPin size={20} />}
        error={f2.formState.errors.codigo?.message}
        {...f2.register('codigo')}
      />
      <CampoAuth
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo 6 caracteres"
        iconoIzq={<MdLock size={20} />}
        error={f2.formState.errors.passwordNueva?.message}
        {...f2.register('passwordNueva')}
      />
      <CampoAuth
        label="Repetir nueva contraseña"
        type="password"
        autoComplete="new-password"
        iconoIzq={<MdLock size={20} />}
        error={f2.formState.errors.confirmar?.message}
        {...f2.register('confirmar')}
      />

      <button type="submit" className={styles.btnEntrar} disabled={restablecer.isPending}>
        {restablecer.isPending ? 'Guardando…' : 'CAMBIAR CONTRASEÑA'}
      </button>
      <p className={styles.enlaceFila}>
        <button
          type="button"
          className={styles.enlace}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setPaso(1)}
        >
          Usar otro correo
        </button>
      </p>
    </form>
  );
}
