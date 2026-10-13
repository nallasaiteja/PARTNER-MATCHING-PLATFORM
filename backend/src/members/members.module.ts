import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [MembersController, PackagesController],
  providers: [MembersService, PackagesService],
  exports: [MembersService, PackagesService],
})
export class MembersModule {}
