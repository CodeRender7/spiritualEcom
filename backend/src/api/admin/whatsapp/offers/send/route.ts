import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sessionRegistry, sendMessage, sendImage } from "../../../../../lib/whatsapp-session"

/**
 * Admin WhatsApp Offer API
 * POST /admin/whatsapp/offers/send → send personalized offer to a customer
 * 
 * Body:
 * {
 *   sessionId: "was_abc123",
 *   to: "+919876543210",
 *   customerName?: "Ram Sharma",
 *   discountCode?: "DIVINE20",
 *   discountPercent?: 20,
 *   bannerUrl?: "https://...",
 *   expiryDays?: 3
 * }
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { sessionId, to, customerName, discountCode, discountPercent, bannerUrl, expiryDays } = req.body as {
    sessionId: string
    to: string
    customerName?: string
    discountCode?: string
    discountPercent?: number
    bannerUrl?: string
    expiryDays?: number
  }

  if (!sessionId || !to?.trim()) {
    return res.status(400).json({ message: "Session ID and recipient phone are required" })
  }

  const session = sessionRegistry.get(sessionId)
  if (!session || session.status !== "connected") {
    return res.status(400).json({ message: "Connected WhatsApp session required" })
  }

  const name = customerName || "Devotee"
  const code = discountCode || "DIVINE10"
  const pct = discountPercent || 10
  const days = expiryDays || 3

  const offerMsg = `Namaste ${name}! 🚩\n\n` +
    `A special blessing for you: Enjoy *${pct}% OFF* on your next DivineKart purchase!\n\n` +
    `Use Coupon Code: *${code}*\n` +
    `Valid for the next ${days} days only.\n\n` +
    `Shop now: ${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:8000"}`

  let result
  if (bannerUrl) {
    result = await sendImage(session.session_key, to, bannerUrl, offerMsg)
  } else {
    result = await sendMessage(session.session_key, to, offerMsg)
  }

  if (!result.success) {
    return res.status(500).json({ message: "Failed to send offer" })
  }

  return res.json({ success: true })
}
