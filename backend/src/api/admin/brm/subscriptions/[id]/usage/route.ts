import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { recordUsage } from "../../../../../../lib/brm"

/**
 * Admin BRM API — usage entry (v1 metering, admin-entered)
 * POST /admin/brm/subscriptions/:id/usage
 *
 * Body: { subscription_item_id, quantity, metadata? }
 * Adds `quantity` to the item's used_qty. Overage is computed at renewal
 * via lineUsageOverage (used above the included pool).
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, any>
  if (!body.subscription_item_id || body.quantity == null) {
    return res.status(400).json({ message: "subscription_item_id and quantity are required" })
  }
  try {
    const updated = await recordUsage(req.scope, {
      subscription_item_id: String(body.subscription_item_id),
      quantity: Number(body.quantity),
      metadata: body.metadata ?? undefined,
    })
    return res.json({ subscription_item: updated })
  } catch (err: any) {
    return res.status(404).json({ message: err?.message ?? String(err) })
  }
}