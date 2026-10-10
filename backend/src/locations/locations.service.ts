import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LocationLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './location.dto';

const PARENT_LEVEL: Record<LocationLevel, LocationLevel | null> = {
  COUNTRY: null,
  STATE: LocationLevel.COUNTRY,
  DISTRICT: LocationLevel.STATE,
  MANDAL: LocationLevel.DISTRICT,
  VILLAGE: LocationLevel.MANDAL,
};

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(parentId?: string, level?: LocationLevel) {
    if (parentId) {
      const parent = await this.prisma.locationMaster.findFirst({
        where: { id: parentId, isActive: true },
      });
      if (!parent) throw new NotFoundException('Parent location not found');
    }

    if (level && !Object.values(LocationLevel).includes(level)) {
      throw new BadRequestException('Invalid location level');
    }

    return this.prisma.locationMaster.findMany({
      where: {
        parentId: parentId || null,
        isActive: true,
        ...(level ? { level } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateLocationDto) {
    const expectedParentLevel = PARENT_LEVEL[dto.level];
    if (expectedParentLevel === null && dto.parentId) {
      throw new BadRequestException('Countries cannot have a parent location');
    }
    if (expectedParentLevel !== null && !dto.parentId) {
      throw new BadRequestException(`${dto.level} requires a ${expectedParentLevel.toLowerCase()} parent`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.locationMaster.findFirst({
        where: { id: dto.parentId, isActive: true },
      });
      if (!parent) throw new NotFoundException('Parent location not found');
      if (parent.level !== expectedParentLevel) {
        throw new BadRequestException(`${dto.level} must belong to a ${expectedParentLevel?.toLowerCase()}`);
      }
    }

    const name = dto.name.trim();
    const duplicate = await this.prisma.locationMaster.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, level: dto.level, parentId: dto.parentId || null },
    });
    if (duplicate) throw new ConflictException('This location already exists under the selected parent');

    return this.prisma.locationMaster.create({
      data: { name, level: dto.level, parentId: dto.parentId || null },
    });
  }

  async update(id: string, dto: UpdateLocationDto) {
    const location = await this.prisma.locationMaster.findUnique({ where: { id } });
    if (!location) throw new NotFoundException('Location not found');

    const name = dto.name?.trim();
    if (name && name.toLocaleLowerCase() !== location.name.toLocaleLowerCase()) {
      const duplicate = await this.prisma.locationMaster.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
          level: location.level,
          parentId: location.parentId,
        },
      });
      if (duplicate) throw new ConflictException('This location already exists under the selected parent');
    }

    return this.prisma.locationMaster.update({
      where: { id },
      data: { ...(name ? { name } : {}), ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}) },
    });
  }
}