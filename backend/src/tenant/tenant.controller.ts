import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, NotFoundException, Query, ForbiddenException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { Prisma } from 'generated/prisma/client';
import prisma from 'lib/db';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';
import { HashidService } from 'src/common/hashid/hashid.service';
import { Need } from 'src/auth/need.decorator';
import { canAt, requestContext } from 'src/auth/access';
import { only } from 'src/common/only';


@Controller('tenant')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly hashidService: HashidService,
  ) {}

  //frontend
  @Patch('arrearsbf/:id')
  @Need('arrears.edit', 'lease:params.id')
  arrearsbf(
    @Param('id', HashidPipe) id: string,
    @Body() updateLeaseDto: Prisma.LeaseUpdateInput,
  ) {
    return this.tenantService.arrearsbf(+id, updateLeaseDto);
  }

  @Get('search')
  @Need('payments.add')
  searchTenants(@Query('query') query: string) {
    return this.tenantService.searchTenants(query);
  }

  @Get('byUnitId/:id')
  @Need('tenants.view', 'unit:params.id')
  async getTenant(@Param('id', HashidPipe) id: string) {
    try {
      const tenant = await this.tenantService.getTenant(+id);
      const [houseId] = requestContext.getStore()!.houseIds;
      if (!canAt('payments.view', houseId)) Object.assign(tenant, { arrearsbf: null, deposit: null });
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
  @Need('tenants.add', 'unit:body.unitId')
  createTenant(@Body() createTenantDto: any) {
    if (!createTenantDto.unitId) {
      throw new HttpException('unit is required.', HttpStatus.BAD_REQUEST);
    }
    delete createTenantDto.movedFromLeaseId;
    if (Number(createTenantDto.arrearsbf) && !canAt('arrears.edit', requestContext.getStore()!.houseIds[0])) {
      throw new ForbiddenException('Setting arrears b/f needs the Arrears b/f right.');
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
  @Need('tenants.view', 'leaseCode:params.code')
  async year(@Param('code') code: string) {
    return this.tenantService.year(code);
  }

  @Get('past')
  @Need('pastTenants.view')
  async allPast() {
    return this.tenantService.past();
  }

  @Get('past/:id')
  @Need('pastTenants.view', 'unit:params.id')
  async past(@Param('id', HashidPipe) id: string) {
    return this.tenantService.past(+id);
  }

  @Get('byLeaseId/:id')
  @Need('pastTenants.view', 'lease:params.id')
  async pastTenant(@Param('id', HashidPipe) id: string) {
    try {
      const tenant: any = await this.tenantService.getPastTenant(+id);
      if (!canAt('payments.view', requestContext.getStore()!.houseIds[0])) {
        const { date, reason, finalReading, movedToUnit } = tenant.moveOut;
        Object.assign(tenant, { arrearsbf: null, deposit: null, moveOut: { date, reason, finalReading, movedToUnit } });
      }
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
  @Need('tenants.edit', 'tenant:params.id')
  update(
    @Param('id', HashidPipe) id: string,
    @Body() updateTenantDto: Prisma.TenantUpdateInput,
  ) {
    return this.tenantService.update(
      +id,
      only(updateTenantDto, ['name', 'contact', 'nationId', 'emergencyContactName', 'emergencyContactPhone', 'notes']),
    );
  }

  @Patch('vacateTenant/:id')
  @Need('tenants.vacate', 'tenant:params.id')
  async vacateTenant(@Param('id', HashidPipe) id: string, @Body() body: any) {
    return this.tenantService.vacateTenant(+id, body);
  }

  @Delete('deleteTenant/:id')
  @Need('tenants.delete', 'tenant:params.id')
  remove(@Param('id', HashidPipe) id: string) {
    return this.tenantService.remove(+id);
  }

  @Post('move/:id')
  @Need('tenants.move', 'tenant:params.id', 'unit:body.toUnitId')
  move(@Param('id', HashidPipe) id: string, @Body() body: any) {
    return this.tenantService.moveTenant(+id, { ...body, toUnitId: this.hashidService.decode(body.toUnitId) });
  }

  @Get('lease/:code')
  async getLease(@Param('code') code: string) {
    return prisma.lease.findFirst({ where: { code } });
  }
}
