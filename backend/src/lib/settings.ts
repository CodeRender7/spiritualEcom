import { Modules } from "@medusajs/framework/utils"

/**
 * DivineKart settings stored in the Store `metadata` JSON under the
 * `divinekart_settings` key. Read via getStoreSettings / writeSettings.
 */

export type PaymentSettings = {
  cod_enabled: boolean
  razorpay_enabled: boolean
  razorpay_key_id: string
  razorpay_key_secret: string
  razorpay_test_mode: boolean
}

export type ReviewsSettings = {
  enabled: boolean
  require_moderation: boolean
  allow_anonymous: boolean
}

export type UpsellSettings = {
  enabled: boolean
  strategy: "related" | "bestsellers" | "cross_sell"
  max_items: number
  min_order_value: number
}

export type WhatsappSettings = {
  enabled: boolean
  gateway: "openwa" | "waha"
  gateway_url: string
  api_key: string
  default_country_code: string
  order_confirmation_template: string
  order_shipped_template: string
}

export type InvoicingSettings = {
  enabled: boolean
  company_name: string
  company_address: string
  gstin: string
  contact_email: string
  footer_note: string
}

export type DivineKartSettings = {
  payments: PaymentSettings
  reviews: ReviewsSettings
  upsell: UpsellSettings
  whatsapp: WhatsappSettings
  invoicing: InvoicingSettings
}

export const SETTINGS_KEY = "divinekart_settings"

export const defaultSettings: DivineKartSettings = {
  payments: {
    cod_enabled: true,
    razorpay_enabled: true,
    razorpay_key_id: process.env.RAZORPAY_KEY_ID || "",
    razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    razorpay_test_mode: true,
  },
  reviews: {
    enabled: true,
    require_moderation: false,
    allow_anonymous: true,
  },
  upsell: {
    enabled: true,
    strategy: "related",
    max_items: 6,
    min_order_value: 0,
  },
  whatsapp: {
    enabled: false,
    gateway: "openwa",
    gateway_url: "",
    api_key: "",
    default_country_code: "+91",
    order_confirmation_template:
      "Namaste {name}! 🕉️ Your DivineKart order #{order_id} is confirmed. Total ₹{total}. Thank you!",
    order_shipped_template:
      "Namaste {name}! Your DivineKart order #{order_id} has been shipped. 🚚",
  },
  invoicing: {
    enabled: true,
    company_name: "DivineKart",
    company_address: "Vrindavan, Uttar Pradesh, India",
    gstin: "",
    contact_email: "support@divinekart.com",
    footer_note: "Thank you for shopping at DivineKart! 🙏",
  },
}

/** Deep-merge a partial update into the default settings (survives drifts). */
export function mergeSettings(partial: Partial<DivineKartSettings>): DivineKartSettings {
  const merged: DivineKartSettings = {
    payments: { ...defaultSettings.payments, ...(partial.payments ?? {}) },
    reviews: { ...defaultSettings.reviews, ...(partial.reviews ?? {}) },
    upsell: { ...defaultSettings.upsell, ...(partial.upsell ?? {}) },
    whatsapp: { ...defaultSettings.whatsapp, ...(partial.whatsapp ?? {}) },
    invoicing: { ...defaultSettings.invoicing, ...(partial.invoicing ?? {}) },
  }
  return merged
}

/** Read persisted settings from the store metadata, falling back to defaults. */
export async function getStoreSettings(container: any): Promise<DivineKartSettings> {
  const storeModule = container.resolve(Modules.STORE)
  const stores = await storeModule.listStores({}, { select: ["id", "metadata"] })
  const metadata = stores[0]?.metadata ?? {}
  const stored = metadata[SETTINGS_KEY]
  if (!stored || typeof stored !== "object") {
    return structureSettings(defaultSettings)
  }
  return structureSettings(mergeSettings(stored as Partial<DivineKartSettings>))
}

/** Persist settings to the store metadata. */
export async function writeStoreSettings(
  container: any,
  partial: Partial<DivineKartSettings>
): Promise<DivineKartSettings> {
  const storeModule = container.resolve(Modules.STORE)
  const stores = await storeModule.listStores({}, { select: ["id", "metadata"] })
  const metadata = stores[0]?.metadata ?? {}
  const current = structureSettings(
    mergeSettings((metadata[SETTINGS_KEY] as Partial<DivineKartSettings>) ?? {})
  )
  const next = mergeSettings({ ...current, ...partial })
  const normalized = structureSettings(next)

  await storeModule.updateStores(stores[0].id, {
    metadata: { ...metadata, [SETTINGS_KEY]: normalized },
  })
  return normalized
}

/**
 * Ensure only known keys are present. Drops leftover/unexpected fields so the
 * stored blob always matches the typed shape.
 */
function structureSettings(s: DivineKartSettings): DivineKartSettings {
  return {
    payments: {
      cod_enabled: Boolean(s.payments?.cod_enabled),
      razorpay_enabled: Boolean(s.payments?.razorpay_enabled),
      razorpay_key_id: String(s.payments?.razorpay_key_id ?? ""),
      razorpay_key_secret: String(s.payments?.razorpay_key_secret ?? ""),
      razorpay_test_mode: Boolean(s.payments?.razorpay_test_mode),
    },
    reviews: {
      enabled: Boolean(s.reviews?.enabled),
      require_moderation: Boolean(s.reviews?.require_moderation),
      allow_anonymous: Boolean(s.reviews?.allow_anonymous),
    },
    upsell: {
      enabled: Boolean(s.upsell?.enabled),
      strategy: (s.upsell?.strategy ?? "related") as UpsellSettings["strategy"],
      max_items: Number(s.upsell?.max_items ?? 6),
      min_order_value: Number(s.upsell?.min_order_value ?? 0),
    },
    invoicing: {
      enabled: Boolean(s.invoicing?.enabled),
      company_name: String(s.invoicing?.company_name ?? ""),
      company_address: String(s.invoicing?.company_address ?? ""),
      gstin: String(s.invoicing?.gstin ?? ""),
      contact_email: String(s.invoicing?.contact_email ?? ""),
      footer_note: String(s.invoicing?.footer_note ?? ""),
    },
    whatsapp: {
      enabled: Boolean(s.whatsapp?.enabled),
      gateway: (s.whatsapp?.gateway ?? "openwa") as WhatsappSettings["gateway"],
      gateway_url: String(s.whatsapp?.gateway_url ?? ""),
      api_key: String(s.whatsapp?.api_key ?? ""),
      default_country_code: String(s.whatsapp?.default_country_code ?? "+91"),
      order_confirmation_template: String(
        s.whatsapp?.order_confirmation_template ?? ""
      ),
      order_shipped_template: String(s.whatsapp?.order_shipped_template ?? ""),
    },
  }
}