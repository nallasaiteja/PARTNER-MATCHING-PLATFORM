import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction } from '@prisma/client';
import {
  CreateSuccessStoryDto,
  UpdateSuccessStoryDto,
  QuerySuccessStoryDto,
} from './dto/success-story.dto';

@Injectable()
export class SuccessStoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper to validate a member ID against MemberProfile
   */
  private async validateMember(memberIdOrPk: string) {
    const member = await this.prisma.memberProfile.findFirst({
      where: {
        OR: [{ memberId: memberIdOrPk }, { id: memberIdOrPk }],
      },
      select: {
        id: true,
        memberId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!member) {
      throw new BadRequestException(
        `Member with ID "${memberIdOrPk}" was not found in the platform records.`,
      );
    }
    const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Partner';
    return { ...member, fullName };
  }

  /**
   * Create a new Success Story (Admin / Staff)
   */
  async create(dto: CreateSuccessStoryDto, actor: any) {
    if (dto.partner1MemberId === dto.partner2MemberId) {
      throw new BadRequestException('Partner 1 and Partner 2 cannot be the same member.');
    }

    const partner1 = await this.validateMember(dto.partner1MemberId);
    const partner2 = await this.validateMember(dto.partner2MemberId);

    const marriageDate = new Date(dto.marriageDate);
    if (isNaN(marriageDate.getTime())) {
      throw new BadRequestException('Invalid marriage date provided.');
    }

    let engagementDate: Date | null = null;
    if (dto.engagementDate) {
      engagementDate = new Date(dto.engagementDate);
      if (isNaN(engagementDate.getTime())) {
        throw new BadRequestException('Invalid engagement date provided.');
      }
    }

    const story = await this.prisma.successStory.create({
      data: {
        partner1MemberId: partner1.memberId,
        partner1ProfileId: partner1.id,
        partner1Name: dto.partner1Name?.trim() || partner1.fullName,
        partner2MemberId: partner2.memberId,
        partner2ProfileId: partner2.id,
        partner2Name: dto.partner2Name?.trim() || partner2.fullName,
        title: dto.title?.trim() || `${partner1.fullName} & ${partner2.fullName}`,
        story: dto.story?.trim() || null,
        engagementDate,
        marriageDate,
        couplePhotos: dto.couplePhotos,
        youtubeVideoUrl: dto.youtubeVideoUrl?.trim() || null,
        isPublished: dto.isPublished ?? true,
        createdById: actor?.id || null,
      },
    });

    if (actor?.id) {
      await this.auditService.log({
        actorId: actor.id,
        actorRole: (actor.role as any) || 'SUPER_ADMIN',
        action: AuditAction.PROFILE_EDIT,
        resourceType: 'SuccessStory',
        resourceId: story.id,
        metadata: {
          partner1MemberId: story.partner1MemberId,
          partner2MemberId: story.partner2MemberId,
          marriageDate: story.marriageDate,
          isPublished: story.isPublished,
        },
      });
    }

    return story;
  }

  /**
   * Public list of published success stories (Sanitized - no sensitive member data)
   */
  async findAllPublic(query: QuerySuccessStoryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const where = {
      isPublished: true,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              { story: { contains: query.search, mode: 'insensitive' as const } },
              { partner1Name: { contains: query.search, mode: 'insensitive' as const } },
              { partner2Name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.successStory.count({ where }),
      this.prisma.successStory.findMany({
        where,
        orderBy: [{ marriageDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          story: true,
          partner1Name: true,
          partner2Name: true,
          engagementDate: true,
          marriageDate: true,
          couplePhotos: true,
          youtubeVideoUrl: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      stories: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin list of all success stories (including drafts & member IDs)
   */
  async findAllAdmin(query: QuerySuccessStoryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.isPublished !== undefined && query.isPublished !== '') {
      where.isPublished = query.isPublished === 'true';
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { story: { contains: query.search, mode: 'insensitive' } },
        { partner1MemberId: { contains: query.search, mode: 'insensitive' } },
        { partner2MemberId: { contains: query.search, mode: 'insensitive' } },
        { partner1Name: { contains: query.search, mode: 'insensitive' } },
        { partner2Name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.successStory.count({ where }),
      this.prisma.successStory.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      stories: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single story (Public or Admin)
   */
  async findOne(id: string, isStaffOrAdmin = false) {
    const story = await this.prisma.successStory.findUnique({
      where: { id },
    });

    if (!story) {
      throw new NotFoundException('Success story not found.');
    }

    if (!story.isPublished && !isStaffOrAdmin) {
      throw new NotFoundException('Success story not found.');
    }

    if (!isStaffOrAdmin) {
      // Return public sanitized object
      return {
        id: story.id,
        title: story.title,
        story: story.story,
        partner1Name: story.partner1Name,
        partner2Name: story.partner2Name,
        engagementDate: story.engagementDate,
        marriageDate: story.marriageDate,
        couplePhotos: story.couplePhotos,
        youtubeVideoUrl: story.youtubeVideoUrl,
        createdAt: story.createdAt,
      };
    }

    return story;
  }

  /**
   * Update success story
   */
  async update(id: string, dto: UpdateSuccessStoryDto, actor: any) {
    const existing = await this.prisma.successStory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Success story not found.');
    }

    const data: any = {};

    if (dto.partner1MemberId || dto.partner2MemberId) {
      const p1Id = dto.partner1MemberId || existing.partner1MemberId;
      const p2Id = dto.partner2MemberId || existing.partner2MemberId;

      if (p1Id === p2Id) {
        throw new BadRequestException('Partner 1 and Partner 2 cannot be the same member.');
      }

      if (dto.partner1MemberId) {
        const p1 = await this.validateMember(dto.partner1MemberId);
        data.partner1MemberId = p1.memberId;
        data.partner1ProfileId = p1.id;
        if (!dto.partner1Name) data.partner1Name = p1.fullName;
      }

      if (dto.partner2MemberId) {
        const p2 = await this.validateMember(dto.partner2MemberId);
        data.partner2MemberId = p2.memberId;
        data.partner2ProfileId = p2.id;
        if (!dto.partner2Name) data.partner2Name = p2.fullName;
      }
    }

    if (dto.partner1Name !== undefined) data.partner1Name = dto.partner1Name;
    if (dto.partner2Name !== undefined) data.partner2Name = dto.partner2Name;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.story !== undefined) data.story = dto.story;

    if (dto.marriageDate) {
      const mDate = new Date(dto.marriageDate);
      if (isNaN(mDate.getTime())) throw new BadRequestException('Invalid marriage date');
      data.marriageDate = mDate;
    }

    if (dto.engagementDate !== undefined) {
      if (dto.engagementDate) {
        const eDate = new Date(dto.engagementDate);
        if (isNaN(eDate.getTime())) throw new BadRequestException('Invalid engagement date');
        data.engagementDate = eDate;
      } else {
        data.engagementDate = null;
      }
    }

    if (dto.couplePhotos) {
      data.couplePhotos = dto.couplePhotos;
    }

    if (dto.youtubeVideoUrl !== undefined) {
      data.youtubeVideoUrl = dto.youtubeVideoUrl?.trim() || null;
    }

    if (dto.isPublished !== undefined) {
      data.isPublished = dto.isPublished;
    }

    const updated = await this.prisma.successStory.update({
      where: { id },
      data,
    });

    if (actor?.id) {
      await this.auditService.log({
        actorId: actor.id,
        actorRole: (actor.role as any) || 'SUPER_ADMIN',
        action: AuditAction.PROFILE_EDIT,
        resourceType: 'SuccessStory',
        resourceId: id,
        metadata: { changes: Object.keys(data) },
      });
    }

    return updated;
  }

  /**
   * Toggle publication status
   */
  async togglePublish(id: string, isPublished: boolean, actor: any) {
    const existing = await this.prisma.successStory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Success story not found.');
    }

    const updated = await this.prisma.successStory.update({
      where: { id },
      data: { isPublished },
    });

    if (actor?.id) {
      await this.auditService.log({
        actorId: actor.id,
        actorRole: (actor.role as any) || 'SUPER_ADMIN',
        action: AuditAction.PROFILE_EDIT,
        resourceType: 'SuccessStory',
        resourceId: id,
        metadata: { action: isPublished ? 'PUBLISHED' : 'UNPUBLISHED' },
      });
    }

    return updated;
  }

  /**
   * Delete success story
   */
  async delete(id: string, actor: any) {
    const existing = await this.prisma.successStory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Success story not found.');
    }

    await this.prisma.successStory.delete({ where: { id } });

    if (actor?.id) {
      await this.auditService.log({
        actorId: actor.id,
        actorRole: (actor.role as any) || 'SUPER_ADMIN',
        action: AuditAction.PROFILE_EDIT,
        resourceType: 'SuccessStory',
        resourceId: id,
        metadata: {
          action: 'DELETED',
          partner1MemberId: existing.partner1MemberId,
          partner2MemberId: existing.partner2MemberId,
        },
      });
    }

    return { success: true, message: 'Success story deleted successfully.' };
  }
}
