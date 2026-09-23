import { z } from 'zod';

/* --------------------------------------------------------------------------
 * Validación de variables de entorno al arrancar (Anexo C13).
 * Si falta o está mal una variable, la app NO levanta — evita el clásico
 * "funcionaba en mi máquina" por una variable olvidada.
 * ----------------------------------------------------------------------- */

const esquemaEnv = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  DATABASE_URL: z.string().url(),

  // Redis solo lo usa BullMQ (colas). Opcional hoy: el backend arranca sin él.
  REDIS_URL: z.string().url().optional(),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRA_EN: z.string().default('8h'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Remitente que ve el usuario, ej. "QPass <qpass.team@gmail.com>".
  SMTP_FROM: z.string().optional(),

  PORT: z.coerce.number().int().positive().default(4000),
  // Vacío o "*" => todos los orígenes (como el backend Express anterior).
  CORS_ORIGEN: z.string().default('*'),

  // Almacenamiento de imágenes (S3 compatible: MinIO en prod, ver
  // docker-compose.yml). Requeridas: sin esto la subida/servido de fotos no
  // funciona, así que la app no debe levantar a medias.
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1).default('qpass-uploads'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),
  // MinIO exige path-style; se deja activado salvo que se ponga "false".
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true'),
});

export type VariablesEntorno = z.infer<typeof esquemaEnv>;

export function validarEnv(configuracion: Record<string, unknown>): VariablesEntorno {
  const resultado = esquemaEnv.safeParse(configuracion);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas:\n${detalle}`);
  }
  return resultado.data;
}
