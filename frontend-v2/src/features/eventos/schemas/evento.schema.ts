import { z } from 'zod';

/** Convierte "" -> undefined para campos opcionales de texto. */
const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const eventoSchema = z
  .object({
    nombre: z.string().trim().min(3, 'Mínimo 3 caracteres'),
    lugar: z.string().trim().min(1, 'Indica el lugar'),
    fecha: z.string().min(1, 'Indica la fecha de inicio'),
    fechaFin: z.string().min(1, 'Indica la fecha de fin'),
    imagen: textoOpcional,
    qrPrefijo: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{0,3}$/, '1 a 3 letras')
      .optional()
      .transform((v) => (v ? v.toUpperCase() : undefined)),
  })
  .refine((d) => new Date(d.fechaFin) >= new Date(d.fecha), {
    message: 'La fecha de fin no puede ser anterior al inicio',
    path: ['fechaFin'],
  });

export type EventoFormValues = z.input<typeof eventoSchema>;
export type EventoFormData = z.output<typeof eventoSchema>;
