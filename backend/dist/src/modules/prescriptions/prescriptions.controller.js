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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrescriptionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const prescriptions_service_1 = require("./prescriptions.service");
const prescription_dto_1 = require("./dto/prescription.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let PrescriptionsController = class PrescriptionsController {
    constructor(prescriptionsService) {
        this.prescriptionsService = prescriptionsService;
    }
    async findAll(branchId, status) {
        return this.prescriptionsService.findAll({ branchId, status });
    }
    async findOne(id) {
        return this.prescriptionsService.findOne(id);
    }
    async create(branchId, dto) {
        return this.prescriptionsService.create(branchId, dto);
    }
    async verify(id, pharmacistId, dto) {
        return this.prescriptionsService.verify(id, pharmacistId, dto);
    }
    async dispense(id, pharmacistId) {
        return this.prescriptionsService.dispense(id, pharmacistId);
    }
};
exports.PrescriptionsController = PrescriptionsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Daftar antrean resep dokter (Pending, Verified, Dispensed, Rejected)' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('branchId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PrescriptionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Detail resep dokter, item racikan, dan status apoteker' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PrescriptionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER', 'KASIR', 'APOTEKER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Input resep dokter baru' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('branchId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, prescription_dto_1.CreatePrescriptionDto]),
    __metadata("design:returntype", Promise)
], PrescriptionsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/verify'),
    (0, roles_decorator_1.Roles)('OWNER', 'APOTEKER'),
    (0, swagger_1.ApiOperation)({ summary: 'Verifikasi klinis resep oleh Apoteker (Approve / Reject)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, prescription_dto_1.VerifyPrescriptionDto]),
    __metadata("design:returntype", Promise)
], PrescriptionsController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)(':id/dispense'),
    (0, roles_decorator_1.Roles)('OWNER', 'APOTEKER'),
    (0, swagger_1.ApiOperation)({ summary: 'Dispensing / penyerahan obat resep ke pasien' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PrescriptionsController.prototype, "dispense", null);
exports.PrescriptionsController = PrescriptionsController = __decorate([
    (0, swagger_1.ApiTags)('Prescriptions (Resep Dokter & Apoteker)'),
    (0, common_1.Controller)('prescriptions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [prescriptions_service_1.PrescriptionsService])
], PrescriptionsController);
//# sourceMappingURL=prescriptions.controller.js.map