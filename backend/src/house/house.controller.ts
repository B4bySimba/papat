import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { HouseService } from './house.service';
import { Prisma } from 'generated/prisma/client';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';
import { HashidService } from 'src/common/hashid/hashid.service';
import { Need } from 'src/auth/need.decorator';
import { canAt, currentAccess } from 'src/auth/access';
import { only } from 'src/common/only';
import { isGlobal, RIGHTS, withNeeds } from 'src/auth/rights';

/** Whoever adds a house may do everything there except delete it. */
const CREATOR_RIGHTS = withNeeds(RIGHTS.map((r) => r.key).filter((k) => !isGlobal(k) && k !== 'house.delete'));

@Controller('house')
export class HouseController {
  constructor(
    private readonly houseService: HouseService,
    private readonly hashidService: HashidService,
  ) {}

  //frontend
  @Get('withUnits')
  @Need('reports.view')
  getHousesWithUnitsAndTenants() {
    return this.houseService.getHousesWithUnitsAndTenants();
  }

  @Get('reports')
  @Need('reports.view')
  getHousesWithUnits() {
    return this.houseService.getHousesWithUnits();
  }

  @Get('search')
  @Need('payments.add')
  searchProperties(
    @Query('search') search?: string,
    @Query('query') query?: string,
  ) {
    const actualQuery = search ?? query ?? '';
    return this.houseService.searchProperties(actualQuery);
  }

  @Get('waterSearch')
  @Need('readings.add')
  searchWaterProperties(
    @Query('search') search?: string,
    @Query('query') query?: string,
  ) {
    const actualQuery = search ?? query ?? '';
    return this.houseService.searchWaterProperties(actualQuery);
  }

  @Post('createProperty')
  @Need('property.add')
  async createProperty(@Body() createHouseDto: any) {
    const access = currentAccess()!;
    if (createHouseDto.landlordId) {
      createHouseDto.landlordId = this.hashidService.decode(
        createHouseDto.landlordId,
      );
    }

    const house = await this.houseService.createProperty(
      createHouseDto,
      access.isRoot ? undefined : { userId: access.user.id, rights: CREATOR_RIGHTS },
    );

    return {
      message: 'Property created successfully.',
    };
  }

  @Get('names')
  @Need('house.view')
  gaetNameAndIds() {
    return this.houseService.getNameAndIds();
  }

  @Get('dets/:id')
  @Need('house.view', 'house:params.id')
  async getDets(@Param('id', HashidPipe) id: number) {
    const house = await this.houseService.getHouseDets(id);
    return canAt('landlord.view', id) ? house : { ...house, landlord: null, agreed_commission: null };
  }

  @Get('units/:id')
  getUnits(@Param('id', HashidPipe) id: number) {
    return this.houseService.getUnits(id);
  }

  @Patch('editHouse/:id')
  @Need('house.edit', 'house:params.id')
  update(
    @Param('id', HashidPipe) id: number,
    @Body() updateHouseDto: Prisma.HouseUpdateInput,
  ) {
    return this.houseService.update(id, only(updateHouseDto, ['name', 'address', 'description', 'lr_number']));
  }

  @Delete('deleteHouse/:id')
  @Need('house.delete', 'house:params.id')
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
