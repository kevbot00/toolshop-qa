import { test, expect } from '../../src/fixtures';

test.describe('Carts', () => {
  let cartId: string;
  let product: { id: string; name: string; price: number };

  test.beforeEach(async ({ api }) => {
    cartId = await api.createCart();
    product = await api.findProduct('Combination Pliers');
  });

  test('a new cart starts empty', async ({ api }) => {
    const response = await api.cart(cartId);

    expect(response.status()).toBe(200);
    expect((await response.json()).cart_items).toEqual([]);
  });

  test('an added item is stored with its product and quantity @smoke', async ({ api }) => {
    expect((await api.addToCart(cartId, product.id, 2)).status()).toBe(200);

    const { cart_items } = await (await api.cart(cartId)).json();
    expect(cart_items).toHaveLength(1);
    expect(cart_items[0]).toMatchObject({ product_id: product.id, quantity: 2 });
    expect(cart_items[0].product.name).toBe(product.name);
  });

  test('updating the quantity replaces it rather than adding to it', async ({ api }) => {
    await api.addToCart(cartId, product.id, 2);

    expect((await api.updateCartQuantity(cartId, product.id, 5)).status()).toBe(200);

    const { cart_items } = await (await api.cart(cartId)).json();
    expect(cart_items[0].quantity).toBe(5);
  });

  test('removing the only item leaves the cart empty', async ({ api }) => {
    await api.addToCart(cartId, product.id, 1);

    expect((await api.removeFromCart(cartId, product.id)).status()).toBe(204);

    expect((await (await api.cart(cartId)).json()).cart_items).toEqual([]);
  });

  test('a product that does not exist is rejected with 422', async ({ api }) => {
    const response = await api.addToCart(cartId, 'not-a-product', 1);

    expect(response.status()).toBe(422);
    expect((await response.json()).errors).toHaveProperty('product_id');
  });

  // Boundary values around the allowed range of 1 to 99.
  const quantities = [
    { quantity: 0, status: 422 },
    { quantity: 1, status: 200 },
    { quantity: 99, status: 200 },
    { quantity: 100, status: 422 },
  ];
  for (const { quantity, status } of quantities) {
    test(`quantity ${quantity} returns ${status}`, async ({ api }) => {
      expect((await api.addToCart(cartId, product.id, quantity)).status()).toBe(status);
    });
  }
});
