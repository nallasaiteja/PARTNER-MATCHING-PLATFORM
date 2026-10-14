import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MobileRequestsService } from './mobile-requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('admin/mobile-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MobileRequestsController {
  constructor(private readonly mobileRequestsService: MobileRequestsService) {}

  @Get()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.HQ_SERVICE_TEAM,
    Role.BRANCH_MANAGER,
    Role.BRANCH_STAFF,
  )
  listRequests(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.mobileRequestsService.listMobileRequests({ status, search, page, limit });
  }

  @Patch(':id/respond')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.HQ_SERVICE_TEAM,
    Role.BRANCH_MANAGER,
    Role.BRANCH_STAFF,
  )
  @HttpCode(HttpStatus.OK)
  respondOnBehalfOfMember(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('action') action: 'ACCEPTED' | 'REJECTED',
    @Req() req: any,
  ) {
    return this.mobileRequestsService.respondOnBehalfOfMember(user, id, action, req.ip);
  }
}
