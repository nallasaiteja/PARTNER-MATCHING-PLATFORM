export interface HeightOption {
  label: string;
  value: string;
  cm: number;
}

export const HEIGHT_OPTIONS: HeightOption[] = [
  { label: `4'5" (134 cm)`, value: `4'5" (134 cm)`, cm: 134 },
  { label: `4'6" (137 cm)`, value: `4'6" (137 cm)`, cm: 137 },
  { label: `4'7" (139 cm)`, value: `4'7" (139 cm)`, cm: 139 },
  { label: `4'8" (142 cm)`, value: `4'8" (142 cm)`, cm: 142 },
  { label: `4'9" (144 cm)`, value: `4'9" (144 cm)`, cm: 144 },
  { label: `4'10" (147 cm)`, value: `4'10" (147 cm)`, cm: 147 },
  { label: `4'11" (149 cm)`, value: `4'11" (149 cm)`, cm: 149 },
  { label: `5'0" (152 cm)`, value: `5'0" (152 cm)`, cm: 152 },
  { label: `5'1" (154 cm)`, value: `5'1" (154 cm)`, cm: 154 },
  { label: `5'2" (157 cm)`, value: `5'2" (157 cm)`, cm: 157 },
  { label: `5'3" (160 cm)`, value: `5'3" (160 cm)`, cm: 160 },
  { label: `5'4" (162 cm)`, value: `5'4" (162 cm)`, cm: 162 },
  { label: `5'5" (165 cm)`, value: `5'5" (165 cm)`, cm: 165 },
  { label: `5'6" (167 cm)`, value: `5'6" (167 cm)`, cm: 167 },
  { label: `5'7" (170 cm)`, value: `5'7" (170 cm)`, cm: 170 },
  { label: `5'8" (172 cm)`, value: `5'8" (172 cm)`, cm: 172 },
  { label: `5'9" (175 cm)`, value: `5'9" (175 cm)`, cm: 175 },
  { label: `5'10" (177 cm)`, value: `5'10" (177 cm)`, cm: 177 },
  { label: `5'11" (180 cm)`, value: `5'11" (180 cm)`, cm: 180 },
  { label: `6'0" (182 cm)`, value: `6'0" (182 cm)`, cm: 182 },
  { label: `6'1" (185 cm)`, value: `6'1" (185 cm)`, cm: 185 },
  { label: `6'2" (187 cm)`, value: `6'2" (187 cm)`, cm: 187 },
  { label: `6'3" (190 cm)`, value: `6'3" (190 cm)`, cm: 190 },
  { label: `6'4" (193 cm)`, value: `6'4" (193 cm)`, cm: 193 },
  { label: `6'5" (195 cm)`, value: `6'5" (195 cm)`, cm: 195 },
  { label: `6'6" (198 cm)`, value: `6'6" (198 cm)`, cm: 198 },
  { label: `6'7" (200 cm)`, value: `6'7" (200 cm)`, cm: 200 },
  { label: `6'8" (203 cm)`, value: `6'8" (203 cm)`, cm: 203 },
  { label: `6'9" (205 cm)`, value: `6'9" (205 cm)`, cm: 205 },
  { label: `6'10" (208 cm)`, value: `6'10" (208 cm)`, cm: 208 },
  { label: `6'11" (210 cm)`, value: `6'11" (210 cm)`, cm: 210 },
  { label: `7'0" (213 cm)`, value: `7'0" (213 cm)`, cm: 213 },
];

export const BLOOD_GROUP_OPTIONS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export const MOTHER_TONGUE_OPTIONS = [
  'Telugu',
  'Kannada',
  'Tamil',
  'Odia',
  'English',
  'Hindi',
  'Urdu',
] as const;

export const COMPLEXION_OPTIONS = [
  'Fair',
  'Very Fair',
  'Medium',
  'Brown',
  'Dark',
] as const;

export const MARITAL_STATUS_OPTIONS = [
  'Unmarried',
  'Widower',
  'Divorced',
  'Waiting for Divorce',
  'No Divorce',
] as const;

export const FOOD_PREFERENCE_OPTIONS = [
  'Vegetarian',
  'Non-Vegetarian',
  'Eggetarian',
  'Not Particular',
] as const;

export const HOBBY_SUGGESTIONS = [
  'Reading',
  'Music',
  'Traveling',
  'Cooking',
  'Fitness & Gym',
  'Photography',
  'Gardening',
  'Art & Painting',
  'Movies / Cinema',
  'Writing',
  'Sports',
  'Gaming',
] as const;

export const SPOKEN_LANGUAGE_OPTIONS = [
  'Telugu',
  'English',
  'Hindi',
  'Tamil',
  'Kannada',
  'Odia',
  'Urdu',
  'Marathi',
  'Malayalam',
  'Gujarati',
  'Bengali',
] as const;

export const APPLICATION_FOR_OPTIONS = [
  'Myself',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Relative',
  'Friend',
] as const;

export const BEST_TIME_TO_CALL_OPTIONS = [
  'Anytime',
  'Morning (9 AM - 12 PM)',
  'Afternoon (12 PM - 4 PM)',
  'Evening (4 PM - 8 PM)',
  'Weekends Only',
] as const;

export const SOURCE_OPTIONS = [
  'Online Search / Google',
  'Social Media (Facebook / Instagram)',
  'Newspaper / Print Ad',
  'TV / Media',
  'Agent / Field Staff',
  'Friend / Relative Referral',
  'Branch Walk-in',
  'Other',
] as const;

export const CHILD_MARITAL_STATUS_OPTIONS = [
  'Unmarried',
  'Married',
  'Divorced',
  'Widower',
] as const;

