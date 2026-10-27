import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { LandlordService } from './landlord.service';
import { Prisma } from 'generated/prisma/client';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';
import { Need } from 'src/auth/need.decorator';
import { only } from 'src/common/only';

const LANDLORD_FIELDS = ['name', 'contact', 'nationalId', 'email'] as const;


@Controller('landlord')
export class LandlordController {
  constructor(private readonly landlordService: LandlordService) {}

  //lease
  @Get('by-tenant')
  @Need('payments.add', 'tenant:query.tenantId')
  getLeaseByTenant(@Query('tenantId', HashidPipe) tenantId: string) {
    return this.landlordService.findActiveByTenant(+tenantId);
  }

  @Get('by-unit')
  @Need('payments.add', 'house:query.houseId', 'unit:query.unitId')
  getLeaseByUnit(
    @Query('houseId', HashidPipe) houseId: number,
    @Query('unitId', HashidPipe) unitId: number,
  ) {
    return this.landlordService.findActiveByHouseAndUnit(houseId, unitId);
  }

  @Post()
  @Need('landlords.manage')
  create(@Body() createLandlordDto: Prisma.LandlordCreateInput) {
    return this.landlordService.create(only(createLandlordDto, LANDLORD_FIELDS) as Prisma.LandlordCreateInput);
  }

  @Get()
  findAll() {
    return this.landlordService.findAll();
  }

  @Get('getAll')
  @Need('property.add')
  getAll() {
    return this.landlordService.getAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.landlordService.findOne(+id);
  }

  @Patch('editLandlord/:id')
  @Need('landlords.manage')
  update(
    @Param('id', HashidPipe) id: string,
    @Body() updateLandlordDto: Prisma.LandlordUpdateInput,
  ) {
    return this.landlordService.update(+id, only(updateLandlordDto, LANDLORD_FIELDS));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.landlordService.remove(+id);
  }
}