import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HouseService } from './house.service';
import { Prisma } from '@prisma/client';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';
import { HashidService } from 'src/common/hashid/hashid.service';
import { PermissionsGuard } from 'src/auth/permissions.guard';
import { Permissions } from 'src/auth/permissions.decorator';

@Controller('house')
@UseGuards(PermissionsGuard)
export class HouseController {
  constructor(
    private readonly houseService: HouseService,
    private readonly hashidService: HashidService,
  ) {}

  //frontend
  @Get('withUnits')
  // @Permissions('view_house')
  getHousesWithUnitsAndTenants() {
    return this.houseService.getHousesWithUnitsAndTenants();
  }

  @Get('reports')
  // @Permissions('view_house')
  getHousesWithUnits() {
    return this.houseService.getHousesWithUnits();
  }

  @Get('search')
  searchProperties(
    @Query('search') search?: string,
    @Query('query') query?: string,
  ) {
    const actualQuery = search ?? query ?? '';
    return this.houseService.searchProperties(actualQuery);
  }

  @Get('waterSearch')
  searchWaterProperties(
    @Query('search') search?: string,
    @Query('query') query?: string,
  ) {
    const actualQuery = search ?? query ?? '';
    return this.houseService.searchWaterProperties(actualQuery);
  }

  @Post('createProperty')
  async createProperty(@Body() createHouseDto: any) {
    if (createHouseDto.landlordId) {
      createHouseDto.landlordId = this.hashidService.decode(
        createHouseDto.landlordId,
      );
    }

    const house = await this.houseService.createProperty(createHouseDto);

    return {
      message: 'Property created successfully.',
    };
  }

  @Get('names')
  // @Permissions('view_house')
  gaetNameAndIds() {
    return this.houseService.getNameAndIds();
  }

  @Get('dets/:id')
  getDets(@Param('id', HashidPipe) id: number) {
    return this.houseService.getHouseDets(id);
  }

  @Get('units/:id')
  getUnits(@Param('id', HashidPipe) id: number) {
    return this.houseService.getUnits(id);
  }

  @Patch('editHouse/:id')
  update(
    @Param('id', HashidPipe) id: number,
    @Body() updateHouseDto: Prisma.HouseUpdateInput,
  ) {
    console.log(updateHouseDto);
    return this.houseService.update(id, updateHouseDto);
  }

  @Delete('deleteHouse/:id')
  remove(@Param('id', HashidPipe) id: number) {
    return this.houseService.remove(id);
  }

  @Post()
  create(@Body() createHouseDto: any) {
    return this.houseService.create(createHouseDto);
  }

  @Get()
  findAll() {
    return this.houseService.findAll();
  }

  @Get('occupied')
  find() {
    return this.houseService.find();
  }

  @Delete('d/:id')
  removes(@Param('id') id: string) {
    return this.houseService.remove(+id);
  }

  @Get('get/:id')
  findOne(@Param('id') id: string) {
    console.log('Received ID:', id);
    return this.houseService.findOne(+id);
  }
}
