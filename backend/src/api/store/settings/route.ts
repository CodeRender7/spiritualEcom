import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getStoreSettings } from "../../../lib/settings"

/**
 * Public-safe subset of settings exposed to the storefront. Never leaks API
 * keys or secrets. Used by the storefront to decide feature toggles (reviews,
 * upsell, what's enabled) without admin auth.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const settings = await getStoreSettings(req.scope)

  return res.json({
    payments: {
      cod_enabled: settings.payments.cod_enabled,
      razorpay_enabled: settings.payments.razorpay_enabled,
      razorpay_test_mode: settings.payments.razorpay_test_mode,
    },
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