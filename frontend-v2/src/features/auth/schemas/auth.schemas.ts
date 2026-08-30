/* Validación de formularios de auth (zod). Se valida al salir del campo. */

import { z } from 'zod';

const email = z.string().min(1, 'Ingresa tu correo').email('El correo no es válido');
const password = z.string().min(1, 'Ingresa tu contraseña');

export const loginSchema = z.object({
  email,
  password,
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registroSchema = z
  .object({
    nombre: z.string().min(1, 'Ingresa tu nombre'),
    apellidoPaterno: z.string().min(1, 'Ingresa tu apellido paterno'),
    apellidoMaterno: z.string().min(1, 'Ingresa tu apellido materno'),
    email,
    ci: z.string().min(1, 'Ingresa tu documento de identidad'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmar: z.string().min(1, 'Repite la contraseña'),
    celular: z
      .string()
      .regex(/^\d{8}$/, 'El celular debe tener 8 dígitos')
      .optional()
      .or(z.literal('')),
    fechaNacimiento: z.string().optional().or(z.literal('')),
  })
  .refine((d) => d.password === d.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  });
export type RegistroFormValues = z.infer<typeof registroSchema>;

export const solicitarSchema = z.object({ email });
export type SolicitarFormValues = z.infer<typeof solicitarSchema>;

export const restablecerSchema = z
  .object({
    codigo: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos'),
    passwordNueva: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmar: z.string().min(1, 'Repite la contraseña'),
  })
  .refine((d) => d.passwordNueva === d.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  });
export type RestablecerFormValues = z.infer<typeof restablecerSchema>;
