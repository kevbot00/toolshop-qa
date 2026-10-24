import { test, expect } from '../../src/fixtures';
import { billingFrom } from '../../src/api/ToolshopApi';

test.describe('POST /invoices', () => {
  test('a customer checks out a cart and the invoice appears in their history @smoke', async ({ api, customer }) => {
    const product = await api.findProduct('Combination Pliers');
    const cartId = await api.createCart();
    await api.addToCart(cartId, product.id, 2);

    const response = await api.createInvoice(customer.token, {
      ...billingFrom(customer.address),
      cart_id: cartId,
      payment_method: 'cash-on-delivery',
      payment_details: {},
    });

    expect(response.status()).toBe(201);
    const invoice = await response.json();
    expect(invoice.invoice_number).toMatch(/^INV-\d+$/);
    expect(invoice.total).toBeCloseTo(product.price * 2, 2);

    const history = await (await api.invoices(customer.token)).json();
    expect(history.data.map((i: { invoice_number: string }) => i.invoice_number)).toEqual([invoice.invoice_number]);
  });

  test('checking out without a token returns 401', async ({ api, customer }) => {
    const cartId = await api.createCart();

    const response = await api.createInvoice(undefined, {
      ...billingFrom(customer.address),
      cart_id: cartId,
      payment_method: 'cash-on-delivery',
      payment_details: {},
    });

    expect(response.status()).toBe(401);
  });

  test('a billing city that does not belong to the postcode is rejected', async ({ api, customer }) => {
    const cartId = await api.createCart();
    await api.addToCart(cartId, (await api.findProduct('Pliers')).id, 1);

    const response = await api.createInvoice(customer.token, {
      ...billingFrom(customer.address),
      billing_city: 'Not The Right City',
      cart_id: cartId,
      payment_method: 'cash-on-delivery',
      payment_details: {},
    });

    expect(response.status()).toBe(422);
    expect((await response.json()).billing_country).toEqual([expect.stringContaining('city does not belong')]);
  });
});

test.describe('POST /payment/check', () => {
  const validCard = {
    credit_card_number: '1111-2222-3333-4444',
    expiration_date: '12/2099',
    cvv: '123',
    card_holder_name: 'Test Customer',
  };

  test('accepts a well-formed credit card', async ({ api }) => {
    const response = await api.checkPayment('credit-card', validCard);

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ message: 'Payment was successful' });
  });

  test('rejects a card that has expired', async ({ api }) => {
    const response = await api.checkPayment('credit-card', { ...validCard, expiration_date: '01/2020' });

    expect(response.status()).toBe(422);
    expect((await response.json()).errors).toHaveProperty(['payment_details.expiration_date']);
  });
});
