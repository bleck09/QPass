import { SetMetadata } from '@nestjs/common';
import { Rol } from '@prisma/client';

/**
 * @Roles('Admin', 'Supervisor') — restringe un endpoint a esos roles GLOBALES
 * de cuenta (Usuario.rol, el que viaja en el JWT). Va pegado al endpoint que
 * protege para leerse sin buscar en otro archivo (C15). Sin este decorador,
 * cualquier usuario autenticado pasa.
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
