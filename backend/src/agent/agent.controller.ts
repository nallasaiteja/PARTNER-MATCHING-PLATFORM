import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import {
  CreateAgentMemberProfileDto,
  UpdateAgentMemberProfileDto,
  RaiseAgentInvoiceRequestDto,
  FilterAgentProfilesDto,
  FilterAgentInvoicesDto,
} from './dto/agent.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('agent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  // --------------------------------------------------------------------------
  // 1. DASHBOARD & OVERVIEW
  // --------------------------------------------------------------------------

  @Get('dashboard')
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT, Role.SUPER_ADMIN, Role.ADMIN)
  getDashboard(@CurrentUser() user: any) {
    return this.agentService.getDashboard(user);
  }

  // --------------------------------------------------------------------------
  // 2. MEMBER PROFILES (OWN PROFILES ONLY)
  // --------------------------------------------------------------------------

  @Get('profiles')
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT, Role.SUPER_ADMIN, Role.ADMIN)
  listOwnProfiles(
    @CurrentUser() user: any,
    @Query() filter: FilterAgentProfilesDto,
  ) {
    return this.agentService.listOwnProfiles(user, filter);
  }

  @Get('profiles/:id')
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT, Role.SUPER_ADMIN, Role.ADMIN)
  getOwnProfile(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agentService.getOwnProfile(user, id);
  }

  @Post('profiles')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT, Role.SUPER_ADMIN, Role.ADMIN)
  createMemberProfile(
    @CurrentUser() user: any,
    @Body() dto: CreateAgentMemberProfileDto,
    @Req() req: any,
  ) {
    return this.agentService.createMemberProfile(user, dto, req.ip);
  }

  @Patch('profiles/:id')
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT, Role.SUPER_ADMIN, Role.ADMIN)
  updateOwnProfile(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAgentMemberProfileDto,
    @Req() req: any,
  ) {
    return this.agentService.updateOwnProfile(user, id, dto, req.ip);
  }

  @Delete('profiles/:id')
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT, Role.SUPER_ADMIN, Role.ADMIN)
  deleteProfile(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agentService.deleteProfile(user, id);
  }

  // --------------------------------------------------------------------------
  // 3. INVOICE REQUESTS
  // --------------------------------------------------------------------------

  @Get('invoices')
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT, Role.SUPER_ADMIN, Role.ADMIN)
  listOwnInvoices(
    @CurrentUser() user: any,
    @Query() filter: FilterAgentInvoicesDto,
  ) {
    return this.agentService.listOwnInvoices(user, filter);
  }

  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT, Role.SUPER_ADMIN, Role.ADMIN)
  raiseInvoiceRequest(
    @CurrentUser() user: any,
    @Body() dto: RaiseAgentInvoiceRequestDto,
    @Req() req: any,
  ) {
    return this.agentService.raiseInvoiceRequest(user, dto, req.ip);
  }

  @Post('invoices/:id/approve')
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT)
  approveInvoice(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agentService.approveInvoice(user, id);
  }

  // --------------------------------------------------------------------------
  // 4. COMMISSION VIEW & REPORTING
  // --------------------------------------------------------------------------

  @Get('commissions')
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT, Role.SUPER_ADMIN, Role.ADMIN)
  getCommissionView(@CurrentUser() user: any) {
    return this.agentService.getCommissionView(user);
  }

  @Post('commissions')
  @Roles(Role.BRANCH_AGENT, Role.FRANCHISE_AGENT)
  configureCommission(@CurrentUser() user: any) {
    return this.agentService.configureCommission(user);
  }
}
