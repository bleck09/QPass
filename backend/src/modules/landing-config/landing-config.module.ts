import { Module } from '@nestjs/common';
import { LandingConfigController } from './landing-config.controller';
import { LandingConfigService } from './landing-config.service';

@Module({
  controllers: [LandingConfigController],
  providers: [LandingConfigService],
})
export class LandingConfigModule {}
