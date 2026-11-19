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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const products_service_1 = require("./products.service");
const product_dto_1 = require("./dto/product.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let ProductsController = class ProductsController {
    constructor(productsService) {
        this.productsService = productsService;
    }
    async findAll(search, categoryId, isPrescriptionRequired, lowStockOnly) {
        return this.productsService.findAll({
            search,
            categoryId,
            isPrescriptionRequired,
            lowStockOnly,
        });
    }
    async findByBarcode(barcode) {
        return this.productsService.findByBarcode(barcode);
    }
    async findOne(id) {
        return this.productsService.findOne(id);
    }
    async create(dto) {
        return this.productsService.create(dto);
    }
    async update(id, dto) {
        return this.productsService.update(id, dto);
    }
    async remove(id) {
        return this.productsService.remove(id);
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Daftar semua produk / obat dengan filter kategori, pencarian, dan stok' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, description: 'Cari nama obat, merk, kandungan generik, atau SKU' }),
    (0, swagger_1.ApiQuery)({ name: 'categoryId', required: false, description: 'Filter berdasarkan ID kategori' }),
    (0, swagger_1.ApiQuery)({ name: 'isPrescriptionRequired', required: false, type: Boolean, description: 'Filter obat resep vs OTC' }),
    (0, swagger_1.ApiQuery)({ name: 'lowStockOnly', required: false, type: Boolean, description: 'Hanya tampilkan obat dengan stok menipis' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('categoryId')),
    __param(2, (0, common_1.Query)('isPrescriptionRequired')),
    __param(3, (0, common_1.Query)('lowStockOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Boolean, Boolean]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('barcode/:barcode'),
    (0, swagger_1.ApiOperation)({ summary: 'Pencarian obat cepat via barcode (untuk Barcode Scanner POS)' }),
    __param(0, (0, common_1.Param)('barcode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findByBarcode", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Detail lengkap obat, sediaan, harga, dan riwayat batch' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER', 'ADMIN', 'APOTEKER'),
    (0, swagger_1.ApiOperation)({ summary: 'Tambah produk / obat baru' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_dto_1.CreateProductDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Perbarui informasi obat' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('OWNER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Hapus data obat' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "remove", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)('Products'),
    (0, common_1.Controller)('products'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map