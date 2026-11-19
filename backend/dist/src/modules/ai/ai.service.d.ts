import { PrismaService } from '../../prisma/prisma.service';
export declare class AiService {
    private prisma;
    constructor(prisma: PrismaService);
    getDemandForecasting(branchId?: string): Promise<{
        evaluatedAt: string;
        totalProductsAnalyzed: number;
        highRiskCount: number;
        mediumRiskCount: number;
        forecasts: {
            productId: string;
            name: string;
            category: string;
            unit: string;
            currentStock: number;
            minStock: number;
            salesVelocityDaily: number;
            forecast: {
                days7: number;
                days14: number;
                days30: number;
            };
            reorderPoint: number;
            daysOfInventoryLeft: number;
            riskLevel: "HIGH" | "MEDIUM" | "LOW";
            recommendation: string;
            confidenceScore: number;
        }[];
    }>;
    private readonly interactionRules;
    checkDrugInteractions(productIds: string[]): Promise<{
        testedProductsCount: number;
        hasInteractions: boolean;
        safetyStatus: string;
        interactionsCount: number;
        interactions: any[];
    }>;
    getCustomerSegmentation(): Promise<{
        analyzedAt: string;
        totalCustomers: number;
        segmentSummary: Record<string, number>;
        customers: {
            id: string;
            name: string;
            phone: string;
            metrics: {
                recencyDays: number;
                frequency: number;
                monetaryTotal: number;
            };
            segment: string;
            description: string;
            actionSuggestion: string;
        }[];
    }>;
}
