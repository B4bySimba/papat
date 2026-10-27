import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';
import { Need } from 'src/auth/need.decorator';
import { HouseChange, LeaseChange, RateChangeService } from './rate-change.service';

@Controller('rates')
export class RatesController {
  constructor(private readonly rates: RateChangeService) {}

  @Get('lease/:id')
  @Need('rates.change', 'lease:params.id')
  leaseTerms(@Param('id', HashidPipe) id: string, @Query('month') month?: string) {
    return this.rates.leaseTerms(+id, month);
  }

  @Post('lease/:id')
  @Need('rates.change', 'lease:params.id')
  changeLease(@Param('id', HashidPipe) id: string, @Body() body: LeaseChange) {
    return this.rates.changeLease(+id, body);
  }

  @Get('house/:id')
  @Need('rates.change', 'house:params.id')
  houseTerms(@Param('id', HashidPipe) id: string, @Query('month') month?: string) {
    return this.rates.houseTerms(+id, month);
  }

  @Post('house/:id')
  @Need('rates.change', 'house:params.id')
  changeHouse(@Param('id', HashidPipe) id: string, @Body() body: HouseChange) {
    return this.rates.changeHouse(+id, body);
  }
}
