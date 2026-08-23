// Client-side API layer for DivineKart storefront — auth, cart, orders.
// Runs in the browser only (uses publishable key + bearer tokens).
// Server-side catalog fetches live in ./medusa.ts.

export interface Customer {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}

export interface OrderItem {
  id: string;
  title: string;
  subtitle?: string | null;
  thumbnail?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  variant_id?: string;
  product_id?: string;
}

export interface Order {
  id: string;
  display_id: number;
  status: string;
  payment_status: string;
  fulfillment_status?: string | null;
  currency_code: string;
  total: number;
  subtotal: number;
  shipping_total: number;
  tax_total: number;
  email?: string;
  created_at: string;
  items: OrderItem[];
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string | null;
    city?: string;
    province?: string | null;
    postal_code?: string;
    phone?: string | null;
  } | null;
  payment_collections?: Array<{
    id: string;
    payment_sessions?: Array<{ provider_id: string; status: string }>;
  }>;
}

export interface ShippingOption {
  id: string;
  name: string;
  amount: number;
  price_type: string;
}

export interface CartData {
  id: string;
  total: number;
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  currency_code: string;
  items: Array<{
    id: string;
    title: string;
    thumbnail?: string | null;
    quantity: number;
    unit_price: number;
    variant_id?: string;
    product_id?: string;
  }>;
  promotions?: Array<{ code: string; is_automatic?: boolean }>;
}

function getUrl(): string {
  return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const TOKEN_KEY = "divinekart_auth_token";
const CUSTOMER_KEY = "divinekart_customer";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, customer: Customer): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_KEY);
}

export function getStoredCustomer(): Customer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    return raw ? (JSON.parse(raw) as Customer) : null;
  } catch {
    return null;
  }
}

async function api(path: string, options: RequestInit = {}, needsAuth = false): Promise<any> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
  };
  if (needsAuth) {
    const token = getToken();
    if (!token) throw new Error("Please login to continue.");
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${getUrl()}${path}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> | undefined) } });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message || body.type || message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────

export async function loginCustomer(email: string, password: string): Promise<{ token: string }> {
  return api("/auth/customer/emailpass", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function registerCustomer(
  email: string,
  password: string,
  first_name?: string,
  last_name?: string,
  metadata?: Record<string, any>
): Promise<{ token: string }> {
  // 1. Register the auth identity → short-lived register token
  const reg = await api("/auth/customer/emailpass/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  // 2. Create the customer record using the register token
  await api("/store/customers", {
    method: "POST",
    headers: { Authorization: `Bearer ${reg.token}` },
    body: JSON.stringify({ email, first_name, last_name, metadata }),
  });

  // 3. Login again to obtain a session token (register token is not a session token)
  return loginCustomer(email, password);
}

export async function fetchMe(): Promise<Customer> {
  const data = await api("/store/customers/me", {}, true);
  return data.customer as Customer;
}

// ── Cart / Checkout ───────────────────────────────────────────────────

export async function createCart(): Promise<CartData> {
  const data = await api("/store/carts", { method: "POST", body: JSON.stringify({ currency_code: "inr" }) });
  return data.cart as CartData;
}

export async function fetchCart(cartId: string): Promise<CartData> {
  const data = await api(`/store/carts/${cartId}`);
  return data.cart as CartData;
}

export async function associateCartWithCustomer(cartId: string): Promise<void> {
  await api(`/store/carts/${cartId}/customer`, { method: "POST", body: JSON.stringify({}) }, true);
}

export async function addLineItem(
  cartId: string,
  variantId: string,
  quantity: number,
  metadata?: Record<string, any>
): Promise<CartData> {
  const data = await api(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity, ...(metadata ? { metadata } : {}) }),
  });
  return data.cart as CartData;
}

export async function updateLineItem(cartId: string, lineId: string, quantity: number): Promise<CartData> {
  const data = await api(`/store/carts/${cartId}/line-items/${lineId}`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
  return data.cart as CartData;
}

export async function removeLineItem(cartId: string, lineId: string): Promise<CartData> {
  const data = await api(`/store/carts/${cartId}/line-items/${lineId}`, { method: "DELETE" });
  return data.cart as CartData;
}

export async function applyPromotion(cartId: string, code: string): Promise<CartData> {
  const data = await api(`/store/carts/${cartId}/promotions`, {
    method: "POST",
    body: JSON.stringify({ promo_codes: [code] }),
  });
  return data.cart as CartData;
}

export async function removePromotion(cartId: string): Promise<CartData> {
  const data = await api(`/store/carts/${cartId}/promotions`, { method: "DELETE" });
  return data.cart as CartData;
}

export async function updateCart(
  cartId: string,
  payload: { email?: string; shipping_address?: Record<string, string> }
): Promise<CartData> {
  const data = await api(`/store/carts/${cartId}`, { method: "POST", body: JSON.stringify(payload) });
  return data.cart as CartData;
}

export async function listShippingOptions(cartId: string): Promise<ShippingOption[]> {
  const data = await api(`/store/shipping-options?cart_id=${cartId}`);
  return data.shipping_options as ShippingOption[];
}

export async function addShippingMethod(cartId: string, optionId: string): Promise<CartData> {
  const data = await api(`/store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    body: JSON.stringify({ option_id: optionId }),
  });
  return data.cart as CartData;
}

export async function createPaymentCollection(cartId: string): Promise<{ id: string }> {
  const data = await api("/store/payment-collections", {
    method: "POST",
    body: JSON.stringify({ cart_id: cartId }),
  });
  return data.payment_collection as { id: string };
}

export async function initiatePaymentSession(collectionId: string, providerId: string): Promise<any> {
  return api(`/store/payment-collections/${collectionId}/payment-sessions`, {
    method: "POST",
    body: JSON.stringify({ provider_id: providerId }),
  });
}

export async function completeCart(cartId: string): Promise<{ order: Order }> {
  return api(`/store/carts/${cartId}/complete`, { method: "POST", body: JSON.stringify({}) });
}

// ── Payment decision tree (A3) ───────────────────────────────────────

export interface EligiblePaymentProvider {
  id: string;
  label: string;
  test_mode: boolean;
}

export interface CartPaymentEligibility {
  cart_id: string;
  providers: EligiblePaymentProvider[];
  best: string | null;
  auto_selected: boolean;
  subscription_cart: boolean;
  cod_hidden: boolean;
  fallback_hint: string | null;
}

export async function fetchCartPaymentProviders(cartId: string): Promise<CartPaymentEligibility> {
  return api(`/store/carts/${cartId}/payment-providers`) as Promise<CartPaymentEligibility>;
}

// ── Orders ────────────────────────────────────────────────────────────

export async function fetchOrder(orderId: string): Promise<Order> {
  const data = await api(`/store/orders/${orderId}`);
  return data.order as Order;
}

export async function fetchMyOrders(limit = 20): Promise<Order[]> {
  const data = await api(`/store/orders?limit=${limit}&fields=id,display_id,status,total,currency_code,created_at,payment_status`, {}, true);
  return data.orders as Order[];
}

// ── Referrals ──────────────────────────────────────────────────────────

export interface MyReferral {
  referral: {
    id: string;
    code: string;
    reward_code: string | null;
    reward_status: string;
  } | null;
  stats: {
    invited: number;
    completed: number;
    pending: number;
  };
}

export async function fetchMyReferral(): Promise<MyReferral> {
  return api("/store/referrals/me", {}, true) as Promise<MyReferral>;
}