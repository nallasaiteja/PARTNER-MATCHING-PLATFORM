import { BadRequestException } from '@nestjs/common';

const REVELATION_PREFERENCES = [
  '0 Hours',
  '24 Hours',
  '72 Hours',
  'Acceptance Preference',
];

export function validateAndSanitizeStep5(data: Record<string, any>) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new BadRequestException('Step 5 settings must be an object');
  }

  if (data.willingToTakePackage !== undefined && typeof data.willingToTakePackage !== 'boolean') {
    throw new BadRequestException('willingToTakePackage must be Yes or No');
  }
  if (data.mobileRevelationPreference !== undefined
    && !REVELATION_PREFERENCES.includes(data.mobileRevelationPreference)) {
    throw new BadRequestException('Select a valid mobile revelation preference');
  }
  if (data.profilePaymentDate !== undefined && data.profilePaymentDate !== '') {
    if (typeof data.profilePaymentDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.profilePaymentDate)) {
      throw new BadRequestException('profilePaymentDate must be a valid date');
    }
    const date = new Date(`${data.profilePaymentDate}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== data.profilePaymentDate) {
      throw new BadRequestException('profilePaymentDate must be a valid date');
    }
  }

  const sanitized = { ...data };
  for (const field of [
    'mobileVerified',
    'emailVerified',
    'idProofUploaded',
    'idProofVerified',
    'idProofVerifiedAt',
    'idProofVerifiedBy',
    'profilePaymentDateSetBy',
    'profilePaymentDateSetByStaffId',
  ]) {
    delete sanitized[field];
  }
  return sanitized;
}