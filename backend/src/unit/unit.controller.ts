import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, Query } from '@nestjs/common';
import { UnitService } from './unit.service';
import { Prisma } from 'generated/prisma/client';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';
import { HashidService } from 'src/common/hashid/hashid.service';


@Controller('unit')
export class UnitController {
  constructor(
    private readonly unitService: UnitService,
    private readonly hashidService: HashidService,
  ) {}

  //for frontend
  @Get('search')
  searchUnits(
    @Query('search') search?: string,
    @Query('houseId', HashidPipe) houseId?: string,
  ) {
    return this.unitService.searchUnits({ search, houseId: Number(houseId) });
  }

  @Get('waterSearch')
  searchWaterUnits(
    @Query('search') search?: string,
    @Query('houseId', HashidPipe) houseId?: string,
  ) {
    return this.unitService.searchWaterUnits({
      search,
      houseId: Number(houseId),
    });
  }

  @Post('createUnit')
  createUnit(@Body() createUnitDto: any) {
    if (!createUnitDto.houseId) {
      throw new HttpException('houseId is required.', HttpStatus.BAD_REQUEST);
    }

    const decodedHouseId = this.hashidService.decode(createUnitDto.houseId);
    if (decodedHouseId === null) {
      throw new HttpException('Invalid house ID.', HttpStatus.BAD_REQUEST);
    }

    createUnitDto.house = { connect: { id: decodedHouseId } };
    delete createUnitDto.houseId;

    return this.unitService.createUnit(createUnitDto);
  }

  @Get('byHouseId/:id')
  getUnits(@Param('id', HashidPipe) id: string) {
    return this.unitService.getUnits(+id);
  }

  @Get('one/:id')
  getOne(@Param('id', HashidPipe) id: string) {
    return this.unitService.getOne(+id);
  }

  @Get('names/:id')
  names(@Param('id', HashidPipe) id: string) {
    return this.unitService.names(+id);
  }

  //backend
  @Post()
  create(@Body() createUnitDto: Prisma.UnitCreateInput) {
    return this.unitService.create(createUnitDto);
  }

  @Get()
  findAll() {
    return this.unitService.findAll();
  }

  @Get('get/:id')
  findOne(@Param('id') id: string) {
    console.log(id);
    return this.unitService.findOne(+id);
  }

  @Patch('editUnit/:id')
  update(
    @Param('id', HashidPipe) id: string,
    @Body() updateUnitDto: Prisma.UnitUpdateInput,
  ) {
    return this.unitService.update(+id, updateUnitDto);
  }

  @Delete('deleteUnit/:id')
  remove(@Param('id', HashidPipe) id: string) {
    return this.unitService.remove(+id);
  }

  @Delete('deletePayments')
  async deleteMany(@Body('ids') ids: string) {
    try {
      const idArray = ids.split(',').map((id) => this.hashidService.decode(id));

      if (idArray.length === 0) {
        throw new HttpException(
          { message: 'No payment IDs provided.' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.unitService.deleteMany(idArray);

      if (result.count === 0) {
        throw new HttpException(
          {
            message: 'No payments were deleted. Please check the provided IDs.',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        message: `${result.count} payment(s) deleted successfully.`,
      };
    } catch (error) {
      console.error('Delete many payments error:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { message: 'Failed to delete payments.', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
