import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  DivineKartSettings,
  getStoreSettings,
  writeStoreSettings,
} from "../../../lib/settings"

const AdminSettingsSchema = z.object({
  payments: z
    .object({
      cod_enabled: z.boolean().optional(),
      razorpay_enabled: z.boolean().optional(),
      razorpay_key_id: z.string().optional(),
      razorpay_key_secret: z.string().optional(),
      razorpay_test_mode: z.boolean().optional(),
    })
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
  if (partial.payments && (partial.payments.cod_enabled !== undefined || partial.payments.razorpay_enabled !== undefined)) {
    await syncRegionProviders(req.scope, settings)
  }

  return res.json({ settings })
}

/** Align each region's linked payment providers with stored enable flags. */
async function syncRegionProviders(scope: any, settings: DivineKartSettings) {
  const regionModule = scope.resolve(Modules.REGION)
  const regions = await regionModule.listRegions({}, { select: ["id"] })

  const providerId = (id: string) => `pp_${id}_${id}`

  await Promise.all(
    regions.map(async (region: { id: string }) => {
      const providers = ["pp_system_default"]
      if (settings.payments.cod_enabled) providers.push(providerId("cod"))
      if (settings.payments.razorpay_enabled) providers.push(providerId("razorpay"))

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