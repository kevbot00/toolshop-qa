import type { Locator, Page } from '@playwright/test';

export type PaymentMethod =
  | 'bank-transfer'
  | 'cash-on-delivery'
  | 'credit-card'
  | 'buy-now-pay-later'
  | 'gift-card';

/** The four-step checkout wizard: cart, sign in, billing address, payment. */
export class CheckoutPage {
  readonly lineItems: Locator;
  readonly cartTotal: Locator;
  readonly emptyCartMessage: Locator;
  readonly billingCity: Locator;
  readonly paymentMethod: Locator;
  readonly confirmButton: Locator;
  readonly paymentSuccess: Locator;
  readonly paymentError: Locator;
  readonly orderConfirmation: Locator;

  constructor(private readonly page: Page) {
    this.lineItems = page.locator('tbody tr').filter({ has: page.getByTestId('product-title') });
    this.cartTotal = page.getByTestId('cart-total');
    this.emptyCartMessage = page.getByText('The cart is empty. Nothing to display.');
    this.billingCity = page.getByTestId('city');
    this.paymentMethod = page.getByTestId('payment-method');
    this.confirmButton = page.getByTestId('finish');
    this.paymentSuccess = page.getByTestId('payment-success-message');
    this.paymentError = page.getByTestId('payment-error-message');
    this.orderConfirmation = page.locator('#order-confirmation');
  }

  async goto(): Promise<void> {
    await this.page.goto('/checkout');
  }

  lineItem(productName: string): Locator {
    return this.lineItems.filter({ hasText: productName });
  }

  async setQuantity(productName: string, quantity: number): Promise<void> {
    const input = this.lineItem(productName).getByTestId('product-quantity');
    await input.fill(String(quantity));
    // The cart recalculates on change, which fires when the field loses focus.
    await input.blur();
  }

  async remove(productName: string): Promise<void> {
    await this.lineItem(productName).locator('.btn-danger').click();
  }

  async proceedFromCart(): Promise<void> {
    await this.page.getByTestId('proceed-1').click();
  }

  /** Step 2 for a customer who is already signed in. */
  async proceedAsSignedInCustomer(): Promise<void> {
    await this.page.getByTestId('proceed-2').click();
  }

  async continueAsGuest(guest: { email: string; firstName: string; lastName: string }): Promise<void> {
    // The guest form lives in a tab next to the sign-in form.
    await this.page.getByRole('tab', { name: 'Continue as Guest' }).click();
    await this.page.getByTestId('guest-email').fill(guest.email);
    await this.page.getByTestId('guest-first-name').fill(guest.firstName);
    await this.page.getByTestId('guest-last-name').fill(guest.lastName);
    await this.page.getByTestId('guest-submit').click();
    await this.page.getByTestId('proceed-2-guest').click();
  }

  /**
   * Entering country, postcode and house number makes the app look up and fill in street, city
   * and state. Waiting for the city to be filled is the signal that the lookup has finished.
   */
  async enterBillingAddress(address: { country: string; postcode: string; houseNumber: string }): Promise<void> {
    await this.page.getByTestId('country').selectOption(address.country);
    await this.page.getByTestId('postal_code').fill(address.postcode);
    await this.page.getByTestId('house_number').fill(address.houseNumber);
    await this.page.getByTestId('house_number').blur();
  }

  async proceedFromBilling(): Promise<void> {
    await this.page.getByTestId('proceed-3').click();
  }

  async choosePayment(method: PaymentMethod): Promise<void> {
    await this.paymentMethod.selectOption(method);
  }

  async enterCreditCard(card: { number: string; expiry: string; cvv: string; holder: string }): Promise<void> {
    await this.page.getByTestId('credit_card_number').fill(card.number);
    await this.page.getByTestId('expiration_date').fill(card.expiry);
    await this.page.getByTestId('cvv').fill(card.cvv);
    await this.page.getByTestId('card_holder_name').fill(card.holder);
  }

  /** The first click validates the payment; the second places the order. */
  async confirmPayment(): Promise<void> {
    await this.confirmButton.click();
  }

  async placeOrder(): Promise<string> {
    await this.confirmButton.click();
    await this.orderConfirmation.waitFor();
    const text = await this.orderConfirmation.innerText();
    const invoice = text.match(/INV-\d+/)?.[0];
    if (!invoice) throw new Error(`No invoice number in confirmation: "${text}"`);
    return invoice;
  }
}
