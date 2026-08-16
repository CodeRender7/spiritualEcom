import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveBrmService, brmId } from "../../../../lib/brm"

/**
 * Admin BRM API
 * GET  /admin/brm/templates    → list offer templates (with tree)
 * POST /admin/brm/templates    → create offer template (+ optional way_group_id)
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brm = resolveBrmService(req.scope)
  const [templates, wayGroups] = await Promise.all([
    brm.listOfferTemplates({}),
    brm.listWayGroups({}),
  ])
  return res.json({
    templates,
    way_groups: wayGroups,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, any>
  const brm = resolveBrmService(req.scope)
  const id = brmId("off")
  const created = await brm.createOfferTemplates({
    id,
    code: String(body.code ?? "").trim() || `offer_${Date.now().toString(36)}`,
    name: String(body.name ?? "Untitled offer").trim(),
    kind: body.kind ?? "subscription",
    way_group_id: body.way_group_id ?? null,
    status: body.status ?? "active",
    billing_model: body.billing_model ?? "prepaid",
    interval: body.interval ?? "month",
    interval_count: Number(body.interval_count ?? 1),
    trial_days: Number(body.trial_days ?? 0),
    billing_anchor: body.billing_anchor ?? null,
    auto_renew: body.auto_renew ?? true,
    max_cycles: body.max_cycles ?? null,
    validity_days: body.validity_days ?? null,
    proration: body.proration ?? "none",
    grace_days: Number(body.grace_days ?? 3),
    retry_attempts: Number(body.retry_attempts ?? 3),
    retry_interval_days: body.retry_interval_days ?? null,
    discount_rule_id: body.discount_rule_id ?? null,
    effective_from: body.effective_from ?? null,
    effective_to: body.effective_to ?? null,
    metadata: body.metadata ?? null,
  })
  return res.json({ template: created })
}