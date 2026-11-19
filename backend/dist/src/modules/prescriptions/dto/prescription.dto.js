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
exports.VerifyPrescriptionDto = exports.CreatePrescriptionDto = exports.PrescriptionItemDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class PrescriptionItemDto {
}
exports.PrescriptionItemDto = PrescriptionItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'prod-uuid-1', description: 'ID obat yang diresepkan' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Obat wajib dipilih' }),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '500 mg', description: 'Dosis obat' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Dosis wajib diisi' }),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "dosage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '3 x 1 tablet sehari setelah makan', description: 'Aturan pakai (Signa)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Aturan pakai wajib diisi' }),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "dosageInstructions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10, description: 'Jumlah obat yang diresepkan' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PrescriptionItemDto.prototype, "quantity", void 0);
class CreatePrescriptionDto {
}
exports.CreatePrescriptionDto = CreatePrescriptionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'cust-uuid-1', description: 'ID Pasien / Pelanggan' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'dr. H. Hendra Wijaya, Sp.PD', description: 'Nama dokter penulis resep' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nama dokter wajib diisi' }),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "doctorName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SIP.446/1209/DKS/2023', description: 'Nomor Surat Izin Praktik (SIP) dokter' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nomor SIP dokter wajib diisi' }),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "doctorSip", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Pasien mengeluhkan demam 3 hari dan batuk produktif', description: 'Catatan resep / riwayat alergi' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PrescriptionItemDto], description: 'Daftar racikan / obat dalam resep' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PrescriptionItemDto),
    __metadata("design:type", Array)
], CreatePrescriptionDto.prototype, "items", void 0);
class VerifyPrescriptionDto {
}
exports.VerifyPrescriptionDto = VerifyPrescriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'VERIFIED',
        enum: ['VERIFIED', 'REJECTED'],
        description: 'Status verifikasi apoteker',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['VERIFIED', 'REJECTED']),
    __metadata("design:type", String)
], VerifyPrescriptionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Dosis dan aturan pakai sesuai, tidak ada interaksi berbahaya', description: 'Catatan skrining klinis apoteker' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VerifyPrescriptionDto.prototype, "clinicalNotes", void 0);
//# sourceMappingURL=prescription.dto.js.map