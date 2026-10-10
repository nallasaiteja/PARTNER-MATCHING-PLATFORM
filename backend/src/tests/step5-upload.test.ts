import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ScopeGuardService } from '../common/guards/scope-guard.service';
const { UploadService } = require('../upload/upload.service');

async function run() {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'step5-id-proof-'));
  let profile: any = {
    id: 'profile-1',
    userId: 'member-1',
    createdByStaffId: 'staff-1',
    ownershipType: 'BRANCH',
    ownerOrgId: 'branch-1',
    assignedToId: null,
    idProofFileUrl: null,
    profileData: { step1: { idProofFileUrl: 'blob:temporary' }, step5: {} },
  };
  const prisma: any = {
    memberProfile: {
      findUnique: async () => profile,
      update: async ({ data }: any) => {
        profile = { ...profile, ...data };
        return profile;
      },
    },
  };
  const service = new UploadService(prisma, new ScopeGuardService(prisma));
  const actor = { id: 'member-1', role: 'MEMBER', organizationId: null };
  const filePath = path.join(tempDirectory, 'proof.jpg');
  fs.writeFileSync(filePath, 'proof');
  const proofDirectory = path.join(process.cwd(), 'uploads', 'id-proofs');
  const proofDirectoryExisted = fs.existsSync(proofDirectory);
  fs.mkdirSync(proofDirectory, { recursive: true });
  const storedFilename = `step5-test-${Date.now()}.pdf`;
  const storedPath = path.join(proofDirectory, storedFilename);
  fs.writeFileSync(storedPath, 'private proof');
  profile.idProofFileUrl = `/uploads/id-proofs/${storedFilename}`;

  try {
    const downloaded = await service.getIdProof('profile-1', actor);
    assert.equal(downloaded.filename, storedFilename);
    assert.equal(downloaded.contentType, 'application/pdf');
    await assert.rejects(service.getIdProof('profile-1', { ...actor, id: 'member-2' }), ForbiddenException);
    profile.idProofFileUrl = null;

    const uploaded = await service.saveIdProof({
      path: filePath,
      filename: 'proof.jpg',
      mimetype: 'image/jpeg',
      size: 5,
    } as Express.Multer.File, 'profile-1', actor);

    assert.equal(uploaded.url, '/uploads/id-proofs/proof.jpg');
    assert.equal(profile.idProofFileUrl, uploaded.url);
    assert.equal(profile.profileData.step5.idProofUploaded, true);
    assert.equal(profile.profileData.step5.idProofVerified, false);

    const otherMember = { ...actor, id: 'member-2' };
    profile = { ...profile, idProofFileUrl: null };
    const unauthorizedFile = path.join(tempDirectory, 'unauthorized.jpg');
    fs.writeFileSync(unauthorizedFile, 'proof');
    await assert.rejects(service.saveIdProof({
      path: unauthorizedFile,
      filename: 'unauthorized.jpg',
      mimetype: 'image/jpeg',
      size: 5,
    } as Express.Multer.File, 'profile-1', otherMember), ForbiddenException);
    assert.equal(fs.existsSync(unauthorizedFile), false);

    profile = { ...profile, idProofFileUrl: '/uploads/id-proofs/existing.jpg' };
    const duplicateFile = path.join(tempDirectory, 'duplicate.jpg');
    fs.writeFileSync(duplicateFile, 'proof');
    await assert.rejects(service.saveIdProof({
      path: duplicateFile,
      filename: 'duplicate.jpg',
      mimetype: 'image/jpeg',
      size: 5,
    } as Express.Multer.File, 'profile-1', actor), BadRequestException);
    assert.equal(fs.existsSync(duplicateFile), false);
  } finally {
    if (fs.existsSync(storedPath)) fs.unlinkSync(storedPath);
    if (!proofDirectoryExisted && fs.readdirSync(proofDirectory).length === 0) fs.rmdirSync(proofDirectory);
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }

  console.log('Step 5 ID-proof upload ownership, duplicate prevention, and persisted status passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});