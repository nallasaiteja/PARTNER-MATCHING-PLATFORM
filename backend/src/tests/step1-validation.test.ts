import { validateStep1 } from '../../../frontend/src/utils/stepValidation';

const run = () => {
  const result = validateStep1({
    firstName: 'Ramesh',
    lastName: 'Kolisetty',
    gender: 'Male',
    mobile: '+919876543210',
    email: 'ramesh@example.com',
    dateOfBirth: '2000-01-01',
    idProofType: '',
    idProofNumber: '',
    photoUrl: '',
    idProofFileUrl: '',
  } as any);

  if (!result.idProofType) {
    throw new Error('Expected ID proof type validation error');
  }

  if (!result.idProofNumber) {
    throw new Error('Expected ID proof number validation error');
  }

  if (!result.photoUrl) {
    throw new Error('Expected photo upload validation error');
  }

  if (!result.idProofFileUrl) {
    throw new Error('Expected ID proof file validation error');
  }

  if (!result.height) {
    throw new Error('Expected height validation error');
  }

  if (!result.maritalStatus) {
    throw new Error('Expected marital status validation error');
  }

  console.log('✅ Step 1 validation rules are enforced (including physical and lifestyle)');
};

run();
