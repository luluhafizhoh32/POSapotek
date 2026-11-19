import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'cat-uuid-1', description: 'ID kategori obat' })
  @IsString()
  @IsNotEmpty({ message: 'Kategori obat wajib dipilih' })
  categoryId: string;

  @ApiPropertyOptional({ example: 'MED-PAR-001', description: 'SKU produk (opsional, dibuat otomatis jika kosong)' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: '899123456701', description: 'Barcode produk (opsional, dibuat otomatis jika kosong)' })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ example: 'Paracetamol 500mg', description: 'Nama dagang / merk obat' })
  @IsString()
  @IsNotEmpty({ message: 'Nama obat wajib diisi' })
  name: string;

  @ApiPropertyOptional({ example: 'Acetaminophen', description: 'Nama generik kandungan zat aktif' })
  @IsString()
  @IsOptional()
  genericName?: string;

  @ApiPropertyOptional({ example: 'Sanbe Farma', description: 'Nama produsen / brand' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ example: 'Tablet', description: 'Bentuk sediaan (Tablet, Sirup, Kapsul, Salep, dll.)' })
  @IsString()
  @IsNotEmpty({ message: 'Bentuk sediaan wajib diisi' })
  dosageForm: string;

  @ApiPropertyOptional({ example: '500 mg', description: 'Kekuatan dosis obat' })
  @IsString()
  @IsOptional()
  dosage?: string;

  @ApiProperty({ example: 'Strip', description: 'Satuan terkecil (Strip, Botol, Tube, Box, Blister, Sachet)' })
  @IsString()
  @IsNotEmpty({ message: 'Satuan kemasan wajib diisi' })
  unit: string;

  @ApiProperty({ example: 8500, description: 'Harga beli / HPP per satuan' })
  @IsNumber()
  @Min(0)
  buyPrice: number;

  @ApiProperty({ example: 12000, description: 'Harga jual ke konsumen per satuan' })
  @IsNumber()
  @Min(0)
  sellPrice: number;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Batas minimal stok peringatan' })
  @IsNumber()
  @IsOptional()
  minStock?: number;

  @ApiPropertyOptional({ example: 500, default: 500, description: 'Kapasitas maksimal stok' })
  @IsNumber()
  @IsOptional()
  maxStock?: number;

  @ApiPropertyOptional({ example: false, default: false, description: 'Memerlukan resep dokter (obat keras/narkotika)' })
  @IsBoolean()
  @IsOptional()
  isPrescriptionRequired?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Status aktif' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProductDto extends CreateProductDto {}
