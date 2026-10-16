import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import {
  CreateSuggestionDto,
  UpdateSuggestionStatusDto,
  TogglePackageEligibilityDto,
  SuggestionQueryDto,
} from './dto/suggestions.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('api/v1/suggestions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  // 1. Staff suggests a profile to an eligible paid member
  @Post()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.BRANCH_MANAGER,
    Role.BRANCH_STAFF,
    Role.HQ_SERVICE_TEAM,
  )
  async createSuggestion(@Req() req: any, @Body() dto: CreateSuggestionDto) {
    return this.suggestionsService.createSuggestion(req.user, dto);
  }

  // 2. Member views suggestions directed to them
  @Get('my-suggestions')
  @Roles(Role.MEMBER, Role.SUPER_ADMIN, Role.ADMIN)
  async getMySuggestions(@Req() req: any) {
    return this.suggestionsService.getMemberSuggestions(req.user);
  }

  // 3. Member updates suggestion status (VIEWED, INTERESTED, DECLINED)
  @Patch(':id/status')
  @Roles(Role.MEMBER, Role.SUPER_ADMIN, Role.ADMIN)
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSuggestionStatusDto,
  ) {
    return this.suggestionsService.updateMemberSuggestionStatus(req.user, id, dto);
  }

  // 4. Admin lists all packages with eligibility
  @Get('packages')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  async listPackages() {
    return this.suggestionsService.listPackagesWithEligibility();
  }

  // 5. Admin configures package eligibility
  @Patch('packages/:id/eligibility')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async toggleEligibility(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: TogglePackageEligibilityDto,
  ) {
    return this.suggestionsService.togglePackageEligibility(
      req.user,
      id,
      dto.eligible,
    );
  }

  // 6. Suggestion History Report (Admin, Branch Manager)
  @Get('history')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  async getHistory(@Req() req: any, @Query() query: SuggestionQueryDto) {
    return this.suggestionsService.getSuggestionHistory(req.user, query);
  }
}
