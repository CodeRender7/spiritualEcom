import type { WhatsAppSession } from "./whatsapp-session"
import { sessionRegistry } from "./whatsapp-session"

/**
 * Shared helpers for the WhatsApp suite (broadcasts, chat inbox, analytics).
 * Kept deliberately free of Medusa DI so it can be used from libs, routes,
 * subscribers and jobs alike.
 */

/**
 * Normalize a raw phone/WhatsApp id into a comparable E.164-ish string.
 * - strips `@c.us`, `@s.whatsapp.net`, `+`, spaces, dashes, parens
 * - returns e.g. `919876543210`
 */
export function normalizePhone(raw: string): string {
  if (!raw) return ""
  return raw
    .replace(/@[cgs]\.[a-z]+|@s\.whatsapp\.net/gi, "")
    .replace(/[^0-9]/g, "")
    .replace(/^0+/, "")
}

/** Format a normalized number with a leading `+` for OpenWA send calls. */
export function toWaId(normalized: string): string {
  const n = normalizePhone(normalized)
  return n ? `+${n}` : ""
}

/**
 * Pick the session to send from.
 * - prefers a specific `sessionKey`
 * - otherwise the first session in `connected` state
 * - otherwise falls back to any session in the registry
 * Returns the session key or `null`.
 */
export function pickConnectedSession(sessionKey?: string | null): string | null {
  if (sessionKey) {
    const found = sessionRegistry.all().find((s) => s.session_key === sessionKey)
    if (found) return found.session_key
  }
  const connected = sessionRegistry.all().find((s) => s.status === "connected")
  if (connected) return connected.session_key
  const anySession = sessionRegistry.all()[0]
  return anySession?.session_key || null
}

/** True when at least one registry session is connected. */
export function hasConnectedSession(): boolean {
  return sessionRegistry.all().some((s) => s.status === "connected")
}

/** Snapshot of registry sessions (defensive clone). */
export function listRegistrySessions(): WhatsAppSession[] {
  return sessionRegistry.all().map((s) => ({ ...s }))
}

/** Short id generator matching the `was_` prefix style used in the suite. */
export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Build a display name for a conversation peer.
 * Uses customer first/last name, falling back to provided `contactName` or the
 * raw phone.
 */
export function buildDisplayName(input: {
  phone: string
  customerName?: string | null
  contactName?: string | null
}): string {
  if (input.customerName) return input.customerName
  if (input.contactName) return input.contactName
  return input.phone
}

/** Throttle/sleep helper (ms) for rate-limited WhatsApp sends. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Resolve the WhatsApp module service from any Medusa container (route scope,
 * job container, subscriber container, ...).
 *
 * Writes MUST go through the module service's generated methods (e.g.
 * `createWhatsappChatMessages`, `updateWhatsappSessions`) — the remote-query
 * `query.graph()` path is read-only in the installed Medusa version and
 * silently ignores `operation`.
 */
export function resolveWhatsappService(container: any): any {
  return container.resolve("whatsapp")
}
