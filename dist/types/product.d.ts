export default interface StencilProduct {
    id: number;
    name: string;
    min_purchase_quantity: number;
    max_purchase_quantity: number;
    bulk_discount_rates?: {
        type: 'price';
        min: number;
        max: number;
        discount: {
            formatted: string;
            value: number;
            currency: string;
        };
    }[];
    price: {
        without_tax: {
            value: number;
        };
    };
    options: {
        id: number;
        display_name: string;
        type: string;
        required: boolean;
        values: {
            id: number;
            label: string;
            is_default: boolean;
            price_modifier: number;
            price_modifier_type: 'absolute' | 'percentage';
        }[];
    }[];
    option: {
        id: number;
        display_name: string;
        type: string;
        required: boolean;
        values: {
            id: number;
            label: string;
            is_default: boolean;
            price_modifier: number;
            price_modifier_type: 'absolute' | 'percentage';
        }[];
    };
    option_value: {
        id: number;
        label: string;
        is_default: boolean;
        price_modifier: number;
        price_modifier_type: 'absolute' | 'percentage';
    };
}
