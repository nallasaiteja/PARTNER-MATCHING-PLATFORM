import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminMembersController } from './admin-members.controller';
import { AdminMembersService } from './admin-members.service';
import { MobileRequestsController } from './mobile-requests.controller';
import { MobileRequestsService } from './mobile-requests.service';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { AdminPackagesController } from './admin-packages.controller';
import { AdminPackagesService } from './admin-packages.service';
import { AdvancedSearchController } from './advanced-search.controller';
import { AdvancedSearchService } from './advanced-search.service';
import { FeaturedProfilesController } from './featured-profiles.controller';
import { FeaturedProfilesService } from './featured-profiles.service';
import { AdvertisementsController } from './advertisements.controller';
import { AdvertisementsService } from './advertisements.service';
import { WeddingServicesController } from './wedding-services.controller';
import { WeddingServicesService } from './wedding-services.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [
    AdminDashboardController,
    AdminMembersController,
    MobileRequestsController,
    AlertsController,
    MasterDataController,
    AdminPackagesController,
    AdvancedSearchController,
    FeaturedProfilesController,
    AdvertisementsController,
    WeddingServicesController,
  ],
  providers: [
    AdminDashboardService,
    AdminMembersService,
    MobileRequestsService,
    AlertsService,
    MasterDataService,
    AdminPackagesService,
    AdvancedSearchService,
    FeaturedProfilesService,
    AdvertisementsService,
    WeddingServicesService,
  ],
  exports: [
    AdminDashboardService,
    AdminMembersService,
    MobileRequestsService,
    AlertsService,
    MasterDataService,
    AdminPackagesService,
    AdvancedSearchService,
    FeaturedProfilesService,
    AdvertisementsService,
    WeddingServicesService,
  ],
})
export class AdminModule {}
