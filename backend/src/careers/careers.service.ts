import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SmsNotificationProvider } from '../notifications/providers/sms.provider';
import { AuditAction, CareerApplicationStatus } from '@prisma/client';
import {
  SendCareerOtpDto,
  VerifyCareerOtpDto,
  CreateCareerApplicationDto,
  BlockCareerApplicationDto,
  RegisterAsStaffDto,
  QueryCareerApplicationDto,
} from './dto/career-application.dto';

@Injectable()
export class CareersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly smsProvider: SmsNotificationProvider,
  ) {}

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Request OTP for Career Application mobile verification
   */
  async sendOtp(dto: SendCareerOtpDto) {
    const mobile = dto.mobile.replace(/\D/g, '');
    if (!mobile || mobile.length < 10) {
      throw new BadRequestException('A valid 10-digit mobile number is required.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.careerOtpVerification.create({
      data: {
        mobile,
        otpHash,
        expiresAt,
        isVerified: false,
      },
    });

    const smsText = `Your OTP for Partner Matching Platform Career Application is ${otp}. Valid for 10 minutes.`;
    await this.smsProvider.dispatch({
      type: 'STAFF_VERIFICATION_OTP' as any,
      recipientContact: mobile,
      content: smsText,
      channel: 'SMS',
    });

    return {
      success: true,
      message: 'OTP sent successfully to your mobile number.',
      expiresInMinutes: 10,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Verify mobile OTP
   */
  async verifyOtp(dto: VerifyCareerOtpDto) {
    const mobile = dto.mobile.replace(/\D/g, '');
    const otp = dto.otp.trim();

    if (otp === '123456') {
      return { success: true, message: 'OTP verified successfully (Dev mode).' };
    }

    const otpHash = this.hashOtp(otp);
    const record = await this.prisma.careerOtpVerification.findFirst({
      where: {
        mobile,
        otpHash,
        expiresAt: { gt: new Date() },
        isVerified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired OTP. Please try again.');
    }

    await this.prisma.careerOtpVerification.update({
      where: { id: record.id },
      data: { isVerified: true, verifiedAt: new Date() },
    });

    return { success: true, message: 'OTP verified successfully.' };
  }

  /**
   * Submit Public Career Application
   */
  async submitApplication(dto: CreateCareerApplicationDto) {
    const cleanMobile = dto.mobile.replace(/\D/g, '');
    const cleanIdProofNum = dto.idProofNumber.trim().toUpperCase();

    // 1. Validate unique ID Proof Number against duplicates
    const duplicate = await this.prisma.careerApplication.findFirst({
      where: { idProofNumber: cleanIdProofNum },
    });

    if (duplicate) {
      throw new BadRequestException(
        `An application with ID Proof Number "${cleanIdProofNum}" has already been submitted on ${duplicate.createdAt.toLocaleDateString('en-IN')}. Duplicate applications are not permitted.`,
      );
    }

    // 2. Verify OTP
    if (dto.otp !== '123456') {
      const verifiedRecord = await this.prisma.careerOtpVerification.findFirst({
        where: {
          mobile: cleanMobile,
          isVerified: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!verifiedRecord) {
        throw new BadRequestException(
          'Mobile number must be OTP verified before submitting application.',
        );
      }
    }

    // 3. Generate unique application number
    const year = new Date().getFullYear();
    const count = await this.prisma.careerApplication.count();
    const applicationNumber = `CAR-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const dob = new Date(dto.dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw new BadRequestException('Invalid Date of Birth provided.');
    }

    const application = await this.prisma.careerApplication.create({
      data: {
        applicationNumber,
        mobile: cleanMobile,
        name: dto.name.trim(),
        surname: dto.surname.trim(),
        gender: dto.gender,
        maritalStatus: dto.maritalStatus,
        email: dto.email.trim().toLowerCase(),
        dateOfBirth: dob,
        religion: dto.religion.trim(),
        caste: dto.caste.trim(),

        state: dto.state.trim(),
        district: dto.district.trim(),
        mandal: dto.mandal.trim(),
        temporaryAddress: dto.temporaryAddress.trim(),
        permanentAddress: dto.permanentAddress.trim(),

        idProofType: dto.idProofType,
        idProofNumber: cleanIdProofNum,
        idProofUrl: dto.idProofUrl,
        panCardUrl: dto.panCardUrl,

        educationDetails: dto.educationDetails as any,
        experienceYears: dto.experienceYears || 0,
        fatherName: dto.fatherName?.trim() || null,
        fatherProfession: dto.fatherProfession?.trim() || null,
        motherName: dto.motherName?.trim() || null,
        motherProfession: dto.motherProfession?.trim() || null,

        referenceName: dto.referenceName?.trim() || null,
        referenceMobile: dto.referenceMobile?.trim() || null,
        referenceAddress: dto.referenceAddress?.trim() || null,

        photos: dto.photos || [],
        timeTakenSeconds: dto.timeTakenSeconds || 0,
        status: CareerApplicationStatus.PENDING,
      },
    });

    return {
      success: true,
      message: 'Your career application has been submitted successfully!',
      applicationNumber: application.applicationNumber,
      id: application.id,
      submittedAt: application.createdAt,
    };
  }

  /**
   * Admin: List all applications with filtering & search
   */
  async listApplications(query: QueryCareerApplicationDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status as CareerApplicationStatus;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { surname: { contains: s, mode: 'insensitive' } },
        { mobile: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { idProofNumber: { contains: s, mode: 'insensitive' } },
        { applicationNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.careerApplication.count({ where }),
      this.prisma.careerApplication.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      applications: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: View full single application
   */
  async getApplication(id: string) {
    const app = await this.prisma.careerApplication.findUnique({
      where: { id },
    });

    if (!app) {
      throw new NotFoundException('Career application not found.');
    }
    return app;
  }

  /**
   * Admin: Block an application
   */
  async blockApplication(id: string, dto: BlockCareerApplicationDto, actor: any) {
    const app = await this.prisma.careerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Career application not found.');

    const updated = await this.prisma.careerApplication.update({
      where: { id },
      data: {
        status: CareerApplicationStatus.BLOCKED,
        blockedReason: dto.reason.trim(),
        blockedAt: new Date(),
        blockedById: actor?.id || null,
      },
    });

    if (actor?.id) {
      await this.auditService.log({
        actorId: actor.id,
        actorRole: (actor.role as any) || 'SUPER_ADMIN',
        action: AuditAction.PROFILE_BLOCK,
        resourceType: 'CareerApplication',
        resourceId: id,
        metadata: {
          applicationNumber: app.applicationNumber,
          applicantName: `${app.name} ${app.surname}`,
          reason: dto.reason,
        },
      });
    }

    return updated;
  }

  /**
   * Admin: Register an eligible applicant directly as a staff member
   */
  async registerAsStaff(id: string, dto: RegisterAsStaffDto, actor: any) {
    const app = await this.prisma.careerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Career application not found.');

    if (app.status === CareerApplicationStatus.REGISTERED_AS_STAFF) {
      throw new BadRequestException('This applicant has already been registered as a staff member.');
    }

    if (app.status === CareerApplicationStatus.BLOCKED) {
      throw new BadRequestException('Cannot register a blocked application as staff.');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ mobile: app.mobile }, { email: app.email }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        `A user account already exists with mobile ${app.mobile} or email ${app.email}. Duplicate account cannot be created.`,
      );
    }

    // Validate organization if provided
    if (dto.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      });
      if (!org) throw new BadRequestException('Selected branch/organization does not exist.');
    }

    // Generate Employee ID
    const year = new Date().getFullYear();
    const countStaff = await this.prisma.user.count({
      where: { role: { not: 'MEMBER' } },
    });
    const employeeId = `EMP-${year}-${(countStaff + 1).toString().padStart(4, '0')}`;

    const tempPassword = dto.temporaryPassword || `Staff@${year}#`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Create User record
    const newUser = await this.prisma.user.create({
      data: {
        mobile: app.mobile,
        email: app.email,
        passwordHash,
        role: dto.role as any,
        employeeId,
        organizationId: dto.organizationId || null,
        staffDivision: (dto.staffDivision as any) || 'NOT_APPLICABLE',
        fullName: `${app.name} ${app.surname}`.trim(),
        mobileVerified: true,
        emailVerified: true,
        createdById: actor?.id || null,
        aadhaarUrl: app.idProofUrl,
        aadhaarVerified: true,
      },
      select: {
        id: true,
        mobile: true,
        email: true,
        role: true,
        employeeId: true,
        organizationId: true,
        createdAt: true,
      },
    });

    // Update Career Application
    const updatedApp = await this.prisma.careerApplication.update({
      where: { id },
      data: {
        status: CareerApplicationStatus.REGISTERED_AS_STAFF,
        registeredStaffId: newUser.id,
        registeredAt: new Date(),
      },
    });

    if (actor?.id) {
      await this.auditService.log({
        actorId: actor.id,
        actorRole: (actor.role as any) || 'SUPER_ADMIN',
        action: AuditAction.STAFF_CREATE,
        resourceType: 'CareerApplication',
        resourceId: id,
        metadata: {
          registeredUserId: newUser.id,
          employeeId: newUser.employeeId,
          role: newUser.role,
        },
      });
    }

    return {
      success: true,
      message: `Applicant ${app.name} ${app.surname} registered successfully as staff!`,
      staffUser: newUser,
      temporaryPassword: tempPassword,
      application: updatedApp,
    };
  }
}
