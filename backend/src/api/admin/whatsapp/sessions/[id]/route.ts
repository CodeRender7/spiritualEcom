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
  // Proper soft-delete through the module service (sets deleted_at). The raw
  // `updateWhatsappSessions` path is not allowed to mutate managed soft-delete
  // columns, and the soft-delete filter in list/query.graph excludes the row
  // afterwards — so it disappears from the dashboard without losing history.
  const svc: any = req.scope.resolve("whatsapp")
  await svc.softDeleteWhatsappSessions([id])
  sessionRegistry.delete(id)
  return res.json({ success: true })
}
