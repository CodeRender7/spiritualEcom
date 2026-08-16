import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveBrmService, getTemplateTree } from "../../../../../lib/brm"

/**
 * Admin BRM API
 * GET    /admin/brm/templates/:id    → template tree (template + way_group + plan_lines + add_ons)
 * PATCH  /admin/brm/templates/:id    → update template knobs
 * DELETE /admin/brm/templates/:id    → soft-delete template
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const tree = await getTemplateTree(req.scope, String(req.params.id))
    return res.json(tree)
  } catch (err: any) {
    return res.status(404).json({ message: err?.message ?? "Template not found" })
  }
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const brm = resolveBrmService(req.scope)
  const id = String(req.params.id)
  const body = (req.body ?? {}) as Record<string, any>
  const allowed = [
    "code", "name", "kind", "way_group_id", "status", "billing_model", "interval",
    "interval_count", "trial_days", "billing_anchor", "auto_renew", "max_cycles",
    "validity_days", "proration", "grace_days", "retry_attempts", "retry_interval_days",
    "discount_rule_id", "effective_from", "effective_to", "metadata",
  ]
  const patch: Record<string, any> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key]
  }
  const updated = await brm.updateOfferTemplates({ id, ...patch })
  return res.json({ template: updated })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const brm = resolveBrmService(req.scope)
  await brm.softDeleteOfferTemplates([String(req.params.id)])
  return res.json({ deleted: true })
}