export declare class PurchaseItemDto {
    productId: string;
    quantity: number;
    unitPrice: number;
}
export declare class CreatePurchaseDto {
    supplierId: string;
    expectedDate?: string;
    notes?: string;
    items: PurchaseItemDto[];
}
export declare class ReceiveItemDto {
    purchaseItemId: string;
    batchNumber: string;
    mfgDate: string;
    expDate: string;
    receivedQuantity: number;
}
export declare class ReceiveGoodsDto {
    items: ReceiveItemDto[];
}
