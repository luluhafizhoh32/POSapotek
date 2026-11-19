export declare class CreateSupplierDto {
    code: string;
    name: string;
    companyName: string;
    phone: string;
    email?: string;
    address?: string;
    isActive?: boolean;
}
export declare class UpdateSupplierDto extends CreateSupplierDto {
}
