import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveBrmService } from "../../../../../lib/brm"

/**
 * Admin BRM API — way group by id
 * PATCH  /admin/brm/way-groups/:id   → update filters/priority/status
 * DELETE /admin/brm/way-groups/:id   → soft-delete
 */

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const brm = resolveBrmService(req.scope)
  const id = String(req.params.id)
  const body = (req.body ?? {}) as Record<string, any>
  const allowed = ["code", "name", "provider", "plan_family", "payment_method", "region", "priority", "status", "metadata"]
  const patch: Record<string, any> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key]
  }
  const updated = await brm.updateWayGroups({ id, ...patch })
  return res.json({ way_group: updated })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const brm = resolveBrmService(req.scope)
  await brm.softDeleteWayGroups([String(req.params.id)])
  return res.json({ deleted: true })
}