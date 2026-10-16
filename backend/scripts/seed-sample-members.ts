import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function run() {
  console.log('🌱 Seeding rich sample members for instant browsing...');

  const passwordHash = await bcrypt.hash('Test@1234', 12);

  // 1. Ensure branch organization exists
  const branch = await prisma.organization.upsert({
    where: { id: 'org-branch-a' },
    update: {},
    create: {
      id: 'org-branch-a',
      name: 'Hyderabad Central Branch',
      type: 'BRANCH',
    },
  });

  // 2. Demo User Groom (Male) - Mobile 9888800001
  const groomUser = await prisma.user.upsert({
    where: { mobile: '9888800001' },
    update: { passwordHash, status: 'ACTIVE' },
    create: {
      mobile: '9888800001',
      email: 'karthik.varma@matrimony.com',
      passwordHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      organizationId: branch.id,
    },
  });

  const groomProfileData = {
    step1: {
      firstName: 'Karthik',
      lastName: 'Varma',
      gender: 'Male',
      dateOfBirth: '1995-07-15',
      maritalStatus: 'Unmarried',
      religion: 'Hindu',
      religionId: 'community-religion-hindu',
      caste: 'Kamma',
      casteId: 'community-caste-kamma',
      subCaste: 'Chowdary',
      gothram: 'Kasyapa',
      star: 'Swati',
      raasi: 'Tula',
      padam: '2',
      height: "5'11\"",
      address: 'Jubilee Hills, Road No 36',
      city: 'Hyderabad',
      district: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      diet: 'Non-Vegetarian',
      smoking: 'No',
      drinking: 'Socially',
    },
    step2: {
      education: 'B.Tech, MS in Computer Science',
      employedIn: 'Private Sector',
      profession: 'Senior Software Engineer',
      company: 'Microsoft India',
      annualIncome: '₹28,00,000',
    },
    step3: {
      familyType: 'Nuclear',
      fatherName: 'Ramana Varma',
      fatherStatus: 'Employed / Business',
      motherName: 'Lalitha Varma',
      motherStatus: 'Homemaker',
      nativePlace: 'Hyderabad, Telangana',
    },
    step4: {
      partnerAgeMin: 22,
      partnerAgeMax: 28,
      partnerHeightMin: "5'2\"",
      partnerHeightMax: "5'8\"",
      partnerEducation: 'Any Graduate / Postgraduate',
      partnerCaste: 'Kamma',
      partnerLocation: 'Hyderabad, Bangalore, USA',
    },
    step5: {
      photoPrivacy: 'ALL',
      phonePrivacy: 'INTEREST_ACCEPTED',
      idProofVerified: true,
    },
  };

  await prisma.memberProfile.upsert({
    where: { userId: groomUser.id },
    update: {
      firstName: 'Karthik',
      lastName: 'Varma',
      gender: 'Male',
      dateOfBirth: new Date('1995-07-15'),
      packageType: 'PAID',
      photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600',
      profileData: groomProfileData,
    },
    create: {
      userId: groomUser.id,
      memberId: 'M2026000088',
      firstName: 'Karthik',
      lastName: 'Varma',
      gender: 'Male',
      dateOfBirth: new Date('1995-07-15'),
      packageType: 'PAID',
      photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600',
      ownerOrgId: branch.id,
      profileData: groomProfileData,
    },
  });

  console.log('✅ Demo Groom created: Mobile 9888800001 / Password Test@1234');

  // 3. Demo Brides (Females) in Kamma community
  const brides = [
    {
      mobile: '9777700001',
      email: 'ananya.chowdary@example.com',
      memberId: 'M2026000101',
      firstName: 'Ananya',
      lastName: 'Chowdary',
      dob: '1999-05-14',
      height: "5'5\"",
      education: 'B.Tech, MS in Software Systems',
      employedIn: 'Private Sector',
      profession: 'Software Engineer',
      annualIncome: '₹24,00,000',
      city: 'Hyderabad',
      photoUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600',
      gothram: 'Atreya',
      star: 'Rohini',
      raasi: 'Vrishabha',
    },
    {
      mobile: '9777700002',
      email: 'sravani.naidu@example.com',
      memberId: 'M2026000102',
      firstName: 'Sravani',
      lastName: 'Naidu',
      dob: '1998-08-20',
      height: "5'6\"",
      education: 'MBA (Finance), ISB',
      employedIn: 'Private Sector',
      profession: 'Product Manager',
      annualIncome: '₹28,00,000',
      city: 'Hyderabad',
      photoUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
      gothram: 'Kasyapa',
      star: 'Swati',
      raasi: 'Tula',
    },
    {
      mobile: '9777700003',
      email: 'deepika.rao@example.com',
      memberId: 'M2026000103',
      firstName: 'Deepika',
      lastName: 'Rao',
      dob: '2000-03-10',
      height: "5'4\"",
      education: 'MBBS, MD Pediatrics',
      employedIn: 'Healthcare',
      profession: 'Pediatric Doctor',
      annualIncome: '₹18,00,000',
      city: 'Vijayawada',
      photoUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      gothram: 'Bharadwaja',
      star: 'Hasta',
      raasi: 'Kanya',
    },
    {
      mobile: '9777700004',
      email: 'pooja.varma@example.com',
      memberId: 'M2026000104',
      firstName: 'Pooja',
      lastName: 'Varma',
      dob: '1998-11-25',
      height: "5'7\"",
      education: 'M.Tech in Artificial Intelligence',
      employedIn: 'Private Sector',
      profession: 'Data Scientist',
      annualIncome: '₹32,00,000',
      city: 'Bangalore',
      photoUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600',
      gothram: 'Koundinya',
      star: 'Punarvasu',
      raasi: 'Mithuna',
    },
    {
      mobile: '9777700005',
      email: 'kavya.chowdary@example.com',
      memberId: 'M2026000105',
      firstName: 'Kavya',
      lastName: 'Chowdary',
      dob: '1997-02-18',
      height: "5'5\"",
      education: 'Chartered Accountant (CA)',
      employedIn: 'Finance / Corporate',
      profession: 'Audit Manager',
      annualIncome: '₹22,00,000',
      city: 'Hyderabad',
      photoUrl: 'https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=600',
      gothram: 'Vasishta',
      star: 'Revati',
      raasi: 'Meena',
    },
  ];

  for (const b of brides) {
    const user = await prisma.user.upsert({
      where: { mobile: b.mobile },
      update: { passwordHash, status: 'ACTIVE' },
      create: {
        mobile: b.mobile,
        email: b.email,
        passwordHash,
        role: 'MEMBER',
        status: 'ACTIVE',
        organizationId: branch.id,
      },
    });

    const brideProfileData = {
      step1: {
        firstName: b.firstName,
        lastName: b.lastName,
        gender: 'Female',
        dateOfBirth: b.dob,
        maritalStatus: 'Unmarried',
        religion: 'Hindu',
        religionId: 'community-religion-hindu',
        caste: 'Kamma',
        casteId: 'community-caste-kamma',
        subCaste: 'Chowdary',
        gothram: b.gothram,
        star: b.star,
        raasi: b.raasi,
        height: b.height,
        address: `${b.city}, AP/Telangana`,
        city: b.city,
        state: 'Telangana',
        country: 'India',
        diet: 'Vegetarian',
      },
      step2: {
        education: b.education,
        employedIn: b.employedIn,
        profession: b.profession,
        annualIncome: b.annualIncome,
      },
      step3: {
        familyType: 'Nuclear',
        fatherName: `${b.lastName} Prasad`,
        fatherStatus: 'Business',
        motherName: `${b.lastName} Vani`,
        motherStatus: 'Homemaker',
        nativePlace: b.city,
      },
      step4: {
        partnerAgeMin: 25,
        partnerAgeMax: 32,
        partnerHeightMin: "5'8\"",
        partnerHeightMax: "6'2\"",
        partnerCaste: 'Kamma',
      },
      step5: {
        photoPrivacy: 'ALL',
        phonePrivacy: 'INTEREST_ACCEPTED',
        idProofVerified: true,
      },
    };

    await prisma.memberProfile.upsert({
      where: { userId: user.id },
      update: {
        firstName: b.firstName,
        lastName: b.lastName,
        gender: 'Female',
        dateOfBirth: new Date(b.dob),
        packageType: 'PAID',
        photoUrl: b.photoUrl,
        profileData: brideProfileData,
      },
      create: {
        userId: user.id,
        memberId: b.memberId,
        firstName: b.firstName,
        lastName: b.lastName,
        gender: 'Female',
        dateOfBirth: new Date(b.dob),
        packageType: 'PAID',
        photoUrl: b.photoUrl,
        ownerOrgId: branch.id,
        profileData: brideProfileData,
      },
    });

    console.log(`✅ Seeded bride: ${b.firstName} ${b.lastName} (${b.memberId})`);
  }

  console.log('\n🎉 ALL SAMPLE MEMBERS SEEDED SUCCESSFULLY!');
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
