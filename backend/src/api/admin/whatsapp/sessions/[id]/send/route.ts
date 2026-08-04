import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sessionRegistry, sendMessage, sendImage } from "../../../../../../lib/whatsapp-session"

/**
 * Admin WhatsApp Messaging API
 * POST /admin/whatsapp/sessions/:id/send → send text/image message
 * 
 * Body:
 * { to: "+919876543210", message: "text", image?: "url", caption?: "text" }
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { to, message, image, caption } = req.body as {
    to: string
    message?: string
    image?: string
    caption?: string
  }

  const session = sessionRegistry.get(id)
  if (!session) {
    return res.status(404).json({ message: "Session not found" })
  }

  if (session.status !== "connected") {
    return res.status(400).json({ message: "Session is not connected" })
  }

  if (!to?.trim()) {
    return res.status(400).json({ message: "Recipient phone number is required" })
  }

  let result
  if (image) {
    result = await sendImage(session.session_key, to, image, caption || message)
  } else if (message) {
    result = await sendMessage(session.session_key, to, message)
  } else {
    return res.status(400).json({ message: "Message or image is required" })
  }

  if (!result.success) {
    return res.status(500).json({ message: "Failed to send message" })
  }

  return res.json({ success: true, messageId: "messageId" in result ? result.messageId : undefined })
}
