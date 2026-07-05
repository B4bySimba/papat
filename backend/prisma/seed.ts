import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.permission.upsert({
    where: { name: 'view_house' },
    update: {},
    create: { name: 'view_house' },
  });

  console.log('✅ Seeded: view_house permission');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
