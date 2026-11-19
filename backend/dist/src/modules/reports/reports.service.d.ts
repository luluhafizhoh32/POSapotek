import { PrismaService } from '../../prisma/prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardSummary(branchId?: string): Promise<{
        revenueToday: number;
        revenueYesterday: number;
        revenueGrowthPercent: number;
        transactionsToday: number;
        revenueThisMonth: number;
        grossProfitThisMonth: number;
        profitMarginPercent: number;
        alerts: {
            lowStockCount: number;
            expiringBatchesCount: number;
            pendingPrescriptionsCount: number;
        };
        paymentBreakdown: Record<string, number>;
        last7Days: {
            date: string;
            dayName: string;
            totalRevenue: number;
            transactionCount: number;
        }[];
        topSellingProducts: {
            id: string;
            name: string;
            unit: string;
            totalSold: number;
            totalRevenue: number;
        }[];
    }>;
}
