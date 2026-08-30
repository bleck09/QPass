/* ============================================================================
 * RecuperarForm — 2 pasos: (1) pedir código al correo, (2) código + nueva
 * contraseña. Muestra "Paso X de 2" (Manual 2.1 heurística 1).
 * El backend no envía correo real: devuelve el código en la respuesta y se
 * muestra en pantalla (comportamiento de desarrollo, igual que el backend).
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Alert, Button, Input } from '@/shared/components/ui';
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
import styles from './authForm.module.css';

export function RecuperarForm() {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [codigoDemo, setCodigoDemo] = useState<string | null>(null);

  const solicitar = useRecuperarSolicitar();
  const restablecer = useRecuperarRestablecer();

  const formPaso1 = useForm<SolicitarFormValues>({
    resolver: zodResolver(solicitarSchema),
    mode: 'onBlur',
  });
  const formPaso2 = useForm<RestablecerFormValues>({
    resolver: zodResolver(restablecerSchema),
    mode: 'onBlur',
  });

  const enviarPaso1 = (v: SolicitarFormValues) => {
    solicitar.mutate(v, {
      onSuccess: ({ codigoDemo }) => {
        setEmail(v.email);
        setCodigoDemo(codigoDemo);
        setPaso(2);
      },
    });
  };

  const enviarPaso2 = (v: RestablecerFormValues) => {
    restablecer.mutate({
      email,
      codigo: v.codigo,
      passwordNueva: v.passwordNueva,
    });
  };

  if (paso === 1) {
    return (
      <form
        className={styles.form}
        onSubmit={formPaso1.handleSubmit(enviarPaso1)}
        noValidate
      >
        <p className={styles.enlaceFila}>Paso 1 de 2</p>
        {solicitar.isError && <Alert tipo="error">{solicitar.error.mensaje}</Alert>}

        <Input
          label="Correo de tu cuenta"
          type="email"
          autoComplete="email"
          autoFocus
          error={formPaso1.formState.errors.email?.message}
          {...formPaso1.register('email')}
        />

        <div className={styles.pie}>
          <Button type="submit" anchoCompleto cargando={solicitar.isPending}>
            {solicitar.isPending ? 'Enviando…' : 'Enviar código'}
          </Button>
          <p className={styles.enlaceFila}>
            <Link to={RUTAS.LOGIN} className={styles.enlace}>
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </form>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={formPaso2.handleSubmit(enviarPaso2)}
      noValidate
    >
      <p className={styles.enlaceFila}>Paso 2 de 2</p>

      {codigoDemo && (
        <Alert tipo="info" titulo="Modo desarrollo">
          El backend no envía correos todavía. Tu código es:{' '}
          <strong>{codigoDemo}</strong>
        </Alert>
      )}
      {restablecer.isError && (
        <Alert tipo="error">{restablecer.error.mensaje}</Alert>
      )}

      <Input
        label="Código de 6 dígitos"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        error={formPaso2.formState.errors.codigo?.message}
        {...formPaso2.register('codigo')}
      />
      <Input
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 6 caracteres"
        error={formPaso2.formState.errors.passwordNueva?.message}
        {...formPaso2.register('passwordNueva')}
      />
      <Input
        label="Repetir nueva contraseña"
        type="password"
        autoComplete="new-password"
        error={formPaso2.formState.errors.confirmar?.message}
        {...formPaso2.register('confirmar')}
      />

      <div className={styles.pie}>
        <Button type="submit" anchoCompleto cargando={restablecer.isPending}>
          {restablecer.isPending ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
        <p className={styles.enlaceFila}>
          <button
            type="button"
            className={styles.enlace}
            onClick={() => setPaso(1)}
          >
            Usar otro correo
          </button>
        </p>
      </div>
    </form>
  );
}
