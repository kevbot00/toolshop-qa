import { test, expect } from '../../src/fixtures';
import { buildUser, uniqueEmail } from '../../src/data/factories';
import { seededUsers } from '../../src/data/users';

test.describe('POST /users/login', () => {
  test('valid credentials return a bearer token @smoke', async ({ api }) => {
    const response = await api.login(seededUsers.customer.email, seededUsers.customer.password);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ token_type: 'bearer', access_token: expect.any(String) });
    expect(body.expires_in).toBeGreaterThan(0);
  });

  test('wrong password returns 401 and no token', async ({ api }) => {
    const response = await api.login(seededUsers.customer.email, 'not-the-password');

    expect(response.status()).toBe(401);
    expect(await response.json()).not.toHaveProperty('access_token');
  });
});

test.describe('POST /users/register', () => {
  test('creates the user without echoing the password, and the user can log in', async ({ api }) => {
    const user = buildUser();

    const response = await api.register(user);

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ id: expect.any(String), email: user.email, first_name: user.first_name });
    expect(body).not.toHaveProperty('password');
    expect((await api.login(user.email, user.password)).status()).toBe(200);
  });

  test('an email that is already registered returns 409', async ({ api, customer }) => {
    const response = await api.register(buildUser({ email: customer.email }));

    expect(response.status()).toBe(409);
    expect((await response.json()).email).toEqual([expect.stringContaining('already exists')]);
  });

  test('missing required fields return 422 naming each field', async ({ api }) => {
    const response = await api.register({});

    expect(response.status()).toBe(422);
    expect(Object.keys(await response.json()).sort()).toEqual(['email', 'first_name', 'last_name', 'password']);
  });

  test('a weak password returns 422 listing every rule it breaks', async ({ api }) => {
    const response = await api.register(buildUser({ password: 'abc' }));

    expect(response.status()).toBe(422);
    const { password } = await response.json();
    expect(password).toEqual(
      expect.arrayContaining([
        expect.stringContaining('at least 8 characters'),
        expect.stringContaining('uppercase and one lowercase'),
        expect.stringContaining('symbol'),
        expect.stringContaining('number'),
      ]),
    );
  });

  test('a malformed email is rejected', async ({ api }) => {
    // Known defect, kept as an expected failure so it stays visible in every report. When the API
    // starts rejecting the email, this test "unexpectedly passes" and fails the run as a reminder
    // to remove this line.
    test.fail(true, 'BUG: the API registers "not-an-email" and returns 201. See README > Findings.');

    // Unique on every run, so a second run can't get a 409 (duplicate) and pass for the wrong reason.
    const malformed = uniqueEmail().replace('@', '-at-');
    const response = await api.register(buildUser({ email: malformed }));

    expect(response.status()).toBe(422);
  });
});

test.describe('Session', () => {
  test('GET /users/me without a token returns 401', async ({ api }) => {
    expect((await api.me()).status()).toBe(401);
  });

  test('GET /users/me returns the signed-in customer', async ({ api, customer }) => {
    const response = await api.me(customer.token);

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ email: customer.email, last_name: customer.last_name });
  });

  test('logging out invalidates the token', async ({ api, customer }) => {
    expect((await api.logout(customer.token)).status()).toBe(200);

    expect((await api.me(customer.token)).status()).toBe(401);
  });
});
