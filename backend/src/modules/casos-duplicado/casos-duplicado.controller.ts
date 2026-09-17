import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { EstadoCaso } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UsuarioActual,
  UsuarioJwt,
} from '../../common/decorators/usuario-actual.decorator';
import { CasosDuplicadoService } from './casos-duplicado.service';
import { RecuperarManillaDto } from './dto/casos-duplicado.dto';

// La verificación del dueño vive en EntradasController
// (POST /entradas/:id/verificar-duplicado) porque devuelve la entrada actualizada.
@Controller('casos-duplicado')
export class CasosDuplicadoController {
  constructor(private readonly casosDuplicadoService: CasosDuplicadoService) {}

  /** "Personas por encontrar": estado=pendiente. */
  @Get()
  @Roles('Admin', 'Supervisor', 'Cliente')
  listar(
    @UsuarioActual() actor: UsuarioJwt,
    @Query('eventoId') eventoId?: string,
    @Query('estado') estado?: EstadoCaso,
  ) {
    return this.casosDuplicadoService.listar(actor, { eventoId, estado });
  }

  /** Polling (~10 s): escaneos de manillas copiadas desde `desde` (ISO). */
  @Get('alertas')
  @Roles('Admin', 'Supervisor', 'Cliente')
  alertas(
    @UsuarioActual() actor: UsuarioJwt,
    @Query('desde') desde?: string,
    @Query('eventoId') eventoId?: string,
  ) {
    return this.casosDuplicadoService.alertas(actor, { desde, eventoId });
  }

  @Post(':id/recuperar')
  @Roles('Admin', 'Supervisor')
  @HttpCode(HttpStatus.OK)
  recuperar(
    @Param('id') id: string,
    @Body() dto: RecuperarManillaDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.casosDuplicadoService.recuperar(id, dto, actor);
  }
}
