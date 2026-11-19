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
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sales_service_1 = require("./sales.service");
const sale_dto_1 = require("./dto/sale.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let SalesController = class SalesController {
    constructor(salesService) {
        this.salesService = salesService;
    }
    async findAll(branchId, startDate, endDate) {
        return this.salesService.findAll({ branchId, startDate, endDate });
    }
    async findOne(id) {
        return this.salesService.findOne(id);
    }
    async checkout(userId, branchId, dto) {
        return this.salesService.checkout(userId, branchId, dto);
    }
    async generateQris(dto) {
        return this.salesService.generateQris(dto);
    }
    async verifyQris(referenceCode) {
        return this.salesService.verifyQris(referenceCode);
    }
};
exports.SalesController = SalesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Riwayat transaksi penjualan kasir' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, description: 'Tanggal mulai (YYYY-MM-DD)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, description: 'Tanggal akhir (YYYY-MM-DD)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('branchId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Detail faktur penjualan, item obat, batch terpotong & pembayaran' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('checkout'),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER', 'KASIR', 'ADMIN'),
    (0, swagger_1.ApiOperation)({
        summary: 'Checkout transaksi POS Kasir (Pengurangan stok otomatis berbasis FEFO & Simulasi Pembayaran)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('branchId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, sale_dto_1.CheckoutDto]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "checkout", null);
__decorate([
    (0, common_1.Post)('qris/generate'),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER', 'KASIR'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate kode QRIS simulasi dinamis untuk pembayaran kasir' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sale_dto_1.GenerateQrisDto]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "generateQris", null);
__decorate([
    (0, common_1.Get)('qris/verify/:referenceCode'),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER', 'KASIR'),
    (0, swagger_1.ApiOperation)({ summary: 'Verifikasi status pembayaran QRIS simulasi' }),
    __param(0, (0, common_1.Param)('referenceCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "verifyQris", null);
exports.SalesController = SalesController = __decorate([
    (0, swagger_1.ApiTags)('Sales & POS (Kasir)'),
    (0, common_1.Controller)('sales'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [sales_service_1.SalesService])
], SalesController);
//# sourceMappingURL=sales.controller.js.map