import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
export declare class SuppliersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        _count: {
            purchases: number;
            productBatches: number;
        };
    } & {
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
    })[]>;
    findOne(id: string): Promise<{
        purchases: {
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
        }[];
    } & {
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
    }>;
    create(dto: CreateSupplierDto): Promise<{
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
    }>;
    update(id: string, dto: UpdateSupplierDto): Promise<{
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
    }>;
    remove(id: string): Promise<{
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
    }>;
}
