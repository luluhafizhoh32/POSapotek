import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Hj. Siti Aminah', description: 'Nama lengkap pelanggan' })
  @IsString()
  @IsNotEmpty({ message: 'Nama pelanggan wajib diisi' })
  name: string;

  @ApiProperty({ example: '081298765432', description: 'Nomor telepon / WhatsApp pelanggan' })
  @IsString()
  @IsNotEmpty({ message: 'Nomor telepon wajib diisi' })
  phone: string;

  @ApiPropertyOptional({ example: 'siti.aminah@gmail.com', description: 'Email pelanggan' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Jl. Tebet Barat Dalam No. 12, Jakarta Selatan', description: 'Alamat tempat tinggal' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ default: true, description: 'Status keanggotaan aktif' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCustomerDto extends CreateCustomerDto {}
