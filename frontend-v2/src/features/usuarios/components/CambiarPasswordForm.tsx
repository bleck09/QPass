/* Cambio de contraseña sabiendo la actual. Permite pegar (WCAG 3.3.8). */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input } from '@/shared/components/ui';
import {
  cambiarPasswordSchema,
  type CambiarPasswordFormValues,
} from '../schemas/usuarios.schemas';
import type { CambiarPasswordDto } from '../types/usuarios.types';
import styles from './perfilForm.module.css';

interface CambiarPasswordFormProps {
  cargando?: boolean;
  errorApi?: string;
  exito?: boolean;
  onGuardar: (dto: CambiarPasswordDto) => void;
}

export function CambiarPasswordForm({
  cargando,
  errorApi,
  exito,
  onGuardar,
}: CambiarPasswordFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CambiarPasswordFormValues>({
    resolver: zodResolver(cambiarPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = (v: CambiarPasswordFormValues) => {
    onGuardar({ passwordActual: v.passwordActual, passwordNueva: v.passwordNueva });
    reset();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorApi && <Alert tipo="error">{errorApi}</Alert>}
      {exito && <Alert tipo="exito">Tu contraseña se actualizó.</Alert>}

      <Input
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        error={errors.passwordActual?.message}
        {...register('passwordActual')}
      />
      <div className={styles.fila2}>
        <Input
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 6 caracteres"
          error={errors.passwordNueva?.message}
          {...register('passwordNueva')}
        />
        <Input
          label="Repetir nueva contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmar?.message}
          {...register('confirmar')}
        />
      </div>

      <div className={styles.pie}>
        <Button type="submit" cargando={cargando}>
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
