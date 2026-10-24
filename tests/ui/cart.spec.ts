import { test, expect } from '../../src/fixtures';

test.describe('Shopping cart', () => {
  let product: { id: string; name: string; price: number };

  test.beforeEach(async ({ api }) => {
    product = await api.findProduct('Combination Pliers');
  });

  test('adding a product updates the cart badge @smoke', async ({ productPage, header }) => {
    await productPage.goto(product.id);

    await productPage.addToCart(1);

    await expect(header.cartQuantity).toHaveText('1');
  });

  test('the cart line total is quantity times unit price', async ({ productPage, header, checkout }) => {
    await productPage.goto(product.id);
    await productPage.addToCart(3);

    await header.cartLink.click();

    const expected = `$${(product.price * 3).toFixed(2)}`;
    const line = checkout.lineItem(product.name);
    await expect(line.getByTestId('product-quantity')).toHaveValue('3');
    await expect(line.getByTestId('line-price')).toHaveText(expected);
    await expect(checkout.cartTotal).toHaveText(expected);
  });

  test('changing the quantity in the cart recalculates the total', async ({ productPage, header, checkout }) => {
    await productPage.goto(product.id);
    await productPage.addToCart(1);
    await header.cartLink.click();

    await checkout.setQuantity(product.name, 4);

    await expect(checkout.cartTotal).toHaveText(`$${(product.price * 4).toFixed(2)}`);
  });

  test('removing the only item empties the cart', async ({ productPage, header, checkout }) => {
    await productPage.goto(product.id);
    await productPage.addToCart(1);
    await header.cartLink.click();

    await checkout.remove(product.name);

    await expect(checkout.emptyCartMessage).toBeVisible();
    await expect(checkout.lineItems).toHaveCount(0);
  });
});
