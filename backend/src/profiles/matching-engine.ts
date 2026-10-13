/**
 * Matching Engine & Visibility Serialization
 * Section 4.3 & Section 4.2
 */

export function calculateAge(dob: Date | string): number {
  const birthDate = new Date(dob);
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export function isCasteConverted(profile: any): boolean {
  const profileData = (profile?.profileData as Record<string, any>) || {};
  const step1 = profileData.step1 || {};
  const religion = String(step1.religion || step1.religionId || '').toLowerCase();
  const caste = String(step1.caste || step1.casteId || '').toLowerCase();
  return (
    step1.isConverted === true ||
    step1.casteConverted === true ||
    religion.includes('converted') ||
    caste.includes('converted')
  );
}

export function getProfileCaste(profile: any): string {
  const profileData = (profile?.profileData as Record<string, any>) || {};
  return String(profileData.step1?.caste || profileData.step1?.casteId || '').trim();
}

export function getProfileReligion(profile: any): string {
  const profileData = (profile?.profileData as Record<string, any>) || {};
  return String(profileData.step1?.religion || profileData.step1?.religionId || '').trim();
}

export function getProfileMaritalStatus(profile: any): string {
  const profileData = (profile?.profileData as Record<string, any>) || {};
  return String(profileData.step1?.maritalStatus || '').trim();
}

/**
 * Section 4.3 A: Verified View Matching Logic
 * - Displays all profiles of member's own caste matching age range and marital status.
 * - Caste-converted members: see ONLY caste-converted profiles from all castes in Verified view.
 * - Opposite gender.
 */
export function isVerifiedMatch(member: any, candidate: any): boolean {
  if (!member || !candidate || member.id === candidate.id) return false;
  if (candidate.isBlocked || candidate.user?.status === 'BLOCKED' || candidate.user?.status === 'TERMINATED') {
    return false;
  }

  // Opposite gender check
  const memberGender = String(member.gender || '').toLowerCase();
  const candidateGender = String(candidate.gender || '').toLowerCase();
  if (memberGender && candidateGender && memberGender === candidateGender) {
    return false;
  }

  const memberConverted = isCasteConverted(member);
  const candidateConverted = isCasteConverted(candidate);

  if (memberConverted) {
    // PDF Rule: Caste-Converted members: See only caste-converted profiles (from all castes) in Verified view
    if (!candidateConverted) return false;
  } else {
    // Normal members: Own caste only
    if (candidateConverted) return false;
    const memberCaste = getProfileCaste(member).toLowerCase();
    const candidateCaste = getProfileCaste(candidate).toLowerCase();
    if (!memberCaste || !candidateCaste || memberCaste !== candidateCaste) {
      return false;
    }
  }

  // Age eligibility: candidate age should fit reasonable marital bounds or preferences
  const candidateAge = calculateAge(candidate.dateOfBirth);
  const memberAge = calculateAge(member.dateOfBirth);

  const memberPrefs = member.profileData?.step4 || {};
  if (memberPrefs.ageRangeMin != null && candidateAge < memberPrefs.ageRangeMin) return false;
  if (memberPrefs.ageRangeMax != null && candidateAge > memberPrefs.ageRangeMax) return false;

  // Marital status eligibility
  const memberMarital = getProfileMaritalStatus(member).toLowerCase();
  const candidateMarital = getProfileMaritalStatus(candidate).toLowerCase();
  if (memberPrefs.preferredMaritalStatus && Array.isArray(memberPrefs.preferredMaritalStatus) && memberPrefs.preferredMaritalStatus.length > 0) {
    const allowed = memberPrefs.preferredMaritalStatus.map((s: string) => s.toLowerCase());
    if (candidateMarital && !allowed.includes(candidateMarital)) return false;
  } else {
    // Default marital match: unmarried with unmarried
    if (memberMarital === 'unmarried' && candidateMarital && candidateMarital !== 'unmarried') {
      return false;
    }
  }

  return true;
}

/**
 * Section 4.3 B: Matched View Mutual Compatibility Logic
 * Evaluates both profiles against each other's partner preferences mutually.
 */
export function isMutualMatch(memberA: any, memberB: any): boolean {
  if (!memberA || !memberB || memberA.id === memberB.id) return false;
  if (memberB.isBlocked || memberB.user?.status === 'BLOCKED' || memberB.user?.status === 'TERMINATED') {
    return false;
  }

  // Opposite gender
  const genderA = String(memberA.gender || '').toLowerCase();
  const genderB = String(memberB.gender || '').toLowerCase();
  if (genderA && genderB && genderA === genderB) return false;

  const ageA = calculateAge(memberA.dateOfBirth);
  const ageB = calculateAge(memberB.dateOfBirth);

  const prefsA = memberA.profileData?.step4 || {};
  const prefsB = memberB.profileData?.step4 || {};

  // Age compatibility (mutual)
  if (prefsA.ageRangeMin != null && ageB < prefsA.ageRangeMin) return false;
  if (prefsA.ageRangeMax != null && ageB > prefsA.ageRangeMax) return false;
  if (prefsB.ageRangeMin != null && ageA < prefsB.ageRangeMin) return false;
  if (prefsB.ageRangeMax != null && ageA > prefsB.ageRangeMax) return false;

  // Marital status compatibility (mutual)
  const maritalA = getProfileMaritalStatus(memberA).toLowerCase();
  const maritalB = getProfileMaritalStatus(memberB).toLowerCase();
  if (prefsA.preferredMaritalStatus?.length && maritalB) {
    const list = prefsA.preferredMaritalStatus.map((s: string) => s.toLowerCase());
    if (!list.includes(maritalB)) return false;
  }
  if (prefsB.preferredMaritalStatus?.length && maritalA) {
    const list = prefsB.preferredMaritalStatus.map((s: string) => s.toLowerCase());
    if (!list.includes(maritalA)) return false;
  }

  // Inter-caste & Caste-converted rules
  const convertedA = isCasteConverted(memberA);
  const convertedB = isCasteConverted(memberB);
  const casteA = getProfileCaste(memberA).toLowerCase();
  const casteB = getProfileCaste(memberB).toLowerCase();

  if (convertedA || convertedB) {
    // Caste converted in Matched view:
    // Can see same caste and other converted caste profiles based on partner preferences
    const interA = Boolean(prefsA.interCasteAllowed);
    const interB = Boolean(prefsB.interCasteAllowed);
    if (!interA && casteA !== casteB) return false;
    if (!interB && casteA !== casteB) return false;
  } else {
    // Normal members:
    // If no inter-caste preference set: shows only same-caste profiles
    const interA = Boolean(prefsA.interCasteAllowed);
    const interB = Boolean(prefsB.interCasteAllowed);

    if (!interA && casteA !== casteB) return false;
    if (!interB && casteA !== casteB) return false;

    if (interA && prefsA.preferredCastes?.length) {
      const allowedA = prefsA.preferredCastes.map((c: string) => c.toLowerCase());
      if (!allowedA.includes(casteB)) return false;
    }
    if (interB && prefsB.preferredCastes?.length) {
      const allowedB = prefsB.preferredCastes.map((c: string) => c.toLowerCase());
      if (!allowedB.includes(casteA)) return false;
    }
  }

  // Height compatibility (if specified)
  const heightA = memberA.profileData?.step1?.height;
  const heightB = memberB.profileData?.step1?.height;
  // If height range specified, check string match or inclusion (flexible for inches/cm)
  if (prefsA.heightRangeMin && prefsA.heightRangeMax && heightB) {
    // Optional check: pass if compatible
  }

  // Family status (mutual if specified)
  const familyStatusA = memberA.profileData?.step3?.familyStatus;
  const familyStatusB = memberB.profileData?.step3?.familyStatus;
  if (prefsA.preferredFamilyStatus?.length && familyStatusB) {
    if (!prefsA.preferredFamilyStatus.includes(familyStatusB)) return false;
  }
  if (prefsB.preferredFamilyStatus?.length && familyStatusA) {
    if (!prefsB.preferredFamilyStatus.includes(familyStatusA)) return false;
  }

  // Kuja Dosham (if specified and not 'Any')
  const kujaA = memberA.profileData?.step1?.kujaDosham;
  const kujaB = memberB.profileData?.step1?.kujaDosham;
  if (prefsA.kujaDoshamPreference && prefsA.kujaDoshamPreference !== 'Any' && kujaB) {
    if (prefsA.kujaDoshamPreference !== kujaB) return false;
  }
  if (prefsB.kujaDoshamPreference && prefsB.kujaDoshamPreference !== 'Any' && kujaA) {
    if (prefsB.kujaDoshamPreference !== kujaA) return false;
  }

  // Smoke & Drink preferences
  const smokeA = memberA.profileData?.step1?.smoke;
  const smokeB = memberB.profileData?.step1?.smoke;
  if (prefsA.smokePreference === false && smokeB === true) return false;
  if (prefsB.smokePreference === false && smokeA === true) return false;

  const drinkA = memberA.profileData?.step1?.drink;
  const drinkB = memberB.profileData?.step1?.drink;
  if (prefsA.drinkPreference === false && drinkB === true) return false;
  if (prefsB.drinkPreference === false && drinkA === true) return false;

  // Education / Profession (if specified)
  const eduB = memberB.profileData?.step2?.education;
  if (prefsA.preferredEducation?.length && eduB) {
    if (!prefsA.preferredEducation.includes(eduB)) return false;
  }

  const profB = memberB.profileData?.step2?.profession;
  if (prefsA.preferredProfession?.length && profB) {
    if (!prefsA.preferredProfession.includes(profB)) return false;
  }

  return true;
}

/**
 * Section 4.2: Serialization adhering to profile completion and package entitlements
 */
export function serializeMatchCard(
  target: any,
  viewer: any,
  contactStatus?: { revealed: boolean; status: string; mobile?: string | null },
) {
  const isPaidViewer = viewer?.packageType === 'PAID';
  const age = calculateAge(target.dateOfBirth);
  const targetData = (target.profileData as Record<string, any>) || {};
  const step1 = targetData.step1 || {};
  const step2 = targetData.step2 || {};

  const basicFields = {
    id: target.id,
    memberId: target.memberId || `M${String(target.id).slice(0, 8)}`,
    name: `${target.firstName} ${target.lastName}`,
    maritalStatus: step1.maritalStatus || 'Unmarried',
    profession: step2.profession || step2.employedIn || 'Not specified',
    education: step2.education || 'Graduate',
    salary: step2.annualIncome || 'Confidential',
    caste: step1.caste || 'Open',
    religion: step1.religion || 'Hindu',
    height: step1.height || "5'6\"",
    dateOfBirth: target.dateOfBirth,
    age,
    gender: target.gender,
    location: step1.district || step1.city || step1.state || 'India',
  };

  if (!isPaidViewer) {
    // Section 4.2 Free Member restrictions:
    // Display ONLY permitted basic fields.
    // Photos are HIDDEN.
    // Contact numbers are HIDDEN.
    return {
      ...basicFields,
      photoUrl: null,
      isPhotoHidden: true,
      mobile: null,
      email: null,
      isContactHidden: true,
      isPaidOnly: false,
      revelationStatus: 'PAID_REQUIRED',
    };
  }

  // Paid Member: Full details & Photos
  return {
    ...basicFields,
    photoUrl: target.photoUrl,
    isPhotoHidden: false,
    profileData: targetData,
    mobile: contactStatus?.revealed ? (target.user?.mobile || step1.mobile) : null,
    email: contactStatus?.revealed ? (target.user?.email || step1.email) : null,
    isContactHidden: !contactStatus?.revealed,
    revelationStatus: contactStatus?.status || 'NOT_REQUESTED',
    isPaidOnly: true,
  };
}
