import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ example: 'SEHATHEMAT', description: 'Kode voucher promosi' })
  @IsString()
  @IsNotEmpty({ message: 'Kode promo wajib diisi' })
  code: string;

  @ApiProperty({ example: 'Diskon Akhir Pekan Sehat', description: 'Nama program promosi' })
  @IsString()
  @IsNotEmpty({ message: 'Nama promosi wajib diisi' })
  name: string;

  @ApiProperty({ example: 'PERCENTAGE', enum: ['PERCENTAGE', 'FIXED', 'MIN_PURCHASE'], description: 'Tipe promosi' })
  @IsString()
  @IsIn(['PERCENTAGE', 'FIXED', 'MIN_PURCHASE'])
  type: string;

  @ApiProperty({ example: 10, description: 'Nilai promosi (persentase / nominal potongan)' })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ example: 50000, description: 'Batas minimal belanja untuk menggunakan promo' })
  @IsNumber()
  @IsOptional()
  minPurchase?: number;

  @ApiProperty({ example: '2026-09-01', description: 'Tanggal mulai berlaku' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-31', description: 'Tanggal berakhir' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ default: true, description: 'Status aktif' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
