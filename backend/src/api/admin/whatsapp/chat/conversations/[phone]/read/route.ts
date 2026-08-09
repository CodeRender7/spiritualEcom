import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { markConversationRead } from "../../../../../../../lib/whatsapp-chat"

/**
 * POST /admin/whatsapp/chat/conversations/:phone/read
 * → marks the conversation read (unread_count = 0).
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { phone } = req.params
  const sessionId = (req.body?.sessionId as string) || (req.query.sessionId as string) || ""
  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" })
  }

  await markConversationRead(req.scope, sessionId, phone)
  return res.json({ ok: true })
}