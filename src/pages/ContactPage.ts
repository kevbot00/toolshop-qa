import type { Locator, Page } from '@playwright/test';

export type ContactMessage = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
};

export class ContactPage {
  readonly submit: Locator;
  readonly successMessage: Locator;
  readonly firstNameError: Locator;
  readonly emailError: Locator;
  readonly messageError: Locator;

  constructor(private readonly page: Page) {
    this.submit = page.getByTestId('contact-submit');
    this.successMessage = page.locator('.alert-success');
    this.firstNameError = page.getByTestId('first-name-error');
    this.emailError = page.getByTestId('email-error');
    this.messageError = page.getByTestId('message-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/contact');
  }

  async send(message: ContactMessage): Promise<void> {
    await this.page.getByTestId('first-name').fill(message.firstName);
    await this.page.getByTestId('last-name').fill(message.lastName);
    await this.page.getByTestId('email').fill(message.email);
    await this.page.getByTestId('subject').selectOption(message.subject);
    await this.page.getByTestId('message').fill(message.message);
    await this.submit.click();
  }
}
