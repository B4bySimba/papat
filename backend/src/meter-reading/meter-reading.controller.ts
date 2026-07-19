import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MeterReadingService } from './meter-reading.service';
import { Prisma } from 'generated/prisma/client';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';


@Controller('meter-reading')
export class MeterReadingController {
  constructor(private readonly meterReadingService: MeterReadingService) {}

  @Post()
  create(@Body() createMeterReadingDto: Prisma.MeterReadingCreateInput) {
    return this.meterReadingService.create(createMeterReadingDto);
  }

  @Get()
  findAll() {
    return this.meterReadingService.findAll();
  }

  @Get('getAll')
  getAll() {
    return this.meterReadingService.getAll();
  }

  // Must stay ahead of the ':id' catch-all route below, or NestJS would treat
  // "suggest-period" as an :id value.
  @Get('suggest-period')
  suggestPeriod(
    @Query('unitId') unitId: string,
    @Query('readOn') readOn: string,
    @Query('currentReading') currentReading?: string,
  ) {
    return this.meterReadingService.suggestPeriod(unitId, readOn, currentReading);
  }

  @Get('unit/:unitId')
  getUnit(@Param('unitId') unitId: string) {
    return this.meterReadingService.getUnit(+unitId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meterReadingService.findOne(+id);
  }

  @Patch('editMeterReading/:id')
  update(
    @Param('id', HashidPipe) id: string,
    @Body() updateMeterReadingDto: Prisma.MeterReadingUpdateInput,
  ) {
    return this.meterReadingService.update(+id, updateMeterReadingDto);
  }

  @Delete('deleteMeterReading/:id')
  remove(@Param('id', HashidPipe) id: string) {
    return this.meterReadingService.remove(+id);
  }

  @Post('create')
  createManyReadings(@Body() body: { readings: any[] }) {
    return this.meterReadingService.createMany(body.readings);
  }
}
