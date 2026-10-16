import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('--- Testing Member Profile Complete Application & Queue Routing ---');

    // 1. Find profile for user with mobile 9121617097
    const profile = await prisma.memberProfile.findFirst({
      where: { user: { mobile: '9121617097' } },
      include: { user: true },
    });

    if (!profile) {
      console.error('Profile not found for 9121617097');
      return;
    }

    console.log(`Found member: ${profile.firstName} ${profile.lastName} (${profile.memberId})`);
    console.log(`Current verificationStatus before completion: ${JSON.stringify((profile.profileData as any)?.step5?.verificationStatus)}`);

    // 2. Simulate complete profile payload with all 5 steps filled
    const completeProfileData = {
      step1: {
        firstName: profile.firstName || 'Sai',
        lastName: profile.lastName || 'Teja',
        gender: profile.gender || 'Male',
        mobile: profile.user?.mobile || '9121617097',
        email: 'sai.teja@example.com',
        dateOfBirth: '1998-05-20',
        idProofType: 'Aadhar Card',
        idProofNumber: '987654321012',
        religion: 'Hindu',
        caste: 'Kamma',
        country: 'India',
        state: 'Telangana',
        district: 'Hyderabad',
        height: "5'10\"",
        maritalStatus: 'Unmarried',
        photoUrl: '/uploads/sample-avatar.png',
        idProofFileUrl: '/uploads/sample-aadhar.pdf',
      },
      step2: {
        education: 'B.Tech / B.E.',
        employedIn: 'Private',
        profession: 'Software Engineer',
        designation: 'Senior Developer',
        annualIncome: '1800000',
        workingLocation: 'India',
        workingState: 'Telangana',
        workingCity: 'Hyderabad',
        companyName: 'Tech Solutions India',
        workingSince: '2020-06-01',
        totalExperience: '4 Years',
      },
      step3: {
        fatherName: 'Venkateswara Rao',
        fatherReligion: 'Hindu',
        fatherCaste: 'Kamma',
        fatherStatus: 'Alive',
        fatherMobile: '9848012345',
        fatherEmployment: 'Business',
        fatherProfession: 'Agriculture / Retail',
        motherName: 'Lakshmi Devi',
        motherReligion: 'Hindu',
        motherCaste: 'Kamma',
        motherStatus: 'Alive',
        motherEmployment: 'Homemaker',
        familyPermanentAddress: 'Flat 302, Jubilee Hills, Hyderabad',
        familyPresentAddress: 'Flat 302, Jubilee Hills, Hyderabad',
        familyType: 'Nuclear Family',
        familyStatus: 'Middle Class',
      },
      step4: {
        preferredMaritalStatus: ['Unmarried'],
        ageRangeMin: 22,
        ageRangeMax: 27,
        heightRangeMin: "5'2\"",
        heightRangeMax: "5'8\"",
        interCasteAllowed: false,
        preferredCastes: ['Kamma'],
      },
      step5: {
        mobileVerified: true,
        emailVerified: true,
        idProofUploaded: true,
        idProofVerified: false,
        idProofStatus: 'PENDING_REVIEW',
        verificationStatus: 'PENDING_VERIFICATION',
        submittedForVerificationAt: new Date().toISOString(),
        mobileRevelationPreference: '0 Hours',
      },
    };

    // 3. Update profile to reflect completed submission
    const updated = await prisma.memberProfile.update({
      where: { id: profile.id },
      data: {
        currentStep: 5,
        completedSteps: [1, 2, 3, 4, 5],
        idProofFileUrl: completeProfileData.step1.idProofFileUrl,
        idProofType: completeProfileData.step1.idProofType,
        idProofNumber: completeProfileData.step1.idProofNumber,
        photoUrl: completeProfileData.step1.photoUrl,
        profileData: completeProfileData as any,
      },
    });

    console.log('\n✅ Profile updated successfully in PostgreSQL:');
    console.log(`- Member ID: ${updated.memberId}`);
    console.log(`- Current Step: ${updated.currentStep}`);
    console.log(`- Completed Steps: ${JSON.stringify(updated.completedSteps)}`);
    console.log(`- ID Proof URL: ${updated.idProofFileUrl}`);
    console.log(`- Verification Status: ${(updated.profileData as any)?.step5?.verificationStatus}`);
    console.log(`- ID Proof Status: ${(updated.profileData as any)?.step5?.idProofStatus}`);

    // 4. Verify Admin Pending Verification Queue Query
    const adminPendingMembers = await prisma.memberProfile.findMany({
      where: {
        isBlocked: false,
        OR: [
          { profileData: { path: ['step5', 'verificationStatus'], equals: 'PENDING_VERIFICATION' } },
          { profileData: { path: ['step5', 'idProofStatus'], equals: 'PENDING_REVIEW' } },
          {
            AND: [
              { idProofFileUrl: { not: null } },
              { profileData: { path: ['step5', 'idProofVerified'], not: true } },
            ],
          },
        ],
      },
      select: {
        id: true,
        memberId: true,
        firstName: true,
        lastName: true,
        idProofFileUrl: true,
        profileData: true,
      },
    });

    const isMemberInAdminQueue = adminPendingMembers.some((m) => m.id === updated.id);
    console.log(`\n🛡️ Admin Pending Verification Queue Count: ${adminPendingMembers.length}`);
    console.log(`🛡️ Does Sai Teja (${updated.memberId}) appear in Admin Queue? ${isMemberInAdminQueue ? 'YES ✅' : 'NO ❌'}`);

    // 5. Verify Branch Manager ID Proof Queue Query
    const branchCandidates = await prisma.memberProfile.findMany({
      where: { isBlocked: false },
      select: {
        id: true,
        memberId: true,
        firstName: true,
        lastName: true,
        idProofFileUrl: true,
        profileData: true,
      },
    });

    const branchIdProofQueue = branchCandidates.filter((m) => {
      const step5 = (m.profileData as Record<string, any>)?.step5 || {};
      if (step5.idProofVerified === true) return false;
      return (
        step5.verificationStatus === 'PENDING_VERIFICATION' ||
        step5.idProofStatus === 'PENDING_REVIEW' ||
        Boolean(m.idProofFileUrl)
      );
    });

    const isMemberInBranchQueue = branchIdProofQueue.some((m) => m.id === updated.id);
    console.log(`\n🪪 Branch Manager ID Proof Queue Count: ${branchIdProofQueue.length}`);
    console.log(`🪪 Does Sai Teja (${updated.memberId}) appear in Branch Queue? ${isMemberInBranchQueue ? 'YES ✅' : 'NO ❌'}`);

    if (isMemberInAdminQueue && isMemberInBranchQueue) {
      console.log('\n🎉 ALL VERIFICATION AND QUEUE ROUTING CHECKS PASSED!');
    } else {
      console.error('\n❌ Queue routing check failed');
    }
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
