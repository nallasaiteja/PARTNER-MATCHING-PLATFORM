import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('Searching for users matching 912161709 or recent members...');
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { mobile: { contains: '912161709' } },
        { mobile: { contains: '912161' } }
      ]
    },
    include: {
      memberProfile: true
    }
  });

  console.log('Matched count with phone filter:', users.length);
  for (const u of users) {
    console.log('USER:', {
      id: u.id,
      email: u.email,
      mobile: u.mobile,
      role: u.role,
      status: u.status,
      profile: u.memberProfile
    });
  }

  // Also print the 5 most recently created/updated profiles
  console.log('\n--- 5 MOST RECENT MEMBER PROFILES ---');
  const recentProfiles = await prisma.memberProfile.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: { user: true }
  });
  for (const p of recentProfiles) {
    console.log({
      id: p.id,
      memberId: p.memberId,
      name: `${p.firstName} ${p.lastName}`,
      mobile: p.user?.mobile,
      currentStep: p.currentStep,
      completedSteps: p.completedSteps,
      idProofType: p.idProofType,
      idProofFileUrl: p.idProofFileUrl,
      ownerOrgId: p.ownerOrgId,
      profileData: p.profileData,
      updatedAt: p.updatedAt
    });
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
