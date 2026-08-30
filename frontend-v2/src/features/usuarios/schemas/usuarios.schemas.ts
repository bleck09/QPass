import { z } from 'zod';
import { ROLES } from '@/shared/constants/roles';

export const perfilSchema = z.object({
  celular: z
    .string()
    .trim()
    .regex(/^\d{8}$/, 'El celular debe tener 8 dígitos')
    .optional()
    .or(z.literal('')),
  ciudad: z.string().trim().max(80).optional().or(z.literal('')),
  biografia: z.string().trim().max(400, 'Máximo 400 caracteres').optional().or(z.literal('')),
  fechaNacimiento: z.string().optional().or(z.literal('')),
});
export type PerfilFormValues = z.infer<typeof perfilSchema>;

export const cambiarPasswordSchema = z
  .object({
    passwordActual: z.string().min(1, 'Ingresa tu contraseña actual'),
    passwordNueva: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmar: z.string().min(1, 'Repite la nueva contraseña'),
  })
  .refine((d) => d.passwordNueva === d.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  });
export type CambiarPasswordFormValues = z.infer<typeof cambiarPasswordSchema>;

/** Roles que un Admin puede dar de alta directamente. */
export const ROLES_ADMIN_CREA = [
  ROLES.RECARGADOR,
  ROLES.SUPERVISOR,
  ROLES.DEVOLUCION,
  ROLES.USUARIO_NEGOCIO,
] as const;

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresa el nombre'),
  apellidoPaterno: z.string().trim().optional().or(z.literal('')),
  apellidoMaterno: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().min(1, 'Ingresa el correo').email('Correo no válido'),
  ci: z.string().trim().optional().or(z.literal('')),
  celular: z
    .string()
    .trim()
    .regex(/^\d{8}$/, '8 dígitos')
    .optional()
    .or(z.literal('')),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  rol: z.enum(ROLES_ADMIN_CREA),
});
export type CrearUsuarioFormValues = z.infer<typeof crearUsuarioSchema>;
