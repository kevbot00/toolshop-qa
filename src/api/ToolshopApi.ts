import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { Address, NewUser } from '../data/factories';

export type BillingDetails = {
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postal_code: string;
};

/**
 * Thin client over the Toolshop REST API.
 *
 * Methods that return an APIResponse are for tests that assert on the response itself.
 * Methods that return data are for arranging test state, so they fail fast when setup breaks
 * instead of letting the test fail later with a confusing error.
 */
export class ToolshopApi {
  constructor(private readonly request: APIRequestContext) {}

  // --- Auth -----------------------------------------------------------------------------------

  login(email: string, password: string): Promise<APIResponse> {
    return this.request.post('/users/login', { data: { email, password } });
  }

  async token(email: string, password: string): Promise<string> {
    const response = await this.login(email, password);
    expect(response, `login as ${email}`).toBeOK();
    return (await response.json()).access_token;
  }

  register(user: Partial<NewUser>): Promise<APIResponse> {
    return this.request.post('/users/register', { data: user });
  }

  me(token?: string): Promise<APIResponse> {
    return this.request.get('/users/me', { headers: authHeader(token) });
  }

  logout(token: string): Promise<APIResponse> {
    return this.request.get('/users/logout', { headers: authHeader(token) });
  }

  // --- Catalog --------------------------------------------------------------------------------

  products(params: Record<string, string | number> = {}): Promise<APIResponse> {
    return this.request.get('/products', { params });
  }

  product(productId: string): Promise<APIResponse> {
    return this.request.get(`/products/${productId}`);
  }

  searchProducts(query: string): Promise<APIResponse> {
    return this.request.get('/products/search', { params: { q: query } });
  }

  async findProduct(query: string): Promise<{ id: string; name: string; price: number }> {
    const response = await this.searchProducts(query);
    expect(response).toBeOK();
    const { data } = await response.json();
    expect(data.length, `a product matching "${query}"`).toBeGreaterThan(0);
    return data[0];
  }

  async categoryId(name: string): Promise<string> {
    const response = await this.request.get('/categories');
    expect(response).toBeOK();
    const category = (await response.json()).find((c: { name: string }) => c.name === name);
    expect(category, `category "${name}"`).toBeTruthy();
    return category.id;
  }

  // --- Cart -----------------------------------------------------------------------------------

  async createCart(): Promise<string> {
    const response = await this.request.post('/carts');
    expect(response.status()).toBe(201);
    return (await response.json()).id;
  }

  addToCart(cartId: string, productId: string, quantity = 1): Promise<APIResponse> {
    return this.request.post(`/carts/${cartId}`, { data: { product_id: productId, quantity } });
  }

  updateCartQuantity(cartId: string, productId: string, quantity: number): Promise<APIResponse> {
    return this.request.put(`/carts/${cartId}/product/quantity`, {
      data: { product_id: productId, quantity },
    });
  }

  removeFromCart(cartId: string, productId: string): Promise<APIResponse> {
    return this.request.delete(`/carts/${cartId}/product/${productId}`);
  }

  cart(cartId: string): Promise<APIResponse> {
    return this.request.get(`/carts/${cartId}`);
  }

  // --- Checkout -------------------------------------------------------------------------------

  /**
   * The app validates that a billing city/state matches what its postcode service returns for
   * that country and postcode, so tests build addresses from the lookup, as the UI's autofill does.
   */
  async lookupAddress(country: string, postcode: string, houseNumber = '1'): Promise<Address> {
    const response = await this.request.get('/postcode-lookup', {
      params: { country, postcode, house_number: houseNumber },
    });
    expect(response).toBeOK();
    const found = await response.json();
    return {
      street: found.street,
      house_number: found.house_number,
      city: found.city,
      state: found.state,
      country: found.country,
      postal_code: found.postcode,
    };
  }

  createInvoice(
    token: string | undefined,
    invoice: BillingDetails & { cart_id: string; payment_method: string; payment_details: object },
  ): Promise<APIResponse> {
    return this.request.post('/invoices', { data: invoice, headers: authHeader(token) });
  }

  invoices(token: string): Promise<APIResponse> {
    return this.request.get('/invoices', { headers: authHeader(token) });
  }

  checkPayment(paymentMethod: string, paymentDetails: object): Promise<APIResponse> {
    return this.request.post('/payment/check', {
      data: { payment_method: paymentMethod, payment_details: paymentDetails },
    });
  }
}

export function billingFrom(address: Address): BillingDetails {
  return {
    billing_street: address.street,
    billing_city: address.city,
    billing_state: address.state,
    billing_country: address.country,
    billing_postal_code: address.postal_code,
  };
}

function authHeader(token?: string): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}
