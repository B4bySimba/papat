import { Module } from '@nestjs/common';
import { MeterReadingService } from './meter-reading.service';
import { MeterReadingController } from './meter-reading.controller';

@Module({
  controllers: [MeterReadingController],
  providers: [MeterReadingService],
})
export class MeterReadingModule {}
