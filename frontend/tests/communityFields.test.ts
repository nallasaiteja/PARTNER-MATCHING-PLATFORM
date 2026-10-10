import assert from 'node:assert/strict';
import test from 'node:test';
import {
  casteChangeFields,
  hiddenCommunityFields,
  isAryaVysyaCaste,
  isHinduReligion,
  religionChangeFields,
} from '../src/utils/communityFields.ts';

test('Hindu fields are visible only for Hindu religion', () => {
  assert.equal(isHinduReligion('Hindu'), true);
  assert.equal(isHinduReligion('Christian'), false);
  assert.deepEqual(hiddenCommunityFields('Christian', 'Other Caste'), [
    'star', 'starId', 'moonSign', 'moonSignId', 'padam', 'padamId',
    'gothram', 'gothramId', 'kujaDosham', 'uncleGothram', 'swagothram',
  ]);
});

test('Arya Vysya fields are visible only for Hindu Arya Vysya', () => {
  assert.equal(isAryaVysyaCaste('Hindu', 'Arya Vysya'), true);
  assert.equal(isAryaVysyaCaste('Christian', 'Arya Vysya'), false);
  assert.deepEqual(hiddenCommunityFields('Hindu', 'Other Caste'), ['uncleGothram', 'swagothram']);
  assert.deepEqual(hiddenCommunityFields('Hindu', 'Arya Vysya'), []);
});

test('changing religion or caste clears dependent selections', () => {
  assert.ok(religionChangeFields().includes('star'));
  assert.ok(religionChangeFields().includes('kujaDosham'));
  assert.ok(religionChangeFields().includes('uncleGothram'));
  assert.deepEqual(casteChangeFields(), ['subCaste', 'subCasteId', 'uncleGothram', 'swagothram']);
});