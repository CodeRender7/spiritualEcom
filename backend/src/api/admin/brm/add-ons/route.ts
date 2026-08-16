import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveBrmService, brmId } from "../../../../lib/brm"

/**
 * Admin BRM API — add-on templates
 * GET  /admin/brm/add-ons?offer_template_id=...   → list
 * POST /admin/brm/add-ons                         → create an add-on (usage/postpaid line)
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brm = resolveBrmService(req.scope)
  const filters: Record<string, any> = {}
  if (req.query.offer_template_id) filters.offer_template_id = String(req.query.offer_template_id)
  const addOns = await brm.listAddOnTemplates(filters)
  return res.json({ add_ons: addOns })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, any>
  const brm = resolveBrmService(req.scope)
  if (!body.offer_template_id) {
    return res.status(400).json({ message: "offer_template_id is required" })
  }
  const created = await brm.createAddOnTemplates({
    id: brmId("add"),
    offer_template_id: String(body.offer_template_id),
    code: String(body.code ?? "").trim() || `add_${Date.now().toString(36)}`,
    name: String(body.name ?? "Add-on").trim(),
    product_id: body.product_id ?? null,
    charge_type: body.charge_type ?? "one_time", // one_time | usage
    unit_price: Number(body.unit_price ?? 0),
    quantity: Number(body.quantity ?? 1),
    billing_cycles: body.billing_cycles != null ? Number(body.billing_cycles) : null,
    metadata: body.metadata ?? null,
  })
  return res.json({ add_on: created })
}