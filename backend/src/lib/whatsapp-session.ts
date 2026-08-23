import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveWhatsappService } from "./whatsapp-utils"

export type SessionStatus = "disconnected" | "qr_ready" | "connecting" | "connected" | "error"

export interface WhatsAppSession {
  id: string
  name: string
  phone_number?: string
  session_key: string
  status: SessionStatus
  qr_code?: string
  created_at: Date
  updated_at: Date
}

/**
 * In-memory session registry (holds live QR codes + connection state).
 * Backed by database for persistence across restarts.
 */
class SessionRegistry {
  private sessions: Map<string, WhatsAppSession> = new Map()

  set(session: WhatsAppSession) {
    this.sessions.set(session.id, session)
  }

  get(id: string): WhatsAppSession | undefined {
    return this.sessions.get(id)
  }

  delete(id: string) {
    this.sessions.delete(id)
  }

  all(): WhatsAppSession[] {
    return Array.from(this.sessions.values())
  }
}

export const sessionRegistry = new SessionRegistry()

/**
 * OpenWA Gateway — communicates with the OpenWA container via HTTP.
 *
 * The OpenWA container (openwa/wa-automate v4.76.0) exposes one EasyAPI
 * endpoint per client method: POST /<camelCaseMethodName> with an
 * `{ args: { ... } }` (or `{ args: [...] }`) envelope. Every response is
 * `{ success: boolean, response: <value> }` or
 * `{ success: false, error: { name, message, data } }`.
 *
 * Multi-session routing: the container runs one client per session id from
 * its WA_SESSIONS env. Named sessions are reachable at `/<sessionId>/<method>`;
 * the legacy session id "session" owns the unprefixed `/<method>` routes.
 * Session keys in this backend are the OpenWA session ids themselves, so
 * `callOpenWA(sessionKey, ...)` maps 1:1 onto the container's routes.
 */
const OPENWA_URL = process.env.OPENWA_URL || "http://openwa:8002"

/** Route a method for a given session key; the legacy "session" stays unprefixed. */
function routePath(sessionKey: string | undefined, method: string): string {
  if (!sessionKey || sessionKey === "session") return `/${method}`
  return `/${sessionKey}/${method}`
}

/**
 * Maps the OpenWA/WAPI connection state string onto our session status.
 * WAPI states: CONNECTED, WAITING_FOR_QR_CODE, PAIRING, TIMEOUT, UNPAIRED,
 * DISCONNECTED, CONFLICT, DEPRECATED_VERSION, UNLAUNCHED...
 */
function mapConnectionState(state?: string): SessionStatus {
  switch ((state || "").toUpperCase()) {
    case "CONNECTED":
      return "connected"
    case "WAITING_FOR_QR_CODE":
    case "PAIRING":
      return "qr_ready"
    case "UNPAIRED":
      return "disconnected"
    case "CONFLICT":
    case "DEPRECATED_VERSION":
    case "UNLAUNCHED":
      return "error"
    default:
      return "connecting"
  }
}

/** Low-level helper: POST a method with args body, return parsed response. */
async function callOpenWA(
  method: string,
  args: Record<string, unknown> = {},
  timeoutMs = 15000,
  sessionKey?: string
): Promise<{ ok: boolean; response?: any; error?: { name?: string; message?: string } }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const url = `${OPENWA_URL}${routePath(sessionKey, method)}`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args }),
      signal: ctrl.signal,
    })
    const data = (await res.json().catch(() => ({}))) as any
    if (res.status === 404) {
      return { ok: false, error: { name: "MethodNotFound", message: `OpenWA has no method ${method}` } }
    }
    if (!res.ok || data.success === false) {
      return { ok: false, error: data.error || { message: `OpenWA method ${method} failed (HTTP ${res.status})` } }
    }
    return { ok: true, response: data.response }
  } catch (err) {
    console.error(`DivineKart WhatsApp OpenWA call ${method} failed:`, err)
    return { ok: false, error: { name: "NetworkError", message: (err as Error).message } }
  } finally {
    clearTimeout(timer)
  }
}

/** Normalize the WAPI connection state response (string or nested object). */
function getStateFromResponse(response: unknown): SessionStatus {
  let raw: string | undefined
  if (typeof response === "string") {
    raw = response
  } else if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>
    raw = (obj.state as string) || (obj.text as string) || undefined
  }
  return mapConnectionState(raw)
}

