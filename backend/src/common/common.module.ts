import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditService } from './audit/audit.service';
import { ScopeGuardService } from './guards/scope-guard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  providers: [AuditService, ScopeGuardService, JwtAuthGuard],
  exports: [AuditService, ScopeGuardService, JwtAuthGuard, JwtModule],
})
export class CommonModule {}
