import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CrearProductoDto } from './crear-producto.dto';

/** PATCH: todo opcional; `puestoId` no se cambia desde acá. */
export class ActualizarProductoDto extends PartialType(
  OmitType(CrearProductoDto, ['puestoId'] as const),
) {}
