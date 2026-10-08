import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit/audit.service';
import { ScopeGuardService } from './guards/scope-guard.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuditService, ScopeGuardService],
  exports: [AuditService, ScopeGuardService],
})
export class CommonModule {}
