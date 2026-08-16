import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveBrmService, brmId } from "../../../../lib/brm"

/**
 * Admin BRM API — plan lines
 * GET  /admin/brm/plan-lines?offer_template_id=...   → list
 * POST /admin/brm/plan-lines                         → create a plan line
 *
 * Plan lines are the price plan attached to an offer template. Each line
 * can be fixed (unit_price × quantity), per-unit with an included pool
 * (billing_model "usage" → overage above included_qty), or one-time (e.g.
 * setup/activation fee charged on the first cycle).
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brm = resolveBrmService(req.scope)
  const filters: Record<string, any> = {}
  if (req.query.offer_template_id) filters.offer_template_id = String(req.query.offer_template_id)
  const planLines = await brm.listPlanLines(filters)
  return res.json({ plan_lines: planLines })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, any>
  const brm = resolveBrmService(req.scope)
  if (!body.offer_template_id) {
    return res.status(400).json({ message: "offer_template_id is required" })
  }
  const created = await brm.createPlanLines({
    id: brmId("pln"),
    offer_template_id: String(body.offer_template_id),
    product_id: body.product_id ?? null,
    quantity: Number(body.quantity ?? 1),
    included_qty: Number(body.included_qty ?? 0),
    unit_price: Number(body.unit_price ?? 0),
    price_mode: body.price_mode ?? "flat", // flat | quantity | tiered
    charge_type: body.charge_type ?? "recurring", // recurring | one_time | usage
    billing_cycle_override: body.billing_cycle_override != null ? Number(body.billing_cycle_override) : null,
    metadata: body.metadata ?? null,
  })
  return res.json({ plan_line: created })
}