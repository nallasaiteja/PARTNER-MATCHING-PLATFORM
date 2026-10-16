import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFestivalDto, UpdateFestivalDto } from './dto/notifications.dto';
import { AutomatedRemindersService } from './automated-reminders.service';

@Injectable()
export class FestivalsService {
  private readonly logger = new Logger(FestivalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automatedRemindersService: AutomatedRemindersService,
  ) {}

  async listFestivals() {
    return this.prisma.festivalWishConfig.findMany({
      orderBy: { festivalDate: 'asc' },
    });
  }

  async createFestival(actor: any, dto: CreateFestivalDto) {
    const festival = await this.prisma.festivalWishConfig.create({
      data: {
        festivalName: dto.festivalName,
        festivalDate: dto.festivalDate,
        messageTemplate: dto.messageTemplate,
        discountPercent: dto.discountPercent,
        offerCode: dto.offerCode,
        channels: dto.channels || ['APP_PUSH', 'EMAIL', 'WHATSAPP'],
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdById: actor.id,
      },
    });

    this.logger.log(`Created festival wish configuration: ${festival.festivalName} (${festival.festivalDate})`);
    return festival;
  }

  async updateFestival(id: string, dto: UpdateFestivalDto) {
    const existing = await this.prisma.festivalWishConfig.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Festival configuration not found');

    return this.prisma.festivalWishConfig.update({
      where: { id },
      data: {
        festivalName: dto.festivalName,
        festivalDate: dto.festivalDate,
        messageTemplate: dto.messageTemplate,
        discountPercent: dto.discountPercent,
        offerCode: dto.offerCode,
        channels: dto.channels,
        isActive: dto.isActive,
      },
    });
  }

  async deleteFestival(id: string) {
    const existing = await this.prisma.festivalWishConfig.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Festival configuration not found');

    return this.prisma.festivalWishConfig.delete({
      where: { id },
    });
  }

  async dispatchFestival(id: string) {
    const existing = await this.prisma.festivalWishConfig.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Festival configuration not found');

    return this.automatedRemindersService.dispatchFestivalWishes(id);
  }
}
