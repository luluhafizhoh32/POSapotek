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
exports.PurchasesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const purchases_service_1 = require("./purchases.service");
const purchase_dto_1 = require("./dto/purchase.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let PurchasesController = class PurchasesController {
    constructor(purchasesService) {
        this.purchasesService = purchasesService;
    }
    async findAll(branchId, status) {
        return this.purchasesService.findAll({ branchId, status });
    }
    async findOne(id) {
        return this.purchasesService.findOne(id);
    }
    async create(userId, branchId, dto) {
        return this.purchasesService.create(userId, branchId, dto);
    }
    async receiveGoods(id, userId, branchId, dto) {
        return this.purchasesService.receiveGoods(id, userId, branchId, dto);
    }
};
exports.PurchasesController = PurchasesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Daftar semua Purchase Order (PO)' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'Filter status (ORDERED/RECEIVED/CANCELLED)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('branchId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Detail Purchase Order beserta item dan supplier' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER', 'ADMIN', 'GUDANG'),
    (0, swagger_1.ApiOperation)({ summary: 'Buat Purchase Order (PO) baru ke PBF / Supplier' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('branchId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, purchase_dto_1.CreatePurchaseDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/receive'),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER', 'GUDANG'),
    (0, swagger_1.ApiOperation)({ summary: 'Penerimaan barang fisik dari supplier (Membuat Batch baru & Update Stok FEFO)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('branchId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, purchase_dto_1.ReceiveGoodsDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "receiveGoods", null);
exports.PurchasesController = PurchasesController = __decorate([
    (0, swagger_1.ApiTags)('Purchases (Pengadaan)'),
    (0, common_1.Controller)('purchases'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [purchases_service_1.PurchasesService])
], PurchasesController);
//# sourceMappingURL=purchases.controller.js.map