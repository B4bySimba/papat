import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import prisma from 'lib/db';


@Injectable()
export class LandlordService {
  constructor(
    private readonly hashidservice: HashidService,
  ) {}

  //lease
  async findActiveByTenant(tenantId: number) {
    console.log(tenantId)
    return prisma.lease.findFirst({
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
    return prisma.lease.findFirst({
      where: {
        houseId,
        unitId,
        status: 'ACTIVE',
      },
      select: { code: true },
    });
  }

  async create(createLandlordDto: Prisma.LandlordCreateInput) {
    return prisma.landlord.create({ data: createLandlordDto });
  }

  async findAll() {
    return prisma.landlord.findMany({});
  }

  async getAll() {
    const landlords = await prisma.landlord.findMany({
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
    return prisma.landlord.findUnique({
      where: {
        id,
      },
      include: {
        house: true,
      },
    });
  }

  update(id: number, updateLandlordDto: Prisma.LandlordUpdateInput) {
    return prisma.landlord.update({
      where: {
        id,
      },
      data: updateLandlordDto,
    });
  }

  async remove(id: number) {
    return prisma.landlord.delete({
      where: {
        id,
      },
    });
  }
}
