import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sessionRegistry, sendMessage } from "../../../../lib/whatsapp-session"

/**
 * Admin WhatsApp Broadcast API
 * POST /admin/whatsapp/broadcast → send message to multiple recipients
 * 
 * Body:
 * {
 *   sessionId: "was_abc123",
 *   recipients: ["+919876543210", "+919876543211"],
 *   message: "Special offer: 20% off on all items!"
 * }
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { sessionId, recipients, message } = req.body as {
    sessionId: string
    recipients: string[]
    message: string
  }

  if (!sessionId || !recipients?.length || !message?.trim()) {
    return res.status(400).json({ message: "Session ID, recipients, and message are required" })
  }

  const session = sessionRegistry.get(sessionId)
  if (!session) {
    return res.status(404).json({ message: "Session not found" })
  }

  if (session.status !== "connected") {
    return res.status(400).json({ message: "Session is not connected" })
  }

  const results: Array<{ to: string; success: boolean; messageId?: string }> = []

  for (const to of recipients) {
    const result = await sendMessage(session.session_key, to, message)
    results.push({ to, ...result })
    // Rate limiting: 1 message per second to avoid WhatsApp ban
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const successCount = results.filter((r) => r.success).length
  const failCount = results.length - successCount

  return res.json({
    total: results.length,
    success: successCount,
    failed: failCount,
    results,
  })
}
