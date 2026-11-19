import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutDto, GenerateQrisDto } from './dto/sale.dto';
export declare class SalesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(params?: {
        branchId?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<({
        customer: {
            id: string;
            email: string | null;
            name: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
        };
        cashier: {
            id: string;
            email: string;
            name: string;
        };
        items: ({
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
        } & {
            id: string;
            saleId: string;
            productId: string;
            batchId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
        })[];
        payments: {
            id: string;
            saleId: string;
            status: string;
            paymentNumber: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            referenceCode: string | null;
            paidAt: Date;
        }[];
    } & {
        id: string;
        branchId: string;
        createdAt: Date;
        updatedAt: Date;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        invoiceNumber: string;
        customerId: string | null;
        cashierId: string;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        paymentStatus: string;
        paymentMethod: string;
        notes: string | null;
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
        customer: {
            id: string;
            email: string | null;
            name: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
        };
        cashier: {
            id: string;
            name: string;
            phone: string;
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
        } & {
            id: string;
            saleId: string;
            productId: string;
            batchId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
        })[];
        payments: {
            id: string;
            saleId: string;
            status: string;
            paymentNumber: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            referenceCode: string | null;
            paidAt: Date;
        }[];
    } & {
        id: string;
        branchId: string;
        createdAt: Date;
        updatedAt: Date;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        invoiceNumber: string;
        customerId: string | null;
        cashierId: string;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        paymentStatus: string;
        paymentMethod: string;
        notes: string | null;
    }>;
    checkout(userId: string, userBranchId: string, dto: CheckoutDto): Promise<{
        success: boolean;
        message: string;
        sale: {
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
            customer: {
                id: string;
                email: string | null;
                name: string;
                phone: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                address: string | null;
            };
            cashier: {
                id: string;
                name: string;
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
            } & {
                id: string;
                saleId: string;
                productId: string;
                batchId: string;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                discountAmount: import("@prisma/client/runtime/library").Decimal;
                subtotal: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            id: string;
            branchId: string;
            createdAt: Date;
            updatedAt: Date;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            invoiceNumber: string;
            customerId: string | null;
            cashierId: string;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            paymentStatus: string;
            paymentMethod: string;
            notes: string | null;
        };
        receipt: {
            invoiceNumber: string;
            date: Date;
            branchName: string;
            cashierName: string;
            customerName: string;
            subtotal: number;
            discount: number;
            totalAmount: number;
            paymentMethod: string;
            cashGiven: number;
            changeGiven: number;
            itemsCount: any;
        };
    }>;
    generateQris(dto: GenerateQrisDto): Promise<{
        referenceCode: string;
        amount: number;
        currency: string;
        merchantName: string;
        city: string;
        qrPayload: string;
        expiresAt: string;
        status: string;
    }>;
    verifyQris(referenceCode: string): Promise<{
        referenceCode: string;
        status: string;
        paidAt: string;
        message: string;
    }>;
}
