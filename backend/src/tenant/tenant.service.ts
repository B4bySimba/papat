import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import prisma from 'lib/db';

@Injectable()
export class TenantService {
  constructor(
    private readonly hashIdService: HashidService,
  ) {}

  //frontend
  async searchTenants(query: string) {
    const tenants = await prisma.tenant.findMany({
      where: {
        state: 'ACTIVE',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        unit: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((tenant) => ({
      value: this.hashIdService.encode(tenant.id), // � encode the ID
      label: `${tenant.name} - ${tenant.unit?.number ?? 'No Unit'}`,
    }));
  }

  async leaseCode(unitId: number) {
    const unitExists = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true },
    });

    if (!unitExists) {
      throw new NotFoundException('Unit does not exist');
    }

    const lease = await prisma.lease.findFirst({
      where: {
        unitId,
        status: 'ACTIVE',
      },
      select: {
        code: true,
      },
    });

    if (!lease) {
      throw new NotFoundException('Unit is Vacant');
    }

    return {
      leaseCode: lease.code,
    };
  }

  async createTenant(input: any) {
    const unitId = input.unitId;

    if (!unitId) {
      throw new HttpException(
        'unitId is required to assign a tenant to a unit.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!input.effectiveFrom) {
      throw new HttpException(
        'effectiveFrom is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parseRequiredDate = (
      value: string | null | undefined,
    ): string | Date => {
      if (!value) {
        throw new HttpException(`Date is required.`, HttpStatus.BAD_REQUEST);
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new HttpException(
          `Invalid date format: ${value}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return date;
    };

    const parseOptionalDate = (
      value: string | null | undefined,
    ): string | Date | null => {
      if (!value) return null;

      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new HttpException(
          `Invalid date format: ${value}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return date;
    };

    try {
      const tenant = await prisma.$transaction(async (tx) => {
        const unit = await tx.unit.update({
          where: { id: unitId },
          data: { tenantSequence: { increment: 1 } },
          include: { house: true },
        });

        const tenantCode = `${unit.code}t${unit.tenantSequence}`;
        const leaseCount = await tx.lease.count({
          where: { houseId: unit.houseId },
        });
        const lastLease = await tx.lease.findFirst({
          where: { houseId: unit.houseId },
          orderBy: { code: 'desc' },
        });

        const house = await tx.house.update({
          where: { id: unit.houseId },
          data: { leaseSequence: { increment: 1 } },
        });

        const leaseCode = `l${house.id}${house.leaseSequence}`;

        // Step 1: Create Tenant
        const createdTenant = await tx.tenant.create({
          data: {
            code: tenantCode,
            name: input.name,
            photo: input.photo,
            nationId: input.nationId,
            contact: input.contact,
            emergencyContactName: input.emergencyContactName,
            emergencyContactPhone: input.emergencyContactPhone,
            notes: input.notes,
            unit: { connect: { id: unitId } },
          },
        });

        // Step 2: Mark unit as occupied
        await tx.unit.update({
          where: { id: unitId },
          data: {
            state: true,
            deposit: input.deposit,
            rentRate: input.rentRate,
          },
        });

        // Step 3: Create Lease
        const lease = await tx.lease.create({
          data: {
            code: leaseCode,
            tenant: { connect: { id: createdTenant.id } },
            unit: { connect: { id: unitId } },
            house: { connect: { id: unit.houseId } },

            moveInDate: parseRequiredDate(
              input.moveInDate || input.effectiveFrom,
            ),
            arrearsbf: input.arrearsbf ?? 0,
            startDate: parseRequiredDate(input.effectiveFrom),
            endDate: parseOptionalDate(input.endDate),
            rentDue: input.rentDue ?? null,
            deposit: input.deposit,
            rentRate: input.rentRate,
            additional: unit.additional ?? null,
            additionalCharges: unit.additionalCharges ?? 0,
            onEntryMeterReading: input.currentMeterReading ?? 0,

            waterRate: unit.house.water_bill ?? 0,
            serviceCharge: unit.house.serviceCharge ?? 0,
            electricityRate: unit.house.electricity_bill ?? 0,
            garbageFee: unit.house.garbage_collection ?? 0,

            added_field_1: unit.house.added_field_1 ?? null,
            added_field_2: unit.house.added_field_2 ?? null,
            added_field_3: unit.house.added_field_3 ?? null,
            added_field_4: unit.house.added_field_4 ?? null,
            added_field_5: unit.house.added_field_5 ?? null,
            added_field_6: unit.house.added_field_6 ?? null,
            added_field_7: unit.house.added_field_7 ?? null,

            added_field_1_price: unit.house.added_field_1_price ?? 0,
            added_field_2_price: unit.house.added_field_2_price ?? 0,
            added_field_3_price: unit.house.added_field_3_price ?? 0,
            added_field_4_price: unit.house.added_field_4_price ?? 0,
            added_field_5_price: unit.house.added_field_5_price ?? 0,
            added_field_6_price: unit.house.added_field_6_price ?? 0,
            added_field_7_price: unit.house.added_field_7_price ?? 0,
          },
        });

        // Step 4: Create Initial Meter Reading (only if house has a water bill)
        if (unit.house.water_bill && unit.house.water_bill > 0) {
          if (
            input.currentMeterReading === undefined ||
            input.currentMeterReading === null
          ) {
            throw new HttpException(
              'Current meter reading is required when water billing is enabled.',
              HttpStatus.BAD_REQUEST,
            );
          }

          await tx.meterReading.create({
            data: {
              house: { connect: { id: lease.houseId } },
              lease: { connect: { id: lease.id } },
              tenant: { connect: { id: createdTenant.id } },
              unit: { connect: { id: unitId } },
              currentReading: input.currentMeterReading,
              readOn: parseRequiredDate(input.effectiveFrom),
            },
          });
        }

        return createdTenant;
      });

      return {
        message: 'Tenant created successfully.',
      };
    } catch (error) {
      console.error('Failed to create tenant:', error);
      throw new HttpException(
        'Tenant creation failed. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findTenant(Id: number) {
    const activeLease = await prisma.lease.findFirst({
      where: {
        unitId: Id,
        status: 'ACTIVE',
      },
      select: {
        tenant: {
          select: {
            name: true,
            nationId: true,
            contact: true,
            id: true,
          },
        },
        house: {
          select: {
            added_field_1: true,
            added_field_2: true,
            added_field_3: true,
            added_field_4: true,
            added_field_5: true,
            added_field_6: true,
            added_field_7: true,
          },
        },
        unit: {
          select: {
            rentRate: true,
            deposit: true,
          },
        },
        id: true,
        moveInDate: true,
        startDate: true,
        endDate: true,
        waterRate: true,
        serviceCharge: true,
        additionalCharges: true,
        garbageFee: true,
        added_field_1_price: true,
        added_field_2_price: true,
        added_field_3_price: true,
        added_field_4_price: true,
        added_field_5_price: true,
        added_field_6_price: true,
        added_field_7_price: true,
      },
    });

    if (!activeLease) {
      throw new NotFoundException('No active lease found for this unit.');
    }

    const leaseId = activeLease.id;

    // Fetch all readings
    const readings = await prisma.meterReading.findMany({
      where: { leaseId },
      orderBy: { readOn: 'asc' },
    });

    // Fetch all payments
    const payments = await prisma.payment.findMany({
      where: { leaseId },
    });

    // Sum of all payments
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    // Total additional charges
    const totalAdditionalCharges =
      (activeLease.additionalCharges ?? 0) +
      (activeLease.garbageFee ?? 0) +
      (activeLease.added_field_1_price ?? 0) +
      (activeLease.added_field_2_price ?? 0) +
      (activeLease.added_field_3_price ?? 0) +
      (activeLease.added_field_4_price ?? 0) +
      (activeLease.added_field_5_price ?? 0) +
      (activeLease.added_field_6_price ?? 0) +
      (activeLease.added_field_7_price ?? 0);

    let totalExpected = 0;

    for (let i = 0; i < readings.length - 1; i++) {
      const currentReading = readings[i];
      const nextReading = readings[i + 1];

      const unitsUsed =
        nextReading.currentReading - currentReading.currentReading;
      const safeUnitsUsed = unitsUsed < 0 ? 0 : unitsUsed;
      const waterBill = safeUnitsUsed * (activeLease.waterRate ?? 0);
      const serviceCharge = activeLease.serviceCharge ?? 0;
      const deposit = i === 0 ? (activeLease.unit?.deposit ?? 0) : 0;

      const expected =
        serviceCharge +
        waterBill +
        totalAdditionalCharges +
        (activeLease.unit?.rentRate ?? 0) +
        deposit;

      totalExpected += expected;
    }

    const totalBalance = totalExpected - totalCollected;

    const { id, moveInDate, startDate, endDate, tenant, ...cleanedLease } =
      activeLease;

    return {
      tenant: tenant
        ? {
            ...tenant,
            id: await this.hashIdService.encode(tenant.id),
          }
        : null,
      ...cleanedLease,
      leaseId: await this.hashIdService.encode(id),
      moveInDate: moveInDate
        ? new Date(moveInDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null,
      startDate: startDate
        ? new Date(startDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null,
      endDate: endDate
        ? new Date(endDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null,
      balance: totalBalance,
    };
  }

  async getTenant(unitId: number) {
    const unitExists = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true },
    });

    if (!unitExists) {
      throw new NotFoundException('Unit does not exist');
    }

    const lease = await prisma.lease.findFirst({
      where: {
        unitId,
        status: 'ACTIVE',
      },
      select: {
        tenant: {
          select: {
            id: true,
            name: true,
            nationId: true,
            contact: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            notes: true,
          },
        },
        waterRate: true,
        serviceCharge: true,
        electricityRate: true,
        garbageFee: true,
        added_field_1: true,
        added_field_1_price: true,
        added_field_2: true,
        added_field_2_price: true,
        added_field_3: true,
        added_field_3_price: true,
        added_field_4: true,
        added_field_4_price: true,
        added_field_5: true,
        added_field_5_price: true,
        added_field_6: true,
        added_field_6_price: true,
        added_field_7: true,
        added_field_7_price: true,
        additionalCharges: true,
        rentRate: true,
        deposit: true,
        additional: true,
        id: true,
        code: true,
        houseId: true,
        arrearsbf: true,
      },
    });

    if (!lease || !lease.tenant) {
      throw new NotFoundException('Unit is Vacant');
    }

    return {
      tenant: {
        ...lease.tenant,
        id: this.hashIdService.encode(lease.tenant.id),
      },
      water_bill: lease.waterRate ?? 0,
      serviceCharge: lease.serviceCharge ?? 0,
      electricity_bill: lease.electricityRate ?? 0,
      garbage_collection: lease.garbageFee ?? 0,
      added_field_1: lease.added_field_1,
      added_field_1_price: lease.added_field_1_price ?? 0,
      added_field_2: lease.added_field_2,
      added_field_2_price: lease.added_field_2_price ?? 0,
      added_field_3: lease.added_field_3,
      added_field_3_price: lease.added_field_3_price ?? 0,
      added_field_4: lease.added_field_4,
      added_field_4_price: lease.added_field_4_price ?? 0,
      added_field_5: lease.added_field_5,
      added_field_5_price: lease.added_field_5_price ?? 0,
      added_field_6: lease.added_field_6,
      added_field_6_price: lease.added_field_6_price ?? 0,
      added_field_7: lease.added_field_7,
      added_field_7_price: lease.added_field_7_price ?? 0,
      additional: lease.additional,
      additionalCharges: lease.additionalCharges ?? 0,
      deposit: lease.deposit ?? 0,
      rentRate: lease.rentRate,
      leaseId: this.hashIdService.encode(lease.id),
      leaseCode: lease.code,
      houseId: this.hashIdService.encode(lease.houseId),
      arrearsbf: lease.arrearsbf,
    };
  }

  async year(code: string): Promise<number> {
    const firstLease = await prisma.lease.findFirst({
      where: { code },
      orderBy: { startDate: 'asc' },
      select: { startDate: true },
    });

    if (!firstLease) {
      throw new NotFoundException(`No lease found with code: ${code}`);
    }

    return firstLease.startDate.getFullYear();
  }

  async arrearsbf(id: number, updateLeaseDto: Prisma.LeaseUpdateInput) {
    return prisma.lease.update({
      where: { id },
      data: updateLeaseDto,
    });
  }

  async past(Id: number) {
    const terminatedLeases = await prisma.lease.findMany({
      where: {
        unitId: Id,
        status: 'TERMINATED',
      },
      select: {
        tenant: {
          select: {
            name: true,
          },
        },
        id: true,
        moveInDate: true,
        terminationDate: true, // This is the move-out date for terminated leases
      },
    });

    return terminatedLeases.map((lease) => ({
      leaseId: this.hashIdService.encode(lease.id),
      tenantName: lease.tenant?.name || 'No tenant',
      moveInDate: lease.moveInDate
        ? new Date(lease.moveInDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'No date',
      moveOutDate: lease.terminationDate
        ? new Date(lease.terminationDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'No date',
    }));
  }

  async getPastTenant(id: number) {
    const lease = await prisma.lease.findFirst({
      where: {
        id,
        status: 'TERMINATED',
      },
      select: {
        tenant: {
          select: {
            id: true,
            name: true,
            nationId: true,
            contact: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            notes: true,
          },
        },
        waterRate: true,
        serviceCharge: true,
        electricityRate: true,
        garbageFee: true,
        added_field_1: true,
        added_field_1_price: true,
        added_field_2: true,
        added_field_2_price: true,
        added_field_3: true,
        added_field_3_price: true,
        added_field_4: true,
        added_field_4_price: true,
        added_field_5: true,
        added_field_5_price: true,
        added_field_6: true,
        added_field_6_price: true,
        added_field_7: true,
        added_field_7_price: true,
        additionalCharges: true,
        rentRate: true,
        deposit: true,
        additional: true,
        id: true,
        code: true,
        houseId: true,
        arrearsbf: true,
      },
    });

    if (!lease || !lease.tenant) {
      throw new NotFoundException('Tenant not Found');
    }

    return {
      tenant: {
        ...lease.tenant,
        id: this.hashIdService.encode(lease.tenant.id),
      },
      water_bill: lease.waterRate ?? 0,
      serviceCharge: lease.serviceCharge ?? 0,
      electricity_bill: lease.electricityRate ?? 0,
      garbage_collection: lease.garbageFee ?? 0,
      added_field_1: lease.added_field_1,
      added_field_1_price: lease.added_field_1_price ?? 0,
      added_field_2: lease.added_field_2,
      added_field_2_price: lease.added_field_2_price ?? 0,
      added_field_3: lease.added_field_3,
      added_field_3_price: lease.added_field_3_price ?? 0,
      added_field_4: lease.added_field_4,
      added_field_4_price: lease.added_field_4_price ?? 0,
      added_field_5: lease.added_field_5,
      added_field_5_price: lease.added_field_5_price ?? 0,
      added_field_6: lease.added_field_6,
      added_field_6_price: lease.added_field_6_price ?? 0,
      added_field_7: lease.added_field_7,
      added_field_7_price: lease.added_field_7_price ?? 0,
      additional: lease.additional,
      additionalCharges: lease.additionalCharges ?? 0,
      deposit: lease.deposit ?? 0,
      rentRate: lease.rentRate,
      leaseId: this.hashIdService.encode(lease.id),
      leaseCode: lease.code,
      houseId: this.hashIdService.encode(lease.houseId),
      arrearsbf: lease.arrearsbf,
    };
  }

  //backend
  async create(input: any) {
    console.log(input);
    const unitId = input.unit?.connect?.id;

    if (!unitId) {
      throw new Error('unitId is required to assign a tenant to a unit.');
    }

    const effectiveFrom = input.effectiveFrom;
    if (!effectiveFrom) {
      throw new Error('effectiveFrom is required.');
    }

    try {
      const tenant = await prisma.$transaction(async (tx) => {
        // Step 1: Increment tenantSequence and fetch unit with house
        const unit = await tx.unit.update({
          where: { id: unitId },
          data: { tenantSequence: { increment: 1 } },
          include: { house: true },
        });

        const tenantCode = `${unit.code}t${unit.tenantSequence}`; //to be code
        const rateHistoryCode = `${tenantCode}r1`; //rateHistoiryCoode

        const leaseCount = await tx.lease.count({
          where: { houseId: unit.houseId },
        });
        const leaseCode = `L${unit.houseId}${leaseCount + 1}`; //leaseCode
        const rentRate = unit.rentRate;
        // console.log(leaseId);

        // Step 2: Create tenant
        const tenant = await tx.tenant.create({
          data: {
            code: tenantCode,
            name: input.name,
            photo: input.photo,
            nationId: input.nationId,
            contact: input.contact,
            unit: { connect: { id: unitId } },
          },
        });

        // Step 3: Mark unit as OCCUPIED
        await tx.unit.update({
          where: { id: unitId },
          data: { state: true },
        });

        // Step 5: Create lease
        const lease = await tx.lease.create({
          data: {
            code: leaseCode, //code
            tenant: { connect: { id: tenant.id } },
            unit: { connect: { id: unitId } },
            house: { connect: { id: unit.houseId } },

            moveInDate: input.moveInDate,
            startDate: new Date(effectiveFrom),
            endDate: input.endDate ? new Date(input.endDate) : null,
            rentDue: input.rentDue ?? null,
            additionalCharges: unit.additionalCharges ?? 0,
            onEntryMeterReading: input.currentMeterReading ?? null,

            rentRate: rentRate,

            waterRate: unit.house.water_bill ?? 0,
            serviceCharge: unit.house.serviceCharge ?? 0,
            electricityRate: unit.house.electricity_bill ?? 0,
            garbageFee: unit.house.garbage_collection ?? 0,

            added_field_1_price: unit.house.added_field_1_price ?? 0,
            added_field_2_price: unit.house.added_field_2_price ?? 0,
            added_field_3_price: unit.house.added_field_3_price ?? 0,
            added_field_4_price: unit.house.added_field_4_price ?? 0,
            added_field_5_price: unit.house.added_field_5_price ?? 0,
            added_field_6_price: unit.house.added_field_6_price ?? 0,
            added_field_7_price: unit.house.added_field_7_price ?? 0,
          },
        });

        await tx.meterReading.create({
          data: {
            lease: { connect: { id: lease.id } },
            tenant: { connect: { id: tenant.id } },
            unit: { connect: { id: unitId } },
            currentReading: input.currentMeterReading ?? null,
            readOn: input.moveInDate,
          },
        });

        return tenant;
      });

      return tenant;
    } catch (error) {
      console.error('Failed to create tenant:', error);
      throw new Error('Tenant creation failed. Please try again.');
    }
  }

  async findAll() {
    return prisma.tenant.findMany({ include: { lease: true } });
  }

  async findOne(id: number) {
    return prisma.tenant.findUnique({
      where: {
        id,
      },
      include: {
        lease: true,
        meterReading: true,
        unit: true,
      },
    });
  }

  update(id: number, updateTenantDto: Prisma.TenantUpdateInput) {
    return prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  async vacateTenant(id: number, terminationDate: string) {
    // Find the tenant and their unit
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!tenant) {
      throw new Error(`Tenant with ID ${id} not found.`);
    }

    if (tenant.state === 'FORMER') {
      throw new Error(`Tenant ${id} is already vacated.`);
    }

    const name = tenant.name;
    const unitId = tenant.unitId;
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });
    const unitNumber = unit?.number;
    const parsedDate = new Date(terminationDate);
    console.log(parsedDate);

    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid termination date');
    }

    // Transaction: mark tenant as OUT and unit as VACANT
    await prisma.$transaction([
      prisma.lease.updateMany({
        where: { tenantId: id },
        data: {
          status: 'TERMINATED',
          terminationDate: parsedDate,
        },
      }),
      prisma.tenant.update({
        where: { id },
        data: { state: 'FORMER' },
      }),
      prisma.unit.update({
        where: { id: unitId },
        data: { state: false },
      }),
    ]);

    return {
      message: `Tenant ${name} vacated and Unit ${unitNumber} set to VACANT.`,
    };
  }

  async remove(tenantId: number): Promise<{ message: string }> {
    return await prisma.$transaction(async (databaseService) => {
      const tenantWithLease = await databaseService.tenant.findUnique({
        where: { id: tenantId },
        include: {
          lease: {
            where: { status: 'ACTIVE' },
          },
        },
      });

      if (!tenantWithLease) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
      }

      const unitId = tenantWithLease.unitId;
      const hadActiveLease = tenantWithLease.lease.length > 0;

      await databaseService.tenant.delete({
        where: { id: tenantId },
      });

      if (hadActiveLease) {
        const otherActiveTenants = await databaseService.tenant.findMany({
          where: {
            unitId,
            id: { not: tenantId },
            lease: {
              some: { status: 'ACTIVE' },
            },
          },
        });

        if (otherActiveTenants.length === 0) {
          await databaseService.unit.update({
            where: { id: unitId },
            data: { state: false },
          });
        }
      }

      return { message: `Tenant ${tenantId} deleted successfully` };
    });
  }
}
