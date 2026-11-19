"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProductDto = exports.CreateProductDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateProductDto {
}
exports.CreateProductDto = CreateProductDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cat-uuid-1', description: 'ID kategori obat' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Kategori obat wajib dipilih' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'MED-PAR-001', description: 'SKU produk (opsional, dibuat otomatis jika kosong)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "sku", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '899123456701', description: 'Barcode produk (opsional, dibuat otomatis jika kosong)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "barcode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Paracetamol 500mg', description: 'Nama dagang / merk obat' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nama obat wajib diisi' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Acetaminophen', description: 'Nama generik kandungan zat aktif' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "genericName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Sanbe Farma', description: 'Nama produsen / brand' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "brand", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Tablet', description: 'Bentuk sediaan (Tablet, Sirup, Kapsul, Salep, dll.)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Bentuk sediaan wajib diisi' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "dosageForm", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '500 mg', description: 'Kekuatan dosis obat' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "dosage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Strip', description: 'Satuan terkecil (Strip, Botol, Tube, Box, Blister, Sachet)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Satuan kemasan wajib diisi' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "unit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 8500, description: 'Harga beli / HPP per satuan' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "buyPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12000, description: 'Harga jual ke konsumen per satuan' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "sellPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10, default: 10, description: 'Batas minimal stok peringatan' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "minStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 500, default: 500, description: 'Kapasitas maksimal stok' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "maxStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false, default: false, description: 'Memerlukan resep dokter (obat keras/narkotika)' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "isPrescriptionRequired", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true, description: 'Status aktif' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "isActive", void 0);
class UpdateProductDto extends CreateProductDto {
}
exports.UpdateProductDto = UpdateProductDto;
//# sourceMappingURL=product.dto.js.map