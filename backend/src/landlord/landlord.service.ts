import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import { DatabaseService } from 'src/database/database.service';


@Injectable()
export class LandlordService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly hashidservice: HashidService,
  ) {}

  //lease
  async findActiveByTenant(tenantId: number) {
    console.log(tenantId)
    return this.databaseService.lease.findFirst({
      where: {
        tenantId, // ✅ This is fine if tenantId is definitely a number
        status: 'ACTIVE',
      },
      select: {
        code: true,
      },
    });
  }

  async findActiveByHouseAndUnit(houseId: number, unitId: number) {
    return this.databaseService.lease.findFirst({
      where: {
        houseId,
        unitId,
        status: 'ACTIVE',
      },
      select: { code: true },
    });
  }

  async create(createLandlordDto: Prisma.LandlordCreateInput) {
    return this.databaseService.landlord.create({ data: createLandlordDto });
  }

  async findAll() {
    return this.databaseService.landlord.findMany({});
  }

  async getAll() {
    const landlords = await this.databaseService.landlord.findMany({
      select: {
        id: true,
        name: true,
        contact: true,
        email: true,
        nationalId: true,
      },
    });

    return landlords.map((landlord) => ({
      ...landlord,
      id: this.hashidservice.encode(landlord.id),
    }));
  }

  async findOne(id: number) {
    return this.databaseService.landlord.findUnique({
      where: {
        id,
      },
      include: {
        house: true,
      },
    });
  }

  update(id: number, updateLandlordDto: Prisma.LandlordUpdateInput) {
    return this.databaseService.landlord.update({
      where: {
        id,
      },
      data: updateLandlordDto,
    });
  }

  async remove(id: number) {
    return this.databaseService.landlord.delete({
      where: {
        id,
      },
    });
  }
}
