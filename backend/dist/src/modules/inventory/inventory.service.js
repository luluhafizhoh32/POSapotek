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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getInventorySummary(branchId) {
        const products = await this.prisma.product.findMany({
            where: { isActive: true },
            include: {
                category: true,
                inventories: branchId ? { where: { branchId } } : true,
                batches: {
                    where: { currentQuantity: { gt: 0 } },
                    orderBy: { expDate: 'asc' },
                },
            },
        });
        const now = new Date();
        const in30Days = new Date();
        in30Days.setDate(now.getDate() + 30);
        const in90Days = new Date();
        in90Days.setDate(now.getDate() + 90);
        let totalSkus = products.length;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let expiringIn30DaysCount = 0;
        let expiredCount = 0;
        const items = products.map((p) => {
            const stock = p.inventories.reduce((acc, inv) => acc + inv.totalStock, 0);
            if (stock === 0)
                outOfStockCount++;
            else if (stock <= p.minStock)
                lowStockCount++;
            p.batches.forEach((b) => {
                if (b.expDate < now)
                    expiredCount++;
                else if (b.expDate <= in30Days)
                    expiringIn30DaysCount++;
            });
            return {
                id: p.id,
                sku: p.sku,
                barcode: p.barcode,
                name: p.name,
                category: p.category.name,
                dosageForm: p.dosageForm,
                unit: p.unit,
                sellPrice: p.sellPrice,
                minStock: p.minStock,
                totalStock: stock,
                status: stock === 0 ? 'HABIS' : stock <= p.minStock ? 'MENIPIS' : 'AMAN',
                activeBatchesCount: p.batches.length,
                nearestExpiryDate: p.batches.length > 0 ? p.batches[0].expDate : null,
            };
        });
        return {
            summary: {
                totalSkus,
                lowStockCount,
                outOfStockCount,
                expiringIn30DaysCount,
                expiredCount,
            },
            items,
        };
    }
    async getBatches(params) {
        const { productId, status } = params || {};
        return this.prisma.productBatch.findMany({
            where: {
                productId: productId || undefined,
                status: status || undefined,
                currentQuantity: { gt: 0 },
            },
            orderBy: { expDate: 'asc' },
            include: {
                product: {
                    select: {
                        id: true,
                        sku: true,
                        name: true,
                        unit: true,
                        dosageForm: true,
                    },
                },
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        companyName: true,
                    },
                },
            },
        });
    }
    async getExpiryAlerts(daysThreshold = 90) {
        const now = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(now.getDate() + daysThreshold);
        const batches = await this.prisma.productBatch.findMany({
            where: {
                currentQuantity: { gt: 0 },
                expDate: { lte: thresholdDate },
            },
            orderBy: { expDate: 'asc' },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        unit: true,
                        sellPrice: true,
                    },
                },
                supplier: true,
            },
        });
        const categorized = batches.map((b) => {
            const exp = new Date(b.expDate);
            const diffTime = exp.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            let alertLevel;
            if (diffDays <= 0) {
                alertLevel = 'EXPIRED';
            }
            else if (diffDays <= 30) {
                alertLevel = 'CRITICAL';
            }
            else {
                alertLevel = 'WARNING';
            }
            return {
                batchId: b.id,
                batchNumber: b.batchNumber,
                product: b.product,
                currentQuantity: b.currentQuantity,
                expDate: b.expDate,
                daysRemaining: diffDays,
                alertLevel,
            };
        });
        return categorized;
    }
    async adjustStock(userId, userBranchId, dto) {
        const branchId = dto.branchId || userBranchId;
        const batch = await this.prisma.productBatch.findUnique({
            where: { id: dto.batchId },
            include: { product: true },
        });
        if (!batch) {
            throw new common_1.NotFoundException('Batch obat tidak ditemukan');
        }
        if (batch.productId !== dto.productId) {
            throw new common_1.BadRequestException('Batch obat tidak sesuai dengan produk yang dipilih');
        }
        const previousQuantity = batch.currentQuantity;
        const diff = dto.actualQuantity - previousQuantity;
        return this.prisma.$transaction(async (tx) => {
            const updatedBatch = await tx.productBatch.update({
                where: { id: batch.id },
                data: { currentQuantity: dto.actualQuantity },
            });
            const currentInv = await tx.inventory.findFirst({
                where: { branchId, productId: dto.productId },
            });
            const currentTotalStock = currentInv ? currentInv.totalStock : 0;
            const newTotalStock = Math.max(0, currentTotalStock + diff);
            if (currentInv) {
                await tx.inventory.update({
                    where: { id: currentInv.id },
                    data: { totalStock: newTotalStock },
                });
            }
            else {
                await tx.inventory.create({
                    data: {
                        branchId,
                        productId: dto.productId,
                        totalStock: newTotalStock,
                    },
                });
            }
            const movement = await tx.inventoryMovement.create({
                data: {
                    branchId,
                    productId: dto.productId,
                    batchId: dto.batchId,
                    type: 'STOCK_ADJUSTMENT',
                    quantity: diff,
                    previousStock: previousQuantity,
                    finalStock: dto.actualQuantity,
                    notes: dto.notes,
                    createdBy: userId,
                },
            });
            return {
                success: true,
                message: 'Penyesuaian stok berhasil disimpan',
                batch: updatedBatch,
                movement,
            };
        });
    }
    async getMovements(params) {
        const { branchId, productId, type, limit = 50 } = params || {};
        return this.prisma.inventoryMovement.findMany({
            where: {
                branchId: branchId || undefined,
                productId: productId || undefined,
                type: type || undefined,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                product: {
                    select: { id: true, name: true, sku: true, unit: true },
                },
                batch: {
                    select: { id: true, batchNumber: true, expDate: true },
                },
                creator: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map