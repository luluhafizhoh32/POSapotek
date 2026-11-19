import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemDto {
  @ApiProperty({ example: 'prod-uuid-1', description: 'ID produk obat' })
  @IsString()
  @IsNotEmpty({ message: 'Produk wajib dipilih' })
  productId: string;

  @ApiProperty({ example: 2, description: 'Jumlah yang dibeli' })
  @IsNumber()
  @Min(1, { message: 'Jumlah minimal 1' })
  quantity: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Diskon per item' })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;
}

export class CheckoutDto {
  @ApiPropertyOptional({ example: 'cust-uuid-1', description: 'ID Pelanggan (opsional untuk tamu/walk-in)' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({
    example: 'TUNAI',
    enum: ['TUNAI', 'QRIS', 'DEBIT', 'TRANSFER'],
    description: 'Metode pembayaran',
  })
  @IsString()
  @IsIn(['TUNAI', 'QRIS', 'DEBIT', 'TRANSFER'], {
    message: 'Metode pembayaran harus TUNAI, QRIS, DEBIT, atau TRANSFER',
  })
  paymentMethod: string;

  @ApiPropertyOptional({ example: 50000, description: 'Uang yang diserahkan pelanggan (khusus TUNAI)' })
  @IsNumber()
  @IsOptional()
  cashGiven?: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Potongan diskon keseluruhan faktur' })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional({ example: 'Pembelian resep / OTC umum', description: 'Catatan transaksi' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CartItemDto], description: 'Daftar item belanjaan di keranjang' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}

export class GenerateQrisDto {
  @ApiProperty({ example: 45000, description: 'Nominal transaksi QRIS' })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiPropertyOptional({ example: 'INV-20260923-1001', description: 'Nomor invoice referensi' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;
}
