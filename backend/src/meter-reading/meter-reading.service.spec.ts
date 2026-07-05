import { Test, TestingModule } from '@nestjs/testing';
import { MeterReadingService } from './meter-reading.service';

describe('MeterReadingService', () => {
  let service: MeterReadingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeterReadingService],
    }).compile();

    service = module.get<MeterReadingService>(MeterReadingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
