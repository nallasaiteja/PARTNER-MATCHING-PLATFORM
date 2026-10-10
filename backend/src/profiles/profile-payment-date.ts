import { ForbiddenException } from '@nestjs/common';
import { Permission, ROLE_PERMISSIONS, Role } from '../common/constants/roles.constants';

interface PaymentDateActor {
  id: string;
  role: string;
}

export function applyProfilePaymentDate(
  incomingProfileData: Record<string, any> | undefined,
  existingProfileData: Record<string, any> | null | undefined,
  actor: PaymentDateActor,
  profileUserId?: string,
  creating = false,
) {
  if (!incomingProfileData?.step5) {
    return { profileData: incomingProfileData, changed: false };
  }

  const step5 = { ...incomingProfileData.step5 };
  const existingStep5 = existingProfileData?.step5 || {};
  const dateSubmitted = Object.prototype.hasOwnProperty.call(step5, 'profilePaymentDate');
  const previousDate = existingStep5.profilePaymentDate || undefined;
  const rawDate = dateSubmitted ? step5.profilePaymentDate : previousDate;
  const nextDate = typeof rawDate === 'string' && rawDate ? rawDate : undefined;
  const changed = dateSubmitted && nextDate !== previousDate;

  if (changed) {
    if (actor.role === Role.MEMBER) {
      if (creating || actor.id !== profileUserId) {
        throw new ForbiddenException('Members can only set a payment date on their own profile');
      }
    } else {
      const permission = creating ? Permission.PROFILE_CREATE : Permission.PROFILE_EDIT;
      const permissions = ROLE_PERMISSIONS[actor.role as keyof typeof ROLE_PERMISSIONS] || [];
      if (!permissions.includes(permission)) {
        throw new ForbiddenException('Your role cannot set or modify the profile payment date');
      }
    }
  }

  delete step5.profilePaymentDateSetBy;
  delete step5.profilePaymentDateSetByStaffId;
  if (dateSubmitted && nextDate === undefined) step5.profilePaymentDate = '';
  if (nextDate) step5.profilePaymentDate = nextDate;

  const setBy = changed
    ? actor.role === Role.MEMBER ? 'MEMBER' : 'STAFF'
    : existingStep5.profilePaymentDateSetBy;
  const staffId = changed
    ? actor.role === Role.MEMBER ? undefined : actor.id
    : existingStep5.profilePaymentDateSetByStaffId;
  if (nextDate && setBy) {
    step5.profilePaymentDateSetBy = setBy;
    if (staffId) step5.profilePaymentDateSetByStaffId = staffId;
  }

  return {
    profileData: { ...incomingProfileData, step5 },
    changed,
    auditMetadata: changed
      ? { profilePaymentDate: nextDate || null, setBy, staffId: staffId || null }
      : undefined,
  };
}