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
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, ReceiveGoodsDto } from './dto/purchase.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Purchases (Pengadaan)')
@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar semua Purchase Order (PO)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter status (ORDERED/RECEIVED/CANCELLED)' })
  async findAll(
    @CurrentUser('branchId') branchId: string,
    @Query('status') status?: string,
  ) {
    return this.purchasesService.findAll({ branchId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail Purchase Order beserta item dan supplier' })
  async findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Post()
  @Roles('OWNER', 'MANAGER', 'ADMIN', 'GUDANG')
  @ApiOperation({ summary: 'Buat Purchase Order (PO) baru ke PBF / Supplier' })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('branchId') branchId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(userId, branchId, dto);
  }

  @Post(':id/receive')
  @Roles('OWNER', 'MANAGER', 'GUDANG')
  @ApiOperation({ summary: 'Penerimaan barang fisik dari supplier (Membuat Batch baru & Update Stok FEFO)' })
  async receiveGoods(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('branchId') branchId: string,
    @Body() dto: ReceiveGoodsDto,
  ) {
    return this.purchasesService.receiveGoods(id, userId, branchId, dto);
  }
}
