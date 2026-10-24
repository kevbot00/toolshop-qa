import { test, expect, type Customer } from '../../src/fixtures';
import { uniqueEmail } from '../../src/data/factories';
import type { ToolshopApi } from '../../src/api/ToolshopApi';
import type { ProductPage } from '../../src/pages/ProductPage';
import type { Header } from '../../src/pages/Header';

// Called inside each test rather than in beforeEach: the signed-in fixture seeds the token with an
// init script, which only applies to page loads that happen after the fixture has been set up.
async function startCheckout(api: ToolshopApi, productPage: ProductPage, header: Header): Promise<void> {
  const product = await api.findProduct('Combination Pliers');
  await productPage.goto(product.id);
  await productPage.addToCart(1);
  await header.cartLink.click();
}

test.describe('Checkout', () => {
  test('a signed-in customer pays cash on delivery and gets an invoice @smoke', async ({
    api,
    signedInCustomer,
    productPage,
    header,
    checkout,
  }) => {
    await startCheckout(api, productPage, header);
    await checkout.proceedFromCart();
    await checkout.proceedAsSignedInCustomer();
    // The billing step is pre-filled from the customer's profile.
    await expect(checkout.billingCity).toHaveValue(signedInCustomer.address.city);
    await checkout.proceedFromBilling();
    await checkout.choosePayment('cash-on-delivery');

    await checkout.confirmPayment();
    await expect(checkout.paymentSuccess).toHaveText('Payment was successful');
    const invoiceNumber = await checkout.placeOrder();

    await expectInvoiceSaved(api, signedInCustomer, invoiceNumber);
  });

  test('a guest checks out with a credit card', async ({ api, productPage, header, checkout }) => {
    const address = await api.lookupAddress('US', '92501');
    await startCheckout(api, productPage, header);
    await checkout.proceedFromCart();
    await checkout.continueAsGuest({ email: uniqueEmail('guest'), firstName: 'Guest', lastName: 'Shopper' });
    await checkout.enterBillingAddress({ country: 'US', postcode: '92501', houseNumber: '1' });
    await expect(checkout.billingCity).toHaveValue(address.city);
    await checkout.proceedFromBilling();
    await checkout.choosePayment('credit-card');
    await checkout.enterCreditCard({ number: '1111-2222-3333-4444', expiry: '12/2099', cvv: '123', holder: 'Guest Shopper' });

    await checkout.confirmPayment();

    await expect(checkout.paymentSuccess).toHaveText('Payment was successful');
    expect(await checkout.placeOrder()).toMatch(/^INV-\d+$/);
  });
});

// A success screen alone doesn't prove the order was stored, so check through the API as well.
async function expectInvoiceSaved(api: ToolshopApi, customer: Customer, invoiceNumber: string): Promise<void> {
  const history = await (await api.invoices(customer.token)).json();
  expect(history.data.map((i: { invoice_number: string }) => i.invoice_number)).toContain(invoiceNumber);
}
