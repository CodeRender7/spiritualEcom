import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveOffers } from "../../../../lib/brm"

/**
 * Admin BRM API — resolve preview
 * POST /admin/brm/resolve
 *
 * Body: { provider?, plan_family?, payment_method?, region? }
 * Returns the priority-ordered eligible offers (template + matched way group),
 * letting the admin sanity-check the 4-way resolution before wiring anything.
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, any>
  const ctx = {
    provider: body.provider ?? null,
    plan_family: body.plan_family ?? null,
    payment_method: body.payment_method ?? null,
    region: body.region ?? null,
  }
  const offers = await resolveOffers(req.scope, ctx)
  return res.json({ ctx, offers })
}