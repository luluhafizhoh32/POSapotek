import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/promotion.dto';
export declare class PromotionsController {
    private readonly promotionsService;
    constructor(promotionsService: PromotionsService);
    findAll(): Promise<({
        products: ({
            product: {
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                categoryId: string;
                sku: string;
                barcode: string;
                genericName: string | null;
                brand: string | null;
                dosageForm: string;
                dosage: string | null;
                unit: string;
                buyPrice: import("@prisma/client/runtime/library").Decimal;
                sellPrice: import("@prisma/client/runtime/library").Decimal;
                minStock: number;
                maxStock: number;
                isPrescriptionRequired: boolean;
            };
        } & {
            productId: string;
            promotionId: string;
        })[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        code: string;
        type: string;
        value: import("@prisma/client/runtime/library").Decimal;
        minPurchase: import("@prisma/client/runtime/library").Decimal;
        startDate: Date;
        endDate: Date;
    })[]>;
    findActive(): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        code: string;
        type: string;
        value: import("@prisma/client/runtime/library").Decimal;
        minPurchase: import("@prisma/client/runtime/library").Decimal;
        startDate: Date;
        endDate: Date;
    }[]>;
    validateCode(code: string, subtotal: number): Promise<{
        isValid: boolean;
        code: string;
        name: string;
        discountAmount: number;
        finalSubtotal: number;
    }>;
    create(dto: CreatePromotionDto): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        code: string;
        type: string;
        value: import("@prisma/client/runtime/library").Decimal;
        minPurchase: import("@prisma/client/runtime/library").Decimal;
        startDate: Date;
        endDate: Date;
    }>;
}
