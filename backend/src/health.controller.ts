import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Publico } from './common/decorators/publico.decorator';

@Controller()
export class HealthController {
  @Get('health')
  @Publico()
  @SkipThrottle()
  health() {
    return { ok: true };
  }
}
