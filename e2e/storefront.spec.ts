import { test, expect } from "@playwright/test";

// Product/collection titles that only come from the real seeded DB (not the Mock
// fallback), used to prove the storefront renders real data.
const SEEDED_PRODUCT = "Premium Ayodhya Ram Lalla HD Photo Print";
const SEEDED_PRODUCT_SW = "Shiva Meditating in Himalayas Matte Print";
const SEEDED_COLLECTION = "Religious Photos";
const STORE_NAME = "DivineKart";

// Give the small Next/Medusa dev cluster time to warm up first render after boot.
test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(30_000);
});

test.describe("DivineKart storefront", () => {
  test("homepage renders store name and hero", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(STORE_NAME, { exact: false }).first()).toBeVisible();
  });

  test("homepage renders real seeded products (not Mock)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Real-data product stream must include a seeded product title.
    await expect(page.locator(".product-card-title", { hasText: SEEDED_PRODUCT }).first()).toBeVisible();
  });

  test("products listing page renders the product grid from real data", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".product-card-title", { hasText: SEEDED_PRODUCT }).first()).toBeVisible();
  });

  test("search query filters products to a seeded hit", async ({ page }) => {
    await page.goto("/products?q=ayodhya", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".product-card-title", { hasText: /Ayodhya Ram Lalla/i }).first()).toBeVisible();
  });

  test("product detail page loads for a seeded handle", async ({ page }) => {
    await page.goto("/products/ram-lalla-hd-photo", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(SEEDED_PRODUCT, { exact: false }).first()).toBeVisible();
  });

  test("collections list page shows seeded collections", async ({ page }) => {
    await page.goto("/collections", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".bento-card-title", { hasText: SEEDED_COLLECTION }).first()).toBeVisible();
  });

  test("collection detail page renders title and products", async ({ page }) => {
    await page.goto("/collections/religious-photos", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: SEEDED_COLLECTION })).toBeVisible();
    await expect(page.locator(".product-card-title", { hasText: SEEDED_PRODUCT }).first()).toBeVisible();
  });

  test("cart page loads", async ({ page }) => {
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(RegExp(STORE_NAME));
  });

  test("navbar navigation works to products and cart", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByText("All Products").first().click();
    await expect(page).toHaveURL(/\/products$/);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByText("Cart").first().click();
    await expect(page).toHaveURL(/\/cart$/);
  });
});

test.describe("backend API sanity", () => {
  test("store API returns seeded products and collections", async ({ request }) => {
    const key = process.env.E2E_PUBLISHABLE_KEY || "pk_97790752fb8ff4c622d10d836a3703c84c5084b8a94995ee8408e6eed4a5da75";
    const products = await request.get("http://localhost:9000/store/products", {
      headers: { "x-publishable-api-key": key },
    });
    expect(products.ok()).toBeTruthy();
    const pd = await products.json();
    expect(Array.isArray(pd.products)).toBeTruthy();
    expect(pd.products.length).toBeGreaterThanOrEqual(30);

    const collections = await request.get("http://localhost:9000/store/collections", {
      headers: { "x-publishable-api-key": key },
    });
    expect(collections.ok()).toBeTruthy();
    const cd = await collections.json();
    expect(cd.collections.length).toBeGreaterThanOrEqual(10);
  });
});