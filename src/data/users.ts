// Accounts created by the app's database seeder. Tests only read with these; anything that
// changes account state registers its own user instead (see the `customer` fixture).
export const seededUsers = {
  admin: { email: 'admin@practicesoftwaretesting.com', password: 'welcome01' },
  customer: { email: 'customer@practicesoftwaretesting.com', password: 'welcome01' },
} as const;
