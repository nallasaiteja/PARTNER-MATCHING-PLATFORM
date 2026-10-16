import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { mobile: '9121617097' },
    include: { memberProfile: true }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User:', user.mobile, 'Name:', user.memberProfile?.firstName, user.memberProfile?.lastName);
  const commonPasswords = ['Password123!', 'Admin@123', 'Member@123', 'Secret123!', 'password123', '123456', '9121617097'];
  for (const p of commonPasswords) {
    const match = await bcrypt.compare(p, user.passwordHash);
    if (match) {
      console.log('Password matched:', p);
      break;
    }
  }
}

check().finally(() => prisma.$disconnect());
