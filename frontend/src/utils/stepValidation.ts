/**
 * Step Validation Engine
 * Validates step data according to Section 3 specification business rules.
 */

import type {
  StepNumber,
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  StepValidationErrors,
} from '../types/profile.ts';

/**
 * Calculates age given a YYYY-MM-DD birthdate string.
 */
export function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function validateStep1(data: Step1Data): StepValidationErrors {
  const errors: StepValidationErrors = {};

  if (!data.firstName || !data.firstName.trim()) {
    errors.firstName = 'Full name is required';
  }

  if (!data.lastName || !data.lastName.trim()) {
    errors.lastName = 'Surname is required';
  }

  if (!data.gender) {
    errors.gender = 'Gender is required (Male or Female)';
  }

  if (!data.mobile || !data.mobile.trim()) {
    errors.mobile = 'Mobile number is required';
  } else if (!/^\+?[0-9]{10,15}$/.test(data.mobile.replace(/\s+/g, ''))) {
    errors.mobile = 'Mobile number must be 10–15 digits';
  }

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.idProofType || !data.idProofType.trim()) {
    errors.idProofType = 'ID proof type is required';
  }

  if (!data.idProofNumber || !data.idProofNumber.trim()) {
    errors.idProofNumber = 'ID proof number is required';
  }

  if (!data.photoUrl || !data.photoUrl.trim()) {
    errors.photoUrl = 'Profile photo is required';
  }

  if (!data.idProofFileUrl || !data.idProofFileUrl.trim()) {
    errors.idProofFileUrl = 'ID proof file upload is required';
  }

  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const age = calculateAge(data.dateOfBirth);
    if (age < 18 || age > 70) {
      errors.dateOfBirth = `Age must be between 18 and 70 years (Calculated age: ${age})`;
    }
  }

  if (data.timeOfBirth && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.timeOfBirth)) {
    errors.timeOfBirth = 'Time of birth must be in HH:MM format';
  }

  if (!data.religion || !data.religion.trim()) {
    errors.religion = 'Religion is required';
  }

  if (!data.caste || !data.caste.trim()) {
    errors.caste = 'Caste is required';
  }

  if (!data.country || !data.country.trim()) {
    errors.country = 'Country is required';
  }

  if (!data.state || !data.state.trim()) {
    errors.state = 'State is required';
  }

  if (data.mandal && !data.district) {
    errors.mandal = 'Select a district before selecting a mandal';
  }

  if (data.villageId && !data.mandal) {
    errors.village = 'Select a mandal before choosing a village';
  }

  // Physical & Lifestyle Details
  if (!data.height || !data.height.trim()) {
    errors.height = 'Height is required';
  }

  if (!data.maritalStatus || !data.maritalStatus.trim()) {
    errors.maritalStatus = 'Marital status is required';
  } else if (![
    'Unmarried',
    'Widower',
    'Divorced',
    'Waiting for Divorce',
    'No Divorce',
  ].includes(data.maritalStatus)) {
    errors.maritalStatus = 'Select a valid marital status';
  }

  if (data.motherTongue && ![
    'Telugu',
    'Kannada',
    'Tamil',
    'Odia',
    'English',
    'Hindi',
    'Urdu',
  ].includes(data.motherTongue)) {
    errors.motherTongue = 'Select a valid mother tongue';
  }

  if (data.complexion && ![
    'Fair',
    'Very Fair',
    'Medium',
    'Brown',
    'Dark',
  ].includes(data.complexion)) {
    errors.complexion = 'Select a valid complexion';
  }

  if (data.foodPreference && ![
    'Vegetarian',
    'Non-Vegetarian',
    'Eggetarian',
    'Not Particular',
  ].includes(data.foodPreference)) {
    errors.foodPreference = 'Select a valid food preference';
  }

  if (data.bloodGroup && ![
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
  ].includes(data.bloodGroup)) {
    errors.bloodGroup = 'Select a valid blood group';
  }

  // Marital History & Children Details (if not Unmarried)
  if (data.maritalStatus && data.maritalStatus !== 'Unmarried') {
    if (data.havingChildren) {
      const totalChildren = (data.sons?.length || 0) + (data.daughters?.length || 0);
      if (totalChildren === 0) {
        errors.havingChildren = 'Please add at least one son or daughter, or select No for Having Children';
      }
      if (data.sons) {
        data.sons.forEach((son, index) => {
          if (!son.name || !son.name.trim()) {
            errors[`son_${index}_name`] = `Son #${index + 1} name is required`;
          }
          if (son.age < 0 || isNaN(son.age)) {
            errors[`son_${index}_age`] = `Son #${index + 1} age must be a valid number`;
          }
          if (son.age >= 18 && !son.maritalStatus) {
            errors[`son_${index}_maritalStatus`] = `Son #${index + 1} marital status is required (age 18+)`;
          }
        });
      }
      if (data.daughters) {
        data.daughters.forEach((daughter, index) => {
          if (!daughter.name || !daughter.name.trim()) {
            errors[`daughter_${index}_name`] = `Daughter #${index + 1} name is required`;
          }
          if (daughter.age < 0 || isNaN(daughter.age)) {
            errors[`daughter_${index}_age`] = `Daughter #${index + 1} age must be a valid number`;
          }
          if (daughter.age >= 18 && !daughter.maritalStatus) {
            errors[`daughter_${index}_maritalStatus`] = `Daughter #${index + 1} marital status is required (age 18+)`;
          }
        });
      }
    }
  }

  // Alternate Contact Details Validation
  if (data.alternateMobile && data.alternateMobile.trim()) {
    if (!/^\+?[0-9]{10,15}$/.test(data.alternateMobile.replace(/\s+/g, ''))) {
      errors.alternateMobile = 'Alternate mobile number must be 10–15 digits';
    }
  }

  if (data.alternateEmail && data.alternateEmail.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.alternateEmail.trim())) {
      errors.alternateEmail = 'Please enter a valid alternate email address';
    }
  }

  // Application For (if not Myself, filler details are required)
  if (data.applicationFor && data.applicationFor !== 'Myself') {
    if (!data.fillerName || !data.fillerName.trim()) {
      errors.fillerName = 'Name of person filling the form is required';
    }
    if (!data.fillerMobile || !data.fillerMobile.trim()) {
      errors.fillerMobile = 'Mobile number of person filling the form is required';
    } else if (!/^\+?[0-9]{10,15}$/.test(data.fillerMobile.replace(/\s+/g, ''))) {
      errors.fillerMobile = 'Filler mobile number must be 10–15 digits';
    }
  }

  return errors;
}

