import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMediaUrl, validateUploadFile } from '../src/services/apiConfig.ts';

test('resolveMediaUrl correctly resolves various URL structures', () => {
  // Empty or invalid input
  assert.equal(resolveMediaUrl(null), '');
  assert.equal(resolveMediaUrl(undefined), '');
  assert.equal(resolveMediaUrl(''), '');
  assert.equal(resolveMediaUrl('   '), '');

  // Absolute HTTPS / CDN URLs preserved intact
  const cdnUrl = 'https://wykhtxwvstgbroztrlgm.supabase.co/storage/v1/object/public/photos/sample.jpg';
  assert.equal(resolveMediaUrl(cdnUrl), cdnUrl);

  const unsplashUrl = 'https://images.unsplash.com/photo-1519741497674-611481863552';
  assert.equal(resolveMediaUrl(unsplashUrl), unsplashUrl);

  // In-memory URLs (blob: and data:) preserved intact
  const blobUrl = 'blob:http://localhost:5173/3f9b2d8e-1234-5678-9abc-def012345678';
  assert.equal(resolveMediaUrl(blobUrl), blobUrl);

  const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
  assert.equal(resolveMediaUrl(dataUrl), dataUrl);

  // Relative URLs resolved cleanly
  const relativePhoto = '/uploads/photos/member-photo.jpg';
  const resolved = resolveMediaUrl(relativePhoto);
  assert.ok(resolved.endsWith('/uploads/photos/member-photo.jpg'));
});

test('validateUploadFile enforces size limits and MIME restrictions', () => {
  // Missing file
  const noFile = validateUploadFile(null as any, { maxBytes: 500 * 1024 });
  assert.equal(noFile.valid, false);
  assert.ok(noFile.error?.includes('No file selected'));

  // Exceeds 500KB photo limit
  const largeFakeFile = {
    size: 600 * 1024,
    type: 'image/jpeg',
  } as File;

  const sizeCheck = validateUploadFile(largeFakeFile, {
    maxBytes: 500 * 1024,
    allowedMimes: ['image/jpeg', 'image/png'],
    label: 'Profile photo',
  });
  assert.equal(sizeCheck.valid, false);
  assert.ok(sizeCheck.error?.includes('must be smaller than 500KB'));

  // Invalid MIME type
  const badTypeFile = {
    size: 200 * 1024,
    type: 'application/x-msdownload',
  } as File;

  const mimeCheck = validateUploadFile(badTypeFile, {
    maxBytes: 5 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'application/pdf'],
    label: 'ID proof document',
  });
  assert.equal(mimeCheck.valid, false);
  assert.ok(mimeCheck.error?.includes('type not supported'));

  // Valid photo within limits
  const validPhoto = {
    size: 350 * 1024,
    type: 'image/jpeg',
  } as File;

  const validPhotoResult = validateUploadFile(validPhoto, {
    maxBytes: 500 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    label: 'Profile photo',
  });
  assert.equal(validPhotoResult.valid, true);
  assert.equal(validPhotoResult.error, undefined);

  // Valid ID proof (PDF) within 5MB
  const validPdf = {
    size: 2 * 1024 * 1024,
    type: 'application/pdf',
  } as File;

  const validPdfResult = validateUploadFile(validPdf, {
    maxBytes: 5 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'application/pdf'],
    label: 'ID proof document',
  });
  assert.equal(validPdfResult.valid, true);
});
