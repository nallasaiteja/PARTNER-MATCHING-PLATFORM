import { BadRequestException } from '@nestjs/common';

function normalize(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.trim();
  return value;
}

function assertUnchanged(label: string, current: unknown, submitted: unknown) {
  if (current !== undefined && current !== null && current !== ''
    && submitted !== undefined && submitted !== null
    && normalize(current) !== normalize(submitted)) {
    throw new BadRequestException(`${label} is immutable once entered`);
  }
}

export function assertImmutableProfileFields(
  existing: any,
  existingUser: { mobile?: string | null; email?: string | null } | undefined,
  dto: Record<string, any>,
  profileData?: Record<string, any>,
) {
  const submittedStep1 = profileData?.step1 || {};

  assertUnchanged('Full name', existing.firstName, dto.firstName ?? submittedStep1.firstName);
  assertUnchanged('Full name', existing.lastName, dto.lastName ?? submittedStep1.lastName);
  assertUnchanged('Date of birth', existing.dateOfBirth, dto.dateOfBirth ?? submittedStep1.dateOfBirth);
  assertUnchanged('Mobile number', existingUser?.mobile, dto.mobile ?? submittedStep1.mobile);
  assertUnchanged('Email', existingUser?.email, dto.email ?? submittedStep1.email);

  const existingStep1 = (existing.profileData as Record<string, any> | null)?.step1 || {};
  for (const field of ['religion', 'religionId', 'caste', 'casteId']) {
    assertUnchanged(field.replace(/Id$/, ''), existingStep1[field], submittedStep1[field]);
  }
}