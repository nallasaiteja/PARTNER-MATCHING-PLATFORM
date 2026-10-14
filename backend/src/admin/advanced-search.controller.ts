import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdvancedSearchService, AdvancedSearchFilters } from './advanced-search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('admin/search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvancedSearchController {
  constructor(private readonly searchService: AdvancedSearchService) {}

  @Post()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.HQ_SERVICE_TEAM,
    Role.BRANCH_MANAGER,
    Role.BRANCH_STAFF,
    Role.FRANCHISE_MANAGER,
    Role.FRANCHISE_STAFF,
  )
  @HttpCode(HttpStatus.OK)
  searchProfiles(
    @CurrentUser() user: any,
    @Body() filters: AdvancedSearchFilters,
  ) {
    return this.searchService.searchProfiles(user, filters);
  }
}
