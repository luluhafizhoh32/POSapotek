import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto, VerifyPrescriptionDto } from './dto/prescription.dto';
export declare class PrescriptionsController {
    private readonly prescriptionsService;
    constructor(prescriptionsService: PrescriptionsService);
    findAll(branchId: string, status?: string): Promise<({
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
        items: ({
            product: {
                id: string;
                name: string;
                dosageForm: string;
                unit: string;
                sellPrice: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            dosage: string | null;
            productId: string;
            quantity: number;
            prescriptionId: string;
            dosageInstructions: string;
            isDispensed: boolean;
        })[];
        pharmacist: {
            id: string;
            email: string;
            name: string;
        };
    } & {
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
    })[]>;
    findOne(id: string): Promise<{
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
            dosage: string | null;
            productId: string;
            quantity: number;
            prescriptionId: string;
            dosageInstructions: string;
            isDispensed: boolean;
        })[];
        pharmacist: {
            id: string;
            name: string;
            phone: string;
        };
    } & {
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
    }>;
    create(branchId: string, dto: CreatePrescriptionDto): Promise<{
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
            dosage: string | null;
            productId: string;
            quantity: number;
            prescriptionId: string;
            dosageInstructions: string;
            isDispensed: boolean;
        })[];
    } & {
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
    }>;
    verify(id: string, pharmacistId: string, dto: VerifyPrescriptionDto): Promise<{
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
            dosage: string | null;
            productId: string;
            quantity: number;
            prescriptionId: string;
            dosageInstructions: string;
            isDispensed: boolean;
        })[];
        pharmacist: {
            id: string;
            name: string;
        };
    } & {
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
    }>;
    dispense(id: string, pharmacistId: string): Promise<{
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
            dosage: string | null;
            productId: string;
            quantity: number;
            prescriptionId: string;
            dosageInstructions: string;
            isDispensed: boolean;
        })[];
    } & {
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
    }>;
}
