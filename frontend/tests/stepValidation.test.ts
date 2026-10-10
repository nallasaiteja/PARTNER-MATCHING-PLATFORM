import test from 'node:test';
import assert from 'node:assert/strict';

import { validateStep2 } from '../src/utils/stepValidation.ts';

test('validateStep2 requires student-specific fields when employedIn is Student', () => {
  const errors = validateStep2({
    education: 'B.Tech / B.E.',
    employedIn: 'Student',
    currentEducationPursuing: '',
    universityStudying: '',
    universityAddress: '',
    yearOfPursuing: '',
  } as any);

  assert.equal(errors.currentEducationPursuing, 'Course pursuing is required for students');
  assert.equal(errors.universityStudying, 'University / college name is required for students');
  assert.equal(errors.universityAddress, 'University address is required for students');
  assert.equal(errors.yearOfPursuing, 'Current year is required for students');
});

test('validateStep2 requires India work details for private/government/business employment', () => {
  const errors = validateStep2({
    education: 'MBA / PGDM',
    employedIn: 'Private',
    profession: '',
    designation: '',
    workingLocation: 'India',
    workingState: '',
    workingCity: '',
    workingLocationAddress: '',
    companyName: '',
    workingSince: '',
    totalExperience: '',
    annualIncome: '',
  } as any);

  assert.equal(errors.profession, 'Profession is required for employed candidates');
  assert.equal(errors.designation, 'Designation is required for employed candidates');
  assert.equal(errors.workingState, 'Working state is required when working in India');
  assert.equal(errors.workingCity, 'Working city is required when working in India');
  assert.equal(errors.workingLocationAddress, 'Working address is required when working in India');
  assert.equal(errors.companyName, 'Company name is required when working in India');
  assert.equal(errors.workingSince, 'Employment start date is required when working in India');
  assert.equal(errors.totalExperience, 'Total experience is required when working in India');
  assert.equal(errors.annualIncome, 'Annual income is required for employed candidates');
});

test('validateStep2 requires abroad work details for overseas employment', () => {
  const errors = validateStep2({
    education: 'M.Tech / M.E.',
    employedIn: 'Government',
    profession: 'Engineer',
    designation: 'Manager',
    workingLocation: 'Abroad',
    workCountry: '',
    workState: '',
    visaType: '',
    passportValidFrom: '',
    passportValidTill: '',
    abroadCompanyName: '',
    abroadCompanyAddress: '',
    annualIncome: '₹ 30L',
  } as any);

  assert.equal(errors.workCountry, 'Country is required when working abroad');
  assert.equal(errors.workState, 'State is required when working abroad');
  assert.equal(errors.visaType, 'Visa type is required when working abroad');
  assert.equal(errors.passportValidFrom, 'Passport valid from date is required when working abroad');
  assert.equal(errors.passportValidTill, 'Passport valid till date is required when working abroad');
  assert.equal(errors.abroadCompanyName, 'Company name is required when working abroad');
  assert.equal(errors.abroadCompanyAddress, 'Company address is required when working abroad');
});
