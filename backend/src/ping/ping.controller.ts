import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/auth/need.decorator';

@Controller('ping')
export class PingController {
  @Public()
  @Get()
  ping() {
    return { message: 'pong' };
  }
}