export function validateStep2(data: Step2Data): StepValidationErrors {
  const errors: StepValidationErrors = {};

  if (!data.education || !data.education.trim()) {
    errors.education = 'Education qualification is required';
  }

  if (!data.employedIn) {
    errors.employedIn = 'Employment category is required';
  }

  const isStudent = data.employedIn === 'Student';
  const isEmployed = ['Private', 'Government', 'Business'].includes(data.employedIn || '');

  if (isStudent) {
    if (!data.currentEducationPursuing || !data.currentEducationPursuing.trim()) {
      errors.currentEducationPursuing = 'Course pursuing is required for students';
    }
    if (!data.universityStudying || !data.universityStudying.trim()) {
      errors.universityStudying = 'University / college name is required for students';
    }
    if (!data.universityAddress || !data.universityAddress.trim()) {
      errors.universityAddress = 'University address is required for students';
    }
    if (!data.yearOfPursuing || !data.yearOfPursuing.trim()) {
      errors.yearOfPursuing = 'Current year is required for students';
    }
    return errors;
  }

  if (isEmployed) {
    if (!data.profession || !data.profession.trim()) {
      errors.profession = 'Profession is required for employed candidates';
    }
    if (!data.designation || !data.designation.trim()) {
      errors.designation = 'Designation is required for employed candidates';
    }
    if (!data.annualIncome || !data.annualIncome.trim()) {
      errors.annualIncome = 'Annual income is required for employed candidates';
    }

    if (data.workingLocation === 'India') {
      if (!data.workingState || !data.workingState.trim()) {
        errors.workingState = 'Working state is required when working in India';
      }
      if (!data.workingCity || !data.workingCity.trim()) {
        errors.workingCity = 'Working city is required when working in India';
      }
      if (!data.workingLocationAddress || !data.workingLocationAddress.trim()) {
        errors.workingLocationAddress = 'Working address is required when working in India';
      }
      if (!data.companyName || !data.companyName.trim()) {
        errors.companyName = 'Company name is required when working in India';
      }
      if (!data.workingSince || !data.workingSince.trim()) {
        errors.workingSince = 'Employment start date is required when working in India';
      }
      if (!data.totalExperience || !data.totalExperience.trim()) {
        errors.totalExperience = 'Total experience is required when working in India';
      }
    }

    if (data.workingLocation === 'Abroad') {
      if (!data.workCountry || !data.workCountry.trim()) {
        errors.workCountry = 'Country is required when working abroad';
      }
      if (!data.workState || !data.workState.trim()) {
        errors.workState = 'State is required when working abroad';
      }
      if (!data.visaType || !data.visaType.trim()) {
        errors.visaType = 'Visa type is required when working abroad';
      }
      if (!data.passportValidFrom || !data.passportValidFrom.trim()) {
        errors.passportValidFrom = 'Passport valid from date is required when working abroad';
      }
      if (!data.passportValidTill || !data.passportValidTill.trim()) {
        errors.passportValidTill = 'Passport valid till date is required when working abroad';
      }
      if (!data.abroadCompanyName || !data.abroadCompanyName.trim()) {
        errors.abroadCompanyName = 'Company name is required when working abroad';
      }
      if (!data.abroadCompanyAddress || !data.abroadCompanyAddress.trim()) {
        errors.abroadCompanyAddress = 'Company address is required when working abroad';
      }
    }
  }

  return errors;
}

