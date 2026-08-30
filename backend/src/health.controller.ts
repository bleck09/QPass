import { Controller, Get } from '@nestjs/common';
import { Publico } from './common/decorators/publico.decorator';

@Controller()
export class HealthController {
  @Get('health')
  @Publico()
  health() {
    return { ok: true };
  }
}
