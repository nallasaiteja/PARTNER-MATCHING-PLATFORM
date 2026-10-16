import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SuccessStoriesService } from '../success-stories/success-stories.service';
import * as assert from 'assert';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SECTION 11.1 — SUCCESS STORIES TESTS');
  console.log('====================================================\n');

  const prisma = new PrismaService();
  const auditService = new AuditService(prisma);
  const service = new SuccessStoriesService(prisma, auditService);

  try {
    // 1. Fetch two existing members
    const rawMembers = await prisma.memberProfile.findMany({
      take: 2,
      select: { id: true, memberId: true, firstName: true, lastName: true },
    });

    assert.ok(rawMembers.length >= 2, 'Need at least 2 member profiles in DB for testing');
    const members = rawMembers.map((m) => ({
      ...m,
      fullName: `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Partner',
    }));
    const [member1, member2] = members;
    console.log(`Using test members: ${member1.memberId} (${member1.fullName}) & ${member2.memberId} (${member2.fullName})`);

    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    const adminActor = { id: adminUser?.id || 'user-super-admin', role: 'SUPER_ADMIN' };

    // 2. Test: Prevent same partner ID
    console.log('\nTEST 1: Reject identical partner IDs');
    try {
      await service.create(
        {
          partner1MemberId: member1.memberId,
          partner2MemberId: member1.memberId,
          marriageDate: '2026-11-20',
          couplePhotos: ['/uploads/photos/stories/test1.jpg'],
        },
        adminActor,
      );
      assert.fail('Should have thrown error for identical partner IDs');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      console.log('  [PASS] Correctly rejected identical partner IDs:', err.message);
    }

    // 3. Test: Reject non-existent member ID
    console.log('\nTEST 2: Reject non-existent member ID');
    try {
      await service.create(
        {
          partner1MemberId: 'NON_EXISTENT_ID_99999',
          partner2MemberId: member2.memberId,
          marriageDate: '2026-11-20',
          couplePhotos: ['/uploads/photos/stories/test1.jpg'],
        },
        adminActor,
      );
      assert.fail('Should have thrown error for non-existent member');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      console.log('  [PASS] Correctly rejected non-existent member ID:', err.message);
    }

    // 4. Test: Create valid success story
    console.log('\nTEST 3: Create valid success story with couple photos & YouTube embed');
    const created = await service.create(
      {
        partner1MemberId: member1.memberId,
        partner2MemberId: member2.memberId,
        title: 'A Beautiful Match Made on PMP',
        story: 'We met through the verified matchmaking platform and found true companionship.',
        engagementDate: '2026-08-15',
        marriageDate: '2026-12-10',
        couplePhotos: [
          '/uploads/photos/stories/sample1.jpg',
          '/uploads/photos/stories/sample2.jpg',
        ],
        youtubeVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        isPublished: true,
      },
      adminActor,
    );

    assert.ok(created.id, 'Story ID must be generated');
    assert.strictEqual(created.partner1MemberId, member1.memberId);
    assert.strictEqual(created.partner2MemberId, member2.memberId);
    assert.strictEqual(created.isPublished, true);
    assert.strictEqual(created.partner1Name, member1.fullName);
    assert.strictEqual(created.partner2Name, member2.fullName);
    console.log('  [PASS] Success story created successfully with auto-populated partner names:', created.id);

    // 5. Test: Public listing returns published story with sanitized fields
    console.log('\nTEST 4: Public listing respects publication status & sanitizes sensitive data');
    const publicList = await service.findAllPublic({ page: 1, limit: 10 });
    const foundInPublic = publicList.stories.find((s) => s.id === created.id);
    assert.ok(foundInPublic, 'Published story must appear in public listing');
    // Ensure sensitive data is not in public response
    assert.strictEqual((foundInPublic as any).partner1MemberId, undefined, 'Private memberId should not be exposed publicly');
    assert.strictEqual((foundInPublic as any).phone, undefined, 'Phone numbers must not be exposed');
    assert.strictEqual((foundInPublic as any).idProofUrl, undefined, 'ID proofs must not be exposed');
    assert.ok(foundInPublic.couplePhotos, 'Couple photos must be present');
    console.log('  [PASS] Public listing displays story without leaking private member data');

    // 6. Test: Unpublish story (Draft mode)
    console.log('\nTEST 5: Unpublish story hides it from public view');
    const unpublished = await service.togglePublish(created.id, false, adminActor);
    assert.strictEqual(unpublished.isPublished, false);

    const publicAfterUnpublish = await service.findAllPublic({ page: 1, limit: 10 });
    const hiddenInPublic = publicAfterUnpublish.stories.find((s) => s.id === created.id);
    assert.strictEqual(hiddenInPublic, undefined, 'Unpublished story must NOT appear in public listing');
    console.log('  [PASS] Unpublished story successfully hidden from public API');

    // 7. Test: Admin listing shows unpublished stories
    console.log('\nTEST 6: Admin listing includes unpublished/draft stories');
    const adminList = await service.findAllAdmin({ isPublished: 'false' });
    const foundInAdmin = adminList.stories.find((s) => s.id === created.id);
    assert.ok(foundInAdmin, 'Admin must see unpublished drafts');
    assert.strictEqual(foundInAdmin.isPublished, false);
    console.log('  [PASS] Admin listing successfully retrieves drafts with full member IDs');

    // 8. Test: Re-publish and Update Story
    console.log('\nTEST 7: Update story details & re-publish');
    const updated = await service.update(
      created.id,
      {
        title: 'Updated: A Fairytale Telugu Wedding',
        isPublished: true,
      },
      adminActor,
    );
    assert.strictEqual(updated.title, 'Updated: A Fairytale Telugu Wedding');
    assert.strictEqual(updated.isPublished, true);
    console.log('  [PASS] Story updated and re-published successfully');

    // 9. Clean up test record
    console.log('\nTEST 8: Delete story');
    const delRes = await service.delete(created.id, adminActor);
    assert.strictEqual(delRes.success, true);
    const afterDel = await prisma.successStory.findUnique({ where: { id: created.id } });
    assert.strictEqual(afterDel, null, 'Story should be deleted');
    console.log('  [PASS] Story deleted successfully');

    console.log('\n====================================================');
    console.log('🎉 SECTION 11.1 BACKEND TESTS PASSED (8/8)');
    console.log('====================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
