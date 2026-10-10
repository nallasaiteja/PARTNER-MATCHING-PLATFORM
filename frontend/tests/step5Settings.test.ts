import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStep5 } from '../src/utils/stepValidation.ts';

test('Step 5 accepts each PDF mobile-revelation option', () => {
  for (const preference of ['0 Hours', '24 Hours', '72 Hours', 'Acceptance Preference']) {
    assert.deepEqual(validateStep5({ mobileRevelationPreference: preference } as any), {});
  }
});

test('Step 5 rejects unsupported revelation values and malformed profile payment dates', () => {
  const errors = validateStep5({
    mobileRevelationPreference: 'Immediate',
    profilePaymentDate: '10/20/2026',
  } as any);

  assert.ok(errors.mobileRevelationPreference);
  assert.ok(errors.profilePaymentDate);
});