export function validateStep3(data: Step3Data): StepValidationErrors {
  const errors: StepValidationErrors = {};

  if (!data.fatherName || !data.fatherName.trim()) {
    errors.fatherName = "Father's name is required";
  }

  if (data.fatherStatus === 'Alive') {
    if (!data.fatherReligion || !data.fatherReligion.trim()) {
      errors.fatherReligion = 'Father religion is required';
    }

    if (!data.fatherCaste || !data.fatherCaste.trim()) {
      errors.fatherCaste = 'Father caste is required';
    }

    if (!data.fatherHealthCondition || !data.fatherHealthCondition.trim()) {
      errors.fatherHealthCondition = 'Father health condition is required';
    }
    if (!data.fatherMobile || !data.fatherMobile.trim()) {
      errors.fatherMobile = 'Father mobile number is required';
    }
    if (!data.fatherEmployment || !data.fatherEmployment.trim()) {
      errors.fatherEmployment = 'Father employment status is required';
    }
    if (!data.fatherProfession || !data.fatherProfession.trim()) {
      errors.fatherProfession = 'Father profession is required';
    }
    if (!data.fatherAnnualIncome || !data.fatherAnnualIncome.trim()) {
      errors.fatherAnnualIncome = 'Father annual income is required';
    }
    if (!data.fatherDesignation || !data.fatherDesignation.trim()) {
      errors.fatherDesignation = 'Father designation is required';
    }
    if (!data.fatherAddress || !data.fatherAddress.trim()) {
      errors.fatherAddress = 'Father address is required';
    }
    if (!data.fatherProperty || !data.fatherProperty.trim()) {
      errors.fatherProperty = 'Father property details are required';
    }
    if (!data.fatherPension || !data.fatherPension.trim()) {
      errors.fatherPension = 'Father pension details are required';
    }
  }

  if (!data.motherName || !data.motherName.trim()) {
    errors.motherName = "Mother's name is required";
  }

  if (data.motherStatus === 'Alive') {
    if (!data.motherReligion || !data.motherReligion.trim()) {
      errors.motherReligion = 'Mother religion is required';
    }

    if (!data.motherCaste || !data.motherCaste.trim()) {
      errors.motherCaste = 'Mother caste is required';
    }

    if (!data.motherHealthCondition || !data.motherHealthCondition.trim()) {
      errors.motherHealthCondition = 'Mother health condition is required';
    }
    if (!data.motherWorkingSector || !data.motherWorkingSector.trim()) {
      errors.motherWorkingSector = 'Mother working sector is required';
    }
    if (!data.motherMobile || !data.motherMobile.trim()) {
      errors.motherMobile = 'Mother mobile number is required';
    }
    if (!data.motherEmployment || !data.motherEmployment.trim()) {
      errors.motherEmployment = 'Mother employment status is required';
    }
    if (!data.motherProfession || !data.motherProfession.trim()) {
      errors.motherProfession = 'Mother profession is required';
    }
    if (!data.motherAnnualIncome || !data.motherAnnualIncome.trim()) {
      errors.motherAnnualIncome = 'Mother annual income is required';
    }
    if (!data.motherDesignation || !data.motherDesignation.trim()) {
      errors.motherDesignation = 'Mother designation is required';
    }
    if (!data.motherAddress || !data.motherAddress.trim()) {
      errors.motherAddress = 'Mother address is required';
    }
    if (!data.motherProperty || !data.motherProperty.trim()) {
      errors.motherProperty = 'Mother property details are required';
    }
    if (!data.motherPension || !data.motherPension.trim()) {
      errors.motherPension = 'Mother pension details are required';
    }
  }

  if (!data.familyPermanentAddress || !data.familyPermanentAddress.trim()) {
    errors.familyPermanentAddress = 'Permanent family address is required';
  }

  if (!data.familyPresentAddress || !data.familyPresentAddress.trim()) {
    errors.familyPresentAddress = 'Present family address is required';
  }

  if (!data.familyType) {
    errors.familyType = 'Family type is required';
  }

  if (!data.familyStatus) {
    errors.familyStatus = 'Family status is required';
  }

  const brothers = data.brothers || [];
  const sisters = data.sisters || [];

  brothers.forEach((brother, index) => {
    if (!brother.name || !brother.name.trim()) {
      errors[`brother_${index}_name`] = `Brother #${index + 1} name is required`;
    }
    if (brother.age === undefined || brother.age === null || Number.isNaN(Number(brother.age)) || Number(brother.age) < 0) {
      errors[`brother_${index}_age`] = `Brother #${index + 1} age is required`;
    } else if (Number(brother.age) >= 18 && (!brother.maritalStatus || !brother.maritalStatus.trim())) {
      errors[`brother_${index}_maritalStatus`] = `Brother #${index + 1} marital status is required (age 18+)`;
    }
  });

  sisters.forEach((sister, index) => {
    if (!sister.name || !sister.name.trim()) {
      errors[`sister_${index}_name`] = `Sister #${index + 1} name is required`;
    }
    if (sister.age === undefined || sister.age === null || Number.isNaN(Number(sister.age)) || Number(sister.age) < 0) {
      errors[`sister_${index}_age`] = `Sister #${index + 1} age is required`;
    } else if (Number(sister.age) >= 18 && (!sister.maritalStatus || !sister.maritalStatus.trim())) {
      errors[`sister_${index}_maritalStatus`] = `Sister #${index + 1} marital status is required (age 18+)`;
    }
  });

  return errors;
}

