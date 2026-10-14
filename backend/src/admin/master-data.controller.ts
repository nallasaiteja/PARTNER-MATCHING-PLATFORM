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
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('admin/master-data')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get()
  listOptions(@Query('category') category?: string) {
    return this.masterDataService.listOptions(category);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createOption(
    @CurrentUser() user: any,
    @Body() dto: {
      category: string;
      code: string;
      label: string;
      parentCode?: string;
      sortOrder?: number;
      metadata?: any;
    },
    @Req() req: any,
  ) {
    return this.masterDataService.createOption(user, dto, req.ip);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  updateOption(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: {
      label?: string;
      sortOrder?: number;
      isActive?: boolean;
      metadata?: any;
    },
    @Req() req: any,
  ) {
    return this.masterDataService.updateOption(user, id, dto, req.ip);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  deleteOption(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.masterDataService.deleteOption(user, id, req.ip);
  }

  @Get('terms')
  getTerms() {
    return this.masterDataService.getTermsAndConditions();
  }

  @Post('terms')
  @Roles(Role.SUPER_ADMIN)
  updateTerms(
    @CurrentUser() user: any,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    return this.masterDataService.updateTermsAndConditions(user, content, req.ip);
  }
}
