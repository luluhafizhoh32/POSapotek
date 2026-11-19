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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardSummary(branchId) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const salesToday = await this.prisma.sale.findMany({
            where: {
                branchId: branchId || undefined,
                createdAt: { gte: startOfToday },
            },
            include: { items: true },
        });
        const revenueToday = salesToday.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const transactionsToday = salesToday.length;
        const salesYesterday = await this.prisma.sale.findMany({
            where: {
                branchId: branchId || undefined,
                createdAt: { gte: startOfYesterday, lt: startOfToday },
            },
        });
        const revenueYesterday = salesYesterday.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const salesThisMonth = await this.prisma.sale.findMany({
            where: {
                branchId: branchId || undefined,
                createdAt: { gte: startOfMonth },
            },
            include: {
                items: {
                    include: { product: true },
                },
            },
        });
        const revenueThisMonth = salesThisMonth.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        let cogsThisMonth = 0;
        salesThisMonth.forEach((s) => {
            s.items.forEach((item) => {
                cogsThisMonth += Number(item.product.buyPrice) * item.quantity;
            });
        });
        const grossProfitThisMonth = Math.max(0, revenueThisMonth - cogsThisMonth);
        const profitMargin = revenueThisMonth > 0 ? (grossProfitThisMonth / revenueThisMonth) * 100 : 0;
        const in30Days = new Date();
        in30Days.setDate(now.getDate() + 30);
        const expiringBatchesCount = await this.prisma.productBatch.count({
            where: {
                currentQuantity: { gt: 0 },
                expDate: { lte: in30Days },
            },
        });
        const products = await this.prisma.product.findMany({
            where: { isActive: true },
            include: {
                inventories: branchId ? { where: { branchId } } : true,
            },
        });
        const lowStockCount = products.filter((p) => {
            const stock = p.inventories.reduce((acc, inv) => acc + inv.totalStock, 0);
            return stock <= p.minStock;
        }).length;
        const pendingPrescriptionsCount = await this.prisma.prescription.count({
            where: {
                branchId: branchId || undefined,
                status: 'PENDING',
            },
        });
        const paymentBreakdown = {
            TUNAI: 0,
            QRIS: 0,
            DEBIT: 0,
            TRANSFER: 0,
        };
        salesThisMonth.forEach((s) => {
            const method = s.paymentMethod || 'TUNAI';
            paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(s.totalAmount);
        });
        const last7Days = [];
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(startOfToday);
            d.setDate(d.getDate() - i);
            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);
            const daySales = await this.prisma.sale.findMany({
                where: {
                    branchId: branchId || undefined,
                    createdAt: { gte: d, lt: nextD },
                },
            });
            const dayRev = daySales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
            last7Days.push({
                date: d.toISOString().slice(0, 10),
                dayName: dayNames[d.getDay()],
                totalRevenue: dayRev,
                transactionCount: daySales.length,
            });
        }
        const productSalesMap = new Map();
        salesThisMonth.forEach((s) => {
            s.items.forEach((item) => {
                const existing = productSalesMap.get(item.productId);
                if (existing) {
                    existing.totalSold += item.quantity;
                    existing.totalRevenue += Number(item.subtotal);
                }
                else {
                    productSalesMap.set(item.productId, {
                        id: item.product.id,
                        name: item.product.name,
                        unit: item.product.unit,
                        totalSold: item.quantity,
                        totalRevenue: Number(item.subtotal),
                    });
                }
            });
        });
        const topSellingProducts = Array.from(productSalesMap.values())
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 5);
        return {
            revenueToday,
            revenueYesterday,
            revenueGrowthPercent: revenueYesterday > 0
                ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
                : 0,
            transactionsToday,
            revenueThisMonth,
            grossProfitThisMonth,
            profitMarginPercent: Math.round(profitMargin * 10) / 10,
            alerts: {
                lowStockCount,
                expiringBatchesCount,
                pendingPrescriptionsCount,
            },
            paymentBreakdown,
            last7Days,
            topSellingProducts,
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map