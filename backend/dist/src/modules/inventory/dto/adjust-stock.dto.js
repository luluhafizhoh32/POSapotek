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
exports.AdjustStockDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class AdjustStockDto {
}
exports.AdjustStockDto = AdjustStockDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'prod-uuid-1', description: 'ID produk obat' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Produk wajib dipilih' }),
    __metadata("design:type", String)
], AdjustStockDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'batch-uuid-1', description: 'ID batch obat spesifik' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Batch spesifik wajib dipilih' }),
    __metadata("design:type", String)
], AdjustStockDto.prototype, "batchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 45, description: 'Jumlah fisik riil hasil stock opname' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'Jumlah stok tidak boleh negatif' }),
    __metadata("design:type", Number)
], AdjustStockDto.prototype, "actualQuantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Penyesuaian hasil Stock Opname bulanan', description: 'Alasan penyesuaian stok' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Alasan penyesuaian wajib diisi' }),
    __metadata("design:type", String)
], AdjustStockDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID Cabang (opsional, diambil dari pengguna jika kosong)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AdjustStockDto.prototype, "branchId", void 0);
//# sourceMappingURL=adjust-stock.dto.js.map