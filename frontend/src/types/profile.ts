/**
 * SECTION 3 — MEMBER PROFILE DATA ENTRY (5-STEP FORM)
 * Complete type definitions per specification
 */

export type StepNumber = 1 | 2 | 3 | 4 | 5;

export interface StepMetadata {
  number: StepNumber;
  title: string;
  subtitle: string;
  shortTitle: string;
  description: string;
}

export const STEP_DEFINITIONS: StepMetadata[] = [
  {
    number: 1,
    title: 'Personal Details',
    subtitle: 'Identity, photo, address, and lifestyle',
    shortTitle: 'Personal',
    description: 'Core personal identity, photo, birth details, religion, and lifestyle background.',
  },
  {
    number: 2,
    title: 'Education & Professional Details',
    subtitle: 'Qualifications, career, and income',
    shortTitle: 'Education & Career',
    description: 'Educational background, employment sector, designation, and income details.',
  },
  {
    number: 3,
    title: 'Family Details',
    subtitle: 'Parents, siblings, and family values',
    shortTitle: 'Family',
    description: 'Parents background, living status, siblings, and family structure.',
  },
  {
    number: 4,
    title: 'Partner Preferences',
    subtitle: 'Criteria and partner expectations',
    shortTitle: 'Preferences',
    description: 'Desired partner age, height, education, profession, location, and lifestyle.',
  },
  {
    number: 5,
    title: 'Verification & Settings',
    subtitle: 'ID proof, privacy, and account setup',
    shortTitle: 'Verification',
    description: 'Contact verification, ID document verification, privacy, and communication preferences.',
  },
];

// ─── Child / Sibling Data Types ────────────────────────────────────────────

export interface ChildRecord {
  name: string;
  age: number;
  maritalStatus?: string; // only if age >= 18
}

export interface SiblingRecord {
  name: string;
  age: number;
  maritalStatus: string;
  relation: 'Elder' | 'Younger';
}

// ─── Step 1 — Personal Details ─────────────────────────────────────────────

export interface Step1Data {
  // Photo
  photoUrl?: string;

  // Core Identity (IMMUTABLE once set)
  firstName: string;
  lastName: string;
  gender: string; // 'Male' | 'Female'
  mobile: string;
  email: string;
  dateOfBirth: string; // YYYY-MM-DD (IMMUTABLE)
  timeOfBirth?: string;
  birthPlace?: string;

  // Identity Proof
  idProofType?: string;
  idProofNumber?: string;
  idProofFileUrl?: string;

  // Native Address (for matching/filtering)
  country?: string;
  state?: string;
  district?: string;
  mandal?: string;
  village?: string;

  // Religion & Community (IMMUTABLE)
  religion?: string;
  caste?: string;         // filtered by religion
  subCaste?: string;
  casteConverted?: boolean;
  // Hindu-only fields
  star?: string;
  moonSign?: string;    // Raasi
  padam?: string;
  gothram?: string;
  uncleGothram?: string;   // Arya Vysya only
  swagothram?: string;     // Arya Vysya only
  kujaDosham?: 'Yes' | 'No' | "Don't Know";

  // Physical & Lifestyle
  height?: string;        // Required
  bloodGroup?: string;
  motherTongue?: string;
  healthCondition?: string;
  complexion?: string;
  maritalStatus?: string; // Required
  smoke?: boolean;
  drink?: boolean;
  foodPreference?: string;
  aboutMe?: string;
  hobbies?: string;
  spokenLanguages?: string[];

  // Marital History (conditional on maritalStatus)
  dateOfMarriage?: string;
  dateOfDivorce?: string;
  divorceReason?: string;
  divorceCertificateUrl?: string;
  dateOfSpouseDeath?: string;
  deathCertificateUrl?: string;
  havingChildren?: boolean;
  sons?: ChildRecord[];
  daughters?: ChildRecord[];

  // Current Living Address
  currentCountry?: string;
  currentState?: string;
  currentDistrict?: string;
  currentCity?: string;
  currentVillage?: string;
  currentAddress?: string;

  // Contact & Application Meta
  alternateMobile?: string;
  alternateEmail?: string;
  bestTimeToCall?: string;
  applicationFor?: string; // 'Myself' | 'Friend' | 'Relative' | 'Son' | 'Daughter'
  fillerName?: string;
  fillerMobile?: string;
  fillerRelation?: string;
  source?: string;          // Admin-configurable
  nearestBranch?: string;   // Admin-configurable
}

// ─── Step 2 — Education & Professional Details ─────────────────────────────

export interface Step2Data {
  education: string;            // Required — Admin-configurable
  competitiveExams?: string[];  // Multi-select — Admin-configurable
  university?: string;          // Admin-configurable

