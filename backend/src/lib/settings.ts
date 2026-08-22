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
export type BrmDocumentConfig = {
  enabled: boolean
  /** Document kind to generate for this event (invoice, payment_receipt, �). Empty = none. */
  doc_kind: string
  /** Optional explicit pdf-template override (falls back to kind default). */
  template_id?: string | null
}

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
    /** Gallery template id (email-builder map E3) — when set, the dispatcher
     *  renders this template (HTML + subject, `{{key:value}}` substitution)
     *  instead of the inline subject/body. Null/absent = inline fallback. */
    template_id?: string | null
  }
  /** Document channel (document-builder D7): generate + attach a pdf for this event. */
  document?: BrmDocumentConfig
}

export type BrmNotifySettings = {
  /** Master switch for the whole notification flow. */
  enabled: boolean
  events: Record<BrmNotifyEventKey, BrmChannelConfig>
}

/** Quantity-tier base charge (T18): highest min_qty ≤ total cart qty wins. */
export type ShippingTier = {
  min_qty: number
  /** Base delivery charge (paise) applied to orders at this tier. */
  base_charge: number
}

/**
 * Per-product shipping override (T18). Kept in the settings blob (not product
 * metadata) so the admin surface stays single — keyed by product_id.
 */
export type ShippingProductOverride = {
  product_id: string
  /** Extra charge per unit (paise); null/absent = no per-unit charge. */
  charge_per_unit?: number | null
  /** Line ships free regardless of base/tiers. */
  free_shipping?: boolean
  /** Parcel vendor label (Delhivery/BlueDart-style); display/routing hint. */
  parcel_vendor?: string | null
}

/** DivineKart delivery-charge rules engine (T18) — layered composition:
 *  base (tier-adjusted) + Σ per-unit overrides; threshold waives BASE only;
 *  premium members ship free when enabled. */
export type ShippingSettings = {
  enabled: boolean
  /** Global base delivery charge (paise). */
  base_charge: number
  /** Order value (paise) at which the BASE charge is waived; null = off. */
  free_shipping_threshold: number | null
  tiers: ShippingTier[]
  /** Customers with metadata.premium_member ship free (T21 hook). */
  premium_free_shipping: boolean
  product_overrides: ShippingProductOverride[]
}

export function defaultShippingSettings(
  overrides: Partial<ShippingSettings> = {}
): ShippingSettings {
  return {
    enabled: true,
    base_charge: 4900,
    free_shipping_threshold: 49900,
    tiers: [],
    premium_free_shipping: false,
    product_overrides: [],
    ...overrides,
  }
}

export type DivineKartSettings = {
  payments: PaymentSettings
  reviews: ReviewsSettings
  upsell: UpsellSettings
  whatsapp: WhatsappSettings
  invoicing: InvoicingSettings
  brm_notify: BrmNotifySettings
  shipping: ShippingSettings
  /** SMTP email transport (document-builder D6). Absent/disabled → log seam. */
  smtp?: SmtpSettings
  /** Order/pipeline document auto-dispatch (D7). */
  doc_dispatch?: DocDispatchSettings
}

/** SMTP transport config (D6). `password` is write-only — never returned by GET. */
export type SmtpSettings = {
  enabled: boolean
  host: string
  port: number
  secure: boolean // true = implicit TLS (465), false = STARTTLS (587)
  user: string
  password: string
  from_name: string
  from_email: string
}

/** Transactional provider presets for the admin settings UI (D6). */
export const SMTP_PROVIDER_PRESETS: Record<
  string,
  { label: string; host: string; port: number; secure: boolean }
> = {
  ses: { label: "Amazon SES", host: "email-smtp.us-east-1.amazonaws.com", port: 587, secure: false },
  sendgrid: { label: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: false },
  mailgun: { label: "Mailgun", host: "smtp.mailgun.org", port: 587, secure: false },
  gmail: { label: "Gmail", host: "smtp.gmail.com", port: 465, secure: true },
  custom: { label: "Custom SMTP", host: "", port: 587, secure: false },
}

export function defaultSmtpSettings(): SmtpSettings {
  return {
    enabled: false,
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from_name: "DivineKart",
    from_email: "",
  }
}

/** Order/pipeline document auto-dispatch (document-builder D7). */
export type DocDispatchEventConfig = {
  enabled: boolean
  /** Document kinds generated for this event, e.g. ["invoice"]. */
  kinds: string[]
  /** Also send the file over WhatsApp when a customer phone is known. */
  whatsapp?: boolean
}

export type DocDispatchSettings = {
  enabled: boolean
  /** Append an expiring share-link to the delivery message (D4 signed URLs). */
  attach_share_link: boolean
  events: Record<string, DocDispatchEventConfig>
}

