import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  sessionRegistry,
  startSession,
  stopSession,
  getSessionStatus,
  createSessionRecord,
  updateSessionRecord,
} from "../../../../lib/whatsapp-session"

/**
 * Admin WhatsApp Session Management API
 * GET    /admin/whatsapp/sessions        → list all sessions
 * POST   /admin/whatsapp/sessions        → create new session
 * GET    /admin/whatsapp/sessions/:id    → get session details
 * POST   /admin/whatsapp/sessions/:id/start → start session (returns QR)
 * POST   /admin/whatsapp/sessions/:id/stop  → stop session
 * DELETE /admin/whatsapp/sessions/:id    → delete session
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sessions = sessionRegistry.all()
  return res.json({ sessions })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { name } = req.body as { name: string }
  if (!name?.trim()) {
    return res.status(400).json({ message: "Session name is required" })
  }

  const sessionKey = `dk_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now().toString(36)}`
  const session = await createSessionRecord(req.scope, name, sessionKey)
  return res.json({ session })
}
