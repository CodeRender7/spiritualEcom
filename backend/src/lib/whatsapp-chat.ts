import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { sendMessage } from "./whatsapp-session"
import { genId, normalizePhone, pickConnectedSession, resolveWhatsappService, toWaId } from "./whatsapp-utils"

/**
 * WhatsApp Chat Support Inbox (Phase 6)
 *
 * Persists inbound/outbound chat messages and maintains per-peer conversations
 * keyed by (session_id, phone). Lifted out of route handlers so the webhook,
 * admin API and (future) tests share one implementation.
 *
 * All table access goes through `container.resolve(QUERY).graph(...)` for
 * READS only. WRITES go through the whatsapp module service's generated
 * methods (e.g. `createWhatsappChatMessages`, `updateWhatsappConversations`)
 * — `query.graph()` is read-only in the installed Medusa version and silently
 * ignores `operation`.
 */

export type ChatDirection = "inbound" | "outbound"
export type ChatStatus = "received" | "sent" | "delivered" | "read" | "failed"
export type ConversationStatus = "open" | "resolved"

export interface ChatMessageRow {
  id: string
  session_id: string
  direction: ChatDirection
  phone: string
  customer_id: string | null
  contact_name: string | null
  body: string | null
  media_type: string | null
  media_url: string | null
  wa_message_id: string | null
  status: ChatStatus
  timestamp: Date
  created_at: Date
  updated_at: Date
}

export interface ConversationRow {
  session_id: string
  phone: string
  customer_id: string | null
  contact_name: string | null
  last_message: string | null
  last_direction: ChatDirection | null
  last_message_at: Date | null
  unread_count: number
  status: ConversationStatus
  assigned_to: string | null
  created_at: Date
  updated_at: Date
}

export interface RecordMessageInput {
  sessionKey: string
  direction: ChatDirection
  body?: string | null
  mediaType?: string | null
  mediaUrl?: string | null
  /** WhatsApp message id — used to correlate delivery acks. */
  waMessageId?: string | null
  status?: ChatStatus
  /** Peer phone: inbound uses `from`, outbound uses `to`. */
  from?: string | null
  to?: string | null
  contactPhone?: string | null
  /** Pre-resolved customer name (e.g. from listing). */
  contactName?: string | null
  timestamp?: Date | string | number
}

/**
 * Persist one chat message and upsert its conversation row.
 * Returns the inserted message (or null when there is no usable peer phone/session).
 */
export async function recordMessage(
  container: any,
  input: RecordMessageInput
): Promise<{ message: ChatMessageRow | null }> {
  if (!input.sessionKey) return { message: null }

  const rawPhone = input.contactPhone ?? (input.direction === "inbound" ? input.from : input.to) ?? ""
  const phone = normalizePhone(rawPhone)
  if (!phone) return { message: null }

  const { customer_id, customer_name } = await lookupCustomer(container, phone, input.contactName)

  const now = new Date()
  const message: ChatMessageRow = {
    id: genId("wcm"),
    session_id: input.sessionKey,
    direction: input.direction,
    phone,
    customer_id,
    contact_name: customer_name,
    body: input.body ?? null,
    media_type: input.mediaType ?? null,
    media_url: input.mediaUrl ?? null,
    wa_message_id: input.waMessageId ?? null,
    status: input.status ?? "received",
    timestamp: input.timestamp ? new Date(input.timestamp) : now,
    created_at: now,
    updated_at: now,
  }

  try {
    const svc = resolveWhatsappService(container)
    await svc.createWhatsappChatMessages([message])
  } catch (err) {
    console.error("DivineKart WhatsApp insert message failed:", err)
    return { message: null }
  }

  await upsertConversation(container, {
    sessionId: input.sessionKey,
    phone,
    direction: input.direction,
    body: message.body,
    mediaType: message.media_type,
    timestamp: message.timestamp,
    customer_id: customer_id,
    contactName: customer_name,
  })

  return { message }
}

async function lookupCustomer(
  container: any,
  phone: string,
  fallbackName?: string | null
): Promise<{ customer_id: string | null; customer_name: string | null }> {
  try {
    const customerModule = container.resolve(Modules.CUSTOMER)
    const customers = await customerModule.listCustomers({ phone })
    const c = customers?.[0]
    if (c && c.id) {
      const first = (c.first_name as string) || ""
      const last = (c.last_name as string) || ""
      const name = [first, last].filter(Boolean).join(" ").trim()
      return { customer_id: c.id as string, customer_name: name || (c.phone as string) || null }
    }
  } catch (err) {
    // Never let a customer-module hiccup break message persistence.
    console.error("DivineKart WhatsApp customer lookup failed:", err)
  }
  return { customer_id: null, customer_name: fallbackName || null }
}

