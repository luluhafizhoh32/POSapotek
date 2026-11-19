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
exports.CreatePromotionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreatePromotionDto {
}
exports.CreatePromotionDto = CreatePromotionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SEHATHEMAT', description: 'Kode voucher promosi' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Kode promo wajib diisi' }),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Diskon Akhir Pekan Sehat', description: 'Nama program promosi' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nama promosi wajib diisi' }),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PERCENTAGE', enum: ['PERCENTAGE', 'FIXED', 'MIN_PURCHASE'], description: 'Tipe promosi' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['PERCENTAGE', 'FIXED', 'MIN_PURCHASE']),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10, description: 'Nilai promosi (persentase / nominal potongan)' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreatePromotionDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 50000, description: 'Batas minimal belanja untuk menggunakan promo' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePromotionDto.prototype, "minPurchase", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-09-01', description: 'Tanggal mulai berlaku' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-12-31', description: 'Tanggal berakhir' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true, description: 'Status aktif' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreatePromotionDto.prototype, "isActive", void 0);
//# sourceMappingURL=promotion.dto.js.map