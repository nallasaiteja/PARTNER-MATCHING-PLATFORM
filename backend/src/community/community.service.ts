import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommunityMasterLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommunityMasterDto, UpdateCommunityMasterDto } from './community.dto';

const PARENT_LEVEL: Record<CommunityMasterLevel, CommunityMasterLevel | null> = {
  RELIGION: null,
  CASTE: CommunityMasterLevel.RELIGION,
  SUB_CASTE: CommunityMasterLevel.CASTE,
  STAR: null,
  MOON_SIGN: null,
  PADAM: null,
  GOTHRAM: null,
};

const REQUIRED_RELIGIONS = [
  { id: 'default-religion-hindu', name: 'Hindu', level: CommunityMasterLevel.RELIGION, parentId: null },
  { id: 'default-religion-christian', name: 'Christian', level: CommunityMasterLevel.RELIGION, parentId: null },
  { id: 'default-religion-muslim', name: 'Muslim', level: CommunityMasterLevel.RELIGION, parentId: null },
  { id: 'default-religion-caste-converted', name: 'Caste Converted', level: CommunityMasterLevel.RELIGION, parentId: null },
];

// ─── Fallback mapping: default-religion-* → actual seeded community-religion-* IDs ──────
const DEFAULT_TO_SEEDED_ID: Record<string, string> = {
  'default-religion-hindu': 'community-religion-hindu',
  'default-religion-christian': 'community-religion-christian',
  'default-religion-muslim': 'community-religion-muslim',
  'default-religion-caste-converted': 'community-religion-caste-converted',
};

// ─── Built-in fallback castes per religion ──────────────────────────────────────
const FALLBACK_CASTES: Record<string, string[]> = {
  hindu: [
    'Arya Vysya', 'Brahmin', 'Kamma', 'Kapu', 'Reddy', 'Yadav', 'Padmashali',
    'Munnuru Kapu', 'Velama', 'Goud', 'Balija', 'Mudiraj', 'Naidu', 'Kshatriya',
    'Rajput', 'Kurmi', 'Maratha', 'Lingayat', 'Vokkaliga', 'Nair', 'Ezhava',
    'Chettiar', 'Pillai', 'Gounder', 'Thevar', 'Vanniyar', 'Meenavar', 'Nadar',
    'Vishwakarma', 'SC', 'ST', 'Other',
  ],
  christian: [
    'Roman Catholic', 'Protestant', 'Syrian Christian', 'CSI', 'Pentecostal',
    'Seventh Day Adventist', 'Marthoma', 'Born Again', 'Church of South India',
    'Latin Catholic', 'Anglican', 'Baptist', 'Methodist', 'SC', 'Other',
  ],
  muslim: [
    'Sunni', 'Shia', 'Hanafi', 'Shafi', 'Deobandi', 'Barelvi', 'Ahmadiyya',
    'Bohra', 'Khoja', 'Memon', 'Pathan', 'Syed', 'Sheikh', 'Mughal', 'Other',
  ],
  'caste converted': ['SC', 'ST', 'BC', 'OC', 'Other'],
};

const FALLBACK_SUB_CASTES: Record<string, string[]> = {
  'arya vysya': ['Komati', 'Kalinga Komati', 'Penugonda Komati', 'Trivarnika Komati', 'Other'],
  'brahmin': ['Smartha', 'Sri Vaishnava', 'Madhwa', 'Niyogi', 'Vaidiki', 'Desastha', 'Konkanastha', 'Iyer', 'Iyengar', 'Namboothiri', 'Havyaka', 'Other'],
  'reddy': ['Panta Reddy', 'Motati Reddy', 'Desuru Reddy', 'Palnadu Reddy', 'Pedakanti Reddy', 'Other'],
  'kamma': ['Illuvelleni', 'Pedda Kammavaru', 'Chinna Kammavaru', 'Gollavaru', 'Other'],
  'kapu': ['Munnuru Kapu', 'Turpu Kapu', 'Telaga', 'Ontari', 'Balija Naidu', 'Other'],
};

const FALLBACK_GOTHRAMS = [
  'Bharadwaja', 'Kashyapa', 'Vasishta', 'Vishwamitra', 'Gautama', 'Jamadagni',
  'Atri', 'Agastya', 'Angirasa', 'Parasara', 'Shandilya', 'Kaundinya',
  'Dhananjaya', 'Haritha', 'Gargya', 'Vatsa', 'Maudgalya', 'Nidanaga',
  'Kaushika', 'Manu', 'Mandavya', 'Other',
];

