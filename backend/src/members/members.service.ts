import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction } from '@prisma/client';
import { calculateProfileCompletion } from '../profiles/profile-completion';
import {
  isVerifiedMatch,
  isMutualMatch,
  serializeMatchCard,
  calculateAge,
} from '../profiles/matching-engine';
import { MatchQueryFilterDto } from './dto/member-actions.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async getMemberProfileByUserId(userId: string) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        currentPackage: true,
        createdByStaff: true,
      },
    });
    if (!profile) {
      throw new NotFoundException('Member profile not found for this account');
    }
    return profile;
  }

  // ──────────────────────────────────────────────────────────
  // DASHBOARD
  // ──────────────────────────────────────────────────────────

  async getDashboard(userId: string) {
    const profile = await this.getMemberProfileByUserId(userId);
    const completion = calculateProfileCompletion(profile);

    // Fetch candidate profiles to calculate real compatible count
    const candidates = await this.prisma.memberProfile.findMany({
      where: {
        id: { not: profile.id },
        isBlocked: false,
        user: { status: 'ACTIVE' },
      },
      include: { user: true },
    });

    const compatibleInCommunity = candidates.filter((c) => isVerifiedMatch(profile, c));
    const compatibleCount = compatibleInCommunity.length;

    // Interests statistics
    const sentCount = await this.prisma.memberInterest.count({
      where: { senderProfileId: profile.id },
    });
    const receivedCount = await this.prisma.memberInterest.count({
      where: { receiverProfileId: profile.id },
    });
    const acceptedCount = await this.prisma.memberInterest.count({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderProfileId: profile.id }, { receiverProfileId: profile.id }],
      },
    });

    // Activity statistics
    const shortlistsCount = await this.prisma.memberShortlist.count({
      where: { memberProfileId: profile.id },
    });
    const profileViewsCount = await this.prisma.profileViewLog.count({
      where: { viewerProfileId: profile.id },
    });
    const whoViewedMeCount = await this.prisma.profileViewLog.count({
      where: { viewedProfileId: profile.id },
    });

    const step5 = (profile.profileData as Record<string, any>)?.step5 || {};

    const createdByLabel = profile.createdByStaffId
      ? `Profile created by — Staff [${profile.createdByStaffId}]`
      : 'Profile created by — Member';

    return {
      memberId: profile.memberId || `M${profile.id.slice(0, 8)}`,
      firstName: profile.firstName,
      lastName: profile.lastName,
      createdByType: profile.createdByType || 'MEMBER',
      createdByLabel,
      completion,
      verification: {
        mobileVerified: Boolean(profile.user?.mobileVerified),
        emailVerified: Boolean(profile.user?.emailVerified),
        idProofUploaded: Boolean(profile.idProofFileUrl || step5.idProofUploaded),
        idProofVerified: Boolean(step5.idProofVerified),
      },
      membership: {
        packageType: profile.packageType,
        packageName: profile.currentPackage?.name || (profile.packageType === 'PAID' ? 'Standard Paid' : 'Free Membership'),
        packageExpiresAt: profile.packageExpiresAt,
        contactsQuota: profile.contactsQuota,
        contactsRevealedCount: profile.contactsRevealedCount,
        contactsRemaining: Math.max(0, profile.contactsQuota - profile.contactsRevealedCount),
      },
      compatibleCommunityCount: compatibleCount,
      communityMessage: `${compatibleCount} compatible profiles exist in your community`,
      interestsSummary: {
        sentCount,
        receivedCount,
        acceptedCount,
      },
      activitySummary: {
        shortlistsCount,
        profileViewsCount,
        whoViewedMeCount,
      },
      termsAccepted: profile.termsAccepted,
    };
  }

  // ──────────────────────────────────────────────────────────
  // MATCH BROWSING (VERIFIED & MATCHED VIEWS)
  // ──────────────────────────────────────────────────────────

  async getVerifiedMatches(userId: string, filters: MatchQueryFilterDto) {
    const viewer = await this.getMemberProfileByUserId(userId);
    const completion = calculateProfileCompletion(viewer);

    // Fetch candidate profiles excluding blocked / self
    const candidates = await this.prisma.memberProfile.findMany({
      where: {
        id: { not: viewer.id },
        isBlocked: false,
        user: { status: 'ACTIVE' },
      },
      include: {
        user: true,
        currentPackage: true,
      },
    });

    // Exclude members blocked by viewer or who blocked viewer
    const blockedIds = await this.getBlockedProfileIds(viewer.id);
    const eligibleCandidates = candidates.filter((c) => !blockedIds.has(c.id));

    const verifiedMatches = eligibleCandidates.filter((c) => isVerifiedMatch(viewer, c));
    const compatibleCount = verifiedMatches.length;

    // SECTION 4.2 RULE: Below 70% completion
    // Cannot view any match profiles.
    // Only sees: 'X compatible profiles exist in your community' (count only).
    if (!completion.isComplete70Plus && viewer.packageType !== 'PAID') {
      return {
        isRestricted: true,
        completionPercentage: completion.percentage,
        message: `${compatibleCount} compatible profiles exist in your community`,
        compatibleCount,
        missingFields: completion.missingFields,
        results: [],
        page: 1,
        limit: 12,
        total: compatibleCount,
        totalPages: 0,
      };
    }

    // Apply filters
    const filtered = this.applyFilters(verifiedMatches, filters);

    // Get contact reveal statuses for viewer
    const revealMap = await this.getContactRevealStatusMap(viewer.id);

    // Pagination
    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.max(1, parseInt(filters.limit || '12', 10));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const serialized = paginated.map((candidate) =>
      serializeMatchCard(candidate, viewer, revealMap.get(candidate.id)),
    );

    return {
      isRestricted: false,
      completionPercentage: completion.percentage,
      results: serialized,
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getMatchedProfiles(userId: string, filters: MatchQueryFilterDto) {
    const viewer = await this.getMemberProfileByUserId(userId);
    const completion = calculateProfileCompletion(viewer);

    const candidates = await this.prisma.memberProfile.findMany({
      where: {
        id: { not: viewer.id },
        isBlocked: false,
        user: { status: 'ACTIVE' },
      },
      include: {
        user: true,
        currentPackage: true,
      },
    });

    const blockedIds = await this.getBlockedProfileIds(viewer.id);
    const eligibleCandidates = candidates.filter((c) => !blockedIds.has(c.id));

    const mutualMatches = eligibleCandidates.filter((c) => isMutualMatch(viewer, c));
    const compatibleCount = mutualMatches.length;

    if (!completion.isComplete70Plus && viewer.packageType !== 'PAID') {
      return {
        isRestricted: true,
        completionPercentage: completion.percentage,
        message: `${compatibleCount} mutually compatible profiles exist for your preferences`,
        compatibleCount,
        missingFields: completion.missingFields,
        results: [],
        page: 1,
        limit: 12,
        total: compatibleCount,
        totalPages: 0,
      };
    }

    const filtered = this.applyFilters(mutualMatches, filters);
    const revealMap = await this.getContactRevealStatusMap(viewer.id);

    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.max(1, parseInt(filters.limit || '12', 10));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const serialized = paginated.map((candidate) =>
      serializeMatchCard(candidate, viewer, revealMap.get(candidate.id)),
    );

    return {
      isRestricted: false,
      completionPercentage: completion.percentage,
      results: serialized,
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getMatchDetail(userId: string, targetProfileId: string, ipAddress?: string) {
    const viewer = await this.getMemberProfileByUserId(userId);
    const completion = calculateProfileCompletion(viewer);

    if (!completion.isComplete70Plus && viewer.packageType !== 'PAID') {
      throw new ForbiddenException(
        'Profile completion must be at least 70% to view match profile details',
      );
    }

    const target = await this.prisma.memberProfile.findUnique({
      where: { id: targetProfileId },
      include: { user: true, currentPackage: true },
    });

    if (!target || target.isBlocked || target.user?.status === 'BLOCKED') {
      throw new NotFoundException('Profile not found or unavailable');
    }

    // Log profile view ("Profiles Seen" & "Seen My Profile")
    if (viewer.id !== target.id) {
      await this.prisma.profileViewLog.create({
        data: {
          viewerProfileId: viewer.id,
          viewedProfileId: target.id,
        },
      });

      await this.auditService.log({
        actorId: viewer.userId,
        actorRole: viewer.user.role,
        action: AuditAction.PROFILE_VIEW,
        resourceType: 'MemberProfile',
        resourceId: target.id,
        ipAddress,
      });
    }

    const revealMap = await this.getContactRevealStatusMap(viewer.id);
    return serializeMatchCard(target, viewer, revealMap.get(target.id));
  }

  // ──────────────────────────────────────────────────────────
  // CONTACT REVELATION (SECTION 4.8)
  // ──────────────────────────────────────────────────────────

  async revealContact(userId: string, targetProfileId: string, ipAddress?: string) {
    const viewer = await this.getMemberProfileByUserId(userId);

    if (viewer.packageType !== 'PAID') {
      throw new ForbiddenException(
        'Contact number revelation is exclusive to Paid members. Please upgrade your plan.',
      );
    }

    // Check quota
    if (viewer.contactsQuota > 0 && viewer.contactsRevealedCount >= viewer.contactsQuota) {
      throw new ForbiddenException(
        'You have exhausted your contact reveal quota. Please upgrade to a higher plan.',
      );
    }

    const target = await this.prisma.memberProfile.findUnique({
      where: { id: targetProfileId },
      include: { user: true },
    });

    if (!target) throw new NotFoundException('Member profile not found');
    if (target.isBlocked) throw new ForbiddenException('Profile is unavailable');

    // Check existing request
    const existingReq = await this.prisma.contactRevealRequest.findUnique({
      where: {
        senderProfileId_receiverProfileId: {
          senderProfileId: viewer.id,
          receiverProfileId: target.id,
        },
      },
    });

    if (existingReq?.status === 'REVEALED') {
      return {
        status: 'REVEALED',
        mobile: target.user?.mobile,
        email: target.user?.email,
        message: 'Contact already revealed',
      };
    }

    const targetStep5 = (target.profileData as Record<string, any>)?.step5 || {};
    const pref = targetStep5.mobileRevelationPreference || '0 Hours';

    if (pref === '0 Hours') {
      // Auto reveal immediately
      await this.prisma.contactRevealRequest.upsert({
        where: {
          senderProfileId_receiverProfileId: {
            senderProfileId: viewer.id,
            receiverProfileId: target.id,
          },
        },
        create: {
          senderProfileId: viewer.id,
          receiverProfileId: target.id,
          revealType: 'AUTO',
          status: 'REVEALED',
          revealedAt: new Date(),
          actionDate: new Date(),
          actionById: viewer.id,
          actionByType: 'MEMBER',
        },
        update: {
          revealType: 'AUTO',
          status: 'REVEALED',
          revealedAt: new Date(),
        },
      });

      // Increment viewer count
      await this.prisma.memberProfile.update({
        where: { id: viewer.id },
        data: { contactsRevealedCount: { increment: 1 } },
      });

      await this.auditService.log({
        actorId: viewer.userId,
        actorRole: viewer.user.role,
        action: AuditAction.CONTACT_REVEALED,
        resourceType: 'ContactRevealRequest',
        resourceId: target.id,
        metadata: { revealType: 'AUTO', targetMemberId: target.memberId },
        ipAddress,
      });

      return {
        status: 'REVEALED',
        mobile: target.user?.mobile,
        email: target.user?.email,
        message: 'Contact number revealed immediately per 0-hour preference',
      };
    }

    if (pref === '24 Hours' || pref === '72 Hours') {
      const delayHours = pref === '24 Hours' ? 24 : 72;
      const unlocksAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

      const req = await this.prisma.contactRevealRequest.upsert({
        where: {
          senderProfileId_receiverProfileId: {
            senderProfileId: viewer.id,
            receiverProfileId: target.id,
          },
        },
        create: {
          senderProfileId: viewer.id,
          receiverProfileId: target.id,
          revealType: pref === '24 Hours' ? 'SCHEDULED_24H' : 'SCHEDULED_72H',
          status: 'PENDING',
          unlocksAt,
        },
        update: {
          revealType: pref === '24 Hours' ? 'SCHEDULED_24H' : 'SCHEDULED_72H',
          status: 'PENDING',
          unlocksAt,
        },
      });

      await this.auditService.log({
        actorId: viewer.userId,
        actorRole: viewer.user.role,
        action: AuditAction.CONTACT_REVEAL_REQUEST,
        resourceType: 'ContactRevealRequest',
        resourceId: req.id,
        metadata: { delayHours, targetMemberId: target.memberId },
        ipAddress,
      });

      return {
        status: 'SCHEDULED_WAITING',
        unlocksAt,
        message: `Contact reveal scheduled after ${delayHours} hours per recipient's setting. Recipient can review or block during this period.`,
      };
    }

    // Acceptance Preference
    const req = await this.prisma.contactRevealRequest.upsert({
      where: {
        senderProfileId_receiverProfileId: {
          senderProfileId: viewer.id,
          receiverProfileId: target.id,
        },
      },
      create: {
        senderProfileId: viewer.id,
        receiverProfileId: target.id,
        revealType: 'REQUEST_ACCEPTANCE',
        status: 'PENDING',
      },
      update: {
        revealType: 'REQUEST_ACCEPTANCE',
        status: 'PENDING',
      },
    });

    await this.auditService.log({
      actorId: viewer.userId,
      actorRole: viewer.user.role,
      action: AuditAction.CONTACT_REVEAL_REQUEST,
      resourceType: 'ContactRevealRequest',
      resourceId: req.id,
      metadata: { revealType: 'REQUEST_ACCEPTANCE', targetMemberId: target.memberId },
      ipAddress,
    });

    return {
      status: 'PENDING_ACCEPTANCE',
      message: 'Contact request submitted. Mobile number will be unlocked once accepted by the member.',
    };
  }

  async getContactRequests(userId: string) {
    const profile = await this.getMemberProfileByUserId(userId);

    const sent = await this.prisma.contactRevealRequest.findMany({
      where: { senderProfileId: profile.id },
      include: {
        receiver: {
          include: { user: { select: { mobile: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const received = await this.prisma.contactRevealRequest.findMany({
      where: { receiverProfileId: profile.id },
      include: {
        sender: {
          include: { user: { select: { mobile: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      sent: sent.map((r) => ({
        id: r.id,
        targetMemberId: r.receiver.memberId,
        targetName: `${r.receiver.firstName} ${r.receiver.lastName}`,
        revealType: r.revealType,
        status: r.status,
        unlocksAt: r.unlocksAt,
        revealedAt: r.revealedAt,
        createdAt: r.createdAt,
        mobile: r.status === 'REVEALED' ? r.receiver.user?.mobile : null,
      })),
      received: received.map((r) => ({
        id: r.id,
        senderMemberId: r.sender.memberId,
        senderName: `${r.sender.firstName} ${r.sender.lastName}`,
        revealType: r.revealType,
        status: r.status,
        unlocksAt: r.unlocksAt,
        createdAt: r.createdAt,
      })),
    };
  }

  async respondToContactRequest(
    userId: string,
    requestId: string,
    action: 'ACCEPT' | 'REJECT' | 'BLOCK',
    ipAddress?: string,
  ) {
    const profile = await this.getMemberProfileByUserId(userId);

    const request = await this.prisma.contactRevealRequest.findUnique({
      where: { id: requestId },
      include: { sender: true },
    });

    if (!request || request.receiverProfileId !== profile.id) {
      throw new NotFoundException('Contact request not found');
    }

    let newStatus = 'PENDING';
    if (action === 'ACCEPT') {
      newStatus = 'REVEALED';
      // Increment sender's reveal count
      await this.prisma.memberProfile.update({
        where: { id: request.senderProfileId },
        data: { contactsRevealedCount: { increment: 1 } },
      });
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (action === 'BLOCK') {
      newStatus = 'BLOCKED';
    }

    const updated = await this.prisma.contactRevealRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        revealedAt: action === 'ACCEPT' ? new Date() : null,
        actionDate: new Date(),
        actionById: profile.id,
        actionByType: 'MEMBER',
      },
    });

    await this.auditService.log({
      actorId: profile.userId,
      actorRole: profile.user.role,
      action: action === 'ACCEPT' ? AuditAction.CONTACT_REVEALED : AuditAction.CONTACT_REVEAL_REQUEST,
      resourceType: 'ContactRevealRequest',
      resourceId: request.id,
      metadata: { action, newStatus },
      ipAddress,
    });

    return {
      message: `Request ${action.toLowerCase()}ed successfully`,
      status: updated.status,
    };
  }

  async getRevealedContacts(userId: string) {
    const profile = await this.getMemberProfileByUserId(userId);

    const revealed = await this.prisma.contactRevealRequest.findMany({
      where: {
        senderProfileId: profile.id,
        status: 'REVEALED',
      },
      include: {
        receiver: {
          include: { user: true },
        },
      },
      orderBy: { revealedAt: 'desc' },
    });

    return revealed.map((r) => {
      const step1 = (r.receiver.profileData as Record<string, any>)?.step1 || {};
      const step2 = (r.receiver.profileData as Record<string, any>)?.step2 || {};
      return {
        id: r.id,
        profileId: r.receiver.id,
        memberId: r.receiver.memberId,
        name: `${r.receiver.firstName} ${r.receiver.lastName}`,
        mobile: r.receiver.user?.mobile || step1.mobile,
        email: r.receiver.user?.email || step1.email,
        caste: step1.caste,
        religion: step1.religion,
        profession: step2.profession,
        revealedAt: r.revealedAt,
      };
    });
  }

  // ──────────────────────────────────────────────────────────
  // INTERESTS
  // ──────────────────────────────────────────────────────────

  async sendInterest(userId: string, targetProfileId: string, ipAddress?: string) {
    const sender = await this.getMemberProfileByUserId(userId);
    const completion = calculateProfileCompletion(sender);

    if (!completion.isComplete70Plus && sender.packageType !== 'PAID') {
      throw new ForbiddenException('Complete at least 70% of your profile before sending interests');
    }

    if (sender.id === targetProfileId) {
      throw new BadRequestException('Cannot send interest to your own profile');
    }

    const target = await this.prisma.memberProfile.findUnique({
      where: { id: targetProfileId },
    });

    if (!target || target.isBlocked) {
      throw new NotFoundException('Target profile not available');
    }

    const existing = await this.prisma.memberInterest.findUnique({
      where: {
        senderProfileId_receiverProfileId: {
          senderProfileId: sender.id,
          receiverProfileId: target.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Interest already sent with status: ${existing.status}`);
    }

    const interest = await this.prisma.memberInterest.create({
      data: {
        senderProfileId: sender.id,
        receiverProfileId: target.id,
        status: 'PENDING',
      },
    });

    await this.auditService.log({
      actorId: sender.userId,
      actorRole: sender.user.role,
      action: AuditAction.INTEREST_SENT,
      resourceType: 'MemberInterest',
      resourceId: interest.id,
      metadata: { targetMemberId: target.memberId },
      ipAddress,
    });

    return {
      message: 'Interest sent successfully',
      interest,
    };
  }

  async getSentInterests(userId: string) {
    const profile = await this.getMemberProfileByUserId(userId);

    const sent = await this.prisma.memberInterest.findMany({
      where: { senderProfileId: profile.id },
      include: {
        receiver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sent.map((item) => {
      const step1 = (item.receiver.profileData as Record<string, any>)?.step1 || {};
      const step2 = (item.receiver.profileData as Record<string, any>)?.step2 || {};
      return {
        id: item.id,
        targetProfileId: item.receiver.id,
        targetMemberId: item.receiver.memberId,
        targetName: `${item.receiver.firstName} ${item.receiver.lastName}`,
        age: calculateAge(item.receiver.dateOfBirth),
        caste: step1.caste,
        profession: step2.profession,
        status: item.status,
        sentAt: item.createdAt,
        actionDate: item.actionDate,
      };
    });
  }

  async getReceivedInterests(userId: string) {
    const profile = await this.getMemberProfileByUserId(userId);

    const received = await this.prisma.memberInterest.findMany({
      where: { receiverProfileId: profile.id },
      include: {
        sender: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return received.map((item) => {
      const step1 = (item.sender.profileData as Record<string, any>)?.step1 || {};
      const step2 = (item.sender.profileData as Record<string, any>)?.step2 || {};
      return {
        id: item.id,
        senderProfileId: item.sender.id,
        senderMemberId: item.sender.memberId,
        senderName: `${item.sender.firstName} ${item.sender.lastName}`,
        age: calculateAge(item.sender.dateOfBirth),
        caste: step1.caste,
        profession: step2.profession,
        status: item.status,
        receivedAt: item.createdAt,
        actionDate: item.actionDate,
      };
    });
  }

  async respondToInterest(
    userId: string,
    interestId: string,
    status: 'ACCEPTED' | 'REJECTED',
    ipAddress?: string,
  ) {
    const profile = await this.getMemberProfileByUserId(userId);

    const interest = await this.prisma.memberInterest.findUnique({
      where: { id: interestId },
    });

    if (!interest || interest.receiverProfileId !== profile.id) {
      throw new NotFoundException('Interest request not found');
    }

    const updated = await this.prisma.memberInterest.update({
      where: { id: interestId },
      data: {
        status,
        actionDate: new Date(),
        actionById: profile.id,
        actionByType: 'MEMBER',
      },
    });

    await this.auditService.log({
      actorId: profile.userId,
      actorRole: profile.user.role,
      action: status === 'ACCEPTED' ? AuditAction.INTEREST_ACCEPTED : AuditAction.INTEREST_REJECTED,
      resourceType: 'MemberInterest',
      resourceId: interest.id,
      metadata: { status },
      ipAddress,
    });

    return {
      message: `Interest ${status.toLowerCase()} successfully`,
      interest: updated,
    };
  }

  // ──────────────────────────────────────────────────────────
  // SHORTLIST, BLOCKLIST, VIEWS & SUGGESTIONS
  // ──────────────────────────────────────────────────────────

  async toggleShortlist(userId: string, targetProfileId: string) {
    const viewer = await this.getMemberProfileByUserId(userId);

    const existing = await this.prisma.memberShortlist.findUnique({
      where: {
        memberProfileId_targetProfileId: {
          memberProfileId: viewer.id,
          targetProfileId,
        },
      },
    });

    if (existing) {
      await this.prisma.memberShortlist.delete({ where: { id: existing.id } });
      return { shortlisted: false, message: 'Removed from shortlisted profiles' };
    }

    await this.prisma.memberShortlist.create({
      data: {
        memberProfileId: viewer.id,
        targetProfileId,
      },
    });

    return { shortlisted: true, message: 'Profile shortlisted successfully' };
  }

  async listShortlist(userId: string) {
    const viewer = await this.getMemberProfileByUserId(userId);

    const items = await this.prisma.memberShortlist.findMany({
      where: { memberProfileId: viewer.id },
      orderBy: { createdAt: 'desc' },
    });

    const targetIds = items.map((i) => i.targetProfileId);
    const targets = await this.prisma.memberProfile.findMany({
      where: { id: { in: targetIds } },
      include: { user: true },
    });

    const revealMap = await this.getContactRevealStatusMap(viewer.id);
    return targets.map((t) => serializeMatchCard(t, viewer, revealMap.get(t.id)));
  }

  async toggleBlocklist(userId: string, targetProfileId: string) {
    const viewer = await this.getMemberProfileByUserId(userId);

    const existing = await this.prisma.memberBlocklist.findUnique({
      where: {
        memberProfileId_targetProfileId: {
          memberProfileId: viewer.id,
          targetProfileId,
        },
      },
    });

    if (existing) {
      await this.prisma.memberBlocklist.delete({ where: { id: existing.id } });
      return { blocked: false, message: 'Profile unblocked from your search' };
    }

    await this.prisma.memberBlocklist.create({
      data: {
        memberProfileId: viewer.id,
        targetProfileId,
      },
    });

    return { blocked: true, message: 'Profile blocked. You will not see each other in results.' };
  }

  async listBlocklist(userId: string) {
    const viewer = await this.getMemberProfileByUserId(userId);

    const items = await this.prisma.memberBlocklist.findMany({
      where: { memberProfileId: viewer.id },
      orderBy: { createdAt: 'desc' },
    });

    const targetIds = items.map((i) => i.targetProfileId);
    const targets = await this.prisma.memberProfile.findMany({
      where: { id: { in: targetIds } },
    });

    return targets.map((t) => ({
      id: t.id,
      memberId: t.memberId,
      name: `${t.firstName} ${t.lastName}`,
      gender: t.gender,
    }));
  }

  async getActivityViews(userId: string) {
    const profile = await this.getMemberProfileByUserId(userId);

    const profilesSeen = await this.prisma.profileViewLog.findMany({
      where: { viewerProfileId: profile.id },
      include: { viewed: true },
      orderBy: { viewedAt: 'desc' },
      take: 20,
    });

    const seenMyProfile = await this.prisma.profileViewLog.findMany({
      where: { viewedProfileId: profile.id },
      include: { viewer: true },
      orderBy: { viewedAt: 'desc' },
      take: 20,
    });

    return {
      profilesSeen: profilesSeen.map((log) => ({
        id: log.viewed.id,
        memberId: log.viewed.memberId,
        name: `${log.viewed.firstName} ${log.viewed.lastName}`,
        viewedAt: log.viewedAt,
      })),
      seenMyProfile: seenMyProfile.map((log) => ({
        id: log.viewer.id,
        memberId: log.viewer.memberId,
        name: `${log.viewer.firstName} ${log.viewer.lastName}`,
        viewedAt: log.viewedAt,
      })),
    };
  }

  async getSuggestedProfiles(userId: string) {
    const viewer = await this.getMemberProfileByUserId(userId);

    if (viewer.packageType !== 'PAID') {
      return [];
    }

    const candidates = await this.prisma.memberProfile.findMany({
      where: {
        id: { not: viewer.id },
        isBlocked: false,
        user: { status: 'ACTIVE' },
      },
      include: { user: true },
      take: 6,
    });

    const revealMap = await this.getContactRevealStatusMap(viewer.id);
    return candidates.map((c) => serializeMatchCard(c, viewer, revealMap.get(c.id)));
  }

  // ──────────────────────────────────────────────────────────
  // HELPER METHODS
  // ──────────────────────────────────────────────────────────

  private async getBlockedProfileIds(profileId: string): Promise<Set<string>> {
    const blockedByMe = await this.prisma.memberBlocklist.findMany({
      where: { memberProfileId: profileId },
      select: { targetProfileId: true },
    });
    const blockedMe = await this.prisma.memberBlocklist.findMany({
      where: { targetProfileId: profileId },
      select: { memberProfileId: true },
    });

    const set = new Set<string>();
    blockedByMe.forEach((b) => set.add(b.targetProfileId));
    blockedMe.forEach((b) => set.add(b.memberProfileId));
    return set;
  }

  private async getContactRevealStatusMap(viewerProfileId: string) {
    const requests = await this.prisma.contactRevealRequest.findMany({
      where: { senderProfileId: viewerProfileId },
      include: { receiver: { include: { user: true } } },
    });

    const map = new Map<string, { revealed: boolean; status: string; mobile?: string | null }>();
    requests.forEach((r) => {
      const isRevealed = r.status === 'REVEALED';
      map.set(r.receiverProfileId, {
        revealed: isRevealed,
        status: r.status,
        mobile: isRevealed ? r.receiver.user?.mobile : null,
      });
    });
    return map;
  }

  private applyFilters(profiles: any[], filters: MatchQueryFilterDto): any[] {
    return profiles.filter((p) => {
      const pData = (p.profileData as Record<string, any>) || {};
      const step1 = pData.step1 || {};
      const step2 = pData.step2 || {};

      if (filters.caste && step1.caste) {
        if (!step1.caste.toLowerCase().includes(filters.caste.toLowerCase())) return false;
      }
      if (filters.religion && step1.religion) {
        if (!step1.religion.toLowerCase().includes(filters.religion.toLowerCase())) return false;
      }
      if (filters.maritalStatus && step1.maritalStatus) {
        if (step1.maritalStatus.toLowerCase() !== filters.maritalStatus.toLowerCase()) return false;
      }
      if (filters.profession && step2.profession) {
        if (!step2.profession.toLowerCase().includes(filters.profession.toLowerCase())) return false;
      }
      if (filters.education && step2.education) {
        if (!step2.education.toLowerCase().includes(filters.education.toLowerCase())) return false;
      }
      if (filters.city) {
        const city = step1.district || step1.city || step2.workingCity || '';
        if (!city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      }
      if (filters.ageMin || filters.ageMax) {
        const age = calculateAge(p.dateOfBirth);
        if (filters.ageMin && age < parseInt(filters.ageMin, 10)) return false;
        if (filters.ageMax && age > parseInt(filters.ageMax, 10)) return false;
      }
      if (filters.star && step1.star) {
        if (step1.star.toLowerCase() !== filters.star.toLowerCase()) return false;
      }
      if (filters.raasi && step1.moonSign) {
        if (step1.moonSign.toLowerCase() !== filters.raasi.toLowerCase()) return false;
      }
      return true;
    });
  }
}
