import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, RoleType } from '../common/constants/roles.constants';

export interface AdvancedSearchFilters {
  name?: string;
  surname?: string;
  gender?: string;
  maritalStatus?: string;
  minAge?: number;
  maxAge?: number;
  minHeight?: number;
  maxHeight?: number;
  country?: string;
  state?: string;
  district?: string;
  mandal?: string;
  village?: string;
  religion?: string;
  caste?: string;
  subCaste?: string;
  interCasteAccepted?: boolean;
  raasi?: string;
  star?: string;
  moonSign?: string;
  education?: string;
  university?: string;
  abroadStudy?: boolean;
  employedIn?: string;
  profession?: string;
  designation?: string;
  minIncome?: number;
  maxIncome?: number;
  workingLocationType?: string; // "India" | "Abroad"
  workingCountry?: string;
  hasPassport?: boolean;
  motherTongue?: string;
  complexion?: string;
  fatherProfession?: string;
  motherProfession?: string;
  hasPhoto?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdvancedSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchProfiles(actor: any, filters: AdvancedSearchFilters) {
    const where: any = { isBlocked: false };

    // Apply role scope: Branch/Franchise staff only sees permitted
    if (
      actor.role !== Role.SUPER_ADMIN &&
      actor.role !== Role.ADMIN &&
      actor.organizationId
    ) {
      where.ownerOrgId = actor.organizationId;
    }

    // Name & Surname
    if (filters.name) {
      where.firstName = { contains: filters.name.trim(), mode: 'insensitive' };
    }
    if (filters.surname) {
      where.lastName = { contains: filters.surname.trim(), mode: 'insensitive' };
    }

    // Gender
    if (filters.gender) {
      where.gender = { equals: filters.gender, mode: 'insensitive' };
    }

    // Age calculation via dateOfBirth
    const now = new Date();
    if (filters.minAge || filters.maxAge) {
      const dobFilter: any = {};
      if (filters.minAge) {
        // e.g. minAge 25 -> born on or before (now - 25 years)
        const maxDob = new Date(now.getFullYear() - filters.minAge, now.getMonth(), now.getDate());
        dobFilter.lte = maxDob;
      }
      if (filters.maxAge) {
        // e.g. maxAge 35 -> born on or after (now - 36 years)
        const minDob = new Date(now.getFullYear() - filters.maxAge - 1, now.getMonth(), now.getDate());
        dobFilter.gte = minDob;
      }
      where.dateOfBirth = dobFilter;
    }

    // Photo check
    if (filters.hasPhoto !== undefined) {
      if (filters.hasPhoto) {
        where.photoUrl = { not: null };
      } else {
        where.photoUrl = null;
      }
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, profiles] = await Promise.all([
      this.prisma.memberProfile.count({ where }),
      this.prisma.memberProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        include: {
          currentPackage: { select: { name: true } },
          ownerOrg: { select: { id: true, name: true } },
          user: { select: { mobile: true, email: true } },
        },
      }),
    ]);

    // Apply JSON profileData filters in-memory for deep nested profile properties
    const filteredProfiles = profiles.filter((p) => {
      const data = (p.profileData as Record<string, any>) || {};

      if (filters.maritalStatus && data.maritalStatus !== filters.maritalStatus) return false;
      if (filters.religion && data.religion !== filters.religion) return false;
      if (filters.caste && data.caste !== filters.caste) return false;
      if (filters.subCaste && data.subCaste !== filters.subCaste) return false;
      if (filters.interCasteAccepted !== undefined && data.interCasteAccepted !== filters.interCasteAccepted) return false;
      if (filters.raasi && data.raasi !== filters.raasi) return false;
      if (filters.star && data.star !== filters.star) return false;
      if (filters.education && data.education !== filters.education) return false;
      if (filters.profession && data.profession !== filters.profession) return false;
      if (filters.hasPassport !== undefined && Boolean(data.passport) !== filters.hasPassport) return false;
      if (filters.motherTongue && data.motherTongue !== filters.motherTongue) return false;
      if (filters.country && data.country !== filters.country) return false;
      if (filters.state && data.state !== filters.state) return false;
      if (filters.district && data.district !== filters.district) return false;

      return true;
    });

    return {
      total,
      filteredCount: filteredProfiles.length,
      page,
      limit,
      results: filteredProfiles.map((p) => {
        const data = (p.profileData as Record<string, any>) || {};
        const age = now.getFullYear() - new Date(p.dateOfBirth).getFullYear();
        return {
          id: p.id,
          memberId: p.memberId,
          name: `${p.firstName} ${p.lastName}`,
          gender: p.gender,
          age,
          dateOfBirth: p.dateOfBirth,
          package: p.currentPackage?.name || p.packageType,
          isFeatured: p.isFeatured,
          photoUrl: p.photoUrl,
          branchName: p.ownerOrg?.name || 'HQ Central',
          caste: data.caste || 'N/A',
          religion: data.religion || 'N/A',
          education: data.education || 'N/A',
          profession: data.profession || 'N/A',
          income: data.annualIncome || 'N/A',
          location: `${data.city || data.district || ''}, ${data.state || data.country || ''}`.trim(),
          hasPassport: Boolean(data.passport),
          createdAt: p.createdAt,
        };
      }),
    };
  }
}
