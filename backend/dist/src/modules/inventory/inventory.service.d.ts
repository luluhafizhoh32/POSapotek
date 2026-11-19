import { PrismaService } from '../../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    getInventorySummary(branchId?: string): Promise<{
        summary: {
            totalSkus: number;
            lowStockCount: number;
            outOfStockCount: number;
            expiringIn30DaysCount: number;
            expiredCount: number;
        };
        items: {
            id: string;
            sku: string;
            barcode: string;
            name: string;
            category: string;
            dosageForm: string;
            unit: string;
            sellPrice: import("@prisma/client/runtime/library").Decimal;
            minStock: number;
            totalStock: number;
            status: string;
            activeBatchesCount: number;
            nearestExpiryDate: Date;
        }[];
    }>;
    getBatches(params?: {
        productId?: string;
        status?: string;
    }): Promise<({
        product: {
            id: string;
            name: string;
            sku: string;
            dosageForm: string;
            unit: string;
        };
        supplier: {
            id: string;
            name: string;
            companyName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        buyPrice: import("@prisma/client/runtime/library").Decimal;
        productId: string;
        status: string;
        supplierId: string | null;
        batchNumber: string;
        mfgDate: Date;
        expDate: Date;
        initialQuantity: number;
        currentQuantity: number;
    })[]>;
    getExpiryAlerts(daysThreshold?: number): Promise<{
        batchId: string;
        batchNumber: string;
        product: {
            id: string;
            name: string;
            sku: string;
            unit: string;
            sellPrice: import("@prisma/client/runtime/library").Decimal;
        };
        currentQuantity: number;
        expDate: Date;
        daysRemaining: number;
        alertLevel: "EXPIRED" | "CRITICAL" | "WARNING";
    }[]>;
    adjustStock(userId: string, userBranchId: string, dto: AdjustStockDto): Promise<{
        success: boolean;
        message: string;
        batch: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            buyPrice: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            status: string;
            supplierId: string | null;
            batchNumber: string;
            mfgDate: Date;
            expDate: Date;
            initialQuantity: number;
            currentQuantity: number;
        };
        movement: {
            id: string;
            branchId: string;
            createdAt: Date;
            type: string;
            productId: string;
            batchId: string | null;
            quantity: number;
            notes: string | null;
            createdBy: string;
            previousStock: number;
            finalStock: number;
            referenceId: string | null;
        };
    }>;
    getMovements(params?: {
        branchId?: string;
        productId?: string;
        type?: string;
        limit?: number;
    }): Promise<({
        product: {
            id: string;
            name: string;
            sku: string;
            unit: string;
        };
        batch: {
            id: string;
            batchNumber: string;
            expDate: Date;
        };
        creator: {
            id: string;
            email: string;
            name: string;
        };
    } & {
        id: string;
        branchId: string;
        createdAt: Date;
        type: string;
        productId: string;
        batchId: string | null;
        quantity: number;
        notes: string | null;
        createdBy: string;
        previousStock: number;
        finalStock: number;
        referenceId: string | null;
    })[]>;
}
