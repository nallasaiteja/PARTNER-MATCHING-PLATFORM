import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpgradePackageDto } from './dto/member-actions.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('packages')
export class PackagesController {
  constructor(
    private readonly packagesService: PackagesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  listPackages() {
    return this.packagesService.listActivePackages();
  }

  @Get('payment-details')
  getPaymentDetails() {
    return this.packagesService.getPaymentDetails();
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async upgradePackage(
    @CurrentUser() user: any,
    @Body() dto: UpgradePackageDto,
    @Req() req: any,
  ) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      throw new ForbiddenException('Only registered members can upgrade packages');
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.packagesService.upgradePackage(profile.id, user, dto, ipAddress);
  }
}
