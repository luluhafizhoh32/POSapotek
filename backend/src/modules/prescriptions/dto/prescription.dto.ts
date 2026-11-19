import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PrescriptionItemDto {
  @ApiProperty({ example: 'prod-uuid-1', description: 'ID obat yang diresepkan' })
  @IsString()
  @IsNotEmpty({ message: 'Obat wajib dipilih' })
  productId: string;

  @ApiProperty({ example: '500 mg', description: 'Dosis obat' })
  @IsString()
  @IsNotEmpty({ message: 'Dosis wajib diisi' })
  dosage: string;

  @ApiProperty({ example: '3 x 1 tablet sehari setelah makan', description: 'Aturan pakai (Signa)' })
  @IsString()
  @IsNotEmpty({ message: 'Aturan pakai wajib diisi' })
  dosageInstructions: string;

  @ApiProperty({ example: 10, description: 'Jumlah obat yang diresepkan' })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreatePrescriptionDto {
  @ApiPropertyOptional({ example: 'cust-uuid-1', description: 'ID Pasien / Pelanggan' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ example: 'dr. H. Hendra Wijaya, Sp.PD', description: 'Nama dokter penulis resep' })
  @IsString()
  @IsNotEmpty({ message: 'Nama dokter wajib diisi' })
  doctorName: string;

  @ApiProperty({ example: 'SIP.446/1209/DKS/2023', description: 'Nomor Surat Izin Praktik (SIP) dokter' })
  @IsString()
  @IsNotEmpty({ message: 'Nomor SIP dokter wajib diisi' })
  doctorSip: string;

  @ApiPropertyOptional({ example: 'Pasien mengeluhkan demam 3 hari dan batuk produktif', description: 'Catatan resep / riwayat alergi' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [PrescriptionItemDto], description: 'Daftar racikan / obat dalam resep' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}

export class VerifyPrescriptionDto {
  @ApiProperty({
    example: 'VERIFIED',
    enum: ['VERIFIED', 'REJECTED'],
    description: 'Status verifikasi apoteker',
  })
  @IsString()
  @IsIn(['VERIFIED', 'REJECTED'])
  status: 'VERIFIED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Dosis dan aturan pakai sesuai, tidak ada interaksi berbahaya', description: 'Catatan skrining klinis apoteker' })
  @IsString()
  @IsOptional()
  clinicalNotes?: string;
}
