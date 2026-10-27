import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MeterReadingService } from './meter-reading.service';
import { Prisma } from 'generated/prisma/client';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';
import { ListQuery } from 'src/common/list-query';
import { Need } from 'src/auth/need.decorator';
import { only } from 'src/common/only';

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
  @Need('readings.view')
  getAll(@Query() query: ListQuery) {
    return this.meterReadingService.getAll(query);
  }

  @Get('getAll/filters')
  @Need('readings.view')
  getAllFilters() {
    return this.meterReadingService.getAllFilters();
  }

  // Must stay ahead of the ':id' catch-all route below, or NestJS would treat
  // "suggest-period" as an :id value.
  @Get('suggest-period')
  @Need('readings.add', 'unit:query.unitId')
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
  @Need('readings.edit', 'reading:params.id')
  update(
    @Param('id', HashidPipe) id: string,
    @Body() updateMeterReadingDto: Prisma.MeterReadingUpdateInput,
  ) {
    return this.meterReadingService.update(+id, only(updateMeterReadingDto, ['readOn', 'currentReading']));
  }

  @Delete('deleteMeterReading/:id')
  @Need('readings.delete', 'reading:params.id')
  remove(@Param('id', HashidPipe) id: string) {
    return this.meterReadingService.remove(+id);
  }

  @Post('create')
  @Need('readings.add', 'unit:body.readings.*.unitId', 'house:body.readings.*.houseId')
  createManyReadings(@Body() body: { readings: any[] }) {
    return this.meterReadingService.createMany(body.readings);
  }
}
