import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsIn,
  IsEmail,
  Matches,
  Length,
  MinLength,
  IsInt,
  Min,
  Max,
  IsArray,
  IsBoolean,
  ArrayUnique,
} from 'class-validator';

// ---------------------------------------------------------------------------
// CREATE (minimal — mobile, name, gender, DOB required at creation time)
// ---------------------------------------------------------------------------
export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Mobile must be a valid phone number (10–15 digits)' })
  mobile: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsIn(['Male', 'Female'], { message: 'Gender must be Male or Female' })
  gender: string;

  @IsDateString({}, { message: 'Date of birth must be a valid date (YYYY-MM-DD)' })
  dateOfBirth: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  currentStep?: number;

  @IsOptional()
  @IsArray()
  completedSteps?: number[];

  @IsOptional()
  @IsString()
  idProofType?: string;

  @IsOptional()
  @IsString()
  idProofNumber?: string;

  @IsOptional()
  @IsString()
  timeOfBirth?: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  idProofFileUrl?: string;

  @IsOptional()
  profileData?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// STEP 1 — Photo & Core Identity
// ---------------------------------------------------------------------------
export class SaveStep1Dto {
  // Core Identity
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Surname is required' })
  lastName: string;

  @IsIn(['Male', 'Female'], { message: 'Gender must be Male or Female' })
  gender: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Mobile must be 10–15 digits, optionally starting with +',
  })
  mobile: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'ID proof type is required' })
  idProofType: string;

  @IsString()
  @IsNotEmpty({ message: 'ID proof number is required' })
  @MinLength(4, { message: 'ID proof number must be at least 4 characters' })
  idProofNumber: string;

  @IsDateString({}, { message: 'Date of birth must be a valid date' })
  dateOfBirth: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time of birth must be in HH:MM format' })
  timeOfBirth?: string; // Optional HH:MM

  @IsOptional()
  @IsString()
  birthPlace?: string;

  // These are set by file upload separately but can be re-confirmed
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  idProofFileUrl?: string;

  // Physical & Lifestyle Details
  @IsString()
  @IsNotEmpty({ message: 'Height is required' })
  height: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  motherTongue?: string;

  @IsOptional()
  @IsString()
  healthCondition?: string;

  @IsOptional()
  @IsString()
  complexion?: string;

  @IsString()
  @IsNotEmpty({ message: 'Marital status is required' })
  maritalStatus: string;

  @IsOptional()
  @IsBoolean()
  smoke?: boolean;

  @IsOptional()
  @IsBoolean()
  drink?: boolean;

  @IsOptional()
  @IsString()
  foodPreference?: string;

  @IsOptional()
  @IsString()
  aboutMe?: string;

  @IsOptional()
  @IsString()
  hobbies?: string;

  @IsOptional()
  @IsArray()
  spokenLanguages?: string[];

  // Marital History
  @IsOptional()
  @IsString()
  dateOfMarriage?: string;

  @IsOptional()
  @IsString()
  dateOfDivorce?: string;

  @IsOptional()
  @IsString()
  divorceReason?: string;

  @IsOptional()
  @IsString()
  divorceCertificateUrl?: string;

  @IsOptional()
  @IsString()
  dateOfSpouseDeath?: string;

  @IsOptional()
  @IsString()
  deathCertificateUrl?: string;

  @IsOptional()
  @IsBoolean()
  havingChildren?: boolean;

  @IsOptional()
  @IsArray()
  sons?: any[];

  @IsOptional()
  @IsArray()
  daughters?: any[];

  // Current Living Address
  @IsOptional()
  @IsString()
  currentCountry?: string;

  @IsOptional()
  @IsString()
  currentState?: string;

  @IsOptional()
  @IsString()
  currentDistrict?: string;

  @IsOptional()
  @IsString()
  currentCity?: string;

  @IsOptional()
  @IsString()
  currentVillage?: string;

  @IsOptional()
  @IsString()
  currentAddress?: string;

  // Contact & Application Meta
  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @IsOptional()
  @IsEmail()
  alternateEmail?: string;

  @IsOptional()
  @IsString()
  bestTimeToCall?: string;

  @IsOptional()
  @IsString()
  applicationFor?: string;

  @IsOptional()
  @IsString()
  fillerName?: string;

  @IsOptional()
  @IsString()
  fillerMobile?: string;

  @IsOptional()
  @IsString()
  fillerRelation?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  nearestBranch?: string;
}

// ---------------------------------------------------------------------------
// STEP 2 — Education & Professional Details
// ---------------------------------------------------------------------------
export class SaveStep2Dto {
  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  employedIn?: string;

  @IsOptional()
  @IsString()
  currentEducationPursuing?: string;

  @IsOptional()
  @IsString()
  universityStudying?: string;

  @IsOptional()
  @IsString()
  universityAddress?: string;

  @IsOptional()
  @IsString()
  yearOfPursuing?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  workingLocation?: string;

  @IsOptional()
  @IsString()
  workingState?: string;

  @IsOptional()
  @IsString()
  workingCity?: string;

  @IsOptional()
  @IsString()
  workingLocationAddress?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  workingSince?: string;

  @IsOptional()
  @IsString()
  totalExperience?: string;

  @IsOptional()
  @IsString()
  annualIncome?: string;

  @IsOptional()
  @IsString()
  propertyDetails?: string;

  @IsOptional()
  @IsString()
  colleagueName?: string;

  @IsOptional()
  @IsString()
  colleagueMobile?: string;

  @IsOptional()
  profileData?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// STEP 3 — Family Details (shell DTO)
// ---------------------------------------------------------------------------
export class SaveStep3Dto {
  @IsOptional()
  profileData?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// STEP 4 — Partner Preferences (shell DTO)
// ---------------------------------------------------------------------------
export class SaveStep4Dto {
  @IsOptional()
  profileData?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// STEP 5 — Verification & Settings (shell DTO)
// ---------------------------------------------------------------------------
export class SaveStep5Dto {
  @IsOptional()
  profileData?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// UPDATE (general patch)
// ---------------------------------------------------------------------------
export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Mobile must be 10–15 digits, optionally starting with +' })
  mobile?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @IsIn(['Male', 'Female'], { message: 'Gender must be Male or Female' })
  @IsOptional()
  gender?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  currentStep?: number;

  @IsOptional()
  @IsArray()
  completedSteps?: number[];

  @IsOptional()
  @IsString()
  idProofType?: string;

  @IsOptional()
  @IsString()
  idProofNumber?: string;

  @IsOptional()
  @IsString()
  timeOfBirth?: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  idProofFileUrl?: string;

  @IsOptional()
  profileData?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// BLOCK
// ---------------------------------------------------------------------------
export class BlockProfileDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class VerifyIdProofDto {
  @IsBoolean()
  verified: boolean;
}

export class ContactRevealPackagesDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(['PAID'], { each: true })
  packageTypes: string[];
}
