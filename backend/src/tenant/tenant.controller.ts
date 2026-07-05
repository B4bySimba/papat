import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, NotFoundException, Query } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';
import { HashidService } from 'src/common/hashid/hashid.service';


@Controller('tenant')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly databaseService: DatabaseService,
    private readonly hashidService: HashidService,
  ) {}

  //frontend
  @Patch('arrearsbf/:id')
  arrearsbf(
    @Param('id', HashidPipe) id: string,
    @Body() updateLeaseDto: Prisma.LeaseUpdateInput,
  ) {
    return this.tenantService.arrearsbf(+id, updateLeaseDto);
  }

  @Get('search')
  searchTenants(@Query('query') query: string) {
    return this.tenantService.searchTenants(query);
  }

  @Get('byUnitId/:id')
  async getTenant(@Param('id', HashidPipe) id: string) {
    try {
      const tenant = await this.tenantService.getTenant(+id);
      return {
        success: true,
        message: 'Tenant retrieved successfully.',
        data: tenant,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          message: error.message,
          data: {},
        };
      }
      console.error(error); // Optional for debugging

      return {
        success: false,
        message: 'An unexpected error occurred.',
      };
    }
  }

  @Get('leaseCode/:id')
  async leaseCode(@Param('id', HashidPipe) id: string) {
    try {
      const tenant = await this.tenantService.leaseCode(+id);
      return {
        success: true,
        message: 'Tenant retrieved successfully.',
        data: tenant,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          message: error.message,
          data: {},
        };
      }
      console.error(error); // Optional for debugging

      return {
        success: false,
        message: 'An unexpected error occurred.',
      };
    }
  }

  @Get('getCurrent/:id')
  async findTenant(@Param('id', HashidPipe) id: string) {
    try {
      const tenant = await this.tenantService.findTenant(+id);
      return {
        success: true,
        message: 'Tenant retrieved successfully.',
        data: tenant,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          message: error.message,
          data: {},
        };
      }
      console.error(error); // Optional for debugging

      return {
        success: false,
        message: 'An unexpected error occurred.',
      };
    }
  }

  @Post('createTenant')
  createTenant(@Body() createTenantDto: any) {
    if (!createTenantDto.unitId) {
      throw new HttpException('unit is required.', HttpStatus.BAD_REQUEST);
    }

    const decodedUnitId = this.hashidService.decode(createTenantDto.unitId);
    if (decodedUnitId === null) {
      throw new HttpException('Invalid unit ID.', HttpStatus.BAD_REQUEST);
    }

    createTenantDto.unitId = decodedUnitId;
    delete createTenantDto.unit;

    return this.tenantService.createTenant(createTenantDto);
  }

  @Get('year/:code')
  async year(@Param('code') code: string) {
    return this.tenantService.year(code);
  }

  @Get('past/:id')
  async past(@Param('id', HashidPipe) id: string) {
    return this.tenantService.past(+id);
  }

  @Get('byLeaseId/:id')
  async pastTenant(@Param('id', HashidPipe) id: string) {
    try {
      const tenant = await this.tenantService.getPastTenant(+id);
      return {
        success: true,
        message: 'Tenant retrieved successfully.',
        data: tenant,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          message: error.message,
          data: {},
        };
      }
      console.error(error); // Optional for debugging

      return {
        success: false,
        message: 'An unexpected error occurred.',
      };
    }
  }

  //backend
  @Post()
  create(@Body() createTenantDto: Prisma.TenantCreateInput) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(+id);
  }

  @Patch('editTenant/:id')
  update(
    @Param('id', HashidPipe) id: string,
    @Body() updateTenantDto: Prisma.TenantUpdateInput,
  ) {
    return this.tenantService.update(+id, updateTenantDto);
  }

  @Patch('vacateTenant/:id')
  async vacateTenant(
    @Param('id', HashidPipe) id: string,
    @Body('terminationDate') terminationDate: string,
  ) {
    console.log(id, terminationDate);
    return this.tenantService.vacateTenant(+id, terminationDate);
  }

  @Delete('deleteTenant/:id')
  remove(@Param('id', HashidPipe) id: string) {
    return this.tenantService.remove(+id);
  }

  @Patch('edit-lease/:id')
  async updateLease(@Param('id') id: string, @Body() data: any) {
    return this.databaseService.lease.update({
      where: { id: +id },
      data,
    });
  }

  @Get('lease/:code')
  async getLease(@Param('code') code: string) {
    return this.databaseService.lease.findFirst({ where: { code } });
  }
}
