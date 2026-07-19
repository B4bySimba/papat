import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import prisma from 'lib/db';


@Injectable()
export class HouseService {
  constructor(
    private readonly hashidService: HashidService,
  ) {}

  async create(createHouseDto: Prisma.HouseCreateInput) {
    console.log('Data to be inserted into the database:', createHouseDto);

    const house = await prisma.house.create({
      data: createHouseDto,
    });

    console.log('House after insert:', house);

    return house;
  }

  async findAll() {
    return prisma.house.findMany({});
  }

  async find() {
    return prisma.house.findMany({
      where: {
        lease: {
          some: {}, // means: at least one lease exists
        },
      },
      select: {
        id: true,
      },
    });
  }

  async getNameAndIds() {
    const houses = await prisma.house.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return houses.map((house) => ({
      id: this.hashidService.encode(house.id),
      name: house.name,
    }));
  }

  async findOne(id: number) {
    return prisma.house.findUnique({
      where: {
        id,
      },
    });
  }

  async getHouseDets(id: number) {
    const unit = await prisma.unit.groupBy({
      by: ['state'],
      where: { houseId: id },
      _count: {
        state: true,
      },
    });

    const unitCounts = { true: 0, false: 0 };

    unit.forEach((u) => {
      unitCounts[String(u.state)] = u._count.state;
    });

    const house = await prisma.house.findUnique({
      where: { id },
      select: {
        name: true,
        lr_number: true,
        agreed_commission: true,
        water_bill: true,
        garbage_collection: true,
        electricity_bill: true,
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
        landlord: {
          select: {
            name: true,
            contact: true,
            nationalId: true,
            email: true,
            id: true,
          },
        },
      },
    });

    if (!house) {
      throw new NotFoundException('House not found');
    }

    if (!house.landlord) {
      return { ...house, unit: unitCounts, landlord: null };
    }

    const encodedLandlordId = this.hashidService.encode(house.landlord.id);
    const { id: _, ...landlordWithoutId } = house.landlord;

    return {
      ...house,
      unit: unitCounts,
      landlord: {
        ...landlordWithoutId,
        id: encodedLandlordId,
      },
    };
  }

  async getUnits(id: number) {
    return prisma.house.findUnique({
      where: {
        id,
      },
      include: { unit: true },
    });
  }

  update(id: number, updateHouseDto: Prisma.HouseUpdateInput) {
    return prisma.house.update({
      where: {
        id,
      },
      data: updateHouseDto,
    });
  }

  async remove(id: number) {
    return prisma.house.delete({
      where: {
        id,
      },
    });
  }

  //frontend
  async createProperty(createHouseDto: any) {
    const {
      name,
      lr_number,
      agreed_commission,
      water_bill,
      serviceCharge,
      garbage_collection,
      electricity_bill,
      added_field_1,
      added_field_1_price,
      added_field_2,
      added_field_2_price,
      added_field_3,
      added_field_3_price,
      added_field_4,
      added_field_4_price,
      added_field_5,
      added_field_5_price,
      added_field_6,
      added_field_6_price,
      added_field_7,
      added_field_7_price,
      landlordId,
      landlordName,
      landlordContact,
      landlordNationalId,
      landlordEmail,
    } = createHouseDto;

    const data: Prisma.HouseCreateInput = {
      name,
      lr_number,
      agreed_commission,
      water_bill,
      serviceCharge,
      garbage_collection,
      electricity_bill,
      added_field_1,
      added_field_1_price,
      added_field_2,
      added_field_2_price,
      added_field_3,
      added_field_3_price,
      added_field_4,
      added_field_4_price,
      added_field_5,
      added_field_5_price,
      added_field_6,
      added_field_6_price,
      added_field_7,
      added_field_7_price,
    };

    try {
      // Handle landlord
      if (landlordId) {
        data.landlord = { connect: { id: landlordId } };
      } else if (landlordName) {
        const newLandlord = await prisma.landlord.create({
          data: {
            name: landlordName,
            contact: landlordContact,
            nationalId: landlordNationalId,
            email: landlordEmail,
          },
        });
        data.landlord = { connect: { id: newLandlord.id } };
      } else {
        throw new BadRequestException(
          'Either landlordId or landlordName is required.',
        );
      }

      const createdHouse = await prisma.house.create({ data });
      return createdHouse;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `A house with the same ${error.meta?.target} already exists.`,
          );
        }
      }

      console.error(error);
      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the property.',
      );
    }
  }

  async searchProperties(query?: string) {
    const trimmedQuery = (query ?? '').trim();

    if (!trimmedQuery) return [];

    const properties = await prisma.house.findMany({
      where: {
        name: {
          contains: trimmedQuery,
          mode: 'insensitive',
        },
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    return properties.map((p) => ({
      value: this.hashidService.encode(p.id),
      label: p.name,
    }));
  }
  async searchWaterProperties(query?: string) {
    const trimmedQuery = (query ?? '').trim();

    if (!trimmedQuery) return [];

    const properties = await prisma.house.findMany({
      where: {
        name: {
          contains: trimmedQuery,
          mode: 'insensitive',
        },
        water_bill: {
          gt: 0,
        },
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    return properties.map((p) => ({
      value: this.hashidService.encode(p.id),
      label: p.name,
    }));
  }

  async getHousesWithUnitsAndTenants() {
    const houses = await prisma.house.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        unit: {
          where: { state: true },
          select: {
            id: true,
            number: true,
            lease: {
              where: { status: 'ACTIVE' },
              select: {
                code: true,
                rentRate: true,
                tenant: {
                  select: {
                    name: true,
                    contact: true,
                  },
                },
              },
              take: 1, // In case multiple leases are active, take the first
            },
          },
        },
      },
    });

    // Transform the data into your desired format
    return houses.map((house) => ({
      id: this.slugify(house.name),
      name: house.name,
      address: house.address,
      units: house.unit.map((unit) => {
        const lease = unit.lease[0]; // Active lease
        return {
          id: unit.number,
          name: unit.number,
          leaseCode: lease?.code || null,
          tenant: lease?.tenant?.name || null,
          rent: lease?.rentRate || null,
          contact: lease?.tenant?.contact || null,
        };
      }),
    }));
  }

  async getHousesWithUnits() {
    const houses = await prisma.house.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        unit: {
          where: { state: true },
          select: {
            id: true,
            number: true,
            lease: {
              select: {
                code: true,
                rentRate: true,
                tenant: {
                  select: {
                    name: true,
                    contact: true,
                  },
                },
              },
              take: 1, // In case multiple leases are active, take the first
            },
          },
        },
      },
    });

    // Transform the data into your desired format
    return houses.map((house) => ({
      id: this.hashidService.encode(house.id),
      name: house.name,
      address: house.address,
      units: house.unit.map((unit) => {
        const lease = unit.lease[0]; // Active lease
        return {
          id: unit.number,
          name: unit.number,
          leaseCode: lease?.code || null,
          tenant: lease?.tenant?.name || null,
          rent: lease?.rentRate || null,
          contact: lease?.tenant?.contact || null,
        };
      }),
    }));
  }

  private slugify(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-');
  }
}
