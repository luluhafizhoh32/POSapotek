import { IsNotEmpty, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckDrugInteractionDto {
  @ApiProperty({
    example: ['prod-uuid-1', 'prod-uuid-2'],
    description: 'Daftar ID atau nama obat yang akan diperiksa interaksinya',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'Daftar obat tidak boleh kosong' })
  productIds: string[];
}
