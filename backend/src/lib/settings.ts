import { Modules } from "@medusajs/framework/utils"

/**
 * DivineKart settings stored in the Store `metadata` JSON under the
 * `divinekart_settings` key. Read via getStoreSettings / writeSettings.
 */

export type PaymentProviderKey =
  | "cod"
  | "razorpay"
  | "payu"
  | "stripe"
  | "easybuzz"
  | "justpay"
  | "paypal"
  | "hyperswitch"

export type PaymentProviderConfig = {
  enabled: boolean
  /** Lower = shown earlier at checkout / preferred first in routing (T7). */
  priority: number
  key_id: string
  key_secret: string
  test_mode: boolean
}

export type PaymentSettings = Record<PaymentProviderKey, PaymentProviderConfig>

/** All known providers, in display order (priority ascending by default). */
export const PAYMENT_PROVIDERS: PaymentProviderKey[] = [
  "cod",
  "razorpay",
  "payu",
  "stripe",
  "easybuzz",
  "justpay",
  "paypal",
  "hyperswitch",
]

/** Human labels for the admin UI. */
export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderKey, string> = {
  cod: "Cash on Delivery",
  razorpay: "Razorpay (UPI / Cards / NetBanking)",
  payu: "PayU",
  stripe: "Stripe",
  easybuzz: "EasyBuzz",
  justpay: "JustPay",
  paypal: "PayPal",
  hyperswitch: "Hyperswitch (self-hosted)",
}

/** Medusa payment-provider id each key maps to once its module is installed. */
export const PAYMENT_PROVIDER_MODULE_IDS: Record<PaymentProviderKey, string> = {
  cod: "pp_cod_cod",
  razorpay: "pp_razorpay_razorpay",
  payu: "pp_payu_payu",
  stripe: "pp_stripe_stripe",
  easybuzz: "pp_easybuzz_easybuzz",
  justpay: "pp_justpay_justpay",
  paypal: "pp_paypal_paypal",
  hyperswitch: "pp_hyperswitch_hyperswitch",
}

