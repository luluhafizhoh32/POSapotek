import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'SUP-001', description: 'Kode unik supplier/PBF' })
  @IsString()
  @IsNotEmpty({ message: 'Kode supplier wajib diisi' })
  code: string;

  @ApiProperty({ example: 'Budi Santoso', description: 'Nama kontak sales/representatif' })
  @IsString()
  @IsNotEmpty({ message: 'Nama supplier wajib diisi' })
  name: string;

  @ApiProperty({ example: 'PT Kimia Farma Trading & Distribution', description: 'Nama resmi perusahaan PBF' })
  @IsString()
  @IsNotEmpty({ message: 'Nama perusahaan wajib diisi' })
  companyName: string;

  @ApiProperty({ example: '021-3847709', description: 'Nomor telepon supplier' })
  @IsString()
  @IsNotEmpty({ message: 'Nomor telepon wajib diisi' })
  phone: string;

  @ApiPropertyOptional({ example: 'order@kimiafarma.co.id', description: 'Email resmi supplier' })
  @IsEmail({}, { message: 'Format email supplier tidak valid' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Jl. Budi Utomo No. 1, Jakarta Pusat', description: 'Alamat gudang / kantor PBF' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ default: true, description: 'Status kemitraan aktif' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSupplierDto extends CreateSupplierDto {}
