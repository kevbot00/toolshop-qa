import { test as base, expect } from '@playwright/test';
import { ToolshopApi } from './api/ToolshopApi';
import { API_URL } from './config';
import { buildUser, type NewUser } from './data/factories';
import { CatalogPage } from './pages/CatalogPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContactPage } from './pages/ContactPage';
import { Header } from './pages/Header';
import { LoginPage } from './pages/LoginPage';
import { ProductPage } from './pages/ProductPage';
import { RegisterPage } from './pages/RegisterPage';

export type Customer = NewUser & { token: string };

type Fixtures = {
  api: ToolshopApi;
  /** A brand-new registered user, so tests that change account state never share data. */
  customer: Customer;
  /** Same as `customer`, but the browser starts already signed in as them. */
  signedInCustomer: Customer;
  header: Header;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  catalog: CatalogPage;
  productPage: ProductPage;
  checkout: CheckoutPage;
  contactPage: ContactPage;
};

export const test = base.extend<Fixtures>({
  api: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { accept: 'application/json' },
    });
    await use(new ToolshopApi(request));
    await request.dispose();
  },

  customer: async ({ api }, use) => {
    // Checkout rejects addresses that don't match the postcode service, so register with one it returned.
    const address = await api.lookupAddress('US', '92501');
    const user = buildUser({ address });
    const response = await api.register(user);
    expect(response.status(), 'register test customer').toBe(201);
    await use({ ...user, token: await api.token(user.email, user.password) });
  },

  signedInCustomer: async ({ page, customer }, use) => {
    // The UI keeps its JWT in localStorage, so seeding it before the app loads skips the login
    // form. The form itself is covered by its own tests in auth.spec.ts.
    await page.addInitScript((token) => window.localStorage.setItem('auth-token', token), customer.token);
    await use(customer);
  },

  header: async ({ page }, use) => use(new Header(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  catalog: async ({ page }, use) => use(new CatalogPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  checkout: async ({ page }, use) => use(new CheckoutPage(page)),
  contactPage: async ({ page }, use) => use(new ContactPage(page)),
});

export { expect };
