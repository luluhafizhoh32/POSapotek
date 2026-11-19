import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseItemDto {
  @ApiProperty({ example: 'prod-uuid-1', description: 'ID produk obat' })
  @IsString()
  @IsNotEmpty({ message: 'Produk wajib diisi' })
  productId: string;

  @ApiProperty({ example: 100, description: 'Jumlah yang dipesan' })
  @IsNumber()
  @Min(1, { message: 'Jumlah minimal 1' })
  quantity: number;

  @ApiProperty({ example: 8500, description: 'Harga beli per unit dari supplier' })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ example: 'sup-uuid-1', description: 'ID supplier PBF' })
  @IsString()
  @IsNotEmpty({ message: 'Supplier wajib dipilih' })
  supplierId: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Estimasi tanggal barang sampai' })
  @IsDateString()
  @IsOptional()
  expectedDate?: string;

  @ApiPropertyOptional({ example: 'Pengadaan stok bulanan antibiotik dan analgesik', description: 'Catatan PO' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [PurchaseItemDto], description: 'Daftar item obat yang dipesan' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}

export class ReceiveItemDto {
  @ApiProperty({ example: 'po-item-uuid-1', description: 'ID purchase item' })
  @IsString()
  @IsNotEmpty()
  purchaseItemId: string;

  @ApiProperty({ example: 'BATCH-2026-009', description: 'Nomor batch dari pabrikan' })
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @ApiProperty({ example: '2026-09-01', description: 'Tanggal manufaktur / produksi' })
  @IsDateString()
  @IsNotEmpty()
  mfgDate: string;

  @ApiProperty({ example: '2028-09-01', description: 'Tanggal kedaluwarsa batch' })
  @IsDateString()
  @IsNotEmpty()
  expDate: string;

  @ApiProperty({ example: 100, description: 'Jumlah fisik yang diterima' })
  @IsNumber()
  @Min(1)
  receivedQuantity: number;
}

export class ReceiveGoodsDto {
  @ApiProperty({ type: [ReceiveItemDto], description: 'Daftar barang yang diterima beserta batch pabrikan' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];
}
