import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
export declare class CustomersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(search?: string): Promise<({
        _count: {
            sales: number;
            prescriptions: number;
        };
    } & {
        id: string;
        email: string | null;
        name: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
    })[]>;
    findOne(id: string): Promise<{
        sales: ({
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
        })[];
        prescriptions: {
            id: string;
            branchId: string;
            createdAt: Date;
            updatedAt: Date;
            customerId: string;
            notes: string | null;
            prescriptionNumber: string;
            doctorName: string;
            doctorSip: string | null;
            prescriptionDate: Date;
            pharmacistId: string | null;
            status: string;
        }[];
    } & {
        id: string;
        email: string | null;
        name: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
    }>;
    create(dto: CreateCustomerDto): Promise<{
        id: string;
        email: string | null;
        name: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
    }>;
    update(id: string, dto: UpdateCustomerDto): Promise<{
        id: string;
        email: string | null;
        name: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        email: string | null;
        name: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
    }>;
}
