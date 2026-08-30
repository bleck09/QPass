/* ============================================================================
 * ElementoRecintoForm — alta/edición de un elemento del plano del recinto
 * (un puesto de negocio, un escenario, una zona de servicios…).
 * Solo recoge y valida datos: las mutaciones las orquesta MapaRecintoPanel.
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, SubirImagen } from '@/shared/components/ui';
import styles from './MapaRecintoPanel.module.css';

/** Categorías del recinto. La primera es el valor por defecto. */
export const CATEGORIAS_RECINTO = [
  'Comida',
  'Bebidas',
  'Entretenimiento',
  'Servicios',
  'General',
] as const;

export interface NegocioOpcion {
  id: number;
  nombre: string;
  email: string;
}

export interface ValoresElemento {
  /** Solo se usa al crear; en edición el dueño no cambia. */
  negocioId: number | null;
  nombre: string;
  categoria: string;
  ancho: number;
  alto: number;
  logo: string | null;
}

const esquema = z.object({
  negocioId: z.string(),
  nombre: z.string().trim().min(1, 'Indica el nombre del elemento'),
  categoria: z.string().min(1, 'Elige una categoría'),
  ancho: z.string().refine((v) => Number(v) >= 50, 'El ancho mínimo es 50'),
  alto: z.string().refine((v) => Number(v) >= 50, 'El alto mínimo es 50'),
});
type CamposForm = z.infer<typeof esquema>;

interface Props {
  /** Datos iniciales cuando se está editando. */
  inicial?: Partial<ValoresElemento>;
  /** Lista de negocios para asignar el dueño (solo en alta). */
  negocios: NegocioOpcion[];
  /** true cuando se edita un elemento existente. */
  edicion: boolean;
  cargando: boolean;
  onGuardar: (valores: ValoresElemento) => void;
  onCancelar: () => void;
}

export function ElementoRecintoForm({
  inicial,
  negocios,
  edicion,
  cargando,
  onGuardar,
  onCancelar,
}: Props) {
  // El logo se guarda como data URL y se maneja fuera de react-hook-form.
  const [logo, setLogo] = useState<string | null>(inicial?.logo ?? null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CamposForm>({
    resolver: zodResolver(esquema),
    defaultValues: {
      negocioId: inicial?.negocioId != null ? String(inicial.negocioId) : '',
      nombre: inicial?.nombre ?? '',
      categoria: inicial?.categoria ?? CATEGORIAS_RECINTO[0],
      ancho: String(inicial?.ancho ?? 120),
      alto: String(inicial?.alto ?? 120),
    },
  });

  const enviar = (campos: CamposForm) => {
    onGuardar({
      negocioId: campos.negocioId ? Number(campos.negocioId) : null,
      nombre: campos.nombre.trim(),
      categoria: campos.categoria,
      ancho: Number(campos.ancho),
      alto: Number(campos.alto),
      logo,
    });
  };

  return (
    <form className={styles.formGrid} onSubmit={handleSubmit(enviar)} noValidate>
      {!edicion && (
        <Select
          label="Negocio dueño del puesto"
          hint="Para escenarios o zonas comunes, elige cualquiera y renómbralo."
          error={errors.negocioId?.message}
          {...register('negocioId')}
        >
          <option value="">Sin asignar</option>
          {negocios.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre} — {n.email}
            </option>
          ))}
        </Select>
      )}

      <Input
        label="Nombre del elemento"
        placeholder="Ej: Pizzas El Paso"
        error={errors.nombre?.message}
        {...register('nombre')}
      />

      <Select label="Categoría" error={errors.categoria?.message} {...register('categoria')}>
        {CATEGORIAS_RECINTO.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>

      <div className={styles.formFila}>
        <Input
          label="Ancho (px)"
          type="number"
          min={50}
          inputMode="numeric"
          error={errors.ancho?.message}
          {...register('ancho')}
        />
        <Input
          label="Alto (px)"
          type="number"
          min={50}
          inputMode="numeric"
          error={errors.alto?.message}
          {...register('alto')}
        />
      </div>

      <SubirImagen
        label="Imagen o logo"
        hint="Opcional. Se muestra dentro del elemento en el plano."
        valor={logo}
        onChange={setLogo}
      />

      <div className={styles.pieModal}>
        <Button variante="secundario" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={cargando}>
          {edicion ? 'Guardar cambios' : 'Añadir al plano'}
        </Button>
      </div>
    </form>
  );
}
