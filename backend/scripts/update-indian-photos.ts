import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const INDIAN_GROOM_PHOTOS = [
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=600',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600',
  'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600',
];

const INDIAN_BRIDE_PHOTOS = [
  'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600',
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
  'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600',
  'https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=600',
];

async function main() {
  console.log('🇮🇳 Updating profile photos in database to verified Indian portraits...');
  const members = await prisma.memberProfile.findMany();
  let groomIdx = 0;
  let brideIdx = 0;
  let updatedCount = 0;

  for (const m of members) {
    const isMale = (m.gender || '').toLowerCase().startsWith('m');
    const photo = isMale
      ? INDIAN_GROOM_PHOTOS[groomIdx++ % INDIAN_GROOM_PHOTOS.length]
      : INDIAN_BRIDE_PHOTOS[brideIdx++ % INDIAN_BRIDE_PHOTOS.length];

    await prisma.memberProfile.update({
      where: { id: m.id },
      data: { photoUrl: photo },
    });
    updatedCount++;
    console.log(`Updated ${m.memberId} (${m.firstName} ${m.lastName}) -> ${photo}`);
  }

  console.log(`\n🎉 Successfully updated ${updatedCount} member profiles with authentic Indian photos!`);
}

main().finally(() => prisma.$disconnect());
