import { z } from 'zod';
import { test, expect } from '../../src/fixtures';

// Contract for the fields the UI depends on. Validating the whole shape catches a renamed or
// retyped field, which a single-value assertion would miss.
const Product = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  in_stock: z.boolean(),
  is_rental: z.boolean(),
  category: z.object({ id: z.string(), name: z.string() }),
  brand: z.object({ id: z.string(), name: z.string() }),
});

const ProductPage = z.object({
  current_page: z.number().int(),
  last_page: z.number().int(),
  per_page: z.number().int(),
  total: z.number().int(),
  data: z.array(Product),
});

test.describe('GET /products', () => {
  test('returns a paginated list that matches the product contract @smoke', async ({ api }) => {
    const response = await api.products();

    expect(response.status()).toBe(200);
    const page = ProductPage.parse(await response.json());
    expect(page.current_page).toBe(1);
    expect(page.data).toHaveLength(page.per_page);
    expect(page.total).toBeGreaterThan(page.per_page);
  });

  test('consecutive pages do not repeat products', async ({ api }) => {
    const first = ProductPage.parse(await (await api.products({ page: 1 })).json());
    const second = ProductPage.parse(await (await api.products({ page: 2 })).json());

    const firstIds = new Set(first.data.map((p) => p.id));
    expect(second.data.filter((p) => firstIds.has(p.id))).toEqual([]);
  });

  test('filtering by category returns only products in that category', async ({ api }) => {
    const categoryId = await api.categoryId('Pliers');

    const page = ProductPage.parse(await (await api.products({ by_category: categoryId })).json());

    expect(page.data.length).toBeGreaterThan(0);
    expect(new Set(page.data.map((p) => p.category.name))).toEqual(new Set(['Pliers']));
  });

  for (const direction of ['asc', 'desc'] as const) {
    test(`sort=price,${direction} orders results by price`, async ({ api }) => {
      const page = ProductPage.parse(await (await api.products({ sort: `price,${direction}` })).json());

      const prices = page.data.map((p) => p.price);
      const sorted = [...prices].sort((a, b) => (direction === 'asc' ? a - b : b - a));
      expect(prices).toEqual(sorted);
    });
  }

  test('an unknown product id returns 404', async ({ api }) => {
    const response = await api.product('01HZZZZZZZZZZZZZZZZZZZZZZZ');

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ message: 'Requested item not found' });
  });
});

test.describe('GET /products/search', () => {
  for (const term of ['pliers', 'hammer', 'drill']) {
    test(`"${term}" returns only products that mention it`, async ({ api }) => {
      const page = ProductPage.parse(await (await api.searchProducts(term)).json());

      expect(page.data.length).toBeGreaterThan(0);
      for (const product of page.data) {
        expect(`${product.name} ${product.description}`.toLowerCase()).toContain(term);
      }
    });
  }

  test('a term with no matches returns an empty page, not an error', async ({ api }) => {
    const response = await api.searchProducts('no-such-tool-xyz');

    expect(response.status()).toBe(200);
    expect(ProductPage.parse(await response.json()).data).toEqual([]);
  });
});
