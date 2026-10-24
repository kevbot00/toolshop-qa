import { test, expect } from '../../src/fixtures';

test.describe('Product catalog', () => {
  test.beforeEach(async ({ catalog }) => {
    await catalog.goto();
  });

  test('the home page lists a full page of products with prices @smoke', async ({ catalog }) => {
    await expect(catalog.productCards).toHaveCount(9);
    for (const price of await catalog.prices()) {
      expect(price).toBeGreaterThan(0);
    }
  });

  test('search shows the same products the search API returns', async ({ api, catalog }) => {
    const { data } = await (await api.searchProducts('hammer')).json();
    const expected = data.map((p: { name: string }) => p.name).sort();

    await catalog.search('hammer');

    await expect(catalog.searchTerm).toHaveText('hammer');
    // The caption updates before the grid re-renders, so retry until the grid catches up.
    await expect.poll(async () => (await catalog.names()).sort()).toEqual(expected);
  });

  test('a search with no matches shows an empty state', async ({ catalog }) => {
    await catalog.search('no-such-tool-xyz');

    await expect(catalog.noResults).toBeVisible();
    await expect(catalog.productCards).toHaveCount(0);
  });

  test('filtering by category shows only that category', async ({ api, catalog }) => {
    const categoryId = await api.categoryId('Pliers');
    const { data } = await (await api.products({ by_category: categoryId })).json();
    const expected = data.map((p: { name: string }) => p.name).sort();

    await catalog.filterByCategory('Pliers');

    await expect.poll(async () => (await catalog.names()).sort()).toEqual(expected);
  });

  for (const [option, label] of [
    ['price,asc', 'low to high'],
    ['price,desc', 'high to low'],
  ] as const) {
    test(`sorting by price ${label} reorders the grid`, async ({ catalog }) => {
      await catalog.sortBy(option);

      await expect
        .poll(async () => {
          const prices = await catalog.prices();
          const sorted = [...prices].sort((a, b) => (option === 'price,asc' ? a - b : b - a));
          return prices.length > 0 && prices.every((price, i) => price === sorted[i]);
        })
        .toBe(true);
    });
  }

  test('the next page shows a different set of products', async ({ catalog }) => {
    const firstPage = await catalog.names();

    await catalog.goToNextPage();

    await expect.poll(() => catalog.names()).not.toEqual(firstPage);
    await expect(catalog.productCards).toHaveCount(9);
  });

  test('opening a product shows the same details as the API', async ({ api, catalog, productPage }) => {
    const product = await api.findProduct('Combination Pliers');

    await catalog.openProduct(product.name);

    await expect(productPage.name).toHaveText(product.name);
    await expect(productPage.unitPrice).toContainText(product.price.toFixed(2));
    await expect(productPage.description).not.toBeEmpty();
  });
});
