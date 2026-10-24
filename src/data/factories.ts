import { randomUUID } from 'node:crypto';

export type Address = {
  street: string;
  house_number?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
};

export type NewUser = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  dob: string;
  phone: string;
  address: Address;
};

// Satisfies the app's password policy: 8+ chars, upper and lower case, a number and a symbol.
export const VALID_PASSWORD = 'Sup3r$ecret!';

export function uniqueEmail(prefix = 'qa'): string {
  return `${prefix}+${randomUUID().slice(0, 8)}@example.com`;
}

export function buildUser(overrides: Partial<NewUser> = {}): NewUser {
  return {
    first_name: 'Test',
    last_name: 'Customer',
    email: uniqueEmail(),
    password: VALID_PASSWORD,
    dob: '1990-05-15',
    phone: '5551234567',
    address: {
      street: 'Main Street',
      house_number: '1',
      city: 'Riverside',
      state: 'California',
      country: 'US',
      postal_code: '92501',
    },
    ...overrides,
  };
}
