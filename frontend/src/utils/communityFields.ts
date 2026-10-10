import type { Step1Data } from '../types/profile';

export function isHinduReligion(religion?: string): boolean {
  return religion?.trim().toLocaleLowerCase() === 'hindu';
}

export function isAryaVysyaCaste(religion?: string, caste?: string): boolean {
  return isHinduReligion(religion) && caste?.trim().toLocaleLowerCase() === 'arya vysya';
}

export function religionChangeFields(): Array<keyof Step1Data> {
  return [
    'caste', 'casteId', 'subCaste', 'subCasteId',
    'star', 'starId', 'moonSign', 'moonSignId', 'padam', 'padamId',
    'gothram', 'gothramId', 'kujaDosham', 'uncleGothram', 'swagothram',
  ];
}

export function casteChangeFields(): Array<keyof Step1Data> {
  return ['subCaste', 'subCasteId', 'uncleGothram', 'swagothram'];
}

export function hiddenCommunityFields(religion?: string, caste?: string): Array<keyof Step1Data> {
  const fields: Array<keyof Step1Data> = [];
  if (!isHinduReligion(religion)) {
    fields.push(
      'star', 'starId', 'moonSign', 'moonSignId', 'padam', 'padamId',
      'gothram', 'gothramId', 'kujaDosham', 'uncleGothram', 'swagothram',
    );
  } else if (!isAryaVysyaCaste(religion, caste)) {
    fields.push('uncleGothram', 'swagothram');
  }
  return fields;
}