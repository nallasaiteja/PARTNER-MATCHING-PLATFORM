import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Test@1234', 10);

  // Update super admin
  const superAdmin = await prisma.user.upsert({
    where: { mobile: '9000000001' },
    update: { passwordHash, status: 'ACTIVE', role: 'SUPER_ADMIN' },
    create: {
      id: 'user-super-admin',
      mobile: '9000000001',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      staffDivision: 'NOT_APPLICABLE',
    },
  });
  console.log('✅ Updated Super Admin (9000000001):', superAdmin.id, superAdmin.role, superAdmin.status);

  // Also check if admin exists
  const admin = await prisma.user.upsert({
    where: { mobile: '9000000002' },
    update: { passwordHash, status: 'ACTIVE', role: 'ADMIN' },
    create: {
      id: 'user-admin',
      mobile: '9000000002',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      staffDivision: 'NOT_APPLICABLE',
    },
  });
  console.log('✅ Updated Admin (9000000002):', admin.id, admin.role, admin.status);

  // Verify hash
  const isValid = await bcrypt.compare('Test@1234', superAdmin.passwordHash!);
  console.log('Super Admin password matches Test@1234:', isValid);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
