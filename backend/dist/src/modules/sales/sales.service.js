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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let SalesService = class SalesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(params) {
        const { branchId, startDate, endDate, limit = 50 } = params || {};
        const where = {};
        if (branchId)
            where.branchId = branchId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        return this.prisma.sale.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                customer: true,
                cashier: {
                    select: { id: true, name: true, email: true },
                },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, unit: true } },
                        batch: { select: { id: true, batchNumber: true, expDate: true } },
                    },
                },
                payments: true,
            },
        });
    }
    async findOne(id) {
        const sale = await this.prisma.sale.findUnique({
            where: { id },
            include: {
                customer: true,
                cashier: {
                    select: { id: true, name: true, phone: true },
                },
                branch: true,
                items: {
                    include: {
                        product: true,
                        batch: true,
                    },
                },
                payments: true,
            },
        });
        if (!sale) {
            throw new common_1.NotFoundException(`Transaksi penjualan dengan ID ${id} tidak ditemukan`);
        }
        return sale;
    }
    async checkout(userId, userBranchId, dto) {
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('Keranjang belanja kosong');
        }
        const branchId = userBranchId;
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;
        return this.prisma.$transaction(async (tx) => {
            let subtotal = 0;
            const saleItemsToCreate = [];
            const movementsToCreate = [];
            for (const item of dto.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                });
                if (!product || !product.isActive) {
                    throw new common_1.BadRequestException(`Produk ID ${item.productId} tidak tersedia`);
                }
                const sellPriceNum = Number(product.sellPrice);
                const itemSubtotal = sellPriceNum * item.quantity - (item.discountAmount || 0);
                subtotal += itemSubtotal;
                const batches = await tx.productBatch.findMany({
                    where: {
                        productId: item.productId,
                        status: 'ACTIVE',
                        currentQuantity: { gt: 0 },
                        expDate: { gte: now },
                    },
                    orderBy: { expDate: 'asc' },
                });
                const totalBatchStock = batches.reduce((acc, b) => acc + b.currentQuantity, 0);
                if (totalBatchStock < item.quantity) {
                    throw new common_1.BadRequestException(`Stok obat '${product.name}' tidak mencukupi untuk memenuhi pesanan (Tersedia: ${totalBatchStock} ${product.unit}, Diminta: ${item.quantity} ${product.unit})`);
                }
                let remainingNeeded = item.quantity;
                for (const batch of batches) {
                    if (remainingNeeded <= 0)
                        break;
                    const deductQty = Math.min(batch.currentQuantity, remainingNeeded);
                    const newBatchQty = batch.currentQuantity - deductQty;
                    await tx.productBatch.update({
                        where: { id: batch.id },
                        data: {
                            currentQuantity: newBatchQty,
                            status: newBatchQty === 0 ? 'DEPLETED' : 'ACTIVE',
                        },
                    });
                    saleItemsToCreate.push({
                        productId: product.id,
                        batchId: batch.id,
                        quantity: deductQty,
                        unitPrice: product.sellPrice,
                        discountAmount: (item.discountAmount || 0) * (deductQty / item.quantity),
                        subtotal: sellPriceNum * deductQty,
                    });
                    movementsToCreate.push({
                        branchId,
                        productId: product.id,
                        batchId: batch.id,
                        type: 'SALE',
                        quantity: -deductQty,
                        previousStock: batch.currentQuantity,
                        finalStock: newBatchQty,
                        referenceId: invoiceNumber,
                        notes: `Penjualan kasir faktur ${invoiceNumber} Batch ${batch.batchNumber}`,
                        createdBy: userId,
                    });
                    remainingNeeded -= deductQty;
                }
                const currentInv = await tx.inventory.findFirst({
                    where: { branchId, productId: product.id },
                });
                if (currentInv) {
                    await tx.inventory.update({
                        where: { id: currentInv.id },
                        data: {
                            totalStock: Math.max(0, currentInv.totalStock - item.quantity),
                        },
                    });
                }
            }
            const totalDiscount = dto.discountAmount || 0;
            const totalAmount = Math.max(0, subtotal - totalDiscount);
            let changeGiven = 0;
            if (dto.paymentMethod === 'TUNAI' && dto.cashGiven) {
                if (dto.cashGiven < totalAmount) {
                    throw new common_1.BadRequestException(`Uang yang dibayarkan (Rp${dto.cashGiven.toLocaleString('id-ID')}) kurang dari total belanja (Rp${totalAmount.toLocaleString('id-ID')})`);
                }
                changeGiven = dto.cashGiven - totalAmount;
            }
            const sale = await tx.sale.create({
                data: {
                    invoiceNumber,
                    branchId,
                    customerId: dto.customerId || null,
                    cashierId: userId,
                    subtotal,
                    discountAmount: totalDiscount,
                    taxAmount: 0,
                    totalAmount,
                    paymentStatus: 'PAID',
                    paymentMethod: dto.paymentMethod,
                    notes: dto.notes,
                    items: {
                        create: saleItemsToCreate,
                    },
                },
                include: {
                    items: {
                        include: {
                            product: true,
                            batch: true,
                        },
                    },
                    customer: true,
                    branch: true,
                    cashier: { select: { id: true, name: true } },
                },
            });
            const paymentNumber = `PAY-${invoiceNumber.replace('INV-', '')}`;
            await tx.payment.create({
                data: {
                    saleId: sale.id,
                    paymentNumber,
                    method: dto.paymentMethod,
                    amount: totalAmount,
                    status: 'COMPLETED',
                    referenceCode: dto.paymentMethod === 'QRIS'
                        ? `QRIS-ID-${Date.now().toString().slice(-8)}`
                        : null,
                    paidAt: now,
                },
            });
            for (const mov of movementsToCreate) {
                await tx.inventoryMovement.create({ data: mov });
            }
            return {
                success: true,
                message: 'Transaksi kasir berhasil diselesaikan',
                sale,
                receipt: {
                    invoiceNumber: sale.invoiceNumber,
                    date: sale.createdAt,
                    branchName: sale.branch.name,
                    cashierName: sale.cashier.name,
                    customerName: sale.customer ? sale.customer.name : 'Pelanggan Umum',
                    subtotal,
                    discount: totalDiscount,
                    totalAmount,
                    paymentMethod: dto.paymentMethod,
                    cashGiven: dto.cashGiven || totalAmount,
                    changeGiven,
                    itemsCount: saleItemsToCreate.reduce((sum, i) => sum + i.quantity, 0),
                },
            };
        });
    }
    async generateQris(dto) {
        const qrisId = `00020101021226670014ID.LINKAJA.WWW01189360099900000000010215${Date.now()}5204549953033605405${dto.amount}5802ID5919APOTEK SEHAT SENTOSA6007JAKARTA62190115${dto.invoiceNumber || 'POSINV'}6304`;
        const referenceCode = `QRIS-${Date.now().toString().slice(-8)}`;
        return {
            referenceCode,
            amount: dto.amount,
            currency: 'IDR',
            merchantName: 'Apotek Sehat Sentosa',
            city: 'Jakarta',
            qrPayload: qrisId,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            status: 'PENDING',
        };
    }
    async verifyQris(referenceCode) {
        return {
            referenceCode,
            status: 'PAID',
            paidAt: new Date().toISOString(),
            message: 'Pembayaran simulasi QRIS berhasil terverifikasi otomatis',
        };
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalesService);
//# sourceMappingURL=sales.service.js.map