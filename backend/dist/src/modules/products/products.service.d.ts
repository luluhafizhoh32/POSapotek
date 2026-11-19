import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(params?: {
        search?: string;
        categoryId?: string;
        isPrescriptionRequired?: boolean;
        branchId?: string;
        lowStockOnly?: boolean;
    }): Promise<{
        totalStock: number;
        isLowStock: boolean;
        nearestExpDate: Date;
        inventories: {
            id: string;
            branchId: string;
            updatedAt: Date;
            productId: string;
            totalStock: number;
            reservedStock: number;
        }[];
        category: {
            id: string;
            name: string;
        };
        batches: {
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
        }[];
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
    }[]>;
    findByBarcode(barcode: string): Promise<{
        totalStock: number;
        inventories: {
            id: string;
            branchId: string;
            updatedAt: Date;
            productId: string;
            totalStock: number;
            reservedStock: number;
        }[];
        category: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        };
        batches: {
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
        }[];
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
    }>;
    findOne(id: string): Promise<{
        totalStock: number;
        inventories: ({
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
        } & {
            id: string;
            branchId: string;
            updatedAt: Date;
            productId: string;
            totalStock: number;
            reservedStock: number;
        })[];
        category: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        };
        batches: ({
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
        })[];
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
    }>;
    create(dto: CreateProductDto): Promise<{
        category: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        };
    } & {
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
    }>;
    update(id: string, dto: UpdateProductDto): Promise<{
        category: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        };
    } & {
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
    }>;
    remove(id: string): Promise<{
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
    }>;
}
