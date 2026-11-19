export declare class PrescriptionItemDto {
    productId: string;
    dosage: string;
    dosageInstructions: string;
    quantity: number;
}
export declare class CreatePrescriptionDto {
    customerId?: string;
    doctorName: string;
    doctorSip: string;
    notes?: string;
    items: PrescriptionItemDto[];
}
export declare class VerifyPrescriptionDto {
    status: 'VERIFIED' | 'REJECTED';
    clinicalNotes?: string;
}
