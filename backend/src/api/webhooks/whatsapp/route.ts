import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sessionRegistry, updateSessionRecord } from "../../../lib/whatsapp-session"

/**
 * OpenWA Webhook Receiver
 * POST /webhooks/whatsapp → receives QR codes, status updates, inbound messages
 * 
 * Webhook events from OpenWA:
 * - qr: { sessionKey, qr }
 * - status: { sessionKey, status, phone }
 * - message: { sessionKey, from, to, body, isGroupMsg, timestamp }
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { event, data } = req.body as { event: string; data: any }

  if (event === "qr") {
    // QR code generated
    const session = Array.from(sessionRegistry.all()).find(
      (s) => s.session_key === data.sessionKey
    )
    if (session) {
      await updateSessionRecord(req.scope, session.id, {
        qr_code: data.qr,
        status: "qr_ready",
      })
    }
    return res.json({ received: true })
  }

  if (event === "status") {
    // Connection status change
    const session = Array.from(sessionRegistry.all()).find(
      (s) => s.session_key === data.sessionKey
    )
    if (session) {
      await updateSessionRecord(req.scope, session.id, {
        status: data.status,
        phone_number: data.phone || session.phone_number,
      })
    }
    return res.json({ received: true })
  }

  if (event === "message") {
    // Inbound message received - store for chat support (Phase 6)
    // For now, just log it
    console.log("WhatsApp inbound message:", data)
    return res.json({ received: true })
  }

  return res.status(400).json({ message: "Unknown event type" })
}
