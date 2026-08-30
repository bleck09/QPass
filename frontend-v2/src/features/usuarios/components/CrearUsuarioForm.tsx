/* Alta de una cuenta operativa por el Admin (Recargador, Supervisor,
 * Devolución o Negocio). La contraseña la define el Admin y se comunica a la
 * persona por fuera (no hay correo). */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, Select } from '@/shared/components/ui';
import { ROL_LABEL } from '@/shared/constants/roles';
import {
  crearUsuarioSchema,
  ROLES_ADMIN_CREA,
  type CrearUsuarioFormValues,
} from '../schemas/usuarios.schemas';
import type { CrearUsuarioDto } from '../services/usuarios.service';
import styles from './perfilForm.module.css';

interface CrearUsuarioFormProps {
  cargando?: boolean;
  errorApi?: string;
  onGuardar: (dto: CrearUsuarioDto) => void;
  onCancelar: () => void;
}

export function CrearUsuarioForm({
  cargando,
  errorApi,
  onGuardar,
  onCancelar,
}: CrearUsuarioFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CrearUsuarioFormValues>({
    resolver: zodResolver(crearUsuarioSchema),
    mode: 'onBlur',
    defaultValues: { rol: ROLES_ADMIN_CREA[0] },
  });

  const onSubmit = (v: CrearUsuarioFormValues) => {
    onGuardar({
      nombre: v.nombre.trim(),
      apellidoPaterno: v.apellidoPaterno?.trim() || undefined,
      apellidoMaterno: v.apellidoMaterno?.trim() || undefined,
      email: v.email.trim(),
      ci: v.ci?.trim() || undefined,
      celular: v.celular?.trim() || undefined,
      password: v.password,
      rol: v.rol,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorApi && <Alert tipo="error">{errorApi}</Alert>}

      <Select label="Rol" error={errors.rol?.message} {...register('rol')}>
        {ROLES_ADMIN_CREA.map((r) => (
          <option key={r} value={r}>
            {ROL_LABEL[r]}
          </option>
        ))}
      </Select>

      <Input
        label="Nombre(s)"
        autoFocus
        error={errors.nombre?.message}
        {...register('nombre')}
      />
      <div className={styles.fila2}>
        <Input
          label="Apellido paterno"
          opcional
          error={errors.apellidoPaterno?.message}
          {...register('apellidoPaterno')}
        />
        <Input
          label="Apellido materno"
          opcional
          error={errors.apellidoMaterno?.message}
          {...register('apellidoMaterno')}
        />
      </div>
      <Input
        label="Correo electrónico"
        type="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <div className={styles.fila2}>
        <Input label="C.I." opcional error={errors.ci?.message} {...register('ci')} />
        <Input
          label="Celular"
          type="tel"
          inputMode="numeric"
          opcional
          error={errors.celular?.message}
          {...register('celular')}
        />
      </div>
      <Input
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        hint="Comunícala a la persona. Podrá cambiarla luego."
        error={errors.password?.message}
        {...register('password')}
      />

      <div className={styles.pieDoble}>
        <Button variante="secundario" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={cargando}>
          Crear cuenta
        </Button>
      </div>
    </form>
  );
}
