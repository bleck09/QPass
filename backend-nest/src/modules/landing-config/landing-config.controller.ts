import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import { Publico } from '../../common/decorators/publico.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { LandingConfigService } from './landing-config.service';
import { GuardarLandingConfigDto } from './dto/guardar-landing-config.dto';

@Controller('landing-config')
export class LandingConfigController {
  constructor(private readonly landingConfigService: LandingConfigService) {}

  @Get(':eventoId')
  @Publico()
  obtener(@Param('eventoId') eventoId: string) {
    return this.landingConfigService.obtener(eventoId);
  }

  @Put(':eventoId')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  guardar(
    @Param('eventoId') eventoId: string,
    @Body() dto: GuardarLandingConfigDto,
  ) {
    return this.landingConfigService.guardar(eventoId, dto);
  }
}
