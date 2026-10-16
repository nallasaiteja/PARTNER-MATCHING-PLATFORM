import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { CreateRazorpayOrderDto, VerifyRazorpayPaymentDto } from './dto/razorpay.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payments/razorpay')
export class PaymentsController {
  constructor(private readonly razorpayService: RazorpayService) {}

  @Get('config')
  getConfig() {
    return this.razorpayService.getConfig();
  }

  @Post('order')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @CurrentUser() user: any,
    @Body() dto: CreateRazorpayOrderDto,
  ) {
    return this.razorpayService.createOrder(user, dto);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verifyPayment(
    @CurrentUser() user: any,
    @Body() dto: VerifyRazorpayPaymentDto,
    @Req() req: any,
  ) {
    return this.razorpayService.verifyPayment(user, dto, req.ip);
  }
}
