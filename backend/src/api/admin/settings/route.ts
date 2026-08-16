import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  DivineKartSettings,
  getStoreSettings,
  writeStoreSettings,
  PAYMENT_PROVIDERS,
  PAYMENT_PROVIDER_MODULE_IDS,
  PaymentProviderConfig,
} from "../../../lib/settings"

const ProviderConfigSchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().optional(),
  key_id: z.string().optional(),
  key_secret: z.string().optional(),
  test_mode: z.boolean().optional(),
})

const AdminSettingsSchema = z.object({
  payments: z
    .object(
      Object.fromEntries(
        PAYMENT_PROVIDERS.map((p) => [p, ProviderConfigSchema.optional()])
      )
    )
    .optional(),
  reviews: z
    .object({
      enabled: z.boolean().optional(),
      require_moderation: z.boolean().optional(),
      allow_anonymous: z.boolean().optional(),
    })
    .optional(),
  upsell: z
    .object({
      enabled: z.boolean().optional(),
      strategy: z.enum(["related", "bestsellers", "cross_sell"]).optional(),
      max_items: z.number().optional(),
      min_order_value: z.number().optional(),
    })
    .optional(),
  whatsapp: z
    .object({
      enabled: z.boolean().optional(),
      gateway: z.enum(["openwa", "waha"]).optional(),
      gateway_url: z.string().optional(),
      api_key: z.string().optional(),
      default_country_code: z.string().optional(),
      order_confirmation_template: z.string().optional(),
      order_shipped_template: z.string().optional(),
    })
    .optional(),
  invoicing: z
    .object({
      enabled: z.boolean().optional(),
      company_name: z.string().optional(),
      company_address: z.string().optional(),
      gstin: z.string().optional(),
      contact_email: z.string().optional(),
      footer_note: z.string().optional(),
    })
    .optional(),
})

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const settings = await getStoreSettings(req.scope)
  return res.json({ settings })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<z.infer<typeof AdminSettingsSchema>>,
  res: MedusaResponse
) => {
  const partial = (req.validatedBody ?? req.body ?? {}) as Partial<DivineKartSettings>
  const settings = await writeStoreSettings(req.scope, partial)

  // Sync region payment-provider links so enable/disable toggles take effect:
  // customers only see providers linked to their region.
  if (partial.payments) {
    await syncRegionProviders(req.scope, settings)
  }

  return res.json({ settings })
}

/** Align each region's linked payment providers with stored enable flags. */
async function syncRegionProviders(scope: any, settings: DivineKartSettings) {
  const regionModule = scope.resolve(Modules.REGION)
  const regions = await regionModule.listRegions({}, { select: ["id"] })

  // Keys actually registered by installed provider modules.
  // The awilix add-list only lives inside the payment module's container, so
  // ask the payment module service for the registered providers instead.
  let installed: string[] = []
  try {
    const paymentModule = scope.resolve(Modules.PAYMENT)
    const providers = await paymentModule.listPaymentProviders(
      { is_enabled: true },
      { select: ["id"] }
    )
    installed = (providers ?? []).map((p: { id: string }) => p.id)
  } catch {
    installed = []
  }

  const providers = ["pp_system_default"]
  for (const key of PAYMENT_PROVIDERS) {
    const cfg: PaymentProviderConfig = settings.payments[key]
    if (!cfg.enabled) continue
    const providerKey = PAYMENT_PROVIDER_MODULE_IDS[key]
    // Only link providers whose module is actually installed in this backend
    // (e.g. payu/stripe/… arrive with T7). Linking a missing module makes the
    // region update throw.
    if (installed.includes(providerKey)) providers.push(providerKey)
  }

  await Promise.all(
    regions.map(async (region: { id: string }) => {
      const { updateRegionsWorkflow } = await import("@medusajs/medusa/core-flows")
      await updateRegionsWorkflow(scope).run({
        input: {
          selector: { id: region.id },
          update: { payment_providers: providers },
        },
      })
    })
  )
}