import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditoriaService } from './auditoria.service';

@Controller('auditoria')
@Roles('Admin')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  listar(
    @Query('entidad') entidad?: string,
    @Query('actorId') actorId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('pagina') pagina?: string,
  ) {
    return this.auditoriaService.listar({
      entidad,
      actorId: actorId ? Number(actorId) : undefined,
      desde,
      hasta,
      pagina: pagina ? Number(pagina) : 0,
    });
  }
}
