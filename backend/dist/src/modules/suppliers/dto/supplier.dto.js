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
exports.UpdateSupplierDto = exports.CreateSupplierDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateSupplierDto {
}
exports.CreateSupplierDto = CreateSupplierDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SUP-001', description: 'Kode unik supplier/PBF' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Kode supplier wajib diisi' }),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Budi Santoso', description: 'Nama kontak sales/representatif' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nama supplier wajib diisi' }),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PT Kimia Farma Trading & Distribution', description: 'Nama resmi perusahaan PBF' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nama perusahaan wajib diisi' }),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '021-3847709', description: 'Nomor telepon supplier' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nomor telepon wajib diisi' }),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'order@kimiafarma.co.id', description: 'Email resmi supplier' }),
    (0, class_validator_1.IsEmail)({}, { message: 'Format email supplier tidak valid' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Jl. Budi Utomo No. 1, Jakarta Pusat', description: 'Alamat gudang / kantor PBF' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true, description: 'Status kemitraan aktif' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateSupplierDto.prototype, "isActive", void 0);
class UpdateSupplierDto extends CreateSupplierDto {
}
exports.UpdateSupplierDto = UpdateSupplierDto;
//# sourceMappingURL=supplier.dto.js.map