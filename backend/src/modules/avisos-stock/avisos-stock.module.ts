import { Module } from '@nestjs/common';
import { AvisosStockController } from './avisos-stock.controller';
import { AvisosStockService } from './avisos-stock.service';

@Module({
  controllers: [AvisosStockController],
  providers: [AvisosStockService],
})
export class AvisosStockModule {}
