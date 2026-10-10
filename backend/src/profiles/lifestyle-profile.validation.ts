import { BadRequestException } from '@nestjs/common';

export const VALID_MOTHER_TONGUES = [
  'Telugu',
  'Kannada',
  'Tamil',
  'Odia',
  'English',
  'Hindi',
  'Urdu',
] as const;

export const VALID_COMPLEXIONS = [
  'Fair',
  'Very Fair',
  'Medium',
  'Brown',
  'Dark',
] as const;

export const VALID_MARITAL_STATUSES = [
  'Unmarried',
  'Widower',
  'Divorced',
  'Waiting for Divorce',
  'No Divorce',
] as const;

export const VALID_FOOD_PREFERENCES = [
  'Vegetarian',
  'Non-Vegetarian',
  'Eggetarian',
  'Not Particular',
] as const;

export const VALID_BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export function validateAndSanitizeStep1Lifestyle(
  source: Record<string, any>,
): Record<string, any> {
  const step1 = { ...source };

  // Height (Required when saving completed step 1)
  if (typeof step1.height !== 'undefined' && step1.height !== null) {
    if (typeof step1.height !== 'string') {
      throw new BadRequestException('Height must be a valid text representation');
    }
    step1.height = step1.height.trim();
  }

  // Marital Status (Required)
  if (typeof step1.maritalStatus !== 'undefined' && step1.maritalStatus !== null) {
    const status = String(step1.maritalStatus).trim();
    if (status && !VALID_MARITAL_STATUSES.includes(status as any)) {
      throw new BadRequestException(
        `Marital status must be one of: ${VALID_MARITAL_STATUSES.join(', ')}`,
      );
    }
    step1.maritalStatus = status;

    // When Unmarried, clear any marital history values
    if (status === 'Unmarried') {
      step1.dateOfMarriage = '';
      step1.dateOfDivorce = '';
      step1.divorceReason = '';
      step1.divorceCertificateUrl = '';
      step1.dateOfSpouseDeath = '';
      step1.deathCertificateUrl = '';
      step1.havingChildren = false;
      step1.sons = [];
      step1.daughters = [];
    }
  }

  // Blood Group
  if (typeof step1.bloodGroup !== 'undefined' && step1.bloodGroup !== null) {
    const bg = String(step1.bloodGroup).trim();
    if (bg && !VALID_BLOOD_GROUPS.includes(bg as any)) {
      throw new BadRequestException(
        `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}`,
      );
    }
    step1.bloodGroup = bg;
  }

  // Mother Tongue
  if (typeof step1.motherTongue !== 'undefined' && step1.motherTongue !== null) {
    const mt = String(step1.motherTongue).trim();
    if (mt && !VALID_MOTHER_TONGUES.includes(mt as any)) {
      throw new BadRequestException(
        `Mother tongue must be one of: ${VALID_MOTHER_TONGUES.join(', ')}`,
      );
    }
    step1.motherTongue = mt;
  }

  // Complexion
  if (typeof step1.complexion !== 'undefined' && step1.complexion !== null) {
    const cx = String(step1.complexion).trim();
    if (cx && !VALID_COMPLEXIONS.includes(cx as any)) {
      throw new BadRequestException(
        `Complexion must be one of: ${VALID_COMPLEXIONS.join(', ')}`,
      );
    }
    step1.complexion = cx;
  }

  // Food Preference
  if (typeof step1.foodPreference !== 'undefined' && step1.foodPreference !== null) {
    const fp = String(step1.foodPreference).trim();
    if (fp && !VALID_FOOD_PREFERENCES.includes(fp as any)) {
      throw new BadRequestException(
        `Food preference must be one of: ${VALID_FOOD_PREFERENCES.join(', ')}`,
      );
    }
    step1.foodPreference = fp;
  }

  // Smoke (boolean)
  if (typeof step1.smoke !== 'undefined' && step1.smoke !== null && step1.smoke !== '') {
    if (typeof step1.smoke !== 'boolean') {
      if (step1.smoke === 'true' || step1.smoke === 'Yes') step1.smoke = true;
      else if (step1.smoke === 'false' || step1.smoke === 'No') step1.smoke = false;
      else throw new BadRequestException('Smoke must be a boolean (Yes or No)');
    }
  }

  // Drink (boolean)
  if (typeof step1.drink !== 'undefined' && step1.drink !== null && step1.drink !== '') {
    if (typeof step1.drink !== 'boolean') {
      if (step1.drink === 'true' || step1.drink === 'Yes') step1.drink = true;
      else if (step1.drink === 'false' || step1.drink === 'No') step1.drink = false;
      else throw new BadRequestException('Drink must be a boolean (Yes or No)');
    }
  }

  // Health Condition
  if (typeof step1.healthCondition === 'string') {
    step1.healthCondition = step1.healthCondition.trim();
  }

  // About Me
  if (typeof step1.aboutMe === 'string') {
    step1.aboutMe = step1.aboutMe.trim();
  }

  // Hobbies
  if (typeof step1.hobbies === 'string') {
    step1.hobbies = step1.hobbies.trim();
  }

  // Spoken Languages
  if (typeof step1.spokenLanguages !== 'undefined' && step1.spokenLanguages !== null) {
    if (!Array.isArray(step1.spokenLanguages)) {
      if (typeof step1.spokenLanguages === 'string') {
        step1.spokenLanguages = step1.spokenLanguages
          .split(',')
          .map((lang: string) => lang.trim())
          .filter(Boolean);
      } else {
        throw new BadRequestException('Spoken languages must be an array of language names');
      }
    }
  }

  // Marital History Fields (When not Unmarried)
  if (step1.maritalStatus && step1.maritalStatus !== 'Unmarried') {
    if (typeof step1.dateOfMarriage === 'string') {
      step1.dateOfMarriage = step1.dateOfMarriage.trim();
    }
    if (typeof step1.dateOfDivorce === 'string') {
      step1.dateOfDivorce = step1.dateOfDivorce.trim();
    }
    if (typeof step1.divorceReason === 'string') {
      step1.divorceReason = step1.divorceReason.trim();
    }
    if (typeof step1.divorceCertificateUrl === 'string') {
      step1.divorceCertificateUrl = step1.divorceCertificateUrl.trim();
    }
    if (typeof step1.dateOfSpouseDeath === 'string') {
      step1.dateOfSpouseDeath = step1.dateOfSpouseDeath.trim();
    }
    if (typeof step1.deathCertificateUrl === 'string') {
      step1.deathCertificateUrl = step1.deathCertificateUrl.trim();
    }

    if (typeof step1.havingChildren !== 'undefined' && step1.havingChildren !== null && step1.havingChildren !== '') {
      if (typeof step1.havingChildren !== 'boolean') {
        if (step1.havingChildren === 'true' || step1.havingChildren === 'Yes') step1.havingChildren = true;
        else if (step1.havingChildren === 'false' || step1.havingChildren === 'No') step1.havingChildren = false;
        else throw new BadRequestException('Having children must be a boolean (Yes or No)');
      }
    }

    const sanitizeChildList = (list: any): any[] => {
      if (!Array.isArray(list)) return [];
      return list.map((child: any) => ({
        name: typeof child.name === 'string' ? child.name.trim() : '',
        age: Number(child.age) || 0,
        maritalStatus: typeof child.maritalStatus === 'string' ? child.maritalStatus.trim() : undefined,
      }));
    };

    if (step1.havingChildren) {
      step1.sons = sanitizeChildList(step1.sons);
      step1.daughters = sanitizeChildList(step1.daughters);
    } else {
      step1.sons = [];
      step1.daughters = [];
    }
  }

  // Current Living Address
  if (typeof step1.currentCountry === 'string') step1.currentCountry = step1.currentCountry.trim();
  if (typeof step1.currentState === 'string') step1.currentState = step1.currentState.trim();
  if (typeof step1.currentDistrict === 'string') step1.currentDistrict = step1.currentDistrict.trim();
  if (typeof step1.currentCity === 'string') step1.currentCity = step1.currentCity.trim();
  if (typeof step1.currentVillage === 'string') step1.currentVillage = step1.currentVillage.trim();
  if (typeof step1.currentAddress === 'string') step1.currentAddress = step1.currentAddress.trim();

  // Contact & Application Metadata
  if (typeof step1.alternateMobile === 'string') {
    step1.alternateMobile = step1.alternateMobile.trim();
    if (step1.alternateMobile && !/^\+?[0-9]{10,15}$/.test(step1.alternateMobile.replace(/\s+/g, ''))) {
      throw new BadRequestException('Alternate mobile must be 10–15 digits');
    }
  }
  if (typeof step1.alternateEmail === 'string') {
    step1.alternateEmail = step1.alternateEmail.trim();
    if (step1.alternateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1.alternateEmail)) {
      throw new BadRequestException('Alternate email must be a valid email format');
    }
  }
  if (typeof step1.bestTimeToCall === 'string') step1.bestTimeToCall = step1.bestTimeToCall.trim();

  if (typeof step1.applicationFor === 'string') {
    step1.applicationFor = step1.applicationFor.trim();
  }
  if (typeof step1.fillerName === 'string') step1.fillerName = step1.fillerName.trim();
  if (typeof step1.fillerMobile === 'string') step1.fillerMobile = step1.fillerMobile.trim();
  if (typeof step1.fillerRelation === 'string') step1.fillerRelation = step1.fillerRelation.trim();
  if (typeof step1.source === 'string') step1.source = step1.source.trim();
  if (typeof step1.nearestBranch === 'string') step1.nearestBranch = step1.nearestBranch.trim();

  return step1;
}