function buildFallbackOptions(
  names: string[],
  level: CommunityMasterLevel,
  parentId: string,
): Array<{ id: string; name: string; level: CommunityMasterLevel; parentId: string }> {
  return names.map((name) => ({
    id: `fallback-${level.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    level,
    parentId,
  }));
}

function resolveReligionName(parentId: string, religions: Array<{ id: string; name: string }>): string | null {
  const r = religions.find((rel) => rel.id === parentId);
  return r ? r.name.toLowerCase() : null;
}

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(parentId?: string, level?: CommunityMasterLevel) {
    // Resolve default-religion-* IDs to actual seeded IDs if needed
    let resolvedParentId = parentId;
    if (parentId && DEFAULT_TO_SEEDED_ID[parentId]) {
      resolvedParentId = DEFAULT_TO_SEEDED_ID[parentId];
    }

    if (resolvedParentId) {
      const parent = await this.prisma.communityMaster.findFirst({
        where: { id: resolvedParentId, isActive: true },
      });
      if (!parent) {
        // Parent not found in DB — return fallback data instead of throwing
        return this.getFallbackChildren(parentId || resolvedParentId, level);
      }
    }

    if (level && !Object.values(CommunityMasterLevel).includes(level)) {
      throw new BadRequestException('Invalid community option level');
    }

    try {
      const options = await this.prisma.communityMaster.findMany({
        where: { parentId: resolvedParentId || null, isActive: true, ...(level ? { level } : {}) },
        orderBy: { name: 'asc' },
      });

      // If DB returned results, use them
      if (options.length > 0) return options;

      // If asking for religions at root level with zero results, return fallback
      if (level === CommunityMasterLevel.RELIGION && !resolvedParentId) {
        return REQUIRED_RELIGIONS;
      }

      // If asking for castes/sub-castes under a known parent and DB returned empty, provide fallback
      if (resolvedParentId) {
        return this.getFallbackChildren(parentId || resolvedParentId, level);
      }

      return options;
    } catch (error) {
      if (level === CommunityMasterLevel.RELIGION && !resolvedParentId) {
        return REQUIRED_RELIGIONS;
      }
      throw error;
    }
  }

  private async getFallbackChildren(
    parentId: string,
    level?: CommunityMasterLevel,
  ): Promise<Array<{ id: string; name: string; level: CommunityMasterLevel; parentId: string | null }>> {
    const allReligions: Array<{ id: string; name: string }> = REQUIRED_RELIGIONS.map((r) => ({ id: r.id, name: r.name }));
    try {
      const dbReligions = await this.prisma.communityMaster.findMany({
        where: { level: CommunityMasterLevel.RELIGION, isActive: true },
      });
      for (const r of dbReligions) allReligions.push({ id: r.id, name: r.name });
    } catch { /* ignore if table doesn't exist yet */ }

    const religionName = resolveReligionName(parentId, allReligions);

    // CASTE fallback — parentId is a religion ID
    if ((!level || level === CommunityMasterLevel.CASTE) && religionName && FALLBACK_CASTES[religionName]) {
      return buildFallbackOptions(FALLBACK_CASTES[religionName], CommunityMasterLevel.CASTE, parentId);
    }

    // SUB_CASTE fallback — parentId is a caste ID, extract caste name from ID
    if (!level || level === CommunityMasterLevel.SUB_CASTE) {
      const casteName = parentId.replace(/^(fallback-caste-|community-caste-)/, '').replace(/-/g, ' ');
      const subCastes = FALLBACK_SUB_CASTES[casteName];
      if (subCastes) {
        return buildFallbackOptions(subCastes, CommunityMasterLevel.SUB_CASTE, parentId);
      }
    }

    // GOTHRAM fallback
    if (!level || level === CommunityMasterLevel.GOTHRAM) {
      if (parentId.includes('gothram') || level === CommunityMasterLevel.GOTHRAM) {
        return buildFallbackOptions(FALLBACK_GOTHRAMS, CommunityMasterLevel.GOTHRAM, parentId);
      }
    }

    return [];
  }

  async create(dto: CreateCommunityMasterDto) {
    const expectedParentLevel = PARENT_LEVEL[dto.level];
    if (expectedParentLevel === null && dto.parentId) {
      throw new BadRequestException(`${dto.level} cannot have a parent`);
    }
    if (expectedParentLevel !== null && !dto.parentId) {
      throw new BadRequestException(`${dto.level} requires a ${expectedParentLevel.toLowerCase()} parent`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.communityMaster.findFirst({
        where: { id: dto.parentId, isActive: true },
      });
      if (!parent) throw new NotFoundException('Parent community option not found');
      if (parent.level !== expectedParentLevel) {
        throw new BadRequestException(`${dto.level} must belong to a ${expectedParentLevel?.toLowerCase()}`);
      }
    }

    const name = dto.name.trim();
    const duplicate = await this.prisma.communityMaster.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, level: dto.level, parentId: dto.parentId || null },
    });
    if (duplicate) throw new ConflictException('This community option already exists under the selected parent');

    return this.prisma.communityMaster.create({
      data: { name, level: dto.level, parentId: dto.parentId || null },
    });
  }

  async update(id: string, dto: UpdateCommunityMasterDto) {
    const option = await this.prisma.communityMaster.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Community option not found');

    const name = dto.name?.trim();
    if (name && name.toLowerCase() !== option.name.toLowerCase()) {
      const duplicate = await this.prisma.communityMaster.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
          level: option.level,
          parentId: option.parentId,
        },
      });
      if (duplicate) throw new ConflictException('This community option already exists under the selected parent');
    }

    return this.prisma.communityMaster.update({
      where: { id },
      data: { ...(name ? { name } : {}), ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}) },
    });
  }
}