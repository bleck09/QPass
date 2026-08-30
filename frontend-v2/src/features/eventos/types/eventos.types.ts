/* Espejo del modelo Evento de Prisma (backend-nest/src/modules/eventos). */

export type EstadoEvento = 'activo' | 'finalizado';

/** Entidad tal como la devuelve el backend. Solo lectura. */
export interface Evento {
  id: string;
  nombre: string;
  lugar: string;
  fecha: string; // ISO 8601
  fechaFin: string; // ISO 8601
  imagen: string | null;
  estado: EstadoEvento;
  qrPrefijo: string | null;
  qrAncho: number | null;
  qrAlto: number | null;
  creadoPorId: number;
  createdAt: string;
  /** Precio mínimo de sus categorías de ticket. Solo en el listado. */
  precioDesde?: number | null;
}

/** Datos que se ENVÍAN al crear (espejo de CrearEventoDto del backend). */
export interface CrearEventoDto {
  nombre: string;
  lugar: string;
  fecha: string;
  fechaFin?: string;
  imagen?: string;
  qrPrefijo?: string;
  qrAncho?: number;
  qrAlto?: number;
}

/** PATCH: todos opcionales, más estado. */
export type ActualizarEventoDto = Partial<CrearEventoDto> & {
  estado?: EstadoEvento;
};
