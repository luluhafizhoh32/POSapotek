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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const inventory_service_1 = require("./inventory.service");
const adjust_stock_dto_1 = require("./dto/adjust-stock.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let InventoryController = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async getSummary(branchId) {
        return this.inventoryService.getInventorySummary(branchId);
    }
    async getBatches(productId, status) {
        return this.inventoryService.getBatches({ productId, status });
    }
    async getExpiryAlerts(days) {
        return this.inventoryService.getExpiryAlerts(days ? Number(days) : 90);
    }
    async adjustStock(userId, branchId, dto) {
        return this.inventoryService.adjustStock(userId, branchId, dto);
    }
    async getMovements(productId, type) {
        return this.inventoryService.getMovements({ productId, type });
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Ringkasan stok apotek, status menipis, dan peringatan kedaluwarsa' }),
    (0, swagger_1.ApiQuery)({ name: 'branchId', required: false }),
    __param(0, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('batches'),
    (0, swagger_1.ApiOperation)({ summary: 'Daftar batch obat terurut berdasarkan prinsip FEFO (First Expired, First Out)' }),
    (0, swagger_1.ApiQuery)({ name: 'productId', required: false, description: 'Filter berdasarkan produk' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'Filter status batch (ACTIVE/DEPLETED/EXPIRED)' }),
    __param(0, (0, common_1.Query)('productId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getBatches", null);
__decorate([
    (0, common_1.Get)('expiry-alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'Daftar peringatan kedaluwarsa obat (Expired, Kritis < 30 hari, Waspada < 90 hari)' }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, description: 'Batas hari peringatan (default: 90 hari)' }),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getExpiryAlerts", null);
__decorate([
    (0, common_1.Post)('adjust'),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER', 'GUDANG', 'APOTEKER'),
    (0, swagger_1.ApiOperation)({ summary: 'Stock Opname / Penyesuaian stok fisik obat per batch' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('branchId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, adjust_stock_dto_1.AdjustStockDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "adjustStock", null);
__decorate([
    (0, common_1.Get)('movements'),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER', 'GUDANG', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Audit trail mutasi stok (Pembelian, Penjualan FEFO, Stock Opname)' }),
    (0, swagger_1.ApiQuery)({ name: 'productId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, description: 'Tipe mutasi (SALE, PURCHASE_RECEIVE, STOCK_ADJUSTMENT)' }),
    __param(0, (0, common_1.Query)('productId')),
    __param(1, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getMovements", null);
exports.InventoryController = InventoryController = __decorate([
    (0, swagger_1.ApiTags)('Inventory & FEFO'),
    (0, common_1.Controller)('inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map