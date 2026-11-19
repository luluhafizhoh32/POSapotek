import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CheckoutDto, GenerateQrisDto } from './dto/sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sales & POS (Kasir)')
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Riwayat transaksi penjualan kasir' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Tanggal mulai (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Tanggal akhir (YYYY-MM-DD)' })
  async findAll(
    @CurrentUser('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.findAll({ branchId, startDate, endDate });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail faktur penjualan, item obat, batch terpotong & pembayaran' })
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post('checkout')
  @Roles('OWNER', 'MANAGER', 'KASIR', 'ADMIN')
  @ApiOperation({
    summary: 'Checkout transaksi POS Kasir (Pengurangan stok otomatis berbasis FEFO & Simulasi Pembayaran)',
  })
  async checkout(
    @CurrentUser('id') userId: string,
    @CurrentUser('branchId') branchId: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.salesService.checkout(userId, branchId, dto);
  }

  @Post('qris/generate')
  @Roles('OWNER', 'MANAGER', 'KASIR')
  @ApiOperation({ summary: 'Generate kode QRIS simulasi dinamis untuk pembayaran kasir' })
  async generateQris(@Body() dto: GenerateQrisDto) {
    return this.salesService.generateQris(dto);
  }

  @Get('qris/verify/:referenceCode')
  @Roles('OWNER', 'MANAGER', 'KASIR')
  @ApiOperation({ summary: 'Verifikasi status pembayaran QRIS simulasi' })
  async verifyQris(@Param('referenceCode') referenceCode: string) {
    return this.salesService.verifyQris(referenceCode);
  }
}
