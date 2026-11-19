import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ example: 'prod-uuid-1', description: 'ID produk obat' })
  @IsString()
  @IsNotEmpty({ message: 'Produk wajib dipilih' })
  productId: string;

  @ApiProperty({ example: 'batch-uuid-1', description: 'ID batch obat spesifik' })
  @IsString()
  @IsNotEmpty({ message: 'Batch spesifik wajib dipilih' })
  batchId: string;

  @ApiProperty({ example: 45, description: 'Jumlah fisik riil hasil stock opname' })
  @IsNumber()
  @Min(0, { message: 'Jumlah stok tidak boleh negatif' })
  actualQuantity: number;

  @ApiProperty({ example: 'Penyesuaian hasil Stock Opname bulanan', description: 'Alasan penyesuaian stok' })
  @IsString()
  @IsNotEmpty({ message: 'Alasan penyesuaian wajib diisi' })
  notes: string;

  @ApiPropertyOptional({ description: 'ID Cabang (opsional, diambil dari pengguna jika kosong)' })
  @IsString()
  @IsOptional()
  branchId?: string;
}
