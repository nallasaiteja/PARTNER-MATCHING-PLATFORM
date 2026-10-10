import { BadRequestException } from '@nestjs/common';

const MARITAL_STATUSES = [
  'Unmarried',
  'Widower',
  'Divorced',
  'No Divorce',
  'Waiting for Divorce',
];
const FAMILY_STATUSES = ['Rich', 'Middle Class', 'Average'];
const EDUCATION_OPTIONS = [
  'B.Tech / B.E.',
  'M.Tech / M.E.',
  'MBA / PGDM',
  'MBBS / MD',
  'MCA / MS',
  'Degree / B.Sc / B.Com',
  'Other',
];
const COMPLEXION_OPTIONS = ['Fair', 'Very Fair', 'Medium', 'Brown', 'Dark'];
const HEIGHT_PATTERN = /^(\d+)'(\d+)"(?: \(\d+ cm\))?$/;

function validateStringArray(value: unknown, field: string, allowedValues?: string[]) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new BadRequestException(`${field} must be an array of non-empty strings`);
  }
  if (allowedValues && value.some((item) => !allowedValues.includes(item))) {
    throw new BadRequestException(`${field} contains an unsupported option`);
  }
}

function heightInches(value: unknown, field: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw new BadRequestException(`${field} must be a height value`);
  const match = HEIGHT_PATTERN.exec(value);
  if (!match) throw new BadRequestException(`${field} must use feet and inches`);
  return Number(match[1]) * 12 + Number(match[2]);
}

export function validateAndSanitizeStep4(data: Record<string, any>) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new BadRequestException('Step 4 preferences must be an object');
  }

  validateStringArray(data.preferredMaritalStatus, 'preferredMaritalStatus', MARITAL_STATUSES);
  validateStringArray(data.preferredFamilyStatus, 'preferredFamilyStatus', FAMILY_STATUSES);
  validateStringArray(data.preferredCastes, 'preferredCastes');
  validateStringArray(data.preferredComplexion, 'preferredComplexion', COMPLEXION_OPTIONS);
  validateStringArray(data.preferredEducation, 'preferredEducation', EDUCATION_OPTIONS);
  validateStringArray(data.preferredProfession, 'preferredProfession');
  validateStringArray(data.preferredCitiesOfWork, 'preferredCitiesOfWork');
  validateStringArray(data.preferredCountriesAbroad, 'preferredCountriesAbroad');

  if (data.ageRangeMin !== undefined && (!Number.isInteger(data.ageRangeMin) || data.ageRangeMin < 18 || data.ageRangeMin > 70)) {
    throw new BadRequestException('ageRangeMin must be an integer between 18 and 70');
  }
  if (data.ageRangeMax !== undefined && (!Number.isInteger(data.ageRangeMax) || data.ageRangeMax < 18 || data.ageRangeMax > 70)) {
    throw new BadRequestException('ageRangeMax must be an integer between 18 and 70');
  }
  if (data.ageRangeMin !== undefined && data.ageRangeMax !== undefined && data.ageRangeMin > data.ageRangeMax) {
    throw new BadRequestException('Minimum age cannot be greater than maximum age');
  }

  const minHeight = heightInches(data.heightRangeMin, 'heightRangeMin');
  const maxHeight = heightInches(data.heightRangeMax, 'heightRangeMax');
  if (minHeight !== undefined && maxHeight !== undefined && minHeight > maxHeight) {
    throw new BadRequestException('Minimum height cannot be greater than maximum height');
  }

  if (data.interCasteAllowed !== undefined && typeof data.interCasteAllowed !== 'boolean') {
    throw new BadRequestException('interCasteAllowed must be Yes or No');
  }
  if (data.kujaDoshamPreference !== undefined && !['Yes', 'No', 'Any'].includes(data.kujaDoshamPreference)) {
    throw new BadRequestException('kujaDoshamPreference must be Yes, No, or Any');
  }
  for (const field of ['smokePreference', 'drinkPreference', 'passportHolderPreference']) {
    if (data[field] !== undefined && typeof data[field] !== 'boolean') {
      throw new BadRequestException(`${field} must be Yes or No`);
    }
  }
  if (data.preferredWorkingLocation !== undefined && !['India', 'Abroad'].includes(data.preferredWorkingLocation)) {
    throw new BadRequestException('preferredWorkingLocation must be India or Abroad');
  }
  if (data.paymentInterestDate !== undefined && data.paymentInterestDate !== '') {
    if (typeof data.paymentInterestDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.paymentInterestDate)) {
      throw new BadRequestException('paymentInterestDate must be a valid date');
    }
    const date = new Date(`${data.paymentInterestDate}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== data.paymentInterestDate) {
      throw new BadRequestException('paymentInterestDate must be a valid date');
    }
  }

  const sanitized = { ...data };
  delete sanitized.paymentInterestDateSetBy;
  delete sanitized.paymentInterestDateSetByStaffId;
  return sanitized;
}