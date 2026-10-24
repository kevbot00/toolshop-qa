import type { Locator, Page } from '@playwright/test';

export type SortOption = 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc';

/** The home page product grid, with its search, sort, category filters and pagination. */
export class CatalogPage {
  readonly productCards: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;
  readonly searchTerm: Locator;
  readonly noResults: Locator;
  readonly nextPage: Locator;

  constructor(private readonly page: Page) {
    // Cards are links whose data-test is "product-<id>"; the anchor tag keeps this from also
    // matching product-name and product-price inside each card.
    this.productCards = page.locator('a[data-test^="product-"]');
    this.productNames = page.getByTestId('product-name');
    this.productPrices = page.getByTestId('product-price');
    this.searchTerm = page.getByTestId('search-term');
    this.noResults = page.getByTestId('no-results');
    this.nextPage = page.getByTestId('pagination-next');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.productCards.first().waitFor();
  }

  async search(query: string): Promise<void> {
    await this.page.getByTestId('search-query').fill(query);
    await this.waitForGridUpdate(() => this.page.getByTestId('search-submit').click());
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.waitForGridUpdate(() => this.page.getByTestId('sort').selectOption(option));
  }

  async filterByCategory(name: string): Promise<void> {
    await this.waitForGridUpdate(() =>
      this.page.getByRole('checkbox', { name, exact: true }).check(),
    );
  }

  async goToNextPage(): Promise<void> {
    await this.waitForGridUpdate(() => this.nextPage.click());
  }

  async openProduct(name: string): Promise<void> {
    await this.productCards.filter({ hasText: name }).first().click();
  }

  async names(): Promise<string[]> {
    return (await this.productNames.allInnerTexts()).map((n) => n.trim());
  }

  async prices(): Promise<number[]> {
    return (await this.productPrices.allInnerTexts()).map((p) => Number(p.replace(/[^0-9.]/g, '')));
  }

  /**
   * Searching, sorting, filtering and paging re-render the grid from an API call. This waits for
   * that response so the action has really been applied. Angular renders the result a moment
   * later, so tests still read the grid with retrying assertions (expect.poll / toHaveText).
   * The app sends this call with the HTTP QUERY method, not GET, so match on the path and skip
   * only the CORS preflight.
   */
  private async waitForGridUpdate(action: () => Promise<unknown>): Promise<void> {
    const response = this.page.waitForResponse(
      (r) =>
        ['/products', '/products/search'].includes(new URL(r.url()).pathname) &&
        r.request().method() !== 'OPTIONS',
    );
    await action();
    await response;
  }
}
