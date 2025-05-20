import { IConfig, IStencilContext } from './types';
export declare class BulkOrderChart {
    private config;
    context: IStencilContext;
    constructor(context: IStencilContext, config: IConfig);
    init(): void;
    private HMTLElements;
    private createBulkChart;
    private createMinPurchaseNote;
    private createBulkTotalContainer;
    private showMinPurchaseNote;
    private hideMinPurchaseNote;
    private getBulkDiscountRates;
    private createBulkChartHeader;
    private getBulkChartVariantOptions;
    private createTableRow;
    private calculateDiscount;
    private calculateDiscountTotal;
    private createQuantityInput;
    private getTotalQuantityOnBulkChart;
    private allRequiredOptionsValueValues;
    private updateBulkTotal;
    private showErrorOnInvalidOptions;
    private addToCart;
}
