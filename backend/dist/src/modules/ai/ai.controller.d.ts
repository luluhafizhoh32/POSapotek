import { AiService } from './ai.service';
import { CheckDrugInteractionDto } from './dto/ai.dto';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    getDemandForecasting(userBranchId: string): Promise<{
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
    checkDrugInteractions(dto: CheckDrugInteractionDto): Promise<{
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
