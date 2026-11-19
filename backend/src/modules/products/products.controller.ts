import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar semua produk / obat dengan filter kategori, pencarian, dan stok' })
  @ApiQuery({ name: 'search', required: false, description: 'Cari nama obat, merk, kandungan generik, atau SKU' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter berdasarkan ID kategori' })
  @ApiQuery({ name: 'isPrescriptionRequired', required: false, type: Boolean, description: 'Filter obat resep vs OTC' })
  @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean, description: 'Hanya tampilkan obat dengan stok menipis' })
  async findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isPrescriptionRequired') isPrescriptionRequired?: boolean,
    @Query('lowStockOnly') lowStockOnly?: boolean,
  ) {
    return this.productsService.findAll({
      search,
      categoryId,
      isPrescriptionRequired,
      lowStockOnly,
    });
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Pencarian obat cepat via barcode (untuk Barcode Scanner POS)' })
  async findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail lengkap obat, sediaan, harga, dan riwayat batch' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles('OWNER', 'MANAGER', 'ADMIN', 'APOTEKER')
  @ApiOperation({ summary: 'Tambah produk / obat baru' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @Roles('OWNER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Perbarui informasi obat' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Hapus data obat' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
