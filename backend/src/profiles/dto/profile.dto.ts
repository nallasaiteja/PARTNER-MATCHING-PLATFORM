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
} from 'class-validator';

// ---------------------------------------------------------------------------
// CREATE (minimal — mobile, name, gender, DOB required at creation time)
// ---------------------------------------------------------------------------
export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Mobile must be a valid phone number (10–15 digits)' })
  mobile: string;

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
}

// ---------------------------------------------------------------------------
// STEP 2 — Education & Professional (shell DTO)
// ---------------------------------------------------------------------------
export class SaveStep2Dto {
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
