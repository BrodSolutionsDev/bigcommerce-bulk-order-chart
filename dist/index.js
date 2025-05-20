"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkOrderChart = void 0;
// @ts-ignore
const stencil_utils_1 = __importDefault(require("@bigcommerce/stencil-utils"));
class BulkOrderChart {
    constructor(context, config) {
        if (!context.product) {
            throw new Error('Bulk order chart requires product object to be injected on custom product template.');
        }
        this.context = context;
        const baseConfig = {
            show_price_range: false,
            variant: 'Size',
            show_price_or_discount: 'price',
            messages: {
                required_field: 'Verify all required fields are filled out',
                required_input: 'Please select a value from the chart',
                min_purchase_note: `Please note: you must purchase at least ${this.context.product.min_purchase_quantity || 1} total quantity`
            },
            colors: {
                black: '#666666',
                red: '#FF0000',
                green: '#036603'
            }
        };
        this.config = Object.assign(Object.assign({}, baseConfig), config);
    }
    init() {
        const option = this.getBulkChartVariantOptions();
        this.HMTLElements().showBulkChartCheckbox.addEventListener('change', () => {
            var _a, _b;
            const variantToHide = (_a = document.querySelector(`[name="attribute[${option.id}]"]`)) === null || _a === void 0 ? void 0 : _a.closest(".form-field");
            if (!variantToHide) {
                throw new Error(`Could not find the variant element with a name "attribute[${option.id}]".`);
            }
            variantToHide.style.display = 'none';
            const firstVariantOption = variantToHide.querySelector("[name]");
            switch (firstVariantOption.type) {
                case 'radio':
                    firstVariantOption.setAttribute("checked", "");
                    break;
                case 'select-one':
                    firstVariantOption.lastElementChild.setAttribute("selected", "");
                    break;
                default:
                    throw new Error('Invalid input type');
            }
            this.HMTLElements().quantitySelection.style.display = 'none';
            const checkboxWrapper = this.HMTLElements().showBulkChartCheckbox.closest('.form-field');
            checkboxWrapper.style.display = 'none';
            this.HMTLElements().addToCartButton.disabled = false;
            const bulkRates = this.getBulkDiscountRates();
            const bulkHeader = this.createBulkChartHeader(bulkRates);
            const bulkRows = option.values.map(value => this.createTableRow({ bulkRates, option, value }));
            const bulkOrderChart = this.createBulkChart({
                header: bulkHeader,
                rows: bulkRows
            });
            (_b = document
                .getElementById('bulk-order-chart-field')) === null || _b === void 0 ? void 0 : _b.appendChild(bulkOrderChart);
            // replace later to listen to add to cart
            bulkOrderChart.addEventListener('input', () => {
                this.updateBulkTotal({ bulkRates });
            });
            this.HMTLElements().addToCartButton.addEventListener('click', e => {
                e.preventDefault();
                const formLabels = Array.from(this.HMTLElements().productOptionsForm.querySelectorAll('.form-label'));
                formLabels.forEach(label => label.removeAttribute('style'));
                const inputsAreValid = this.allRequiredOptionsValueValues();
                this.hideMinPurchaseNote();
                if (!inputsAreValid.valid) {
                    this.showErrorOnInvalidOptions({
                        invalidOptions: inputsAreValid.elements
                    });
                    this.showMinPurchaseNote({
                        message: this.config.messages.required_field,
                        color: this.config.colors.red
                    });
                    return;
                }
                this.addToCart({
                    bulkValues: this.HMTLElements().bulkInputsWithValues
                });
            });
        });
    }
    HMTLElements() {
        let showBulkChartCheckbox = document.getElementById('show-bulk-order-chart');
        if (!showBulkChartCheckbox) {
            throw new Error('Show bulk order chart checkbox is missing - required to trigger the chart display');
        }
        let quantitySelection = document.querySelector('.form-field--increments');
        if (!quantitySelection) {
            throw new Error('Could not find a div element with the class name "form-field--increments".');
        }
        let bulkInputs = Array.from(document.querySelectorAll('.bulk-input'));
        if (!bulkInputs) {
            throw new Error('Could not find any inputs with the class name "bulk-input".');
        }
        let bulkInputsWithValues = bulkInputs.filter(input => input.value);
        let productOptionsForm = document.querySelector('[data-cart-item-add]');
        if (!productOptionsForm) {
            throw new Error('Could not find a form with the attribute "[data-cart-item-add]".');
        }
        let addToCartButton = productOptionsForm.querySelector('#form-action-addToCart');
        if (!addToCartButton) {
            throw new Error('Could not find a button with the id "form-action-addToCart".');
        }
        let cartQuantityValue = document.querySelector('.cart-quantity');
        if (!cartQuantityValue) {
            throw new Error('Could not find a span element with the class name "cart-quantity".');
        }
        return {
            showBulkChartCheckbox,
            quantitySelection,
            bulkInputs,
            bulkInputsWithValues,
            productOptionsForm,
            addToCartButton,
            cartQuantityValue
        };
    }
    createBulkChart({ header, rows }) {
        var _a;
        const widgetContainer = document.createElement('div');
        const minPurchaseNote = this.createMinPurchaseNote();
        const bulkTotal = this.createBulkTotalContainer();
        const bulkOrderChart = document.createElement('div');
        bulkOrderChart.id = 'bulk-order-chart-wrapper';
        bulkOrderChart.innerHTML = `
		<table id="bulk-order-chart">
			<thead id="bulk-order-chart-head"></thead>
			<tbody id="bulk-order-chart-body"></tbody>
		</table>
		`;
        (_a = bulkOrderChart.querySelector('#bulk-order-chart-head')) === null || _a === void 0 ? void 0 : _a.appendChild(header);
        rows.forEach(row => { var _a; return (_a = bulkOrderChart.querySelector('#bulk-order-chart-body')) === null || _a === void 0 ? void 0 : _a.appendChild(row); });
        widgetContainer.appendChild(minPurchaseNote);
        widgetContainer.appendChild(bulkOrderChart);
        widgetContainer.appendChild(bulkTotal);
        return widgetContainer;
    }
    createMinPurchaseNote() {
        const minPurchaseNote = document.createElement('p');
        minPurchaseNote.id = 'bulk-min-purchase-note';
        minPurchaseNote.style.display = 'none';
        minPurchaseNote.innerText = this.config.messages.min_purchase_note;
        return minPurchaseNote;
    }
    createBulkTotalContainer() {
        const bulkTotal = document.createElement('div');
        bulkTotal.id = 'bulk-total-wrapper';
        bulkTotal.innerHTML = `
		<div>
			<span style='margin-right: 10px;'>Total:</span>
			$<input id='bulk-total-value' type='text' value='0.00' style='border: none; padding: 0; width: 64px;' readonly min='0'>
		</div>
		<span id='bulk-savings' style='color: ${this.config.colors.green};'></span>
		`;
        return bulkTotal;
    }
    showMinPurchaseNote({ message = this.config.messages.min_purchase_note, color = this.config.colors.black }) {
        const minPurchaseNote = document.getElementById('bulk-min-purchase-note');
        if (!minPurchaseNote) {
            throw new Error('Bulk chart must have an element with an ID of minPurchaseNote');
        }
        minPurchaseNote.style.display = 'block';
        minPurchaseNote.style.color = color;
        minPurchaseNote.innerText = message;
    }
    hideMinPurchaseNote() {
        const minPurchaseNote = document.getElementById('bulk-min-purchase-note');
        if (!minPurchaseNote) {
            throw new Error('Bulk chart must have an element with an ID of minPurchaseNote');
        }
        if (minPurchaseNote.style.display !== 'none')
            minPurchaseNote.style.display = 'none';
    }
    getBulkDiscountRates() {
        const bulkDiscountRates = this.context.product.bulk_discount_rates;
        if (!bulkDiscountRates) {
            throw new Error('Bulk chart must have bulk discount rates');
        }
        return bulkDiscountRates.map(rate => {
            return {
                min: rate.min,
                max: rate.max,
                discount: rate.discount.value,
                type: rate.type
            };
        });
    }
    createBulkChartHeader(bulkRates) {
        const bulkChartHeader = document.createElement('tr');
        const firstColumnEmpty = document.createElement('th');
        firstColumnEmpty.innerText = this.config.variant;
        bulkChartHeader.appendChild(firstColumnEmpty);
        const basePriceColumn = document.createElement('th');
        if (this.config.show_price_range) {
            basePriceColumn.innerText = `${this.context.product.min_purchase_quantity || 1} - ${bulkRates[0].min - 1}`;
        }
        else {
            basePriceColumn.innerText = `${this.context.product.min_purchase_quantity || 1}`;
        }
        bulkChartHeader.appendChild(basePriceColumn);
        // append each bulk rate as a header column
        for (const bulkRate of bulkRates) {
            const th = document.createElement('th');
            if (this.config.show_price_range) {
                th.innerText =
                    bulkRate.max > 0
                        ? `${bulkRate.min} - ${bulkRate.max}`
                        : `${bulkRate.min}+`;
            }
            else {
                th.innerText = bulkRate.min.toString();
            }
            bulkChartHeader.appendChild(th);
        }
        // append the heading for the qty column after all bulk rates are added
        const quantityHeading = document.createElement('th');
        quantityHeading.innerText = 'Quantity';
        bulkChartHeader.appendChild(quantityHeading);
        return bulkChartHeader;
    }
    getBulkChartVariantOptions() {
        let options = this.context.product.options.filter(option => option.display_name.toLowerCase() === this.config.variant.toLowerCase())[0];
        if (!options) {
            options = this.context.product.options[0];
        }
        return options;
    }
    createTableRow({ bulkRates, option, value }) {
        const tr = document.createElement('tr');
        const price = this.context.product.price.without_tax.value;
        const variant = {
            option_id: 0,
            variant_id: 0
        };
        variant.option_id = option.id;
        variant.variant_id = value.id;
        const td = document.createElement('td');
        td.innerText = value.label;
        tr.appendChild(td);
        const basePriceTd = document.createElement('td');
        basePriceTd.innerText = `$${price}`;
        tr.appendChild(basePriceTd);
        for (const bulkRate of bulkRates) {
            const td = document.createElement('td');
            const discountedPrice = this.calculateDiscount({ bulkRate, price });
            td.innerText = discountedPrice;
            tr.appendChild(td);
        }
        const inputTd = document.createElement('td');
        inputTd.appendChild(this.createQuantityInput(Object.assign({}, variant)));
        tr.appendChild(inputTd);
        return tr;
    }
    calculateDiscount({ bulkRate, price }) {
        switch (bulkRate.type) {
            case 'fixed':
                return `$${bulkRate.discount.toFixed(2)}`;
            case 'percent':
                if (this.config.show_price_or_discount === 'price') {
                    const percentOff = price * (bulkRate.discount / 100);
                    const discountAmount = price - percentOff;
                    return `$${discountAmount.toFixed(2)}`;
                }
                return `${bulkRate.discount}% off`;
            case 'price': // dollar off
                if (this.config.show_price_or_discount === 'price') {
                    const discountAmount = price - bulkRate.discount;
                    return `$${discountAmount.toFixed(2)}`;
                }
                return `$${bulkRate.discount.toFixed(2)} off`;
            default:
                throw new Error('Invalid bulk rate discount type');
        }
    }
    calculateDiscountTotal({ bulkRates, totalQuantity }) {
        const basePrice = this.context.product.price.without_tax.value;
        const bulkRate = bulkRates
            .sort((a, b) => b.min - a.min)
            .filter(bulkRate => totalQuantity >= bulkRate.min)[0];
        if (!bulkRate)
            return basePrice * totalQuantity;
        let discountAmount;
        switch (bulkRate.type) {
            case 'fixed':
                return bulkRate.discount * totalQuantity;
            case 'percent':
                const percentOff = basePrice * (bulkRate.discount / 100);
                discountAmount = basePrice - percentOff;
                return Number(discountAmount.toFixed(2)) * totalQuantity;
            case 'price': // dollar off
                discountAmount = basePrice - bulkRate.discount;
                return discountAmount * totalQuantity;
            default:
                throw new Error('Invalid bulk rate discount type');
        }
    }
    createQuantityInput({ option_id, variant_id }) {
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.className = 'bulk-input';
        quantityInput.placeholder = '0';
        quantityInput.setAttribute('data-option-id', variant_id.toString());
        quantityInput.name = `qty[${option_id}_${variant_id}]`;
        return quantityInput;
    }
    getTotalQuantityOnBulkChart() {
        return this.HMTLElements().bulkInputsWithValues.reduce((acc, curr) => curr.valueAsNumber + acc, 0);
    }
    allRequiredOptionsValueValues() {
        const requiredFields = Array.from(document.querySelectorAll('.productView-options .form-field [name]'));
        const invalidFields = [];
        for (const field of requiredFields) {
            if (!field.validity.valid) {
                invalidFields.push(field);
            }
        }
        return {
            elements: Array.from(invalidFields),
            valid: invalidFields.length <= 0
        };
    }
    updateBulkTotal({ bulkRates }) {
        const basePrice = this.context.product.price.without_tax.value;
        const totalQuantity = this.getTotalQuantityOnBulkChart();
        const totalDiscountPrice = this.calculateDiscountTotal({
            bulkRates,
            totalQuantity
        });
        const totalSavings = basePrice * totalQuantity - totalDiscountPrice;
        const bulkTotalInput = document.getElementById('bulk-total-value');
        if (!bulkTotalInput) {
            throw new Error('Could not find an element with the id "bulk-total-value');
        }
        bulkTotalInput.value = totalDiscountPrice.toFixed(2);
        const bulkSavingsSpan = document.getElementById('bulk-savings');
        if (!bulkSavingsSpan) {
            throw new Error('Could not find an element with the id "bulk-savings".');
        }
        if (totalSavings > 0) {
            bulkSavingsSpan.innerText = `You save $${totalSavings.toFixed(2)}!`;
        }
        else {
            bulkSavingsSpan.innerText = '';
        }
    }
    showErrorOnInvalidOptions({ invalidOptions }) {
        for (const option of invalidOptions) {
            const fieldWrapper = option.closest('.form-field');
            const fieldLabel = fieldWrapper.querySelector('.form-label');
            fieldLabel.style.color = this.config.colors.red;
        }
    }
    addToCart({ bulkValues }) {
        if (bulkValues.length <= 0) {
            this.showMinPurchaseNote({
                message: `You must add at least ${this.context.product.max_purchase_quantity || 1} product${this.context.product.min_purchase_quantity <= 1 ? '' : 's'} to your cart.`,
                color: this.config.colors.red
            });
            return;
        }
        const item = bulkValues[bulkValues.length - 1];
        // _item is unused, but is still returned from .match() so has to be accounted for
        const [_item, optionId, variantId] = item.name.match(/\[(\d+)_(\d+)\]/) || [];
        if (!optionId || !variantId) {
            throw new Error('Could not get Option ID or Variant ID from bulk input.');
        }
        const formData = new FormData();
        formData.append('action', 'add');
        formData.append('product_id', `${this.context.product.id}`);
        formData.append(`attribute[${optionId}]`, variantId);
        formData.append('qty[]', item.value);
        for (const [key, value] of new FormData(this.HMTLElements().productOptionsForm).entries()) {
            if (Array.from(formData.keys()).some(k => k === key))
                continue;
            if (!value)
                continue;
            if (key.includes('qty'))
                continue;
            formData.append(key, value);
        }
        bulkValues.pop();
        this.HMTLElements().cartQuantityValue.style.display = 'inline-block';
        this.HMTLElements().cartQuantityValue.innerHTML = (Number(this.HMTLElements().cartQuantityValue.innerHTML) +
            Number(item.value)).toString();
        // @ts-ignore
        stencil_utils_1.default.api.cart.itemAdd(formData, (err, res) => {
            if (bulkValues.length > 0) {
                this.HMTLElements().addToCartButton.value = 'Adding to Cart...';
                this.HMTLElements().addToCartButton.innerText = 'Adding to Cart...';
                this.HMTLElements().addToCartButton.disabled = true;
                return this.addToCart({ bulkValues });
            }
            else {
                this.HMTLElements().addToCartButton.innerText = 'Added to Cart!';
                this.HMTLElements().addToCartButton.value = 'Added to Cart!';
                setTimeout(() => {
                    this.HMTLElements().addToCartButton.innerText = 'Add To Cart';
                    this.HMTLElements().addToCartButton.value = 'Add To Cart';
                    this.HMTLElements().addToCartButton.disabled = false;
                    this.HMTLElements().bulkInputs.forEach(input => (input.value = ''));
                    document.getElementById('bulk-savings').innerText = '';
                    const bulkTotalInput = document.getElementById('bulk-total-value');
                    bulkTotalInput.value = '0.00';
                }, 3000);
            }
        });
    }
}
exports.BulkOrderChart = BulkOrderChart;
