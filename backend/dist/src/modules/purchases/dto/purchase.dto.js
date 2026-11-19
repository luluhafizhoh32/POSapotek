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
exports.ReceiveGoodsDto = exports.ReceiveItemDto = exports.CreatePurchaseDto = exports.PurchaseItemDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class PurchaseItemDto {
}
exports.PurchaseItemDto = PurchaseItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'prod-uuid-1', description: 'ID produk obat' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Produk wajib diisi' }),
    __metadata("design:type", String)
], PurchaseItemDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Jumlah yang dipesan' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1, { message: 'Jumlah minimal 1' }),
    __metadata("design:type", Number)
], PurchaseItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 8500, description: 'Harga beli per unit dari supplier' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseItemDto.prototype, "unitPrice", void 0);
class CreatePurchaseDto {
}
exports.CreatePurchaseDto = CreatePurchaseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'sup-uuid-1', description: 'ID supplier PBF' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Supplier wajib dipilih' }),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "supplierId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-09-30', description: 'Estimasi tanggal barang sampai' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "expectedDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Pengadaan stok bulanan antibiotik dan analgesik', description: 'Catatan PO' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PurchaseItemDto], description: 'Daftar item obat yang dipesan' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PurchaseItemDto),
    __metadata("design:type", Array)
], CreatePurchaseDto.prototype, "items", void 0);
class ReceiveItemDto {
}
exports.ReceiveItemDto = ReceiveItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'po-item-uuid-1', description: 'ID purchase item' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReceiveItemDto.prototype, "purchaseItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'BATCH-2026-009', description: 'Nomor batch dari pabrikan' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReceiveItemDto.prototype, "batchNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-09-01', description: 'Tanggal manufaktur / produksi' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReceiveItemDto.prototype, "mfgDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2028-09-01', description: 'Tanggal kedaluwarsa batch' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReceiveItemDto.prototype, "expDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Jumlah fisik yang diterima' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ReceiveItemDto.prototype, "receivedQuantity", void 0);
class ReceiveGoodsDto {
}
exports.ReceiveGoodsDto = ReceiveGoodsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ReceiveItemDto], description: 'Daftar barang yang diterima beserta batch pabrikan' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ReceiveItemDto),
    __metadata("design:type", Array)
], ReceiveGoodsDto.prototype, "items", void 0);
//# sourceMappingURL=purchase.dto.js.map