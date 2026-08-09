import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  cancelBroadcast,
  getBroadcast,
  loadsBroadcastSummaries,
  retryFailed,
} from "../../../../../lib/whatsapp-broadcast"

/**
 * Admin WhatsApp Broadcast Detail API
 * GET    /admin/whatsapp/broadcasts/:id      → campaign header + recipient counts
 * POST   /admin/whatsapp/broadcasts/:id      → { action: "resend" | "cancel" }
 * DELETE /admin/whatsapp/broadcasts/:id      → soft-disable (deleted_at)
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const broadcast = await getBroadcast(req.scope, id)
    if (!broadcast) {
      return res.status(404).json({ message: "Broadcast not found" })
    }

    const [enriched] = await loadsBroadcastSummaries(req.scope, [broadcast])
    return res.json({ broadcast: enriched })
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const { action } = (req.body || {}) as { action?: string }

    const broadcast = await getBroadcast(req.scope, id)
    if (!broadcast) {
      return res.status(404).json({ message: "Broadcast not found" })
    }

    if (action === "cancel") {
      const ok = await cancelBroadcast(req.scope, id)
      if (!ok) {
        return res.status(400).json({ message: 'Broadcast is sending or already sent — cannot cancel' })
      }
      return res.json({ ok: true })
    }

    if (action === "resend") {
      const ok = await retryFailed(req.scope, id)
      if (!ok) {
        return res.status(404).json({ message: "Broadcast not found" })
      }
      return res.json({ ok: true })
    }

    return res.status(400).json({ message: 'action must be "resend" or "cancel"' })
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const broadcast = await getBroadcast(req.scope, id)
    if (!broadcast) {
      return res.status(404).json({ message: "Broadcast not found" })
    }

    await query.graph({
      entity: "whatsapp_broadcasts",
      operation: "update",
      filters: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message })
  }
}