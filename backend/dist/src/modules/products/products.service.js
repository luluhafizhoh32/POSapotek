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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ProductsService = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(params) {
        const { search, categoryId, isPrescriptionRequired, branchId, lowStockOnly } = params || {};
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { genericName: { contains: search } },
                { brand: { contains: search } },
                { sku: { contains: search } },
                { barcode: { contains: search } },
            ];
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (isPrescriptionRequired !== undefined) {
            where.isPrescriptionRequired = isPrescriptionRequired;
        }
        const products = await this.prisma.product.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                category: {
                    select: { id: true, name: true },
                },
                inventories: branchId
                    ? { where: { branchId } }
                    : true,
                batches: {
                    where: {
                        currentQuantity: { gt: 0 },
                        status: 'ACTIVE',
                    },
                    orderBy: { expDate: 'asc' },
                    take: 3,
                },
            },
        });
        const mapped = products.map((prod) => {
            const totalStock = prod.inventories.reduce((acc, inv) => acc + inv.totalStock, 0);
            const isLowStock = totalStock <= prod.minStock;
            const nearestExpDate = prod.batches.length > 0 ? prod.batches[0].expDate : null;
            return {
                ...prod,
                totalStock,
                isLowStock,
                nearestExpDate,
            };
        });
        if (lowStockOnly) {
            return mapped.filter((p) => p.isLowStock);
        }
        return mapped;
    }
    async findByBarcode(barcode) {
        const product = await this.prisma.product.findFirst({
            where: {
                OR: [{ barcode }, { sku: barcode }],
            },
            include: {
                category: true,
                inventories: true,
                batches: {
                    where: {
                        currentQuantity: { gt: 0 },
                        status: 'ACTIVE',
                    },
                    orderBy: { expDate: 'asc' },
                },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Produk dengan barcode '${barcode}' tidak ditemukan`);
        }
        const totalStock = product.inventories.reduce((acc, inv) => acc + inv.totalStock, 0);
        return {
            ...product,
            totalStock,
        };
    }
    async findOne(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                inventories: {
                    include: { branch: true },
                },
                batches: {
                    orderBy: { expDate: 'asc' },
                    include: { supplier: true },
                },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
        }
        const totalStock = product.inventories.reduce((acc, inv) => acc + inv.totalStock, 0);
        return {
            ...product,
            totalStock,
        };
    }
    async create(dto) {
        const sku = dto.sku ||
            `MED-${dto.name.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const barcode = dto.barcode ||
            `899${Math.floor(100000000 + Math.random() * 900000000)}`;
        const existingSku = await this.prisma.product.findUnique({
            where: { sku },
        });
        if (existingSku) {
            throw new common_1.ConflictException(`Produk dengan SKU '${sku}' sudah terdaftar`);
        }
        const existingBarcode = await this.prisma.product.findUnique({
            where: { barcode },
        });
        if (existingBarcode) {
            throw new common_1.ConflictException(`Produk dengan Barcode '${barcode}' sudah terdaftar`);
        }
        return this.prisma.product.create({
            data: {
                ...dto,
                sku,
                barcode,
            },
            include: {
                category: true,
            },
        });
    }
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.product.update({
            where: { id },
            data: dto,
            include: {
                category: true,
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.product.delete({
            where: { id },
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map