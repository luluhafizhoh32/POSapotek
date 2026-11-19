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
exports.PurchasesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PurchasesService = class PurchasesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(params) {
        const { branchId, status } = params || {};
        return this.prisma.purchase.findMany({
            where: {
                branchId: branchId || undefined,
                status: status || undefined,
            },
            orderBy: { orderDate: 'desc' },
            include: {
                supplier: true,
                creator: {
                    select: { id: true, name: true, email: true },
                },
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, sku: true, unit: true },
                        },
                    },
                },
            },
        });
    }
    async findOne(id) {
        const purchase = await this.prisma.purchase.findUnique({
            where: { id },
            include: {
                supplier: true,
                branch: true,
                creator: {
                    select: { id: true, name: true, email: true },
                },
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });
        if (!purchase) {
            throw new common_1.NotFoundException(`Purchase Order dengan ID ${id} tidak ditemukan`);
        }
        return purchase;
    }
    async create(userId, branchId, dto) {
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('Purchase order minimal harus memiliki 1 item obat');
        }
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const poNumber = `PO-${dateStr}-${randomSuffix}`;
        const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        return this.prisma.purchase.create({
            data: {
                poNumber,
                branchId,
                supplierId: dto.supplierId,
                orderDate: new Date(),
                expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
                totalAmount,
                status: 'ORDERED',
                notes: dto.notes,
                createdBy: userId,
                items: {
                    create: dto.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        subtotal: item.quantity * item.unitPrice,
                        receivedQuantity: 0,
                    })),
                },
            },
            include: {
                supplier: true,
                items: {
                    include: { product: true },
                },
            },
        });
    }
    async receiveGoods(purchaseId, userId, branchId, dto) {
        const po = await this.prisma.purchase.findUnique({
            where: { id: purchaseId },
            include: { items: true, supplier: true },
        });
        if (!po) {
            throw new common_1.NotFoundException('Purchase Order tidak ditemukan');
        }
        if (po.status === 'RECEIVED') {
            throw new common_1.BadRequestException('Purchase Order ini sudah diterima sebelumnya');
        }
        return this.prisma.$transaction(async (tx) => {
            for (const item of dto.items) {
                const poItem = po.items.find((i) => i.id === item.purchaseItemId);
                if (!poItem) {
                    throw new common_1.BadRequestException(`Item dengan ID ${item.purchaseItemId} tidak terdaftar dalam PO ini`);
                }
                const newBatch = await tx.productBatch.create({
                    data: {
                        productId: poItem.productId,
                        supplierId: po.supplierId,
                        batchNumber: item.batchNumber,
                        mfgDate: new Date(item.mfgDate),
                        expDate: new Date(item.expDate),
                        initialQuantity: item.receivedQuantity,
                        currentQuantity: item.receivedQuantity,
                        buyPrice: poItem.unitPrice,
                        status: 'ACTIVE',
                    },
                });
                await tx.purchaseItem.update({
                    where: { id: poItem.id },
                    data: { receivedQuantity: item.receivedQuantity },
                });
                const currentInv = await tx.inventory.findFirst({
                    where: { branchId, productId: poItem.productId },
                });
                const currentStock = currentInv ? currentInv.totalStock : 0;
                const newStock = currentStock + item.receivedQuantity;
                if (currentInv) {
                    await tx.inventory.update({
                        where: { id: currentInv.id },
                        data: { totalStock: newStock },
                    });
                }
                else {
                    await tx.inventory.create({
                        data: {
                            branchId,
                            productId: poItem.productId,
                            totalStock: newStock,
                        },
                    });
                }
                await tx.inventoryMovement.create({
                    data: {
                        branchId,
                        productId: poItem.productId,
                        batchId: newBatch.id,
                        type: 'PURCHASE_RECEIVE',
                        quantity: item.receivedQuantity,
                        previousStock: currentStock,
                        finalStock: newStock,
                        referenceId: po.poNumber,
                        notes: `Penerimaan barang dari PO ${po.poNumber} Batch ${item.batchNumber}`,
                        createdBy: userId,
                    },
                });
            }
            const updatedPo = await tx.purchase.update({
                where: { id: purchaseId },
                data: { status: 'RECEIVED' },
                include: {
                    items: { include: { product: true } },
                    supplier: true,
                },
            });
            return {
                success: true,
                message: 'Barang berhasil diterima, batch baru dan stok gudang telah terbarui',
                purchase: updatedPo,
            };
        });
    }
};
exports.PurchasesService = PurchasesService;
exports.PurchasesService = PurchasesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PurchasesService);
//# sourceMappingURL=purchases.service.js.map