export function validateStep4(data: Step4Data): StepValidationErrors {
  const errors: StepValidationErrors = {};
  const allowedMaritalStatuses = [
    'Unmarried',
    'Widower',
    'Divorced',
    'No Divorce',
    'Waiting for Divorce',
  ];

  if (!data.preferredMaritalStatus || data.preferredMaritalStatus.length === 0) {
    errors.preferredMaritalStatus = 'Select at least one preferred marital status';
  } else if (data.preferredMaritalStatus.some((status) => !allowedMaritalStatuses.includes(status))) {
    errors.preferredMaritalStatus = 'Select valid preferred marital statuses';
  }

  if (data.ageRangeMin < 18 || data.ageRangeMax > 70 || data.ageRangeMin > data.ageRangeMax) {
    errors.ageRange = 'Minimum age cannot be greater than maximum age';
  }

  const minHeight = /^(\d+)'(\d+)"/.exec(data.heightRangeMin);
  const maxHeight = /^(\d+)'(\d+)"/.exec(data.heightRangeMax);
  if (minHeight && maxHeight) {
    const minInches = Number(minHeight[1]) * 12 + Number(minHeight[2]);
    const maxInches = Number(maxHeight[1]) * 12 + Number(maxHeight[2]);
    if (minInches > maxInches) errors.heightRange = 'Minimum height cannot be greater than maximum height';
  }

  if (data.interCasteAllowed && !(data.preferredCastes || []).length) {
    errors.preferredCastes = 'Select at least one preferred caste';
  }

  if (data.preferredWorkingLocation === 'Abroad' && !(data.preferredCountriesAbroad || []).length) {
    errors.preferredCountriesAbroad = 'Select at least one preferred country';
  }

  return errors;
}

export function validateStep5(data: Step5Data): StepValidationErrors {
  const errors: StepValidationErrors = {};
  const revelationPreferences = [
    '0 Hours',
    '24 Hours',
    '72 Hours',
    'Acceptance Preference',
  ];

  if (!data.mobileRevelationPreference) {
    errors.mobileRevelationPreference = 'Mobile revelation preference is required';
  } else if (!revelationPreferences.includes(data.mobileRevelationPreference)) {
    errors.mobileRevelationPreference = 'Select a valid mobile revelation preference';
  }

  if (data.profilePaymentDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.profilePaymentDate)) {
    errors.profilePaymentDate = 'Profile payment date must be a valid date';
  }

  return errors;
}

/**
 * Validates a specific step number against its data.
 */
export function validateStep(
  stepNumber: StepNumber,
  formData: {
    step1: Step1Data;
    step2: Step2Data;
    step3: Step3Data;
    step4: Step4Data;
    step5: Step5Data;
  },
): StepValidationErrors {
  switch (stepNumber) {
    case 1:
      return validateStep1(formData.step1);
    case 2:
      return validateStep2(formData.step2);
    case 3:
      return validateStep3(formData.step3);
    case 4:
      return validateStep4(formData.step4);
    case 5:
      return validateStep5(formData.step5);
    default:
      return {};
  }
}
