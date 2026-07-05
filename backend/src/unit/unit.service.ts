import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UnitService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly hashidService: HashidService,
  ) {}

  //for frontend
  async searchUnits({
    search = '',
    houseId,
  }: {
    search?: string;
    houseId?: number;
  }) {
    const trimmed = search.trim();

    if (!houseId) return [];

    const units = await this.databaseService.unit.findMany({
      where: {
        houseId,
        number: {
          contains: trimmed,
          mode: 'insensitive',
        },
        state: true,
      },
      orderBy: { number: 'asc' },
      take: 10,
    });

    return units.map((unit) => ({
      value: this.hashidService.encode(unit.id),
      label: unit.number,
    }));
  }

  async searchWaterUnits({
    search = '',
    houseId,
  }: {
    search?: string;
    houseId?: number;
  }) {
    const trimmed = search.trim();

    if (!houseId) return [];

    const units = await this.databaseService.unit.findMany({
      where: {
        houseId,
        number: {
          contains: trimmed,
          mode: 'insensitive',
        },
      },
      orderBy: { number: 'asc' },
      take: 10,
    });

    return units.map((unit) => ({
      value: this.hashidService.encode(unit.id),
      label: unit.number,
    }));
  }

  async createUnit(createUnitDto: Prisma.UnitCreateInput) {
    const houseId = (createUnitDto.house as any).connect.id;

    const houseRecord = await this.databaseService.house.findUnique({
      where: { id: houseId },
    });

    const existingUnitWithNumber = await this.databaseService.unit.findFirst({
      where: {
        houseId,
        number: createUnitDto.number,
      },
    });

    if (existingUnitWithNumber) {
      throw new HttpException(
        `Unit number '${createUnitDto.number}' already exists for this house.`,
        HttpStatus.CONFLICT,
      );
    }

    if (!houseRecord) {
      throw new HttpException('House not found.', HttpStatus.NOT_FOUND);
    }

      const lastUnit = await this.databaseService.unit.findFirst({
        where: { houseId },
        orderBy: { code: 'desc' },
        select: { code: true },
      });

      const prefix = `${houseRecord.code}ut`;


      // Extract suffix only from valid codes for this house
      const allUnits = await this.databaseService.unit.findMany({
        where: {
          houseId,
          code: { startsWith: prefix },
        },
        select: { code: true },
      });

      let maxSuffix = 0;

      for (const u of allUnits) {
        const num = parseInt(u.code.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxSuffix) maxSuffix = num;
      }

      const nextIndex = maxSuffix + 1;
      const code = `${prefix}${nextIndex}`;

      try {
        const createdUnit = await this.databaseService.unit.create({
          data: {
            ...createUnitDto,
            code,
          },
        });

        return {
          message: 'Unit created successfully.',
          createdUnit,
        };
      } catch (error) {
        throw new HttpException(
          'Internal server error.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }



  async getUnits(houseId: number) {
    const units = await this.databaseService.unit.findMany({
      where: { houseId },
      include: {
        lease: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: true,
          },
        },
      },
    });

    const formatted = units.map((unit) => {
      const activeLease = unit.lease[0];

      return {
        unitNumber: unit.number,
        unitId: this.hashidService.encode(unit.id),
        rent: unit.rentRate,
        type: unit.type,
        moveInDate: activeLease?.moveInDate
          ? new Date(activeLease.moveInDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : null,
        state: unit.state,
        leaseId: activeLease ? this.hashidService.encode(activeLease.id) : null,
        leaseCode: activeLease ? activeLease.code : null,
        tenantName: activeLease?.tenant?.name || null,
        tenantTel: activeLease?.tenant?.contact || null,
        description: unit.description,
        deposit: unit.deposit,
        additional: unit.additional,
        additionalCharges: unit.additionalCharges,
      };
    });

    return formatted;
  }

  async getOne(id: number) {
    const unit = await this.databaseService.unit.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        number: true,
        type: true,
        description: true,
        rentRate: true,
        deposit: true,
        additional: true,
        additionalCharges: true,
      },
    });

    if (!unit) {
      throw new Error('Unit not found.');
    }
    return {
      unitId: this.hashidService.encode(unit.id),
      unitNumber: unit.number,
      type: unit.type,
      description: unit.description,
      rent: unit.rentRate,
      deposit: unit.deposit,
      additional: unit.additional,
      additionalCharges: unit.additionalCharges,
    };
  }

  async names(houseId: number) {
    // Fetch house and its units (vacant only)
    const house = await this.databaseService.house.findUnique({
      where: { id: houseId },
      select: {
        water_bill: true,
        unit: {
          where: { state: false },
          select: {
            id: true,
            number: true,
            rentRate: true,
            deposit: true,
          },
        },
      },
    });

    if (!house || house.unit.length === 0) {
      return { message: 'No Vacant Units', hasWaterBill: !!house?.water_bill };
    }

    return {
      hasWaterBill: house.water_bill !== null && house.water_bill > 0,
      units: house.unit.map((unit) => ({
        id: this.hashidService.encode(unit.id),
        number: unit.number,
        rent: unit.rentRate,
        deposit: unit.deposit,
      })),
    };
  }

  //backend
  async create(createUnitDto: Prisma.UnitCreateInput) {
    const houseId = (createUnitDto.house as any).connect.id;

    if (houseId === null) {
      throw new Error('Invalid house ID');
    }

    const house = await this.databaseService.house.findUnique({
      where: { id: houseId },
    });
    if (!house) {
      throw new Error('house not found.');
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      // Step 1: Count existing units
      const count = await this.databaseService.unit.count({
        where: { houseId },
      });

      // Step 2: Generate code
      const code = `${house.code}ut${count + 1}`;

      // Step 3: Try inserting it
      try {
        return await this.databaseService.unit.create({
          data: {
            ...createUnitDto,
            house: {
              connect: { id: houseId },
            },
            code: code,
          },
        });
      } catch (error) {
        // Step 4: Retry on conflict
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' // Unique constraint failed
        ) {
          // Someone inserted a unit just before this one — retry
          continue;
        }

        // If not a unique constraint error, rethrow
        throw error;
      }
    }

    throw new Error(
      'Failed to generate unique unit code after multiple attempts',
    );
  }

  async findAll() {
    return this.databaseService.unit.findMany({});
  }

  async findOne(id: number) {
    return this.databaseService.unit.findUnique({
      where: {
        id,
      },
      include: {
        tenant: true,
      },
    });
  }

  update(id: number, updateUnitDto: Prisma.UnitUpdateInput) {
    return this.databaseService.unit.update({
      where: {
        id,
      },
      data: updateUnitDto,
    });
  }

  async remove(id: number) {
    return this.databaseService.unit.delete({
      where: {
        id,
      },
    });
  }

  async deleteMany(ids: number[]) {
    try {
      return await this.databaseService.unit.deleteMany({
        where: {
          id: { in: ids },
        },
      });
    } catch (error) {
      console.error('DeleteMany Service Error:', error);
      throw new HttpException(
        'An error occurred while deleting payments.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
