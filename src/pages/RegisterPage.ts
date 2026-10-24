import type { Locator, Page } from '@playwright/test';
import type { NewUser } from '../data/factories';

export class RegisterPage {
  readonly submit: Locator;
  readonly passwordError: Locator;

  constructor(private readonly page: Page) {
    this.submit = page.getByTestId('register-submit');
    this.passwordError = page.getByTestId('password-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/register');
  }

  async fill(user: NewUser): Promise<void> {
    const field = (id: string) => this.page.getByTestId(id);
    await field('first-name').fill(user.first_name);
    await field('last-name').fill(user.last_name);
    await field('dob').fill(user.dob);
    await field('country').selectOption(user.address.country);
    await field('postal_code').fill(user.address.postal_code);
    await field('house_number').fill(user.address.house_number ?? '');
    await field('street').fill(user.address.street);
    await field('city').fill(user.address.city);
    await field('state').fill(user.address.state);
    await field('phone').fill(user.phone);
    await field('email').fill(user.email);
    await field('password').fill(user.password);
  }

  async register(user: NewUser): Promise<void> {
    await this.fill(user);
    await this.submit.click();
  }
}
