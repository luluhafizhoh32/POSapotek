export declare class CartItemDto {
    productId: string;
    quantity: number;
    discountAmount?: number;
}
export declare class CheckoutDto {
    customerId?: string;
    paymentMethod: string;
    cashGiven?: number;
    discountAmount?: number;
    notes?: string;
    items: CartItemDto[];
}
export declare class GenerateQrisDto {
    amount: number;
    invoiceNumber?: string;
}
