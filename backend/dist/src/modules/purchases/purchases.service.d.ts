import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseDto, ReceiveGoodsDto } from './dto/purchase.dto';
export declare class PurchasesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(params?: {
        branchId?: string;
        status?: string;
    }): Promise<({
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: string;
            };
        } & {
            id: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            purchaseId: string;
            receivedQuantity: number;
        })[];
        supplier: {
            id: string;
            email: string | null;
            name: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            address: string | null;
            companyName: string;
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
        updatedAt: Date;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        status: string;
        supplierId: string;
        poNumber: string;
        orderDate: Date;
        expectedDate: Date | null;
        createdBy: string;
    })[]>;
    findOne(id: string): Promise<{
        branch: {
            id: string;
            name: string;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            address: string | null;
        };
        items: ({
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
            id: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            purchaseId: string;
            receivedQuantity: number;
        })[];
        supplier: {
            id: string;
            email: string | null;
            name: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            address: string | null;
            companyName: string;
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
        updatedAt: Date;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        status: string;
        supplierId: string;
        poNumber: string;
        orderDate: Date;
        expectedDate: Date | null;
        createdBy: string;
    }>;
    create(userId: string, branchId: string, dto: CreatePurchaseDto): Promise<{
        items: ({
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
            id: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            purchaseId: string;
            receivedQuantity: number;
        })[];
        supplier: {
            id: string;
            email: string | null;
            name: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            address: string | null;
            companyName: string;
        };
    } & {
        id: string;
        branchId: string;
        createdAt: Date;
        updatedAt: Date;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        status: string;
        supplierId: string;
        poNumber: string;
        orderDate: Date;
        expectedDate: Date | null;
        createdBy: string;
    }>;
    receiveGoods(purchaseId: string, userId: string, branchId: string, dto: ReceiveGoodsDto): Promise<{
        success: boolean;
        message: string;
        purchase: {
            items: ({
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
                id: string;
                productId: string;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                subtotal: import("@prisma/client/runtime/library").Decimal;
                purchaseId: string;
                receivedQuantity: number;
            })[];
            supplier: {
                id: string;
                email: string | null;
                name: string;
                phone: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                code: string;
                address: string | null;
                companyName: string;
            };
        } & {
            id: string;
            branchId: string;
            createdAt: Date;
            updatedAt: Date;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            notes: string | null;
            status: string;
            supplierId: string;
            poNumber: string;
            orderDate: Date;
            expectedDate: Date | null;
            createdBy: string;
        };
    }>;
}
