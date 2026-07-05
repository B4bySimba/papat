import { Test, TestingModule } from '@nestjs/testing';
import { HashidService } from './hashid.service';

describe('HashidService', () => {
  let service: HashidService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashidService],
    }).compile();

    service = module.get<HashidService>(HashidService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
