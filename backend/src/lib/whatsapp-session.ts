import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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
 */
const OPENWA_URL = process.env.OPENWA_URL || "http://openwa:8002"

export async function startSession(sessionKey: string): Promise<{ qr?: string; status: SessionStatus }> {
  try {
    const res = await fetch(`${OPENWA_URL}/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionKey }),
    })
    const data = (await res.json()) as any
    return { qr: data.qr, status: data.status || "connecting" }
  } catch (err) {
    console.error("DivineKart WhatsApp start session error:", err)
    return { status: "error" }
  }
}

export async function getSessionStatus(sessionKey: string): Promise<SessionStatus> {
  try {
    const res = await fetch(`${OPENWA_URL}/session/${sessionKey}/status`)
    const data = (await res.json()) as any
    return data.status || "disconnected"
  } catch {
    return "disconnected"
  }
}

export async function stopSession(sessionKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${OPENWA_URL}/session/${sessionKey}/stop`, { method: "POST" })
    return res.ok
  } catch {
    return false
  }
}

export async function sendMessage(
  sessionKey: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const res = await fetch(`${OPENWA_URL}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionKey, to, message }),
    })
    const data = (await res.json()) as any
    return { success: res.ok, messageId: data.messageId }
  } catch (err) {
    console.error("DivineKart WhatsApp send error:", err)
    return { success: false }
  }
}

export async function sendImage(
  sessionKey: string,
  to: string,
  imageUrl: string,
  caption?: string
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${OPENWA_URL}/send/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionKey, to, image: imageUrl, caption }),
    })
    return { success: res.ok }
  } catch {
    return { success: false }
  }
}

/**
 * Load persisted sessions from DB into memory on startup.
 */
export async function loadSessionsFromDB(container: any): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const result = await query.graph({
    entity: "whatsapp_sessions",
    fields: ["id", "name", "phone_number", "session_key", "status", "qr_code", "created_at", "updated_at"],
    filters: { deleted_at: null },
  })
  for (const row of result.data || []) {
    sessionRegistry.set(row as WhatsAppSession)
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

  const db = container.resolve(ContainerRegistrationKeys.QUERY)
  await db.graph({
    entity: "whatsapp_sessions",
    operation: "create",
    data: [session],
  })

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
  const db = container.resolve(ContainerRegistrationKeys.QUERY)
  await db.graph({
    entity: "whatsapp_sessions",
    operation: "update",
    filters: { id },
    data: { ...updates, updated_at: new Date() },
  })
  const existing = sessionRegistry.get(id)
  if (existing) {
    sessionRegistry.set({ ...existing, ...updates, updated_at: new Date() })
  }
}
