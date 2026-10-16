import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { WhatsAppMarketingCampaignDto } from './dto/marketing.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN) // Strictly restricted to Admin & Super Admin per spec
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Post('whatsapp-campaign')
  async triggerWhatsAppCampaign(
    @Req() req: any,
    @Body() dto: WhatsAppMarketingCampaignDto,
  ) {
    return this.marketingService.sendWhatsAppCampaign(req.user, dto);
  }

  @Get('attribution-report')
  async getAttributionReport(@Req() req: any) {
    return this.marketingService.getAttributionReport(req.user);
  }

  @Get('templates')
  getApprovedTemplates() {
    return this.marketingService.getApprovedTemplates();
  }
}
