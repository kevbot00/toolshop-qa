import { test, expect } from '../../src/fixtures';
import { buildUser } from '../../src/data/factories';
import { seededUsers } from '../../src/data/users';

test.describe('Sign in', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('a customer signs in and lands on their account page @smoke', async ({ page, loginPage, header }) => {
    await loginPage.login(seededUsers.customer.email, seededUsers.customer.password);

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByTestId('page-title')).toHaveText('My account');
    await expect(header.userMenu).toContainText('Jane Doe');
  });

  test('a wrong password shows an error and keeps the user signed out', async ({ page, loginPage, header }) => {
    await loginPage.login(seededUsers.customer.email, 'not-the-password');

    await expect(loginPage.error).toContainText('Invalid email or password');
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(header.signIn).toBeVisible();
  });

  test('signing out ends the session', async ({ page, loginPage, header, customer }) => {
    await loginPage.login(customer.email, customer.password);
    await expect(header.userMenu).toBeVisible();

    await header.logOut();

    await expect(header.signIn).toBeVisible();
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});

test('account pages send signed-out visitors to the login page', async ({ page }) => {
  await page.goto('/account/invoices');

  await expect(page).toHaveURL(/\/auth\/login$/);
});

test.describe('Registration', () => {
  test('a new customer registers and can sign in with the new account', async ({ page, api, registerPage, loginPage }) => {
    const user = buildUser({ address: await api.lookupAddress('US', '92501') });
    await registerPage.goto();

    await registerPage.register(user);

    await expect(page).toHaveURL(/\/auth\/login$/);
    await loginPage.login(user.email, user.password);
    await expect(page.getByTestId('page-title')).toHaveText('My account');
  });

  test('a password that breaks the policy is flagged before anything is sent', async ({ page, registerPage }) => {
    let registerCalled = false;
    page.on('request', (r) => {
      if (r.url().includes('/users/register')) registerCalled = true;
    });
    await registerPage.goto();

    await registerPage.register(buildUser({ password: 'short' }));

    await expect(registerPage.passwordError).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/register$/);
    expect(registerCalled, 'the form should not call the API with an invalid password').toBe(false);
  });
});
