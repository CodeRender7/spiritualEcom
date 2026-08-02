export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  prices: Array<{
    currency_code: string;
    amount: number;
  }>;
  calculated_price?: number;
  original_price?: number;
}

export interface ProductImage {
  id: string;
  url: string;
}

export interface ProductCollection {
  id: string;
  title: string;
  handle: string;
  metadata?: Record<string, any>;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description?: string;
  thumbnail?: string;
  images?: ProductImage[];
  variants: ProductVariant[];
  collection?: ProductCollection;
  collection_id?: string;
  metadata?: {
    rating?: number;
    rating_count?: number;
    mrp?: number;
    discount_pct?: number;
    is_deal?: boolean;
    is_new?: boolean;
    is_trending?: boolean;
    icon?: string;
  };
}

function getMedusaUrl(): string {
  if (typeof window === "undefined") {
    return process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  }
  return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
}

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "";

async function medusaFetch(path: string, revalidate = 60): Promise<any> {
  const res = await fetch(`${getMedusaUrl()}${path}`, {
    next: { revalidate },
    headers: PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : undefined,
  });
  if (!res.ok) throw new Error(`Medusa request failed: ${res.status}`);
  return res.json();
}

// Mock Fallback Data in case Medusa backend hasn't finished seeding yet
export const MOCK_COLLECTIONS: ProductCollection[] = [
  { id: "col_1", title: "Religious Photos", handle: "religious-photos", metadata: { icon: "🖼️", count: 12 } },
  { id: "col_2", title: "God Image Keyrings", handle: "god-image-keyrings", metadata: { icon: "🔑", count: 8 } },
  { id: "col_3", title: "Spiritual Idols", handle: "spiritual-idols", metadata: { icon: "🛕", count: 15 } },
  { id: "col_4", title: "Spiritual Stickers", handle: "spiritual-stickers", metadata: { icon: "✨", count: 20 } },
  { id: "col_5", title: "Banners & Posters", handle: "banners-posters", metadata: { icon: "📜", count: 10 } },
  { id: "col_6", title: "Photo Frames", handle: "photo-frames", metadata: { icon: "🖼️", count: 14 } },
  { id: "col_7", title: "Handbills & Puja Invites", handle: "handbills", metadata: { icon: "📨", count: 6 } },
  { id: "col_8", title: "Spiritual Stationery", handle: "spiritual-stationery", metadata: { icon: "📖", count: 9 } },
  { id: "col_9", title: "Spiritual Flags (Dhwaja)", handle: "spiritual-flags", metadata: { icon: "🚩", count: 11 } },
  { id: "col_10", title: "Spiritual Clothing", handle: "spiritual-clothing", metadata: { icon: "🥻", count: 18 } },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod_1",
    title: "Brass Lord Ganesha Idol (Handcrafted 6 inch)",
    handle: "brass-lord-ganesha-idol",
    description: "Exquisite pure brass Ganesha idol for home mandir and desk. Brings prosperity, good fortune, and removes obstacles.",
    thumbnail: "https://images.unsplash.com/photo-1567591416348-18e3c3b01859?w=600&auto=format&fit=crop&q=80",
    images: [{ id: "img_1", url: "https://images.unsplash.com/photo-1567591416348-18e3c3b01859?w=600&auto=format&fit=crop&q=80" }],
    collection_id: "col_3",
    collection: MOCK_COLLECTIONS[2],
    variants: [{ id: "var_1", title: "Standard", prices: [{ currency_code: "inr", amount: 1299 }] }],
    metadata: { rating: 4.9, rating_count: 142, mrp: 1999, discount_pct: 35, is_deal: true, is_trending: true }
  },
  {
    id: "prod_2",
    title: "Gold-Plated Mahadev Shiva Keyring",
    handle: "mahadev-shiva-keyring",
    description: "Premium metallic keyring featuring Lord Shiva Trishul & Damru design. Durable acrylic casing with gold plating.",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    images: [{ id: "img_2", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80" }],
    collection_id: "col_2",
    collection: MOCK_COLLECTIONS[1],
    variants: [{ id: "var_2", title: "Standard", prices: [{ currency_code: "inr", amount: 199 }] }],
    metadata: { rating: 4.8, rating_count: 89, mrp: 399, discount_pct: 50, is_new: true, is_trending: true }
  },
  {
    id: "prod_3",
    title: "Holographic Shri Ram Car Dashboard Sticker",
    handle: "shri-ram-holographic-sticker",
    description: "Weather-proof 3D holographic sticker of Ayodhya Ram Lalla for car dashboard and laptop.",
    thumbnail: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&auto=format&fit=crop&q=80",
    images: [{ id: "img_3", url: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&auto=format&fit=crop&q=80" }],
    collection_id: "col_4",
    collection: MOCK_COLLECTIONS[3],
    variants: [{ id: "var_3", title: "Standard", prices: [{ currency_code: "inr", amount: 149 }] }],
    metadata: { rating: 4.7, rating_count: 230, mrp: 299, discount_pct: 50, is_deal: true, is_trending: true }
  },
  {
    id: "prod_4",
    title: "Sanskrit Shloka Printed Silk Puja Stole (Pitambari Shawl)",
    handle: "silk-puja-stole-pitambari",
    description: "Pure yellow silk scarf with printed Gayatri Mantra & Om symbols for pujas and spiritual ceremonies.",
    thumbnail: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&auto=format&fit=crop&q=80",
    images: [{ id: "img_4", url: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&auto=format&fit=crop&q=80" }],
    collection_id: "col_10",
    collection: MOCK_COLLECTIONS[9],
    variants: [{ id: "var_4", title: "Standard", prices: [{ currency_code: "inr", amount: 599 }] }],
    metadata: { rating: 4.9, rating_count: 76, mrp: 999, discount_pct: 40, is_new: true }
  },
  {
    id: "prod_5",
    title: "Saffron Hanumanji Temple Flag (Kesari Dhwaja with Jai Shri Ram)",
    handle: "saffron-hanuman-temple-flag",
    description: "Satin fabric triangular saffron flag with Bajrangbali graphic for home rooftop and mandirs.",
    thumbnail: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    images: [{ id: "img_5", url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80" }],
    collection_id: "col_9",
    collection: MOCK_COLLECTIONS[8],
    variants: [{ id: "var_5", title: "Standard", prices: [{ currency_code: "inr", amount: 249 }] }],
    metadata: { rating: 4.9, rating_count: 312, mrp: 499, discount_pct: 50, is_trending: true }
  },
  {
    id: "prod_6",
    title: "Gold Foil Framed Goddess Lakshmi & Saraswati Photo",
    handle: "gold-foil-framed-lakshmi-saraswati",
    description: "High-definition 3D gold-embossed wooden framed photo for Diwali & daily altar worship.",
    thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80",
    images: [{ id: "img_6", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80" }],
    collection_id: "col_6",
    collection: MOCK_COLLECTIONS[5],
    variants: [{ id: "var_6", title: "Standard", prices: [{ currency_code: "inr", amount: 799 }] }],
    metadata: { rating: 4.8, rating_count: 118, mrp: 1299, discount_pct: 38, is_deal: true }
  },
  {
    id: "prod_7",
    title: "Handmade Bhagavad Gita Hardcover Diary with Bookmark",
    handle: "bhagavad-gita-hardcover-diary",
    description: "Eco-friendly handmade paper journal with gold-foiled Gita verses on cover.",
    thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    images: [{ id: "img_7", url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80" }],
    collection_id: "col_8",
    collection: MOCK_COLLECTIONS[7],
    variants: [{ id: "var_7", title: "Standard", prices: [{ currency_code: "inr", amount: 349 }] }],
    metadata: { rating: 4.9, rating_count: 94, mrp: 599, discount_pct: 42, is_new: true }
  },
  {
    id: "prod_8",
    title: "Large Format Velvet Cloth Shrine Banner (Mata Ji Ki Chowki)",
    handle: "velvet-shrine-banner-mata-ji",
    description: "Embroidered red velvet altar backdrop cloth with zari border for puja rooms and jagrans.",
    thumbnail: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    images: [{ id: "img_8", url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80" }],
    collection_id: "col_5",
    collection: MOCK_COLLECTIONS[4],
    variants: [{ id: "var_8", title: "Standard", prices: [{ currency_code: "inr", amount: 499 }] }],
    metadata: { rating: 4.6, rating_count: 45, mrp: 899, discount_pct: 44 }
  }
];

export async function fetchProducts(): Promise<Product[]> {
  try {
    const data = await medusaFetch("/store/products");
    return data.products && data.products.length > 0 ? data.products : MOCK_PRODUCTS;
  } catch (error) {
    return MOCK_PRODUCTS;
  }
}

export async function fetchProductByHandle(handle: string): Promise<Product | undefined> {
  const products = await fetchProducts();
  return products.find((p) => p.handle === handle) || MOCK_PRODUCTS.find((p) => p.handle === handle);
}

export async function fetchCollections(): Promise<ProductCollection[]> {
  try {
    const data = await medusaFetch("/store/collections");
    return data.collections && data.collections.length > 0 ? data.collections : MOCK_COLLECTIONS;
  } catch (error) {
    return MOCK_COLLECTIONS;
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  try {
    const data = await medusaFetch(`/store/products?q=${encodeURIComponent(query.trim())}`, 30);
    if (data.products && data.products.length > 0) return data.products;
  } catch (error) {
    // fall through to mock search
  }
  return MOCK_PRODUCTS.filter((p) =>
    `${p.title} ${p.description ?? ""} ${p.collection?.title ?? ""} ${p.metadata?.icon ?? ""}`
      .toLowerCase()
      .includes(q)
  );
}
