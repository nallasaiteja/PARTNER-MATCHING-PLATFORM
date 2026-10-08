import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * GET /api/v1/tickets/:id
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM)
  getTicket(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ticketsService.getTicket(user, id);
  }

  /**
   * POST /api/v1/tickets/:id/request-closure
   * Step 1: Request OTP to close ticket
   */
  @Post(':id/request-closure')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM)
  @HttpCode(HttpStatus.OK)
  requestClosure(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.ticketsService.requestTicketClosure(user, id, req.ip);
  }

  /**
   * POST /api/v1/tickets/:id/verify-otp-close
   * Step 2: Verify OTP and close ticket
   */
  @Post(':id/verify-otp-close')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM)
  @HttpCode(HttpStatus.OK)
  verifyOtpAndClose(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('otp') otp: string,
    @Req() req: any,
  ) {
    return this.ticketsService.verifyOtpAndClose(user, id, otp, req.ip);
  }
}
