/**
 * Step Validation Engine
 * Validates step data according to Section 3 specification business rules.
 */

import {
  StepNumber,
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  StepValidationErrors,
} from '../types/profile';

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

  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const age = calculateAge(data.dateOfBirth);
    if (age < 18 || age > 70) {
      errors.dateOfBirth = `Age must be between 18 and 70 years (Calculated age: ${age})`;
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

  return errors;
}

export function validateStep3(data: Step3Data): StepValidationErrors {
  const errors: StepValidationErrors = {};

  if (!data.fatherName || !data.fatherName.trim()) {
    errors.fatherName = "Father's name is required";
  }

  if (!data.motherName || !data.motherName.trim()) {
    errors.motherName = "Mother's name is required";
  }

  if (!data.familyType) {
    errors.familyType = 'Family type is required';
  }

  return errors;
}

export function validateStep4(data: Step4Data): StepValidationErrors {
  const errors: StepValidationErrors = {};

  if (!data.preferredMaritalStatus || data.preferredMaritalStatus.length === 0) {
    errors.preferredMaritalStatus = 'Select at least one preferred marital status';
  }

  if (data.ageRangeMin > data.ageRangeMax) {
    errors.ageRange = 'Minimum age cannot be greater than maximum age';
  }

  return errors;
}

export function validateStep5(data: Step5Data): StepValidationErrors {
  const errors: StepValidationErrors = {};

  if (!data.mobileRevelationPreference) {
    errors.mobileRevelationPreference = 'Mobile revelation preference is required';
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
