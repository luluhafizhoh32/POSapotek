export declare class CreateProductDto {
    categoryId: string;
    sku?: string;
    barcode?: string;
    name: string;
    genericName?: string;
    brand?: string;
    dosageForm: string;
    dosage?: string;
    unit: string;
    buyPrice: number;
    sellPrice: number;
    minStock?: number;
    maxStock?: number;
    isPrescriptionRequired?: boolean;
    isActive?: boolean;
}
export declare class UpdateProductDto extends CreateProductDto {
}
