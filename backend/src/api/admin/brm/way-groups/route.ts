import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveBrmService, brmId } from "../../../../lib/brm"

/**
 * Admin BRM API — way groups
 * GET  /admin/brm/way-groups    → list
 * POST /admin/brm/way-groups    → create (4 filter dimensions, all optional)
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brm = resolveBrmService(req.scope)
  const wayGroups = await brm.listWayGroups({})
  return res.json({ way_groups: wayGroups })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, any>
  const brm = resolveBrmService(req.scope)
  const created = await brm.createWayGroups({
    id: brmId("way"),
    code: String(body.code ?? "").trim() || `way_${Date.now().toString(36)}`,
    name: String(body.name ?? "Way group").trim(),
    provider: body.provider ?? null,
    plan_family: body.plan_family ?? null,
    payment_method: body.payment_method ?? null,
    region: body.region ?? null,
    priority: Number(body.priority ?? 100),
    status: body.status ?? "active",
    metadata: body.metadata ?? null,
  })
  return res.json({ way_group: created })
}