export function defaultProviderConfig(
  overrides: Partial<PaymentProviderConfig> = {}
): PaymentProviderConfig {
  return { enabled: false, priority: 100, key_id: "", key_secret: "", test_mode: true, ...overrides }
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

/** BRM lifecycle events that can be routed to notification channels (A5). */
export type BrmNotifyEventKey =
  | "activated"
  | "renewal_success"
  | "renewal_failure"
  | "grace_start"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expiry_warning"

/** Per-channel notification config for one BRM event. */
export type BrmChannelConfig = {
  whatsapp: {
    enabled: boolean
    /** Template with {name}, {subscription}, {offer}, {amount}, {period_end}… placeholders. */
    template: string
  }
  email: {
    enabled: boolean
    subject: string
    body: string
  }
}

export type BrmNotifySettings = {
  /** Master switch for the whole notification flow. */
  enabled: boolean
  events: Record<BrmNotifyEventKey, BrmChannelConfig>
}

export type DivineKartSettings = {
  payments: PaymentSettings
  reviews: ReviewsSettings
  upsell: UpsellSettings
  whatsapp: WhatsappSettings
  invoicing: InvoicingSettings
  brm_notify: BrmNotifySettings
}

export const SETTINGS_KEY = "divinekart_settings"

/** All BRM events, in display order for the admin UI (A5). */
export const BRM_NOTIFY_EVENTS: BrmNotifyEventKey[] = [
  "activated",
  "renewal_success",
  "renewal_failure",
  "grace_start",
  "past_due",
  "paused",
  "cancelled",
  "expiry_warning",
]

/** Human labels for the admin UI. */
export const BRM_NOTIFY_EVENT_LABELS: Record<BrmNotifyEventKey, string> = {
  activated: "Subscription activated",
  renewal_success: "Renewal successful",
  renewal_failure: "Renewal failed",
  grace_start: "Grace period started",
  past_due: "Payment past due",
  paused: "Subscription paused",
  cancelled: "Subscription cancelled",
  expiry_warning: "Expiry warning",
}

/** Default per-event channel config. Templates use {name} {offer} {subscription} {amount} {period_end} {next_retry} placeholders. */
export function defaultBrmChannel(overrides: Partial<BrmChannelConfig> = {}): BrmChannelConfig {
  return {
    whatsapp: { enabled: false, template: "" },
    email: { enabled: false, subject: "", body: "" },
    ...overrides,
  }
}

/** Default brm_notify settings: flow off, every event off with empty templates. */
export function defaultBrmNotifySettings(): BrmNotifySettings {
  return {
    enabled: false,
    events: {
      activated: defaultBrmChannel(),
      renewal_success: defaultBrmChannel(),
      renewal_failure: defaultBrmChannel(),
      grace_start: defaultBrmChannel(),
      past_due: defaultBrmChannel(),
      paused: defaultBrmChannel(),
      cancelled: defaultBrmChannel(),
      expiry_warning: defaultBrmChannel(),
    },
  }
}

export const defaultSettings: DivineKartSettings = {
  payments: {
    cod: defaultProviderConfig({ enabled: true, priority: 10 }),
    razorpay: defaultProviderConfig({
      enabled: true,
      priority: 20,
      key_id: process.env.RAZORPAY_KEY_ID || "",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    }),
    payu: defaultProviderConfig({ priority: 30 }),
    stripe: defaultProviderConfig({ priority: 40 }),
    easybuzz: defaultProviderConfig({ priority: 50 }),
    justpay: defaultProviderConfig({ priority: 60 }),
    paypal: defaultProviderConfig({ priority: 70 }),
    hyperswitch: defaultProviderConfig({ priority: 80 }),
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
  brm_notify: defaultBrmNotifySettings(),
}

/** Deep-merge a partial update into the default settings (survives drifts). */
export function mergeSettings(partial: Partial<DivineKartSettings>): DivineKartSettings {
  const merged: DivineKartSettings = {
    payments: { ...defaultSettings.payments, ...(partial.payments ?? {}) },
    reviews: { ...defaultSettings.reviews, ...(partial.reviews ?? {}) },
    upsell: { ...defaultSettings.upsell, ...(partial.upsell ?? {}) },
    whatsapp: { ...defaultSettings.whatsapp, ...(partial.whatsapp ?? {}) },
    invoicing: { ...defaultSettings.invoicing, ...(partial.invoicing ?? {}) },
    brm_notify: mergeBrmNotify(partial.brm_notify),
  }
  return merged
}

/** Deep-merge a partial brm_notify patch over a base (defaults or current stored). */
function mergeBrmNotify(
  partial?: Partial<BrmNotifySettings>,
  base?: BrmNotifySettings
): BrmNotifySettings {
  const current = base ?? defaultBrmNotifySettings()
  const events: BrmNotifySettings["events"] = { ...current.events }
  for (const key of BRM_NOTIFY_EVENTS) {
    const patch = partial?.events?.[key]
    if (!patch) continue
    events[key] = {
      whatsapp: { ...current.events[key].whatsapp, ...(patch.whatsapp ?? {}) },
      email: { ...current.events[key].email, ...(patch.email ?? {}) },
    }
  }
  return {
    enabled: Boolean(partial?.enabled ?? current.enabled),
    events,
  }
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
  // brm_notify is deep-merged over the CURRENT stored value (not the shallow
  // spread below) so a partial patch like { events: { cancelled: {...} } }
  // preserves the master switch and other events.
  const next = mergeSettings({
    ...current,
    ...partial,
    brm_notify: mergeBrmNotify(partial.brm_notify, current.brm_notify),
  })
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
/**
 * Normalize the payments blob. Accepts BOTH the legacy flat shape
 * (cod_enabled / razorpay_key_id / …) and the per-provider shape, so a
 * settings blob persisted before T6 survives the migration intact.
 */
function structurePayments(raw?: Partial<PaymentSettings> | LegacyPaymentSettings | null): PaymentSettings {
  const legacy = raw as LegacyPaymentSettings | undefined
  const isLegacy = legacy?.cod_enabled !== undefined || legacy?.razorpay_enabled !== undefined

  const pick = (key: PaymentProviderKey): PaymentProviderConfig => {
    const current = (raw as Partial<PaymentSettings> | undefined)?.[key] ?? ({} as PaymentProviderConfig)
    if (isLegacy) {
      // Legacy flat fields → per-provider config (only cod/razorpay existed).
      if (key === "cod") {
        return {
          enabled: Boolean(legacy?.cod_enabled),
          priority: 10,
          key_id: "",
          key_secret: "",
          test_mode: true,
        }
      }
      if (key === "razorpay") {
        return {
          enabled: Boolean(legacy?.razorpay_enabled),
          priority: 20,
          key_id: String(legacy?.razorpay_key_id ?? ""),
          key_secret: String(legacy?.razorpay_key_secret ?? ""),
          test_mode: Boolean(legacy?.razorpay_test_mode),
        }
      }
    }
    const d = defaultSettings.payments[key]
    return {
      enabled: Boolean(current.enabled ?? d.enabled),
      priority: Number(current.priority ?? d.priority),
      key_id: String(current.key_id ?? d.key_id ?? ""),
      key_secret: String(current.key_secret ?? d.key_secret ?? ""),
      test_mode: Boolean(current.test_mode ?? d.test_mode),
    }
  }

  return {
    cod: pick("cod"),
    razorpay: pick("razorpay"),
    payu: pick("payu"),
    stripe: pick("stripe"),
    easybuzz: pick("easybuzz"),
    justpay: pick("justpay"),
    paypal: pick("paypal"),
    hyperswitch: pick("hyperswitch"),
  }
}

/** Legacy flat payment settings shape (pre-T6). Kept for migration only. */
type LegacyPaymentSettings = {
  cod_enabled?: boolean
  razorpay_enabled?: boolean
  razorpay_key_id?: string
  razorpay_key_secret?: string
  razorpay_test_mode?: boolean
}

function structureSettings(s: DivineKartSettings): DivineKartSettings {
  return {
    payments: structurePayments(s.payments),
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
    brm_notify: structureBrmNotify(s.brm_notify),
  }
}

/** Normalize the brm_notify blob to the typed shape (drops leftovers). */
function structureBrmNotify(raw?: Partial<BrmNotifySettings> | null): BrmNotifySettings {
  const base = defaultBrmNotifySettings()
  const events: BrmNotifySettings["events"] = { ...base.events }
  for (const key of BRM_NOTIFY_EVENTS) {
    const patch = raw?.events?.[key]
    if (!patch) continue
    events[key] = {
      whatsapp: {
        enabled: Boolean(patch.whatsapp?.enabled ?? base.events[key].whatsapp.enabled),
        template: String(patch.whatsapp?.template ?? base.events[key].whatsapp.template ?? ""),
      },
      email: {
        enabled: Boolean(patch.email?.enabled ?? base.events[key].email.enabled),
        subject: String(patch.email?.subject ?? base.events[key].email.subject ?? ""),
        body: String(patch.email?.body ?? base.events[key].email.body ?? ""),
      },
    }
  }
  return {
    enabled: Boolean(raw?.enabled ?? base.enabled),
    events,
  }
}