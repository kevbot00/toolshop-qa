import type { Locator, Page } from '@playwright/test';

export class Header {
  readonly signIn: Locator;
  readonly userMenu: Locator;
  readonly signOut: Locator;
  readonly cartLink: Locator;
  readonly cartQuantity: Locator;

  constructor(page: Page) {
    this.signIn = page.getByTestId('nav-sign-in');
    this.userMenu = page.getByTestId('nav-menu');
    this.signOut = page.getByTestId('nav-sign-out');
    this.cartLink = page.getByTestId('nav-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
  }

  async logOut(): Promise<void> {
    await this.userMenu.click();
    await this.signOut.click();
  }
}
