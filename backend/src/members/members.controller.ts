import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  MatchQueryFilterDto,
  ContactRevealActionDto,
  InterestActionDto,
} from './dto/member-actions.dto';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.membersService.getDashboard(user.id);
  }

  @Get('matches/verified')
  getVerifiedMatches(
    @CurrentUser() user: any,
    @Query() filters: MatchQueryFilterDto,
  ) {
    return this.membersService.getVerifiedMatches(user.id, filters);
  }

  @Get('matches/matched')
  getMatchedProfiles(
    @CurrentUser() user: any,
    @Query() filters: MatchQueryFilterDto,
  ) {
    return this.membersService.getMatchedProfiles(user.id, filters);
  }

  @Get('matches/:id')
  getMatchDetail(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.membersService.getMatchDetail(user.id, id, ipAddress);
  }

  @Post('matches/:id/reveal-contact')
  @HttpCode(HttpStatus.OK)
  revealContact(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.membersService.revealContact(user.id, id, ipAddress);
  }

  @Get('contacts/requests')
  getContactRequests(@CurrentUser() user: any) {
    return this.membersService.getContactRequests(user.id);
  }

  @Patch('contacts/requests/:id')
  @HttpCode(HttpStatus.OK)
  respondToContactRequest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ContactRevealActionDto,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.membersService.respondToContactRequest(user.id, id, dto.action, ipAddress);
  }

  @Get('contacts/revealed')
  getRevealedContacts(@CurrentUser() user: any) {
    return this.membersService.getRevealedContacts(user.id);
  }

  @Post('interests/:targetProfileId')
  @HttpCode(HttpStatus.CREATED)
  sendInterest(
    @CurrentUser() user: any,
    @Param('targetProfileId') targetProfileId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.membersService.sendInterest(user.id, targetProfileId, ipAddress);
  }

  @Get('interests/sent')
  getSentInterests(@CurrentUser() user: any) {
    return this.membersService.getSentInterests(user.id);
  }

  @Get('interests/received')
  getReceivedInterests(@CurrentUser() user: any) {
    return this.membersService.getReceivedInterests(user.id);
  }

  @Patch('interests/:id')
  @HttpCode(HttpStatus.OK)
  respondToInterest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: InterestActionDto,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.membersService.respondToInterest(user.id, id, dto.status, ipAddress);
  }

  @Post('shortlist/:targetProfileId')
  @HttpCode(HttpStatus.OK)
  toggleShortlist(
    @CurrentUser() user: any,
    @Param('targetProfileId') targetProfileId: string,
  ) {
    return this.membersService.toggleShortlist(user.id, targetProfileId);
  }

  @Get('shortlist')
  listShortlist(@CurrentUser() user: any) {
    return this.membersService.listShortlist(user.id);
  }

  @Post('blocklist/:targetProfileId')
  @HttpCode(HttpStatus.OK)
  toggleBlocklist(
    @CurrentUser() user: any,
    @Param('targetProfileId') targetProfileId: string,
  ) {
    return this.membersService.toggleBlocklist(user.id, targetProfileId);
  }

  @Get('blocklist')
  listBlocklist(@CurrentUser() user: any) {
    return this.membersService.listBlocklist(user.id);
  }

  @Get('activity/views')
  getActivityViews(@CurrentUser() user: any) {
    return this.membersService.getActivityViews(user.id);
  }

  @Get('suggested')
  getSuggestedProfiles(@CurrentUser() user: any) {
    return this.membersService.getSuggestedProfiles(user.id);
  }
}
