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
import { ComplaintsService } from './complaints.service';
import {
  CreateComplaintDto,
  UpdateComplaintDto,
  ComplaintQueryDto,
} from './dto/complaint.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('api/v1/complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN) // Strictly restricted to Admin/Super Admin
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  async createComplaint(@Req() req: any, @Body() dto: CreateComplaintDto) {
    return this.complaintsService.createComplaint(req.user, dto);
  }

  @Get()
  async listComplaints(@Req() req: any, @Query() query: ComplaintQueryDto) {
    return this.complaintsService.listComplaints(req.user, query);
  }

  @Get(':id')
  async getComplaint(@Req() req: any, @Param('id') id: string) {
    return this.complaintsService.getComplaintById(req.user, id);
  }

  @Patch(':id')
  async updateComplaint(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    return this.complaintsService.updateComplaint(req.user, id, dto);
  }
}
