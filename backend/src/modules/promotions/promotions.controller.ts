import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/promotion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Promotions & Discounts')
@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar semua program promosi dan diskon' })
  async findAll() {
    return this.promotionsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Daftar promosi yang saat ini sedang aktif berjalan' })
  async findActive() {
    return this.promotionsService.findActive();
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validasi dan hitung diskon kode voucher untuk keranjang belanja' })
  @ApiQuery({ name: 'code', description: 'Kode voucher' })
  @ApiQuery({ name: 'subtotal', type: Number, description: 'Total belanjaan saat ini' })
  async validateCode(
    @Query('code') code: string,
    @Query('subtotal') subtotal: number,
  ) {
    return this.promotionsService.validateCode(code, Number(subtotal));
  }

  @Post()
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Buat program promosi baru' })
  async create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }
}
