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
exports.PromotionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const promotions_service_1 = require("./promotions.service");
const promotion_dto_1 = require("./dto/promotion.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let PromotionsController = class PromotionsController {
    constructor(promotionsService) {
        this.promotionsService = promotionsService;
    }
    async findAll() {
        return this.promotionsService.findAll();
    }
    async findActive() {
        return this.promotionsService.findActive();
    }
    async validateCode(code, subtotal) {
        return this.promotionsService.validateCode(code, Number(subtotal));
    }
    async create(dto) {
        return this.promotionsService.create(dto);
    }
};
exports.PromotionsController = PromotionsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Daftar semua program promosi dan diskon' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PromotionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, swagger_1.ApiOperation)({ summary: 'Daftar promosi yang saat ini sedang aktif berjalan' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PromotionsController.prototype, "findActive", null);
__decorate([
    (0, common_1.Get)('validate'),
    (0, swagger_1.ApiOperation)({ summary: 'Validasi dan hitung diskon kode voucher untuk keranjang belanja' }),
    (0, swagger_1.ApiQuery)({ name: 'code', description: 'Kode voucher' }),
    (0, swagger_1.ApiQuery)({ name: 'subtotal', type: Number, description: 'Total belanjaan saat ini' }),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('subtotal')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], PromotionsController.prototype, "validateCode", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('OWNER', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'Buat program promosi baru' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [promotion_dto_1.CreatePromotionDto]),
    __metadata("design:returntype", Promise)
], PromotionsController.prototype, "create", null);
exports.PromotionsController = PromotionsController = __decorate([
    (0, swagger_1.ApiTags)('Promotions & Discounts'),
    (0, common_1.Controller)('promotions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [promotions_service_1.PromotionsService])
], PromotionsController);
//# sourceMappingURL=promotions.controller.js.map