export default interface DefaultConfig {
  show_price_range: boolean,
  variant: string,
  show_price_or_discount: 'price'|'discount',
  messages: {
    required_field: string,
    required_input: string,
    min_purchase_note: string
  },
  colors: {
    black: string,
    red: string,
    green: string
  }
}