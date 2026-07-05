import prisma from 'lib/db';

async function main() {
  const houses = await prisma.house.findMany({
    include: {
      lease: true,
    },
  });

  for (const house of houses) {
    const lastNumber =
      house.lease
        .map((lease) => {
          const numberPart = lease.code.replace(`l${house.id}`, '');
          return parseInt(numberPart);
        })
        .filter((n) => !isNaN(n))
        .sort((a, b) => b - a)[0] || 0;

    await prisma.house.update({
      where: { id: house.id },
      data: { leaseSequence: lastNumber },
    });

    console.log(`Updated house ${house.id} → leaseSequence = ${lastNumber}`);
  }

  await prisma.$disconnect();
  console.log('✅ leaseSequence initialized for all houses.');
}

main().catch((e) => {
  console.error('❌ Error initializing leaseSequence:', e);
});
