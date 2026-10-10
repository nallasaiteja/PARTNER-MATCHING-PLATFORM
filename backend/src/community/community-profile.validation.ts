import { BadRequestException } from '@nestjs/common';
import { CommunityMasterLevel } from '@prisma/client';

type CommunityRecord = {
  id: string;
  name: string;
  level: CommunityMasterLevel;
  parentId: string | null;
  isActive: boolean;
};

const COMMUNITY_OPTION_FIELDS: Array<{
  value: string;
  id: string;
  level: CommunityMasterLevel;
}> = [
  { value: 'star', id: 'starId', level: CommunityMasterLevel.STAR },
  { value: 'moonSign', id: 'moonSignId', level: CommunityMasterLevel.MOON_SIGN },
  { value: 'padam', id: 'padamId', level: CommunityMasterLevel.PADAM },
  { value: 'gothram', id: 'gothramId', level: CommunityMasterLevel.GOTHRAM },
];

function findOption(
  options: CommunityRecord[],
  level: CommunityMasterLevel,
  value: unknown,
  id: unknown,
  parentId: string | null,
) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  if (typeof id !== 'string' || !id) return undefined;
  return options.find((option) =>
    option.isActive &&
    option.id === id &&
    option.level === level &&
    option.parentId === parentId &&
    option.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
  );
}

export function validateAndSanitizeStep1Community(
  source: Record<string, any>,
  options: CommunityRecord[],
): Record<string, any> {
  const step1 = { ...source };
  const religionName = typeof step1.religion === 'string' ? step1.religion.trim() : '';
  const casteName = typeof step1.caste === 'string' ? step1.caste.trim() : '';
  if (!religionName) throw new BadRequestException('Religion is required');
  if (!casteName) throw new BadRequestException('Caste is required');

  const religion = findOption(options, CommunityMasterLevel.RELIGION, religionName, step1.religionId, null);
  if (!religion) throw new BadRequestException('Select a valid religion');
  step1.religionId = religion.id;
  step1.religion = religion.name;

  const caste = findOption(options, CommunityMasterLevel.CASTE, casteName, step1.casteId, religion.id);
  if (!caste) throw new BadRequestException('Caste must belong to the selected religion');
  step1.casteId = caste.id;
  step1.caste = caste.name;

  if (typeof step1.casteConverted !== 'undefined' && typeof step1.casteConverted !== 'boolean') {
    throw new BadRequestException('Caste Converted must be Yes or No');
  }

  if (step1.subCaste || step1.subCasteId) {
    const subCaste = findOption(
      options,
      CommunityMasterLevel.SUB_CASTE,
      step1.subCaste,
      step1.subCasteId,
      caste.id,
    );
    if (!subCaste) throw new BadRequestException('Sub-caste must belong to the selected caste');
    step1.subCaste = subCaste.name;
    step1.subCasteId = subCaste.id;
  } else {
    step1.subCaste = '';
    step1.subCasteId = '';
  }

  if (religion.name.toLocaleLowerCase() !== 'hindu') {
    for (const field of COMMUNITY_OPTION_FIELDS) {
      step1[field.value] = '';
      step1[field.id] = '';
    }
    step1.kujaDosham = '';
    step1.uncleGothram = '';
    step1.swagothram = '';
    return step1;
  }

  for (const field of COMMUNITY_OPTION_FIELDS) {
    const value = step1[field.value];
    const id = step1[field.id];
    if (value || id) {
      const option = findOption(options, field.level, value, id, null);
      if (!option) throw new BadRequestException(`${field.value} must be selected from the Hindu master options`);
      step1[field.value] = option.name;
      step1[field.id] = option.id;
    } else {
      step1[field.value] = '';
      step1[field.id] = '';
    }
  }

  if (step1.kujaDosham && !['Yes', 'No', "Don't Know"].includes(step1.kujaDosham)) {
    throw new BadRequestException('Kuja Dosham must be Yes, No, or Don\'t Know');
  }

  if (caste.name.toLocaleLowerCase() !== 'arya vysya') {
    step1.uncleGothram = '';
    step1.swagothram = '';
  }

  return step1;
}