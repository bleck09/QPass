/* ============================================================================
 * PerfilForm — datos editables del propio perfil. La identidad (nombre, correo,
 * rol, CI) es de solo lectura: se corrige por otros flujos.
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, SubirImagen, Textarea } from '@/shared/components/ui';
import { ROL_LABEL } from '@/shared/constants/roles';
import { perfilSchema, type PerfilFormValues } from '../schemas/usuarios.schemas';
import type { ActualizarPerfilDto, Usuario } from '../types/usuarios.types';
import styles from './perfilForm.module.css';

interface PerfilFormProps {
  usuario: Usuario;
  cargando?: boolean;
  errorApi?: string;
  onGuardar: (dto: ActualizarPerfilDto) => void;
}

function fechaAInput(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '';
}

export function PerfilForm({ usuario, cargando, errorApi, onGuardar }: PerfilFormProps) {
  const [foto, setFoto] = useState<string | null>(usuario.foto);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema),
    mode: 'onBlur',
    defaultValues: {
      celular: usuario.celular ?? '',
      ciudad: usuario.ciudad ?? '',
      biografia: usuario.biografia ?? '',
      fechaNacimiento: fechaAInput(usuario.fechaNacimiento),
    },
  });

  const fotoCambio = foto !== usuario.foto;

  const onSubmit = (v: PerfilFormValues) => {
    onGuardar({
      celular: v.celular?.trim() || undefined,
      ciudad: v.ciudad?.trim() || undefined,
      biografia: v.biografia?.trim() || undefined,
      fechaNacimiento: v.fechaNacimiento
        ? new Date(v.fechaNacimiento).toISOString()
        : undefined,
      foto: fotoCambio ? (foto ?? undefined) : undefined,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorApi && <Alert tipo="error">{errorApi}</Alert>}

      <dl className={styles.identidad}>
        <div>
          <dt>Nombre</dt>
          <dd>
            {[usuario.nombre, usuario.apellidoPaterno, usuario.apellidoMaterno]
              .filter(Boolean)
              .join(' ')}
          </dd>
        </div>
        <div>
          <dt>Correo</dt>
          <dd>{usuario.email}</dd>
        </div>
        <div>
          <dt>Rol</dt>
          <dd>{ROL_LABEL[usuario.rol]}</dd>
        </div>
        {usuario.ci && (
          <div>
            <dt>C.I.</dt>
            <dd>{usuario.ci}</dd>
          </div>
        )}
      </dl>

      <SubirImagen
        label="Foto de perfil"
        valor={foto}
        onChange={setFoto}
        hint="Se muestra en el menú y en las pantallas de escaneo."
      />

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
          label="Ciudad"
          opcional
          autoComplete="address-level2"
          error={errors.ciudad?.message}
          {...register('ciudad')}
        />
      </div>

      <Input
        label="Fecha de nacimiento"
        type="date"
        opcional
        error={errors.fechaNacimiento?.message}
        {...register('fechaNacimiento')}
      />

      <Textarea
        label="Biografía"
        opcional
        rows={3}
        error={errors.biografia?.message}
        {...register('biografia')}
      />

      <div className={styles.pie}>
        <Button type="submit" cargando={cargando}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
