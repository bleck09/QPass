/* Espejo del modelo SolicitudEvento de Prisma. */

export type EstadoSolicitud = 'pendiente' | 'aprobado' | 'rechazado';

export interface Actividad {
  titulo: string;
  descripcion: string;
}

export interface ItemCronograma {
  hora: string;
  actividad: string;
}

export interface ClienteResumen {
  id: number;
  nombre: string;
  email: string;
}

export interface SolicitudEvento {
  id: string;
  clienteId: number;
  nombreEvento: string;
  lugar: string;
  fecha: string;
  fechaFin: string;
  descripcion: string;
  colorPrimario: string;
  colorBoton: string;
  colorFondo: string;
  colorTextoTitulo: string;
  colorTextoP: string;
  imagenPortada: string | null;
  mapaLugar: string | null;
  actividades: Actividad[];
  cronograma: ItemCronograma[];
  estado: EstadoSolicitud;
  motivoRechazo: string | null;
  eventoId: string | null;
  resueltoPorId: number | null;
  resueltoEn: string | null;
  createdAt: string;
  updatedAt: string;
  cliente?: ClienteResumen;
}

export interface CrearSolicitudDto {
  nombreEvento: string;
  lugar: string;
  fecha: string;
  fechaFin?: string;
  descripcion: string;
  colorPrimario: string;
  colorBoton: string;
  colorFondo: string;
  colorTextoTitulo: string;
  colorTextoP: string;
  imagenPortada?: string;
  mapaLugar?: string;
  actividades: Actividad[];
  cronograma: ItemCronograma[];
}

export type ActualizarSolicitudDto = Partial<CrearSolicitudDto>;
