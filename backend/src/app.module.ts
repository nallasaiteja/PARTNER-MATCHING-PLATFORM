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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    StaffModule,
    ProfilesModule,
    TicketsModule,
    UploadModule,
    LocationsModule,
    CommunityModule,
  ],
})
export class AppModule {}
