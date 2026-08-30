import { z } from 'zod';

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color hex de 6 dígitos');

export const solicitudSchema = z
  .object({
    nombreEvento: z.string().trim().min(3, 'Mínimo 3 caracteres'),
    lugar: z.string().trim().min(1, 'Indica el lugar'),
    fecha: z.string().min(1, 'Indica la fecha de inicio'),
    fechaFin: z.string().min(1, 'Indica la fecha de fin'),
    descripcion: z.string().trim().min(10, 'Describe el evento (mínimo 10 caracteres)'),
    colorPrimario: hex,
    colorBoton: hex,
    colorFondo: hex,
    colorTextoTitulo: hex,
    colorTextoP: hex,
    imagenPortada: z.string().optional(),
    mapaLugar: z.string().optional(),
    actividades: z
      .array(
        z.object({
          titulo: z.string().trim().min(1, 'Título requerido'),
          descripcion: z.string().trim().min(1, 'Descripción requerida'),
        }),
      )
      .min(1, 'Agrega al menos una actividad'),
    cronograma: z
      .array(
        z.object({
          hora: z.string().trim().min(1, 'Hora requerida'),
          actividad: z.string().trim().min(1, 'Actividad requerida'),
        }),
      )
      .min(1, 'Agrega al menos un ítem al cronograma'),
  })
  .refine((d) => new Date(d.fechaFin) >= new Date(d.fecha), {
    message: 'La fecha de fin no puede ser anterior al inicio',
    path: ['fechaFin'],
  });

export type SolicitudFormValues = z.infer<typeof solicitudSchema>;

export const COLORES_POR_DEFECTO = {
  colorPrimario: '#0f7d8c',
  colorBoton: '#0f7d8c',
  colorFondo: '#0b1120',
  colorTextoTitulo: '#ffffff',
  colorTextoP: '#c9d3dd',
} as const;

export const rechazoSchema = z.object({
  motivoRechazo: z.string().trim().min(5, 'Explica brevemente el motivo'),
});
export type RechazoFormValues = z.infer<typeof rechazoSchema>;
