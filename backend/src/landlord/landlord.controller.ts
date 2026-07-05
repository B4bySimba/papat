import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { LandlordService } from './landlord.service';
import { Prisma } from '@prisma/client';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';


@Controller('landlord')
export class LandlordController {
  constructor(private readonly landlordService: LandlordService) {}

  //lease
  @Get('by-tenant')
  getLeaseByTenant(@Query('tenantId', HashidPipe) tenantId: string) {
    console.log('Decoded tenantId:', tenantId); // � Add this
    return this.landlordService.findActiveByTenant(+tenantId);
  }

  @Get('by-unit')
  getLeaseByUnit(
    @Query('houseId', HashidPipe) houseId: number,
    @Query('unitId', HashidPipe) unitId: number,
  ) {
    return this.landlordService.findActiveByHouseAndUnit(houseId, unitId);
  }

  @Post()
  create(@Body() createLandlordDto: Prisma.LandlordCreateInput) {
    return this.landlordService.create(createLandlordDto);
  }

  @Get()
  findAll() {
    return this.landlordService.findAll();
  }

  @Get('getAll')
  getAll() {
    return this.landlordService.getAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.landlordService.findOne(+id);
  }

  @Patch('editLandlord/:id')
  update(
    @Param('id', HashidPipe) id: string,
    @Body() updateLandlordDto: Prisma.LandlordUpdateInput,
  ) {
    return this.landlordService.update(+id, updateLandlordDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.landlordService.remove(+id);
  }
}