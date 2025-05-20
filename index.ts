import { IConfig, IProduct, IStencilContext } from './types';
// @ts-ignore
import utils from '@bigcommerce/stencil-utils';

interface BulkRate {
	min: number;
	max: number;
	discount: number;
	type: 'fixed' | 'percent' | 'price';
}

export class BulkOrderChart {
	private config;
	public context;

	constructor(context: IStencilContext, config: IConfig) {
		if (!context.product) {
			throw new Error(
				'Bulk order chart requires product object to be injected on custom product template.'
			);
		}
		this.context = context;
		const baseConfig: IConfig = {
			show_price_range: false,
			variant: 'Size',
			show_price_or_discount: 'price',
			messages: {
				required_field: 'Verify all required fields are filled out',
				required_input: 'Please select a value from the chart',
				min_purchase_note: `Please note: you must purchase at least ${
					this.context.product.min_purchase_quantity || 1
				} total quantity`
			},
			colors: {
				black: '#666666',
				red: '#FF0000',
				green: '#036603'
			}
		};
		this.config = { ...baseConfig, ...config };
	}

	init() {
		const option = this.getBulkChartVariantOptions();

		this.HMTLElements().showBulkChartCheckbox.addEventListener('change', () => {
			const variantToHide = document.querySelector(
				`[name="attribute[${option.id}]"]`
			)?.closest(".form-field") as HTMLDivElement;
			if (!variantToHide) {
				throw new Error(
					`Could not find the variant element with a name "attribute[${option.id}]".`
				);
			}
			variantToHide.style.display = 'none';
			const firstVariantOption = variantToHide.querySelector("[name]") as HTMLInputElement | HTMLSelectElement;
			
			switch(firstVariantOption.type) {
				case 'radio':
					firstVariantOption.setAttribute("checked", "");
					break;
				case 'select-one':
					firstVariantOption.lastElementChild!.setAttribute("selected", "");
					break;
				default:
					throw new Error('Invalid input type');
			}


			this.HMTLElements().quantitySelection.style.display = 'none';
			const checkboxWrapper = this.HMTLElements().showBulkChartCheckbox.closest(
				'.form-field'
			) as HTMLDivElement;
			checkboxWrapper.style.display = 'none';
			this.HMTLElements().addToCartButton.disabled = false;
			const bulkRates = this.getBulkDiscountRates();

			const bulkHeader = this.createBulkChartHeader(bulkRates);
			const bulkRows = option.values.map(value =>
				this.createTableRow({ bulkRates, option, value })
			);
			const bulkOrderChart = this.createBulkChart({
				header: bulkHeader,
				rows: bulkRows
			});

			document
				.getElementById('bulk-order-chart-field')
				?.appendChild(bulkOrderChart);

			// replace later to listen to add to cart
			bulkOrderChart.addEventListener('input', () => {
				this.updateBulkTotal({ bulkRates });
			});

			this.HMTLElements().addToCartButton.addEventListener('click', e => {
				e.preventDefault();
				const formLabels = Array.from(
					this.HMTLElements().productOptionsForm.querySelectorAll('.form-label')
				) as HTMLLabelElement[];
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

	private HMTLElements() {
		let showBulkChartCheckbox = document.getElementById(
			'show-bulk-order-chart'
		) as HTMLInputElement;
		if (!showBulkChartCheckbox) {
			throw new Error(
				'Show bulk order chart checkbox is missing - required to trigger the chart display'
			);
		}

		let quantitySelection = document.querySelector(
			'.form-field--increments'
		) as HTMLDivElement;
		if (!quantitySelection) {
			throw new Error(
				'Could not find a div element with the class name "form-field--increments".'
			);
		}

		let bulkInputs = Array.from(
			document.querySelectorAll('.bulk-input')
		) as HTMLInputElement[];
		if (!bulkInputs) {
			throw new Error(
				'Could not find any inputs with the class name "bulk-input".'
			);
		}

		let bulkInputsWithValues = bulkInputs.filter(input => input.value);

		let productOptionsForm = document.querySelector(
			'[data-cart-item-add]'
		) as HTMLFormElement;
		if (!productOptionsForm) {
			throw new Error(
				'Could not find a form with the attribute "[data-cart-item-add]".'
			);
		}

		let addToCartButton = productOptionsForm.querySelector(
			'#form-action-addToCart'
		) as HTMLInputElement;
		if (!addToCartButton) {
			throw new Error(
				'Could not find a button with the id "form-action-addToCart".'
			);
		}

		let cartQuantityValue = document.querySelector(
			'.cart-quantity'
		) as HTMLSpanElement;
		if (!cartQuantityValue) {
			throw new Error(
				'Could not find a span element with the class name "cart-quantity".'
			);
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

	private createBulkChart({
		header,
		rows
	}: {
		header: HTMLTableRowElement;
		rows: HTMLTableRowElement[];
	}): HTMLDivElement {
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

		bulkOrderChart.querySelector('#bulk-order-chart-head')?.appendChild(header);
		rows.forEach(row =>
			bulkOrderChart.querySelector('#bulk-order-chart-body')?.appendChild(row)
		);

		widgetContainer.appendChild(minPurchaseNote);
		widgetContainer.appendChild(bulkOrderChart);
		widgetContainer.appendChild(bulkTotal);

		return widgetContainer;
	}

	private createMinPurchaseNote(): HTMLParagraphElement {
		const minPurchaseNote = document.createElement('p');
		minPurchaseNote.id = 'bulk-min-purchase-note';
		minPurchaseNote.style.display = 'none';
		minPurchaseNote.innerText = this.config.messages.min_purchase_note;
		return minPurchaseNote;
	}

	private createBulkTotalContainer(): HTMLDivElement {
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

	private showMinPurchaseNote({
		message = this.config.messages.min_purchase_note,
		color = this.config.colors.black
	}): void {
		const minPurchaseNote = document.getElementById('bulk-min-purchase-note');

		if (!minPurchaseNote) {
			throw new Error(
				'Bulk chart must have an element with an ID of minPurchaseNote'
			);
		}

		minPurchaseNote.style.display = 'block';
		minPurchaseNote.style.color = color;
		minPurchaseNote.innerText = message;
	}

	private hideMinPurchaseNote(): void {
		const minPurchaseNote = document.getElementById('bulk-min-purchase-note');

		if (!minPurchaseNote) {
			throw new Error(
				'Bulk chart must have an element with an ID of minPurchaseNote'
			);
		}

		if (minPurchaseNote.style.display !== 'none')
			minPurchaseNote.style.display = 'none';
	}

	private getBulkDiscountRates(): BulkRate[] {
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

	private createBulkChartHeader(bulkRates: BulkRate[]): HTMLTableRowElement {
		const bulkChartHeader = document.createElement('tr');

		const firstColumnEmpty = document.createElement('th');
		firstColumnEmpty.innerText = this.config.variant;
		bulkChartHeader.appendChild(firstColumnEmpty);

		const basePriceColumn = document.createElement('th');
		if (this.config.show_price_range) {
			basePriceColumn.innerText = `${
				this.context.product.min_purchase_quantity || 1
			} - ${bulkRates[0].min - 1}`;
		} else {
			basePriceColumn.innerText = `${
				this.context.product.min_purchase_quantity || 1
			}`;
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
			} else {
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

	private getBulkChartVariantOptions(): IProduct['option'] {
		let options = this.context.product.options.filter(
			option => option.display_name.toLowerCase() === this.config.variant.toLowerCase()
		)[0];
		if (!options) {
			options = this.context.product.options[0];
		}
		return options;
	}

	private createTableRow({
		bulkRates,
		option,
		value
	}: {
		bulkRates: BulkRate[];
		option: IProduct['option'];
		value: IProduct['option_value'];
	}): HTMLTableRowElement {
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
		inputTd.appendChild(this.createQuantityInput({ ...variant }));
		tr.appendChild(inputTd);

		return tr;
	}

	private calculateDiscount({
		bulkRate,
		price
	}: {
		bulkRate: BulkRate;
		price: number;
	}): string {
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

	private calculateDiscountTotal({
		bulkRates,
		totalQuantity
	}: {
		bulkRates: BulkRate[];
		totalQuantity: number;
	}): number {
		const basePrice = this.context.product.price.without_tax.value;
		const bulkRate = bulkRates
			.sort((a, b) => b.min - a.min)
			.filter(bulkRate => totalQuantity >= bulkRate.min)[0];
		if (!bulkRate) return basePrice * totalQuantity;

		let discountAmount: number;

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

	private createQuantityInput({
		option_id,
		variant_id
	}: {
		option_id: number;
		variant_id: number;
	}): HTMLInputElement {
		const quantityInput = document.createElement('input');
		quantityInput.type = 'number';
		quantityInput.className = 'bulk-input';
		quantityInput.placeholder = '0';
		quantityInput.setAttribute('data-option-id', variant_id.toString());
		quantityInput.name = `qty[${option_id}_${variant_id}]`;
		return quantityInput;
	}

	private getTotalQuantityOnBulkChart(): number {
		return this.HMTLElements().bulkInputsWithValues.reduce(
			(acc, curr) => curr.valueAsNumber + acc,
			0
		);
	}

	private allRequiredOptionsValueValues(): {
		elements: HTMLElement[];
		valid: boolean;
	} {
		const requiredFields = Array.from(
			document.querySelectorAll('.productView-options .form-field [name]')
		) as [HTMLSelectElement | HTMLSelectElement];
		const invalidFields: HTMLElement[] = [];
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

	private updateBulkTotal({ bulkRates }: { bulkRates: BulkRate[] }): void {
		const basePrice = this.context.product.price.without_tax.value;
		const totalQuantity = this.getTotalQuantityOnBulkChart();
		const totalDiscountPrice = this.calculateDiscountTotal({
			bulkRates,
			totalQuantity
		});
		const totalSavings = basePrice * totalQuantity - totalDiscountPrice;

		const bulkTotalInput = document.getElementById(
			'bulk-total-value'
		) as HTMLInputElement;
		if (!bulkTotalInput) {
			throw new Error(
				'Could not find an element with the id "bulk-total-value'
			);
		}

		bulkTotalInput.value = totalDiscountPrice.toFixed(2);

		const bulkSavingsSpan = document.getElementById(
			'bulk-savings'
		) as HTMLSpanElement;
		if (!bulkSavingsSpan) {
			throw new Error('Could not find an element with the id "bulk-savings".');
		}

		if (totalSavings > 0) {
			bulkSavingsSpan.innerText = `You save $${totalSavings.toFixed(2)}!`;
		} else {
			bulkSavingsSpan.innerText = '';
		}
	}

	private showErrorOnInvalidOptions({
		invalidOptions
	}: {
		invalidOptions: HTMLElement[];
	}): void {
		for (const option of invalidOptions) {
			const fieldWrapper = option.closest('.form-field');
			const fieldLabel = fieldWrapper!.querySelector(
				'.form-label'
			)! as HTMLLabelElement;
			fieldLabel.style.color = this.config.colors.red;
		}
	}

	private addToCart({ bulkValues }: { bulkValues: HTMLInputElement[] }): void {
		if (bulkValues.length <= 0) {
			this.showMinPurchaseNote({
				message: `You must add at least ${
					this.context.product.max_purchase_quantity || 1
				} product${
					this.context.product.min_purchase_quantity <= 1 ? '' : 's'
				} to your cart.`,
				color: this.config.colors.red
			});
			return;
		}
		const item = bulkValues[bulkValues.length - 1];
		// _item is unused, but is still returned from .match() so has to be accounted for
		const [_item, optionId, variantId] =
			item.name.match(/\[(\d+)_(\d+)\]/) || [];
		if (!optionId || !variantId) {
			throw new Error('Could not get Option ID or Variant ID from bulk input.');
		}
		const formData = new FormData();
		formData.append('action', 'add');
		formData.append('product_id', `${this.context.product.id}`);
		formData.append(`attribute[${optionId}]`, variantId);
		formData.append('qty[]', item.value);

		for (const [key, value] of new FormData(
			this.HMTLElements().productOptionsForm
		).entries()) {
			if (Array.from(formData.keys()).some(k => k === key)) continue;
			if (!value) continue;
			if (key.includes('qty')) continue;
			formData.append(key, value);
		}

		bulkValues.pop();
		this.HMTLElements().cartQuantityValue.style.display = 'inline-block';
		this.HMTLElements().cartQuantityValue.innerHTML = (
			Number(this.HMTLElements().cartQuantityValue.innerHTML) +
			Number(item.value)
		).toString();

		// @ts-ignore
		utils.api.cart.itemAdd(formData, (err, res) => {
			if (bulkValues.length > 0) {
				this.HMTLElements().addToCartButton.value = 'Adding to Cart...';
				this.HMTLElements().addToCartButton.innerText = 'Adding to Cart...';
				this.HMTLElements().addToCartButton.disabled = true;
				return this.addToCart({ bulkValues });
			} else {
				this.HMTLElements().addToCartButton.innerText = 'Added to Cart!';
				this.HMTLElements().addToCartButton.value = 'Added to Cart!';

				setTimeout(() => {
					this.HMTLElements().addToCartButton.innerText = 'Add To Cart';
					this.HMTLElements().addToCartButton.value = 'Add To Cart';

					this.HMTLElements().addToCartButton.disabled = false;
					this.HMTLElements().bulkInputs.forEach(input => (input.value = ''));
					document.getElementById('bulk-savings')!.innerText = '';
					const bulkTotalInput = document.getElementById(
						'bulk-total-value'
					) as HTMLInputElement;
					bulkTotalInput.value = '0.00';
				}, 3000);
			}
		});
	}
}
