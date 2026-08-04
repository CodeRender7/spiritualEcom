import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  sessionRegistry,
  startSession,
  stopSession,
  getSessionStatus,
  updateSessionRecord,
} from "../../../../../lib/whatsapp-session"

/**
 * GET    /admin/whatsapp/sessions/:id          → get session details
 * POST   /admin/whatsapp/sessions/:id/start    → start session (QR)
 * POST   /admin/whatsapp/sessions/:id/stop     → stop session
 * POST   /admin/whatsapp/sessions/:id/refresh  → refresh QR code
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const session = sessionRegistry.get(id)
  if (!session) {
    return res.status(404).json({ message: "Session not found" })
  }
  return res.json({ session })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const action = req.url.split("/").pop() // "start", "stop", "refresh"
  
  const session = sessionRegistry.get(id)
  if (!session) {
    return res.status(404).json({ message: "Session not found" })
  }

  if (action === "start" || action === "refresh") {
    const result = await startSession(session.session_key)
    await updateSessionRecord(req.scope, id, {
      status: result.status,
      qr_code: result.qr,
    })
    return res.json({ session: sessionRegistry.get(id), qr: result.qr })
  }

  if (action === "stop") {
    await stopSession(session.session_key)
    await updateSessionRecord(req.scope, id, { status: "disconnected", qr_code: undefined })
    return res.json({ session: sessionRegistry.get(id) })
  }

  return res.status(400).json({ message: "Invalid action" })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const session = sessionRegistry.get(id)
  if (!session) {
    return res.status(404).json({ message: "Session not found" })
  }

  await stopSession(session.session_key)
  await updateSessionRecord(req.scope, id, { deleted_at: new Date() } as any)
  sessionRegistry.delete(id)
  return res.json({ success: true })
}
