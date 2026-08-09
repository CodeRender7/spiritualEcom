import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  createBroadcast,
  listBroadcasts,
  loadsBroadcastSummaries,
} from "../../../../lib/whatsapp-broadcast"

/**
 * Admin WhatsApp Broadcasts API
 * GET  /admin/whatsapp/broadcasts?skip=&take= → list campaigns w/ delivery counts
 * POST /admin/whatsapp/broadcasts             → create (or schedule) a campaign
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const skip = Number(req.query.skip) || 0
    const take = Number(req.query.take) || 50

    const rows = await listBroadcasts(req.scope, { skip, take })
    const broadcasts = await loadsBroadcastSummaries(req.scope, rows)
    return res.json({ broadcasts, count: broadcasts.length })
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = (req.body || {}) as {
      name?: string
      message?: string
      imageUrl?: string
      audienceType?: string
      audienceFilters?: Record<string, unknown>
      recipientPhones?: string[]
      sessionId?: string
      scheduledAt?: string
    }

    const broadcast = await createBroadcast(req.scope, {
      name: body.name || "",
      message: body.message || "",
      imageUrl: body.imageUrl || null,
      audienceType: (body.audienceType as "manual_numbers" | "all_customers" | "customers_with_orders") || "manual_numbers",
      audienceFilters: body.audienceFilters || null,
      recipientPhones: body.recipientPhones || [],
      sessionId: body.sessionId || null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    })

    return res.json({ broadcast })
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message })
  }
}