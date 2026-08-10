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
  const { name, sessionId } = req.body as { name: string; sessionId?: string }
  if (!name?.trim()) {
    return res.status(400).json({ message: "Session name is required" })
  }

  // The session_key is the OpenWA session id itself — it must match one of the
  // session ids the OpenWA container boots (WA_SESSIONS env). Explicit
  // sessionId wins; otherwise slugify the name (host/sales/...).
  const sessionKey = (sessionId || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
  if (!sessionKey) {
    return res.status(400).json({ message: "Could not derive a session id from name" })
  }
  if (sessionRegistry.all().some((s) => s.session_key === sessionKey)) {
    return res.status(409).json({ message: `Session "${sessionKey}" already exists` })
  }

  const session = await createSessionRecord(req.scope, name, sessionKey)
  return res.json({ session })
}
