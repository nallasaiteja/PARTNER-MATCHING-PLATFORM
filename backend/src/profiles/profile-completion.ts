/**
 * Profile Completion Calculation Service
 * Section 4.2: Shared function to evaluate profile completion percentage,
 * missing fields checklist, and 70% threshold compliance.
 */

export interface ProfileCompletionResult {
  percentage: number;
  isComplete70Plus: boolean;
  missingFields: string[];
  missingSteps: number[];
  stepBreakdown: {
    step1: { score: number; max: number; label: string };
    step2: { score: number; max: number; label: string };
    step3: { score: number; max: number; label: string };
    step4: { score: number; max: number; label: string };
    step5: { score: number; max: number; label: string };
  };
}

export function calculateProfileCompletion(profile: any): ProfileCompletionResult {
  const missingFields: string[] = [];
  const missingStepsSet = new Set<number>();

  const profileData = (profile?.profileData as Record<string, any>) || {};
  const step1Data = profileData.step1 || {};
  const step2Data = profileData.step2 || {};
  const step3Data = profileData.step3 || {};
  const step4Data = profileData.step4 || {};
  const step5Data = profileData.step5 || {};

  // ─── Step 1: Personal, Community & Lifestyle (Max 25 points) ───
  let step1Points = 0;
  const step1Max = 25;

  if (profile?.firstName && profile?.lastName) {
    step1Points += 4;
  } else {
    missingFields.push('Full Name');
    missingStepsSet.add(1);
  }

  if (profile?.gender) {
    step1Points += 3;
  } else {
    missingFields.push('Gender');
    missingStepsSet.add(1);
  }

  if (profile?.dateOfBirth) {
    step1Points += 3;
  } else {
    missingFields.push('Date of Birth');
    missingStepsSet.add(1);
  }

  const maritalStatus = step1Data.maritalStatus || profile?.maritalStatus;
  if (maritalStatus) {
    step1Points += 4;
  } else {
    missingFields.push('Marital Status');
    missingStepsSet.add(1);
  }

  const religion = step1Data.religion || step1Data.religionId;
  const caste = step1Data.caste || step1Data.casteId;
  if (religion && caste) {
    step1Points += 5;
  } else {
    missingFields.push('Religion & Caste');
    missingStepsSet.add(1);
  }

  const height = step1Data.height;
  if (height) {
    step1Points += 3;
  } else {
    missingFields.push('Height');
    missingStepsSet.add(1);
  }

  const address = step1Data.address || step1Data.district || step1Data.city || step1Data.state;
  if (address) {
    step1Points += 3;
  } else {
    missingFields.push('Living Location / Address');
    missingStepsSet.add(1);
  }

  // ─── Step 2: Education & Professional Details (Max 20 points) ───
  let step2Points = 0;
  const step2Max = 20;

  if (step2Data.education) {
    step2Points += 7;
  } else {
    missingFields.push('Education Qualification (Step 2)');
    missingStepsSet.add(2);
  }

  if (step2Data.employedIn) {
    step2Points += 5;
  } else {
    missingFields.push('Employment Sector (Step 2)');
    missingStepsSet.add(2);
  }

  const isEmployed = step2Data.employedIn && !['Unemployed', 'Student'].includes(step2Data.employedIn);
  if (isEmployed) {
    if (step2Data.profession) {
      step2Points += 4;
    } else {
      missingFields.push('Profession / Occupation');
      missingStepsSet.add(2);
    }

    if (step2Data.annualIncome) {
      step2Points += 4;
    } else {
      missingFields.push('Annual Income');
      missingStepsSet.add(2);
    }
  } else {
    step2Points += 8; // not employed, full remaining points credited
  }

  // ─── Step 3: Family Details (Max 20 points) ───
  let step3Points = 0;
  const step3Max = 20;

  if (step3Data.fatherName && step3Data.fatherStatus) {
    step3Points += 7;
  } else {
    missingFields.push("Father's Name & Status (Step 3)");
    missingStepsSet.add(3);
  }

  if (step3Data.motherName && step3Data.motherStatus) {
    step3Points += 7;
  } else {
    missingFields.push("Mother's Name & Status (Step 3)");
    missingStepsSet.add(3);
  }

  if (step3Data.familyStatus) {
    step3Points += 6;
  } else {
    missingFields.push('Family Status / Values (Step 3)');
    missingStepsSet.add(3);
  }

  // ─── Step 4: Partner Preferences (Max 20 points) ───
  let step4Points = 0;
  const step4Max = 20;

  if (step4Data.preferredMaritalStatus && Array.isArray(step4Data.preferredMaritalStatus) && step4Data.preferredMaritalStatus.length > 0) {
    step4Points += 7;
  } else {
    missingFields.push('Preferred Marital Status (Step 4)');
    missingStepsSet.add(4);
  }

  if (step4Data.ageRangeMin != null && step4Data.ageRangeMax != null) {
    step4Points += 7;
  } else {
    missingFields.push('Partner Age Range (Step 4)');
    missingStepsSet.add(4);
  }

  if (step4Data.heightRangeMin && step4Data.heightRangeMax) {
    step4Points += 6;
  } else {
    missingFields.push('Partner Height Range (Step 4)');
    missingStepsSet.add(4);
  }

  // ─── Step 5: Verification & Identity (Max 15 points) ───
  let step5Points = 0;
  const step5Max = 15;

  const hasIdProof = Boolean(profile?.idProofFileUrl || step5Data.idProofUploaded);
  if (hasIdProof) {
    step5Points += 8;
  } else {
    missingFields.push('ID Proof Document (Step 5)');
    missingStepsSet.add(5);
  }

  const isMobileVerified = Boolean(profile?.user?.mobileVerified || step5Data.mobileVerified);
  if (isMobileVerified) {
    step5Points += 7;
  } else {
    missingFields.push('Mobile OTP Verification (Step 5)');
    missingStepsSet.add(5);
  }

  const totalScore = step1Points + step2Points + step3Points + step4Points + step5Points;
  const maxPossible = step1Max + step2Max + step3Max + step4Max + step5Max; // 100
  const percentage = Math.min(100, Math.max(0, Math.round((totalScore / maxPossible) * 100)));

  return {
    percentage,
    isComplete70Plus: percentage >= 70,
    missingFields,
    missingSteps: Array.from(missingStepsSet).sort((a, b) => a - b),
    stepBreakdown: {
      step1: { score: step1Points, max: step1Max, label: 'Personal & Community' },
      step2: { score: step2Points, max: step2Max, label: 'Education & Profession' },
      step3: { score: step3Points, max: step3Max, label: 'Family Details' },
      step4: { score: step4Points, max: step4Max, label: 'Partner Preferences' },
      step5: { score: step5Points, max: step5Max, label: 'Verification & Settings' },
    },
  };
}
