import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { StaffModule } from './staff/staff.module';
import { ProfilesModule } from './profiles/profiles.module';
import { TicketsModule } from './tickets/tickets.module';
import { UploadModule } from './upload/upload.module';
import { LocationsModule } from './locations/locations.module';
import { CommunityModule } from './community/community.module';
import { MembersModule } from './members/members.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AdminModule } from './admin/admin.module';
import { FinanceModule } from './finance/finance.module';
import { ReportsModule } from './reports/reports.module';
import { BranchModule } from './branch/branch.module';
import { AgentModule } from './agent/agent.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SuccessStoriesModule } from './success-stories/success-stories.module';
import { CareersModule } from './careers/careers.module';
import { LeaveModule } from './leave/leave.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { SuggestionsModule } from './suggestions/suggestions.module';
import { MarketingModule } from './marketing/marketing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SupabaseModule,
    CommonModule,
    AuthModule,
    StaffModule,
    ProfilesModule,
    TicketsModule,
    UploadModule,
    LocationsModule,
    CommunityModule,
    MembersModule,
    AdminModule,
    FinanceModule,
    ReportsModule,
    BranchModule,
    AgentModule,
    NotificationsModule,
    SuccessStoriesModule,
    CareersModule,
    LeaveModule,
    ComplaintsModule,
    SuggestionsModule,
    MarketingModule,
  ],
})

export class AppModule {}
