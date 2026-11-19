import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Antibiotik', description: 'Nama kategori obat' })
  @IsString()
  @IsNotEmpty({ message: 'Nama kategori wajib diisi' })
  name: string;

  @ApiPropertyOptional({ example: 'Kelompok obat untuk infeksi bakteri', description: 'Deskripsi kategori' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ default: true, description: 'Status aktif' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto extends CreateCategoryDto {}
