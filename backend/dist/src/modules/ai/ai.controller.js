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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ai_service_1 = require("./ai.service");
const ai_dto_1 = require("./dto/ai.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let AiController = class AiController {
    constructor(aiService) {
        this.aiService = aiService;
    }
    async getDemandForecasting(userBranchId) {
        return this.aiService.getDemandForecasting(userBranchId);
    }
    async checkDrugInteractions(dto) {
        return this.aiService.checkDrugInteractions(dto.productIds);
    }
    async getCustomerSegmentation() {
        return this.aiService.getCustomerSegmentation();
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('forecast'),
    (0, swagger_1.ApiOperation)({
        summary: 'AI Fitur 1: Prediksi Kebutuhan Stok (Demand Forecasting 7, 14, 30 hari & ROP)',
    }),
    (0, swagger_1.ApiQuery)({ name: 'branchId', required: false }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getDemandForecasting", null);
__decorate([
    (0, common_1.Post)('drug-interactions'),
    (0, swagger_1.ApiOperation)({
        summary: 'AI Fitur 2: Analisis Klinis Interaksi Obat & Skrining Resep (Severity HIGH/MODERATE/LOW)',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_dto_1.CheckDrugInteractionDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "checkDrugInteractions", null);
__decorate([
    (0, common_1.Get)('rfm-segmentation'),
    (0, swagger_1.ApiOperation)({
        summary: 'AI Fitur 3: Segmentasi Pelanggan Otomatis (Metode RFM: Champions, Loyal, At-Risk, Hibernating)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getCustomerSegmentation", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('AI Intelligence & Analytics'),
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map