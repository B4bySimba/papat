import { Test, TestingModule } from '@nestjs/testing';
import { MeterReadingController } from './meter-reading.controller';
import { MeterReadingService } from './meter-reading.service';

describe('MeterReadingController', () => {
  let controller: MeterReadingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeterReadingController],
      providers: [MeterReadingService],
    }).compile();

    controller = module.get<MeterReadingController>(MeterReadingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