async function upsertConversation(
  container: any,
  opts: {
    sessionId: string
    phone: string
    direction: ChatDirection
    body: string | null
    mediaType: string | null
    timestamp: Date
    customer_id: string | null
    contactName: string | null
  }
): Promise<void> {
  const preview = opts.body || (opts.mediaType ? `[${opts.mediaType}]` : null)

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const existingRes = await query.graph({
    entity: "whatsapp_conversations",
    fields: ["*"],
    filters: { session_id: opts.sessionId, phone: opts.phone },
    take: 1,
  })
  const existing = existingRes?.data?.[0] as Partial<ConversationRow> | undefined

  const svc = resolveWhatsappService(container)
  if (existing) {
    await svc.updateWhatsappConversations([
      {
        session_id: opts.sessionId,
        phone: opts.phone,
        customer_id: opts.customer_id ?? existing.customer_id ?? null,
        contact_name: opts.contactName ?? existing.contact_name ?? null,
        last_message: preview,
        last_direction: opts.direction,
        last_message_at: opts.timestamp,
        unread_count:
          opts.direction === "inbound" ? (existing.unread_count ?? 0) + 1 : 0,
        updated_at: new Date(),
      },
    ])
    return
  }

  await svc.createWhatsappConversations([
    {
      session_id: opts.sessionId,
      phone: opts.phone,
      customer_id: opts.customer_id,
      contact_name: opts.contactName,
      last_message: preview,
      last_direction: opts.direction,
      last_message_at: opts.timestamp,
      unread_count: opts.direction === "inbound" ? 1 : 0,
      status: "open",
      assigned_to: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ])
}

/**
 * List conversations, newest activity first. `search` matches peer phone,
 * contact name, or customer id.
 */
export async function listConversations(
  container: any,
  opts: { skip?: number; take?: number; status?: string; search?: string } = {}
): Promise<ConversationRow[]> {
  const { skip = 0, take = 50, status, search } = opts
  const filters: Record<string, unknown> = {}
  if (status) filters.status = status
  if (search) {
    filters["$or"] = [
      { phone: { $like: `%${search}%` } },
      { contact_name: { $like: `%${search}%` } },
      { customer_id: { $like: `%${search}%` } },
    ]
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const result = await query.graph({
    entity: "whatsapp_conversations",
    fields: ["*"],
    filters,
    order: { last_message_at: "DESC" },
    start: skip,
    take,
  })
  return (result.data || []) as ConversationRow[]
}

/** Fetch one (session, phone) thread, oldest message first. */
export async function getThread(
  container: any,
  sessionId: string,
  phone: string,
  opts: { skip?: number; take?: number } = {}
): Promise<ChatMessageRow[]> {
  const { skip = 0, take = 50 } = opts
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const result = await query.graph({
    entity: "whatsapp_chat_messages",
    fields: ["*"],
    filters: { session_id: sessionId, phone: normalizePhone(phone) },
    order: { timestamp: "ASC" },
    start: skip,
    take,
  })
  return (result.data || []) as ChatMessageRow[]
}

/**
 * Send an admin reply through the best available connected session and
 * persist it as an outbound message tagged with the WA message id.
 */
export async function sendAdminReply(
  container: any,
  sessionId: string,
  phone: string,
  text: string
): Promise<{ ok: boolean; messageId?: string; error?: "no_connected_session" | "send_failed" }> {
  const sessionKey = pickConnectedSession(sessionId)
  if (!sessionKey) {
    return { ok: false, error: "no_connected_session" }
  }

  const result = await sendMessage(sessionKey, toWaId(phone), text)
  if (!result.success) {
    return { ok: false, error: "send_failed" }
  }

  // Record optimistically; ack webhooks update status/wa_message_id later.
  await recordMessage(container, {
    sessionKey,
    direction: "outbound",
    body: text,
    to: toWaId(phone),
    waMessageId: result.messageId || null,
    status: result.messageId ? "sent" : "received",
  })

  return { ok: true, messageId: result.messageId }
}

/** Mark a conversation as fully read. */
export async function markConversationRead(
  container: any,
  sessionId: string,
  phone: string
): Promise<void> {
  const svc = resolveWhatsappService(container)
  await svc.updateWhatsappConversations([
    {
      session_id: sessionId,
      phone: normalizePhone(phone),
      unread_count: 0,
      updated_at: new Date(),
    },
  ])
}

/** Open/resolve a conversation. */
export async function resolveConversation(
  container: any,
  sessionId: string,
  phone: string,
  resolved: boolean
): Promise<void> {
  const svc = resolveWhatsappService(container)
  await svc.updateWhatsappConversations([
    {
      session_id: sessionId,
      phone: normalizePhone(phone),
      status: resolved ? "resolved" : "open",
      updated_at: new Date(),
    },
  ])
}

/** Update delivery status for a tracked outbound message (by WA message id). */
export async function updateMessageAck(
  container: any,
  waMessageId: string,
  status: ChatStatus
): Promise<void> {
  if (!waMessageId) return
  const svc = resolveWhatsappService(container)
  // wa_message_id is not the primary key — use the selector form.
  await svc.updateWhatsappChatMessages([
    {
      selector: { wa_message_id: waMessageId },
      data: { status, updated_at: new Date() },
    },
  ])
}

/**
 * Map an OpenWA ack number onto our message status.
 * -1/0 → failed, 1 → sent, 2 → delivered, 3/4 → read.
 */
export function mapAckToStatus(ack: unknown): ChatStatus | null {
  const n = typeof ack === "number" ? ack : typeof ack === "string" ? Number(ack) : NaN
  if (Number.isNaN(n)) return null
  if (n === -1 || n === 0) return "failed"
  if (n === 1) return "sent"
  if (n === 2) return "delivered"
  if (n === 3 || n === 4) return "read"
  return null
}

// Friendly alias used by the webhook sink — same function, explicit name.
export const recordChatMessage = recordMessage