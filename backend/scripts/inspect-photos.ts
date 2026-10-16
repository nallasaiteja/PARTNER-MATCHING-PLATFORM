import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const members = await prisma.memberProfile.findMany({
    select: {
      id: true,
      memberId: true,
      firstName: true,
      lastName: true,
      gender: true,
      photoUrl: true,
      packageType: true,
    },
    take: 30,
  });
  console.log('Total members found:', members.length);
  for (const m of members) {
    console.log(`${m.memberId} | ${m.firstName} ${m.lastName} (${m.gender}): ${m.photoUrl || 'NO_PHOTO'}`);
  }
}

main().finally(() => prisma.$disconnect());
