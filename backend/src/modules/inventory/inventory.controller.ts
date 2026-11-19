import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory & FEFO')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Ringkasan stok apotek, status menipis, dan peringatan kedaluwarsa' })
  @ApiQuery({ name: 'branchId', required: false })
  async getSummary(@Query('branchId') branchId?: string) {
    return this.inventoryService.getInventorySummary(branchId);
  }

  @Get('batches')
  @ApiOperation({ summary: 'Daftar batch obat terurut berdasarkan prinsip FEFO (First Expired, First Out)' })
  @ApiQuery({ name: 'productId', required: false, description: 'Filter berdasarkan produk' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter status batch (ACTIVE/DEPLETED/EXPIRED)' })
  async getBatches(
    @Query('productId') productId?: string,
    @Query('status') status?: string,
  ) {
    return this.inventoryService.getBatches({ productId, status });
  }

  @Get('expiry-alerts')
  @ApiOperation({ summary: 'Daftar peringatan kedaluwarsa obat (Expired, Kritis < 30 hari, Waspada < 90 hari)' })
  @ApiQuery({ name: 'days', required: false, description: 'Batas hari peringatan (default: 90 hari)' })
  async getExpiryAlerts(@Query('days') days?: number) {
    return this.inventoryService.getExpiryAlerts(days ? Number(days) : 90);
  }

  @Post('adjust')
  @Roles('OWNER', 'MANAGER', 'GUDANG', 'APOTEKER')
  @ApiOperation({ summary: 'Stock Opname / Penyesuaian stok fisik obat per batch' })
  async adjustStock(
    @CurrentUser('id') userId: string,
    @CurrentUser('branchId') branchId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(userId, branchId, dto);
  }

  @Get('movements')
  @Roles('OWNER', 'MANAGER', 'GUDANG', 'ADMIN')
  @ApiOperation({ summary: 'Audit trail mutasi stok (Pembelian, Penjualan FEFO, Stock Opname)' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'type', required: false, description: 'Tipe mutasi (SALE, PURCHASE_RECEIVE, STOCK_ADJUSTMENT)' })
  async getMovements(
    @Query('productId') productId?: string,
    @Query('type') type?: string,
  ) {
    return this.inventoryService.getMovements({ productId, type });
  }
}
