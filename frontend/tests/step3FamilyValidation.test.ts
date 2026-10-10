import test from 'node:test';
import assert from 'node:assert/strict';

import { validateStep3 } from '../src/utils/stepValidation.ts';

test('validateStep3 requires father and mother details and alive conditional fields', () => {
  const errors = validateStep3({
    fatherName: '',
    fatherStatus: 'Alive',
    fatherReligion: '',
    fatherCaste: '',
    fatherHealthCondition: '',
    fatherMobile: '',
    fatherEmployment: '',
    fatherProfession: '',
    fatherAnnualIncome: '',
    fatherDesignation: '',
    fatherAddress: '',
    fatherProperty: '',
    fatherPension: '',
    motherName: '',
    motherStatus: 'Alive',
    motherReligion: '',
    motherCaste: '',
    motherHealthCondition: '',
    motherWorkingSector: '',
    motherMobile: '',
    motherEmployment: '',
    motherProfession: '',
    motherAnnualIncome: '',
    motherDesignation: '',
    motherAddress: '',
    motherProperty: '',
    motherPension: '',
    familyPermanentAddress: '',
    familyPresentAddress: '',
    numberOfBrothers: 0,
    numberOfSisters: 0,
    familyStatus: 'Middle Class',
    familyType: 'Nuclear Family',
  } as any);

  assert.equal(errors.fatherName, "Father's name is required");
  assert.equal(errors.fatherReligion, 'Father religion is required');
  assert.equal(errors.fatherCaste, 'Father caste is required');
  assert.equal(errors.fatherHealthCondition, 'Father health condition is required');
  assert.equal(errors.fatherMobile, 'Father mobile number is required');
  assert.equal(errors.fatherEmployment, 'Father employment status is required');
  assert.equal(errors.fatherProfession, 'Father profession is required');
  assert.equal(errors.fatherAnnualIncome, 'Father annual income is required');
  assert.equal(errors.fatherDesignation, 'Father designation is required');
  assert.equal(errors.fatherAddress, 'Father address is required');
  assert.equal(errors.fatherProperty, 'Father property details are required');
  assert.equal(errors.fatherPension, 'Father pension details are required');

  assert.equal(errors.motherName, "Mother's name is required");
  assert.equal(errors.motherReligion, 'Mother religion is required');
  assert.equal(errors.motherCaste, 'Mother caste is required');
  assert.equal(errors.motherHealthCondition, 'Mother health condition is required');
  assert.equal(errors.motherWorkingSector, 'Mother working sector is required');
  assert.equal(errors.motherMobile, 'Mother mobile number is required');
  assert.equal(errors.motherEmployment, 'Mother employment status is required');
  assert.equal(errors.motherProfession, 'Mother profession is required');
  assert.equal(errors.motherAnnualIncome, 'Mother annual income is required');
  assert.equal(errors.motherDesignation, 'Mother designation is required');
  assert.equal(errors.motherAddress, 'Mother address is required');
  assert.equal(errors.motherProperty, 'Mother property details are required');
  assert.equal(errors.motherPension, 'Mother pension details are required');

  assert.equal(errors.familyPermanentAddress, 'Permanent family address is required');
  assert.equal(errors.familyPresentAddress, 'Present family address is required');
});

test('validateStep3 allows late parent sections without alive-only fields', () => {
  const errors = validateStep3({
    fatherName: 'K. Rao',
    fatherStatus: 'Late',
    motherName: 'Saroja',
    motherStatus: 'Late',
    familyPermanentAddress: 'Hyderabad',
    familyPresentAddress: 'Hyderabad',
    numberOfBrothers: 1,
    numberOfSisters: 1,
    familyStatus: 'Middle Class',
    familyType: 'Joint Family',
  } as any);

  assert.deepEqual(errors, {});
});
