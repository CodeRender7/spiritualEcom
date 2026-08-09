import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getBroadcast, getRecipients } from "../../../../../../lib/whatsapp-broadcast"

/**
 * Admin WhatsApp Broadcast Recipients API
 * GET /admin/whatsapp/broadcasts/:id/recipients?skip=&take=&status=
 * → paged recipient rows for a campaign (optionally filtered by status).
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const skip = Number(req.query.skip) || 0
    const take = Number(req.query.take) || 50
    const status = (req.query.status as string) || undefined

    const broadcast = await getBroadcast(req.scope, id)
    if (!broadcast) {
      return res.status(404).json({ message: "Broadcast not found" })
    }

    const recipients = await getRecipients(req.scope, id, { skip, take, status })
    return res.json({ recipients, count: recipients.length })
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message })
  }
}