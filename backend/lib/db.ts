import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { captureWrites } from 'src/audit/capture';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Query hooks only, so the client keeps PrismaClient's shape.
const prismaClientSingleton = () => {
  return new PrismaClient({ adapter }).$extends(captureWrites) as unknown as PrismaClient;
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
