import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  sessionRegistry,
  createSessionRecord,
  loadSessionsFromDB,
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
  // Merge persisted rows (soft-delete filtered) into the in-memory registry so
  // the list is correct even if the boot loader did not run (e.g. worker mode).
  await loadSessionsFromDB(req.scope)
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

  // Conflict check must be DB-backed (not just the in-memory registry): after a
  // backend restart the registry starts empty while the DB still holds rows,
  // so a duplicate name would previously slip through and hit the unique
  // constraint at insert time → generic 500. Check both the unique `name`
  // constraint and the derived session_key, and return a real 409.
  const duplicate = await findDuplicateSession(req.scope, { name: name.trim(), sessionKey })
  if (duplicate) {
    return res.status(409).json({
      message: `Session "${duplicate.name}" already exists (session_key: ${duplicate.session_key})`,
      session_key: duplicate.session_key,
    })
  }

  const session = await createSessionRecord(req.scope, name, sessionKey)
  return res.json({ session })
}

/**
 * Look up an existing (non-deleted) session by exact name or session_key using
 * the whatsapp module service, which applies the soft-delete filter by default.
 */
async function findDuplicateSession(
  container: any,
  query: { name: string; sessionKey: string }
): Promise<{ id: string; name: string; session_key: string } | null> {
  const svc = container.resolve("whatsapp")
  const candidates = await svc.listWhatsappSessions({
    $or: [{ name: query.name }, { session_key: query.sessionKey }],
  })
  if (!candidates?.length) return null
  const hit = candidates[0]
  return { id: hit.id, name: hit.name, session_key: hit.session_key }
}
