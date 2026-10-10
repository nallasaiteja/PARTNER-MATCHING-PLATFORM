import assert from 'node:assert/strict';
import test from 'node:test';
import { validateStep1 } from '../src/utils/stepValidation.ts';

const baseValidStep1 = {
  firstName: 'Ramesh',
  lastName: 'Kolisetty',
  gender: 'Male',
  mobile: '+919876543210',
  email: 'ramesh@example.com',
  dateOfBirth: '2000-01-01',
  idProofType: 'Aadhar Card',
  idProofNumber: '1234 5678 9012',
  photoUrl: 'http://localhost/photo.jpg',
  idProofFileUrl: 'http://localhost/id.pdf',
  country: 'India',
  state: 'Andhra Pradesh',
  religion: 'Hindu',
  caste: 'Arya Vysya',
  height: `5'8" (172 cm)`,
  maritalStatus: 'Unmarried',
};

test('Step 1 requires height and marital status', () => {
  const result = validateStep1({
    ...baseValidStep1,
    height: '',
    maritalStatus: '',
  } as any);

  assert.equal(result.height, 'Height is required');
  assert.equal(result.maritalStatus, 'Marital status is required');
});

test('Step 1 validates marital status allowed values', () => {
  const invalidResult = validateStep1({
    ...baseValidStep1,
    maritalStatus: 'Single',
  } as any);
  assert.equal(invalidResult.maritalStatus, 'Select a valid marital status');

  const validStatuses = [
    'Unmarried',
    'Widower',
    'Divorced',
    'Waiting for Divorce',
    'No Divorce',
  ];
  for (const status of validStatuses) {
    const validResult = validateStep1({
      ...baseValidStep1,
      maritalStatus: status,
    } as any);
    assert.equal(validResult.maritalStatus, undefined);
  }
});

test('Step 1 validates mother tongue, complexion, and food preferences against exact specs', () => {
  const invalidResult = validateStep1({
    ...baseValidStep1,
    motherTongue: 'French',
    complexion: 'Pale',
    foodPreference: 'Vegan',
    bloodGroup: 'Z+',
  } as any);

  assert.equal(invalidResult.motherTongue, 'Select a valid mother tongue');
  assert.equal(invalidResult.complexion, 'Select a valid complexion');
  assert.equal(invalidResult.foodPreference, 'Select a valid food preference');
  assert.equal(invalidResult.bloodGroup, 'Select a valid blood group');

  const validResult = validateStep1({
    ...baseValidStep1,
    motherTongue: 'Telugu',
    complexion: 'Medium',
    foodPreference: 'Vegetarian',
    bloodGroup: 'O+',
    smoke: false,
    drink: false,
    healthCondition: 'None',
    aboutMe: 'Looking for an understanding partner.',
    hobbies: 'Reading, Music',
    spokenLanguages: ['Telugu', 'English', 'Hindi'],
  } as any);

  assert.equal(validResult.motherTongue, undefined);
  assert.equal(validResult.complexion, undefined);
  assert.equal(validResult.foodPreference, undefined);
  assert.equal(validResult.bloodGroup, undefined);
  assert.equal(Object.keys(validResult).length, 0);
});

test('Step 1 validates children details when havingChildren is true', () => {
  const resultNoChildren = validateStep1({
    ...baseValidStep1,
    maritalStatus: 'Divorced',
    havingChildren: true,
    sons: [],
    daughters: [],
  } as any);
  assert.ok(resultNoChildren.havingChildren);

  const resultAdultChildMissingMarital = validateStep1({
    ...baseValidStep1,
    maritalStatus: 'Divorced',
    havingChildren: true,
    sons: [{ name: 'Karthik', age: 22, maritalStatus: '' }],
  } as any);
  assert.ok(resultAdultChildMissingMarital.son_0_maritalStatus);

  const resultValidChildren = validateStep1({
    ...baseValidStep1,
    maritalStatus: 'Divorced',
    havingChildren: true,
    sons: [{ name: 'Karthik', age: 22, maritalStatus: 'Unmarried' }],
    daughters: [{ name: 'Ananya', age: 12 }],
  } as any);
  assert.equal(resultValidChildren.havingChildren, undefined);
  assert.equal(resultValidChildren.son_0_maritalStatus, undefined);
  assert.equal(resultValidChildren.daughter_0_name, undefined);
});

test('Step 1 validates applicationFor filler details and alternate contacts', () => {
  const missingFiller = validateStep1({
    ...baseValidStep1,
    applicationFor: 'Son',
    fillerName: '',
    fillerMobile: '',
  } as any);
  assert.ok(missingFiller.fillerName);
  assert.ok(missingFiller.fillerMobile);

  const invalidFillerMobile = validateStep1({
    ...baseValidStep1,
    applicationFor: 'Son',
    fillerName: 'Srinivas',
    fillerMobile: '1234',
  } as any);
  assert.ok(invalidFillerMobile.fillerMobile);

  const invalidAlternate = validateStep1({
    ...baseValidStep1,
    alternateMobile: 'bad-phone',
    alternateEmail: 'bad-email',
  } as any);
  assert.ok(invalidAlternate.alternateMobile);
  assert.ok(invalidAlternate.alternateEmail);

  const validFiller = validateStep1({
    ...baseValidStep1,
    applicationFor: 'Son',
    fillerName: 'Srinivas',
    fillerMobile: '9876543210',
    alternateMobile: '+919123456789',
    alternateEmail: 'srinivas@example.com',
  } as any);
  assert.equal(validFiller.fillerName, undefined);
  assert.equal(validFiller.fillerMobile, undefined);
  assert.equal(validFiller.alternateMobile, undefined);
  assert.equal(validFiller.alternateEmail, undefined);
});

