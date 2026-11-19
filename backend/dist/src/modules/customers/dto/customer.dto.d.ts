export declare class CreateCustomerDto {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    isActive?: boolean;
}
export declare class UpdateCustomerDto extends CreateCustomerDto {
}
