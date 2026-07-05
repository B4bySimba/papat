import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import prisma from 'lib/db';
import * as bcrypt from 'bcrypt';


@Injectable()
export class UserService {
  async create(createUserDto: Prisma.UserCreateInput) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async findAll() {
    return prisma.user.findMany({});
  }

  async findOne(id: number) {
    return prisma.user.findUnique({ where: { id }});
  }

  update(id: number, updateUserDto: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data: updateUserDto
    });
  }

  async remove(id: number) {
    return prisma.user.delete({ where: { id }});
  }
}
