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
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PromotionsService = class PromotionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.promotion.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                products: {
                    include: { product: true },
                },
            },
        });
    }
    async findActive() {
        const now = new Date();
        return this.prisma.promotion.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            orderBy: { endDate: 'asc' },
        });
    }
    async validateCode(code, subtotal) {
        const now = new Date();
        const promo = await this.prisma.promotion.findUnique({
            where: { code: code.toUpperCase() },
        });
        if (!promo || !promo.isActive) {
            throw new common_1.NotFoundException(`Kode promo '${code}' tidak ditemukan atau sudah tidak aktif`);
        }
        if (promo.startDate > now || promo.endDate < now) {
            throw new common_1.BadRequestException(`Kode promo '${code}' sudah kedaluwarsa`);
        }
        if (promo.minPurchase && subtotal < Number(promo.minPurchase)) {
            throw new common_1.BadRequestException(`Minimal pembelanjaan untuk promo ini adalah Rp${Number(promo.minPurchase).toLocaleString('id-ID')}`);
        }
        let discountAmount = 0;
        if (promo.type === 'PERCENTAGE') {
            discountAmount = (subtotal * Number(promo.value)) / 100;
        }
        else {
            discountAmount = Number(promo.value);
        }
        return {
            isValid: true,
            code: promo.code,
            name: promo.name,
            discountAmount,
            finalSubtotal: Math.max(0, subtotal - discountAmount),
        };
    }
    async create(dto) {
        return this.prisma.promotion.create({
            data: {
                ...dto,
                code: dto.code.toUpperCase(),
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
            },
        });
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PromotionsService);
//# sourceMappingURL=promotions.service.js.map