export const DOC_DISPATCH_EVENTS = [
  "order_placed",
  "order_shipped",
  "payment_captured",
  "payment_refunded",
] as const

export function defaultDocDispatchSettings(): DocDispatchSettings {
  return {
    enabled: false,
    attach_share_link: true,
    events: {
      order_placed: { enabled: false, kinds: ["invoice"] },
      order_shipped: { enabled: false, kinds: ["waybill"], whatsapp: false },
      payment_captured: { enabled: false, kinds: ["payment_receipt"] },
      payment_refunded: { enabled: false, kinds: [] },
    },
  }
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
    email: { enabled: false, subject: "", body: "", template_id: null },
    document: { enabled: false, doc_kind: "", template_id: null },
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
  shipping: defaultShippingSettings(),
  smtp: defaultSmtpSettings(),
  doc_dispatch: defaultDocDispatchSettings(),
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
    shipping: mergeShipping(partial.shipping),
    smtp: { ...defaultSmtpSettings(), ...(partial.smtp ?? {}) },
    doc_dispatch: { ...defaultDocDispatchSettings(), ...(partial.doc_dispatch ?? {}) },
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
      document: { ...defaultBrmChannel().document!, ...(current.events[key].document ?? {}), ...(patch.document ?? {}) },
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
    shipping: mergeShipping(s.shipping),
    smtp: {
      enabled: Boolean(s.smtp?.enabled),
      host: String(s.smtp?.host ?? ""),
      port: Number(s.smtp?.port ?? 587),
      secure: Boolean(s.smtp?.secure),
      user: String(s.smtp?.user ?? ""),
      password: String(s.smtp?.password ?? ""),
      from_name: String(s.smtp?.from_name ?? "DivineKart"),
      from_email: String(s.smtp?.from_email ?? ""),
    },
    doc_dispatch: structureDocDispatch(s.doc_dispatch),
  }
}

/** Normalize the doc_dispatch blob (D7): known events only, string kinds. */
function structureDocDispatch(raw?: Partial<DocDispatchSettings> | null): DocDispatchSettings {
  const base = defaultDocDispatchSettings()
  const events: DocDispatchSettings["events"] = { ...base.events }
  for (const key of DOC_DISPATCH_EVENTS) {
    const patch = raw?.events?.[key]
    if (!patch) continue
    events[key] = {
      enabled: Boolean(patch.enabled),
      kinds: Array.isArray(patch.kinds)
        ? patch.kinds.map((k) => String(k)).filter(Boolean)
        : base.events[key].kinds,
      whatsapp: Boolean(patch.whatsapp),
    }
  }
  return {
    enabled: Boolean(raw?.enabled),
    attach_share_link: raw?.attach_share_link !== false,
    events,
  }
}

/** Deep-merge shipping settings over defaults, normalizing arrays (T18). */
function mergeShipping(partial?: Partial<ShippingSettings> | null): ShippingSettings {
  const base = defaultShippingSettings()
  const tiers = Array.isArray(partial?.tiers)
    ? partial!.tiers
        .map((t) => ({ min_qty: Number(t?.min_qty ?? 0), base_charge: Number(t?.base_charge ?? 0) }))
        .filter((t) => Number.isFinite(t.min_qty) && Number.isFinite(t.base_charge))
        .sort((a, b) => a.min_qty - b.min_qty)
    : []
  const product_overrides = Array.isArray(partial?.product_overrides)
    ? partial!.product_overrides
        .filter((o) => o?.product_id)
        .map((o) => ({
          product_id: String(o.product_id),
          charge_per_unit:
            o.charge_per_unit == null ? null : Math.max(0, Number(o.charge_per_unit) || 0),
          free_shipping: Boolean(o.free_shipping),
          parcel_vendor: o.parcel_vendor ? String(o.parcel_vendor) : null,
        }))
    : []
  return {
    enabled: Boolean(partial?.enabled ?? base.enabled),
    base_charge: Math.max(0, Number(partial?.base_charge ?? base.base_charge) || 0),
    free_shipping_threshold:
      partial?.free_shipping_threshold == null
        ? null
        : Math.max(0, Number(partial.free_shipping_threshold) || 0),
    tiers,
    premium_free_shipping: Boolean(partial?.premium_free_shipping ?? base.premium_free_shipping),
    product_overrides,
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
        template_id: patch.email?.template_id ?? base.events[key].email.template_id ?? null,
      },
      document: {
        enabled: Boolean(patch.document?.enabled ?? base.events[key].document?.enabled ?? false),
        doc_kind: String(patch.document?.doc_kind ?? base.events[key].document?.doc_kind ?? ""),
        template_id: patch.document?.template_id ?? base.events[key].document?.template_id ?? null,
      },
    }
  }
  return {
    enabled: Boolean(raw?.enabled ?? base.enabled),
    events,
  }
}