/**
 * "Start" = make sure the container is reachable and report the connection
 * state. The OpenWA container auto-starts its single baked-in session on
 * boot; the QR code is delivered asynchronously via the `qr` event webhook,
 * which the backend webhook route stores into `sessionRegistry`.
 */
export async function startSession(sessionKey: string): Promise<{ qr?: string; status: SessionStatus }> {
  const res = await callOpenWA("getConnectionState", {}, 15000, sessionKey)
  // If the container already holds a QR (stored by the webhook), surface it.
  const known = sessionRegistry.all().find((s) => s.session_key === sessionKey)
  return { qr: known?.qr_code, status: res.ok ? getStateFromResponse(res.response) : "error" }
}

export async function getSessionStatus(sessionKey: string): Promise<SessionStatus> {
  const res = await callOpenWA("getConnectionState", {}, 15000, sessionKey)
  return res.ok ? getStateFromResponse(res.response) : "disconnected"
}

export async function stopSession(sessionKey: string): Promise<boolean> {
  const res = await callOpenWA("kill", { reason: `admin stop requested for ${sessionKey}` }, 15000, sessionKey)
  return res.ok
}

export async function sendMessage(
  sessionKey: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> {
  const res = await callOpenWA("sendText", { to, content: message }, 15000, sessionKey)
  if (!res.ok) {
    console.error("DivineKart WhatsApp send error:", res.error)
    return { success: false }
  }
  const messageId = typeof res.response === "string" ? res.response : res.response?.id || undefined
  return { success: true, messageId }
}

export async function sendImage(
  sessionKey: string,
  to: string,
  imageUrl: string,
  caption?: string
): Promise<{ success: boolean }> {
  const res = await callOpenWA(
    "sendFileFromUrl",
    { to, url: imageUrl, caption: caption || "", filename: "image.jpg" },
    15000,
    sessionKey
  )
  return { success: res.ok }
}

/** Send a generated document (pdf) by URL — document-builder D7. */
export async function sendDocumentFile(
  sessionKey: string,
  to: string,
  fileUrl: string,
  filename: string,
  caption?: string
): Promise<{ success: boolean }> {
  const res = await callOpenWA(
    "sendFileFromUrl",
    { to, url: fileUrl, caption: caption || "", filename },
    30000,
    sessionKey
  )
  if (!res.ok) console.error("DivineKart WhatsApp document send error:", res.error)
  return { success: res.ok }
}

/**
 * Load persisted sessions from DB into memory. Reconciles the registry with
 * the DB: soft-deleted rows are dropped from memory and any DB rows missing
 * from the registry are added. Safe to call repeatedly (idempotent).
 */
export async function loadSessionsFromDB(container: any): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const result = await query.graph({
    entity: "whatsapp_sessions",
    fields: ["id", "name", "phone_number", "session_key", "status", "qr_code", "created_at", "updated_at"],
    filters: { deleted_at: null },
  })
  const rows = (result.data || []) as WhatsAppSession[]
  const liveIds = new Set(rows.map((r) => r.id))
  // Drop registry entries that are no longer present (soft-deleted in DB).
  for (const s of sessionRegistry.all()) {
    if (!liveIds.has(s.id)) {
      sessionRegistry.delete(s.id)
    }
  }
  // Add/refresh DB rows in memory.
  for (const row of rows) {
    sessionRegistry.set(row)
  }
}

/**
 * Create a new WhatsApp session record (DB + memory).
 */
export async function createSessionRecord(
  container: any,
  name: string,
  sessionKey: string
): Promise<WhatsAppSession> {
  const id = `was_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date()
  const session: WhatsAppSession = {
    id,
    name,
    session_key: sessionKey,
    status: "disconnected",
    created_at: now,
    updated_at: now,
  }

  const db = resolveWhatsappService(container)
  await db.createWhatsappSessions([session])

  sessionRegistry.set(session)
  return session
}

/**
 * Update session status/QR/phone in DB + memory.
 */
export async function updateSessionRecord(
  container: any,
  id: string,
  updates: Partial<WhatsAppSession>
): Promise<void> {
  const svc = resolveWhatsappService(container)
  // Update by primary key; the generated service method throws NOT_FOUND when
  // the row is missing, so guard defensively for memory-only sessions.
  try {
    await svc.updateWhatsappSessions([{ id, ...updates, updated_at: new Date() }])
  } catch (err) {
    console.error(`DivineKart WhatsApp update session record failed for ${id}:`, err)
  }
  const existing = sessionRegistry.get(id)
  if (existing) {
    sessionRegistry.set({ ...existing, ...updates, updated_at: new Date() })
  }
}
