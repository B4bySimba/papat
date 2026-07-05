import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import prisma from 'lib/db';

@Injectable()
export class MeterReadingService {
  constructor(
    private readonly hashidservice: HashidService,
  ) {}

  async create(createMeterReadingDto: any) {
    const leaseId = createMeterReadingDto.lease.connect.id;
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
    });
    if (!lease) {
      throw new Error('No lease Found with that Id');
    }

    return prisma.meterReading.create({
      data: {
        ...createMeterReadingDto,
        tenant: { connect: { id: lease.tenantId } },
        unit: { connect: { id: lease.unitId } },
        lease: { connect: { id: leaseId } },
      },
    });
  }

  async findAll() {
    return prisma.meterReading.findMany({});
  }

  async findOne(id: number) {
    return prisma.meterReading.findUnique({
      where: { id },
    });
  }

  async getAll() {
    const meterReading = await prisma.meterReading.findMany({
      select: {
        house: {
          select: {
            name: true,
            water_bill: true,
          },
        },
        unit: {
          select: {
            number: true,
          },
        },
        houseId: true,
        unitId: true,
        readOn: true,
        currentReading: true,
        id: true,
      },
    });

    return meterReading.map((m) => {
      const formattedDate = m.readOn
        ? new Date(m.readOn).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null;

      return {
        unitId: m.unit ? this.hashidservice.encode(m.unitId) : null,
        unitNumber: m.unit ? m.unit.number : null,
        houseId:
          m.houseId !== null ? this.hashidservice.encode(m.houseId) : null,
        houseName: m.house ? m.house.name : null,
        readOn: formattedDate,
        currentReading: m.currentReading,
        id: m.id ? this.hashidservice.encode(m.id) : null,
        pricePerUnit: m.house ? m.house.water_bill : null,
      };
    });
  }

  async getUnit(unitId: number) {
    return prisma.meterReading.findMany({
      where: { unitId },
    });
  }

  update(id: number, updateMeterReadingDto: Prisma.MeterReadingUpdateInput) {
    if (typeof updateMeterReadingDto.readOn === 'string') {
      updateMeterReadingDto.readOn = new Date(updateMeterReadingDto.readOn);
    }
    
    return prisma.meterReading.update({
      where: { id },
      data: updateMeterReadingDto,
    });
  }

  async remove(id: number) {
    return prisma.meterReading.delete({
      where: { id },
    });
  }

  async createMany(readings: any[]) {
    return prisma.$transaction(
      readings.map((r) =>
        prisma.meterReading.create({
          data: {
            currentReading: r.currentReading,
            readOn: new Date(r.readOn),
            unit: { connect: { id: this.hashidservice.decode(r.unitId) } },
            house: { connect: { id: this.hashidservice.decode(r.houseId) } },
          },
        }),
      ),
    );
  }
}
