import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getStoreSettings,
  PAYMENT_PROVIDERS,
  PAYMENT_PROVIDER_LABELS,
} from "../../../lib/settings"

/**
 * Public-safe subset of settings exposed to the storefront. Never leaks API
 * keys or secrets. Used by the storefront to decide feature toggles (reviews,
 * upsell, payment methods, what's enabled) without admin auth.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const settings = await getStoreSettings(req.scope)

  // Payment providers: enabled + priority + test_mode only (never key_id/secret).
  // Sorted by priority ascending so the storefront can render in order.
  const providers = PAYMENT_PROVIDERS.map((key) => {
    const cfg = settings.payments[key]
    return {
      id: key,
      label: PAYMENT_PROVIDER_LABELS[key],
      enabled: cfg.enabled,
      priority: cfg.priority,
      test_mode: cfg.test_mode,
    }
  }).sort((a, b) => a.priority - b.priority)

  return res.json({
    payments: { providers },
    reviews: {
      enabled: settings.reviews.enabled,
      require_moderation: settings.reviews.require_moderation,
      allow_anonymous: settings.reviews.allow_anonymous,
    },
    upsell: {
      enabled: settings.upsell.enabled,
      strategy: settings.upsell.strategy,
      max_items: settings.upsell.max_items,
      min_order_value: settings.upsell.min_order_value,
    },
    whatsapp: {
      enabled: settings.whatsapp.enabled,
    },
    invoicing: {
      enabled: settings.invoicing.enabled,
      company_name: settings.invoicing.company_name,
    },
  })
}