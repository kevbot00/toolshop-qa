import { test, expect } from '../../src/fixtures';
import { uniqueEmail } from '../../src/data/factories';

test.describe('Contact form', () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.goto();
  });

  test('a visitor sends a message and sees a confirmation', async ({ contactPage }) => {
    await contactPage.send({
      firstName: 'Test',
      lastName: 'Visitor',
      email: uniqueEmail('contact'),
      subject: 'customer-service',
      message: 'I would like to know whether the combination pliers come with a warranty.',
    });

    await expect(contactPage.successMessage).toHaveText('Thanks for your message! We will contact you shortly.');
  });

  test('submitting an empty form flags each required field', async ({ contactPage }) => {
    await contactPage.submit.click();

    await expect(contactPage.firstNameError).toBeVisible();
    await expect(contactPage.emailError).toBeVisible();
    await expect(contactPage.messageError).toBeVisible();
    await expect(contactPage.successMessage).toBeHidden();
  });
});