  employedIn: string; // 'Private' | 'Government' | 'Unemployed' | 'Student' | 'Business'

  // If Student
  currentEducationPursuing?: string;
  universityStudying?: string;
  universityAddress?: string;
  yearOfPursuing?: string;

  // If Private/Government/Business
  profession?: string;        // Admin-configurable — Required
  designation?: string;       // Admin-configurable — Required
  workingLocation?: 'India' | 'Abroad';

  // If working in India
  workingState?: string;
  workingCity?: string;
  workingLocationAddress?: string;
  companyName?: string;
  workingSince?: string;
  totalExperience?: string;
  passportNumber?: string;

  // If working Abroad
  workCountry?: string;
  workState?: string;
  visaType?: string;          // Admin-configurable
  abroadPassportNumber?: string;
  passportValidFrom?: string;
  passportValidTill?: string;
  abroadCompanyName?: string;
  abroadCompanyAddress?: string;

  // General
  propertyDetails?: string;
  annualIncome?: string;      // Required if employed; any currency
  colleagueName?: string;
  colleagueMobile?: string;
}

// ─── Step 3 — Family Details ───────────────────────────────────────────────

export interface Step3Data {
  // Father
  fatherName: string;
  fatherReligion?: string;
  fatherCaste?: string;
  fatherCasteConverted?: boolean;
  fatherStatus: 'Alive' | 'Late';
  // If Alive
  fatherHealthCondition?: string;
  fatherMobile?: string;
  fatherEmployment?: string;
  fatherProfession?: string;
  fatherAnnualIncome?: string;
  fatherDesignation?: string;
  fatherAddress?: string;
  fatherProperty?: string;
  fatherPension?: string;

  // Mother
  motherName: string;
  motherMaidenName?: string;
  motherReligion?: string;
  motherCaste?: string;
  motherCasteConverted?: boolean;
  motherStatus: 'Alive' | 'Late';
  // If Alive
  motherHealthCondition?: string;
  motherWorkingSector?: string;
  motherMobile?: string;
  motherEmployment?: string; // 'Employment' | 'Housewife'
  motherProfession?: string;
  motherAnnualIncome?: string;
  motherDesignation?: string;
  motherAddress?: string;
  motherProperty?: string;
  motherPension?: string;

  // Family Address
  familyPermanentAddress?: string;
  familyPresentAddress?: string;

  // Siblings
  numberOfBrothers: number;
  brothers?: SiblingRecord[];
  numberOfSisters: number;
  sisters?: SiblingRecord[];

  // Reference
  referenceName?: string;
  referenceMobile?: string;
  referenceRelation?: string;
  referenceAddress?: string;

  // Family Classification
  familyStatus: 'Rich' | 'Middle Class' | 'Average';
  familyType: 'Nuclear Family' | 'Joint Family';
}

// ─── Step 4 — Partner Preferences ─────────────────────────────────────────

export interface Step4Data {
  preferredMaritalStatus: string[];      // Multi-select
  ageRangeMin: number;
  ageRangeMax: number;
  heightRangeMin: string;
  heightRangeMax: string;
  preferredFamilyStatus?: string[];      // Multi-select
  interCasteAllowed?: boolean;
  preferredCastes?: string[];
  kujaDoshamPreference?: 'Yes' | 'No' | 'Any';
  preferredComplexion?: string[];
  smokePreference?: boolean;
  drinkPreference?: boolean;
  preferredEducation?: string[];         // Multi-select
  preferredProfession?: string[];        // Multi-select
  preferredCitiesOfWork?: string[];      // Multi-select
  passportHolderPreference?: boolean;
  preferredWorkingLocation?: 'India' | 'Abroad' | 'Any';
  preferredCountriesAbroad?: string[];   // If Abroad
  paymentInterestDate?: string;
}

// ─── Step 5 — Verification & Settings ─────────────────────────────────────

export interface Step5Data {
  mobileVerified: boolean;
  emailVerified: boolean;
  idProofUploaded: boolean;
  idProofVerified: boolean;
  willingToTakePackage?: boolean;
  paymentInterestDate?: string;
  mobileRevelationPreference: '0 Hours' | '24 Hours' | '72 Hours' | 'Acceptance Preference';
}

// ─── Master Form Data ──────────────────────────────────────────────────────

export interface MemberProfileFormData {
  id?: string;
  memberId?: string;
  userId?: string;
  currentStep: StepNumber;
  completedSteps: StepNumber[];
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
  step5: Step5Data;
  createdAt?: string;
  updatedAt?: string;
}

export type StepValidationErrors = Record<string, string>;

export interface SaveStatusState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
  errorMessage?: string;
}
