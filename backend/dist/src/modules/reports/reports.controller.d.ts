import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDashboardSummary(userBranchId: string): Promise<{
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
