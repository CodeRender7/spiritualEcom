import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendAdminReply } from "../../../../../../../lib/whatsapp-chat"

/**
 * POST /admin/whatsapp/chat/conversations/:phone/reply
 * Body: { text, sessionId? }
 * → sends an admin reply from the connected session and persists it.
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { phone } = req.params
  const { text, sessionId } = (req.body || {}) as { text?: string; sessionId?: string }
  const resolvedSessionId = sessionId || (req.query.sessionId as string) || ""

  if (!resolvedSessionId || !resolvedSessionId.trim()) {
    return res.status(400).json({ message: "sessionId is required" })
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Message text is required" })
  }

  const result = await sendAdminReply(req.scope, resolvedSessionId, phone, text.trim())
  if (!result.ok) {
    return res.status(400).json({
      ok: false,
      error: result.error,
      message:
        result.error === "no_connected_session"
          ? "No connected WhatsApp session. Open the Sessions page to connect one."
          : "Failed to send the WhatsApp message.",
    })
  }

  return res.json(result)
}