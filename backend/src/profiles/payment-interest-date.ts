import { ForbiddenException } from '@nestjs/common';
import { Permission, ROLE_PERMISSIONS, Role } from '../common/constants/roles.constants';

interface PaymentDateActor {
  id: string;
  role: string;
}

interface PaymentDateUpdate {
  profileData: Record<string, any> | undefined;
  changed: boolean;
  auditMetadata?: Record<string, string | null>;
}

function hasOwn(value: Record<string, any> | undefined, key: string) {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}

export function assertCanSetPaymentInterestDate(
  actor: PaymentDateActor,
  profileUserId?: string,
  creating = false,
) {
  if (actor.role === Role.MEMBER) {
    if (creating || actor.id !== profileUserId) {
      throw new ForbiddenException('Members can only set a payment interest date on their own profile');
    }
    return;
  }

  const requiredPermission = creating ? Permission.PROFILE_CREATE : Permission.PROFILE_EDIT;
  const permissions = ROLE_PERMISSIONS[actor.role as keyof typeof ROLE_PERMISSIONS] || [];
  if (!permissions.includes(requiredPermission)) {
    throw new ForbiddenException('Your role cannot set or modify the payment interest date');
  }
}

export function applyPaymentInterestDateAttribution(
  incomingProfileData: Record<string, any> | undefined,
  existingProfileData: Record<string, any> | null | undefined,
  actor: PaymentDateActor,
  profileUserId?: string,
  creating = false,
): PaymentDateUpdate {
  if (!incomingProfileData) {
    return { profileData: incomingProfileData, changed: false };
  }

  const incomingStep4 = { ...(incomingProfileData.step4 || {}) };
  const incomingStep5 = incomingProfileData.step5 ? { ...incomingProfileData.step5 } : undefined;
  const existingStep4 = existingProfileData?.step4 || {};
  const existingStep5 = existingProfileData?.step5 || {};
  const hasStep4Date = hasOwn(incomingStep4, 'paymentInterestDate');
  const hasLegacyStep5Date = hasOwn(incomingStep5, 'paymentInterestDate');
  const dateWasSubmitted = hasStep4Date || hasLegacyStep5Date;
  const oldDate = existingStep4.paymentInterestDate || existingStep5.paymentInterestDate || undefined;
  const submittedDate = hasStep4Date
    ? incomingStep4.paymentInterestDate
    : hasLegacyStep5Date
      ? incomingStep5?.paymentInterestDate
      : oldDate;
  const newDate = typeof submittedDate === 'string' && submittedDate.length > 0
    ? submittedDate
    : undefined;
  const changed = dateWasSubmitted && newDate !== oldDate;

  if (changed) {
    assertCanSetPaymentInterestDate(actor, profileUserId, creating);
  }

  delete incomingStep4.paymentInterestDateSetBy;
  delete incomingStep4.paymentInterestDateSetByStaffId;
  if (newDate === undefined) {
    if (dateWasSubmitted) incomingStep4.paymentInterestDate = '';
    else delete incomingStep4.paymentInterestDate;
  } else {
    incomingStep4.paymentInterestDate = newDate;
  }

  const attribution = changed
    ? {
        setBy: actor.role === Role.MEMBER ? 'MEMBER' : 'STAFF',
        staffId: actor.role === Role.MEMBER ? null : actor.id,
      }
    : {
        setBy: existingStep4.paymentInterestDateSetBy || null,
        staffId: existingStep4.paymentInterestDateSetByStaffId || null,
      };

  if (newDate && attribution.setBy) {
    incomingStep4.paymentInterestDateSetBy = attribution.setBy;
    if (attribution.staffId) incomingStep4.paymentInterestDateSetByStaffId = attribution.staffId;
  }

  const nextProfileData: Record<string, any> = {
    ...incomingProfileData,
  };
  if (incomingProfileData.step4 || dateWasSubmitted) nextProfileData.step4 = incomingStep4;
  if (incomingStep5) {
    delete incomingStep5.paymentInterestDate;
    nextProfileData.step5 = incomingStep5;
  }

  return {
    profileData: nextProfileData,
    changed,
    auditMetadata: changed
      ? {
          paymentInterestDate: newDate || null,
          setBy: attribution.setBy,
          staffId: attribution.staffId,
        }
      : undefined,
  };
}