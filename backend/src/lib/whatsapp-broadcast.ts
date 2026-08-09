import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { sessionRegistry, sendImage, sendMessage } from "./whatsapp-session"
import { genId, hasConnectedSession, normalizePhone, pickConnectedSession, sleep, toWaId } from "./whatsapp-utils"

/**
 * WhatsApp Broadcast Campaigns (Phase 5)
 *
 * Creates, schedules and dispatches broadcast campaigns against a resolved
 * audience (manual numbers, all customers, customers with orders) and tracks
 * per-recipient delivery analytics for the admin dashboard.
 *
 * All table access goes through `container.resolve(QUERY).graph(...)` on the
 * migration-provided tables, mirroring whatsapp-session.ts and
 * whatsapp-chat.ts. Aggregate analytics use the raw `PG_CONNECTION` pool.
 */

export type BroadcastAudienceType = "manual_numbers" | "all_customers" | "customers_with_orders"

export type BroadcastStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "sending"
  | "sent"
  | "partial_failed"
  | "cancelled"
  | "failed"

export type RecipientStatus = "queued" | "sent" | "delivered" | "read" | "failed"

export interface BroadcastRow {
  id: string
  name: string
  session_id: string | null
  message: string
  image_url: string | null
  audience_type: BroadcastAudienceType
  audience_filters: Record<string, unknown> | null
  recipient_phones: string[] | null
  status: BroadcastStatus
  scheduled_at: Date | null
  started_at: Date | null
  finished_at: Date | null
  error: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface BroadcastRecipientRow {
  id: string
  broadcast_id: string
  phone: string
  customer_id: string | null
  status: RecipientStatus
  wa_message_id: string | null
  error: string | null
  attempted_at: Date | null
  delivered_at: Date | null
  read_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface CreateBroadcastInput {
  name: string
  message: string
  imageUrl?: string | null
  audienceType?: BroadcastAudienceType
  audienceFilters?: Record<string, unknown> | null
  recipientPhones?: string[]
  sessionId?: string | null
  scheduledAt?: Date | string | null
}

/** Hard ceiling on resolved audience size to protect the gateway from bans. */
const MAX_AUDIENCE = 5000

/** Friendly display labels mirroring the UI vocabulary. */
export const BROADCAST_STATUS_LABELS: Record<BroadcastStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  queued: "Queued",
  sending: "Sending…",
  sent: "Sent",
  partial_failed: "Partial failure",
  cancelled: "Cancelled",
  failed: "Failed",
}

export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
}

/**
 * Resolve the recipient phone list for an audience definition. Normalized to
 * E.164-ish digits (no `+`) and deduplicated. Throws when the audience exceeds
 * `MAX_AUDIENCE` so callers can surface a 400.
 */
async function collectRecipientPhones(
  container: any,
  audienceType: BroadcastAudienceType,
  filters: Record<string, unknown> | null | undefined,
  manualPhones: string[] | null | undefined
): Promise<string[]> {
  const phones: string[] = []
  const seen = new Set<string>()

  const push = (raw?: string | null) => {
    const phone = normalizePhone(raw || "")
    if (phone && !seen.has(phone)) {
      seen.add(phone)
      phones.push(phone)
    }
  }

  if (audienceType === "manual_numbers" || !audienceType) {
    for (const p of manualPhones || []) push(p)
  } else {
    const customerModule = container.resolve(Modules.CUSTOMER)
    const orderOwnerIds = audienceType === "customers_with_orders" ? await collectCustomerIds(container) : null

    let skip = 0
    const take = 100
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let customers: any[] = []
      try {
        const result = await customerModule.listCustomers(
          {},
          { take, skip, select: ["id", "first_name", "last_name", "phone"] }
        )
        customers = Array.isArray(result) ? result : (result?.data || [])
      } catch (err) {
        console.error("DivineKart WhatsApp broadcast customer list failed:", err)
        break
      }

      for (const c of customers) {
        if (phones.length >= MAX_AUDIENCE) break
        if (orderOwnerIds && !orderOwnerIds.has(c.id as string)) continue
        push(c.phone as string)
      }

      if (phones.length >= MAX_AUDIENCE) break
      if (!customers.length || customers.length < take) break
      skip += take
    }
  }

  if (phones.length > MAX_AUDIENCE) {
    throw new Error(`Audience exceeds the maximum of ${MAX_AUDIENCE} recipients`)
  }
  return phones
}

/**
 * IDs of customers who have placed at least one order. Used to narrow the
 * `customers_with_orders` audience.
 */
async function collectCustomerIds(container: any): Promise<Set<string>> {
  const ids = new Set<string>()
  const orderModule = container.resolve(Modules.ORDER)
  let skip = 0
  const take = 1000
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let orders: any[] = []
    try {
      const result = await orderModule.listOrders({}, { take, skip, select: ["customer_id"] })
      orders = Array.isArray(result) ? result : (result?.data || [])
    } catch (err) {
      console.error("Failed to list orders for broadcast audience:", err)
      break
    }
    for (const o of orders) {
      if (o.customer_id) ids.add(o.customer_id as string)
    }
    if (orders.length < take) break
    skip += take
  }
  return ids
}

/**
 * Resolve an audience for previewing: total count + a small sample of the
 * first normalized phones. Does not persist anything.
 */
export async function resolveAudience(
  container: any,
  audienceType: BroadcastAudienceType,
  filters: Record<string, unknown> | null | undefined,
  manualPhones?: string[] | null
): Promise<{ total: number; sample: string[] }> {
  const phones = await collectRecipientPhones(container, audienceType, filters, manualPhones)
  return { total: phones.length, sample: phones.slice(0, 5) }
}

/**
 * Create a broadcast: builds a header row + one recipient row per resolved
 * phone. Manual numbers are snapshotted inline; customer audiences are
 * resolved at creation time and snapshot into the recipient table.
 */
export async function createBroadcast(
  container: any,
  input: CreateBroadcastInput
): Promise<BroadcastRow> {
  if (!input.name?.trim() || !input.message?.trim()) {
    throw new Error("Broadcast name and message are required")
  }

  const audienceType = input.audienceType || "manual_numbers"
  const phones = await collectRecipientPhones(container, audienceType, input.audienceFilters, input.recipientPhones)
  if (!phones.length) {
    throw new Error("No recipients")
  }

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
  const now = new Date()
  const isScheduled = scheduledAt !== null && scheduledAt.getTime() > now.getTime()

  const id = genId("wab")
  const header: BroadcastRow = {
    id,
    name: input.name.trim(),
    session_id: input.sessionId || null,
    message: input.message,
    image_url: input.imageUrl || null,
    audience_type: audienceType,
    audience_filters: input.audienceFilters || null,
    recipient_phones: audienceType === "manual_numbers" ? phones : null,
    status: isScheduled ? "scheduled" : "queued",
    scheduled_at: scheduledAt,
    started_at: null,
    finished_at: null,
    error: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  const recipients: BroadcastRecipientRow[] = phones.map((phone) => ({
    id: genId("wbr"),
    broadcast_id: id,
    phone,
    customer_id: null,
    status: "queued",
    wa_message_id: null,
    error: null,
    attempted_at: null,
    delivered_at: null,
    read_at: null,
    created_at: now,
    updated_at: now,
  }))

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  await query.graph({
    entity: "whatsapp_broadcasts",
    operation: "create",
    data: [header],
  })

  // Insert recipients in manageable batches to avoid extremely large single
  // inserts for big audiences.
  const batchSize = 1000
  for (let i = 0; i < recipients.length; i += batchSize) {
    await query.graph({
      entity: "whatsapp_broadcast_recipients",
      operation: "create",
      data: recipients.slice(i, i + batchSize),
    })
  }

  return header
}

/** Down-Fetch helpers. */
export async function listBroadcasts(
  container: any,
  opts: { skip?: number; take?: number } = {}
): Promise<BroadcastRow[]> {
  const { skip = 0, take = 50 } = opts
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const result = await query.graph({
    entity: "whatsapp_broadcasts",
    fields: ["*"],
    filters: { deleted_at: null },
    order: { created_at: "DESC" },
    start: skip,
    take,
  })
  return (result.data || []) as BroadcastRow[]
}

export async function getBroadcast(container: any, id: string): Promise<BroadcastRow | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const result = await query.graph({
    entity: "whatsapp_broadcasts",
    fields: ["*"],
    filters: { id, deleted_at: null },
    take: 1,
  })
  return (result.data?.[0] as BroadcastRow) || null
}

export async function getRecipients(
  container: any,
  broadcastId: string,
  opts: { skip?: number; take?: number; status?: string } = {}
): Promise<BroadcastRecipientRow[]> {
  const { skip = 0, take = 50, status } = opts
  const filters: Record<string, unknown> = { broadcast_id: broadcastId }
  if (status) filters.status = status
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const result = await query.graph({
    entity: "whatsapp_broadcast_recipients",
    fields: ["*"],
    filters,
    order: { created_at: "ASC" },
    start: skip,
    take,
  })
  return (result.data || []) as BroadcastRecipientRow[]
}

/**
 * Attach a `{ status: count }` summary (plus `recipient_total`) to each
 * broadcast row using a raw PG aggregate — far cheaper than N+1 queries.
 */
export async function loadsBroadcastSummaries(
  container: any,
  rows: BroadcastRow[]
): Promise<Array<BroadcastRow & { recipient_summary: Record<string, number>; recipient_total: number }>> {
  if (rows.length === 0) return []

  const pool = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const ids = rows.map((r) => r.id)
  const { rows: grouped } = await pool.query(
    `SELECT broadcast_id, status, COUNT(*)::int AS count
     FROM whatsapp_broadcast_recipients
     WHERE broadcast_id = ANY($1)
     GROUP BY broadcast_id, status`,
    [ids]
  )

  const byId = new Map<string, Record<string, number>>()
  for (const g of grouped as Array<{ broadcast_id: string; status: string; count: number }>) {
    const current = byId.get(g.broadcast_id) || {}
    current[g.status] = g.count
    byId.set(g.broadcast_id, current)
  }

  return rows.map((row) => {
    const summary = byId.get(row.id) || {}
    const total = Object.values(summary).reduce((sum, n) => sum + n, 0)
    return { ...row, recipient_summary: summary, recipient_total: total }
  })
}

/** Resolve a stored broadcast session id to its actual gateway session key. */
function sessionKeyFor(broadcast: BroadcastRow): string {
  const known = sessionRegistry.get(broadcast.session_id || "")
  if (known) return known.session_key
  return broadcast.session_id || ""
}

/**
 * Idempotent batch dispatcher: pick due (queued/scheduled-with-now) broadcasts
 * and drain their recipients one per second. Called by the scheduled job and
 * by a "dispatch now" admin action.
 */
export async function dispatchDue(container: any, now: Date = new Date()): Promise<number> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const result = await query.graph({
    entity: "whatsapp_broadcasts",
    fields: ["*"],
    filters: {
      deleted_at: null,
      status: { $in: ["queued", "scheduled"] },
      $or: [{ scheduled_at: null }, { scheduled_at: { $lte: now } }],
    },
    order: { scheduled_at: "ASC" },
  })

  const due = (result.data || []) as BroadcastRow[]
  let handled = 0
  for (const broadcast of due) {
    await dispatchOne(container, broadcast, now)
    handled++
  }
  return handled
}

async function dispatchOne(container: any, broadcast: BroadcastRow, now: Date): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Safety guard: never dispatch a future-scheduled broadcast early (the
  // dispatchDue filter already excludes these, but the job re-runs often).
  if (broadcast.status === "scheduled" && broadcast.scheduled_at && broadcast.scheduled_at > now) return

  // Mark sending before we start touching recipients.
  await query.graph({
    entity: "whatsapp_broadcasts",
    operation: "update",
    filters: { id: broadcast.id },
    data: { status: "sending", started_at: now, updated_at: now },
  })

  const sessionKey = pickConnectedSession(sessionKeyFor(broadcast))
  if (!sessionKey) {
    await query.graph({
      entity: "whatsapp_broadcasts",
      operation: "update",
      filters: { id: broadcast.id },
      data: { status: "failed", error: "no connected session", finished_at: now, updated_at: now },
    })
    return
  }

  const recRes = await query.graph({
    entity: "whatsapp_broadcast_recipients",
    fields: ["*"],
    filters: { broadcast_id: broadcast.id, status: "queued" },
  })
  const recipients = (recRes.data || []) as BroadcastRecipientRow[]

  let sent = 0
  let failedCount = 0

  for (const r of recipients) {
    if (!hasConnectedSession()) {
      // Session dropped mid-broadcast — leave the rest queued for a retry.
      break
    }

    let success: boolean
    let waMessageId: string | undefined

    if (broadcast.image_url) {
      success = (await sendImage(sessionKey, toWaId(r.phone), broadcast.image_url, broadcast.message)).success
    } else {
      const sent = await sendMessage(sessionKey, toWaId(r.phone), broadcast.message)
      success = sent.success
      waMessageId = sent.messageId
    }

    await sleep(1000) // 1/sec rate limit to avoid WhatsApp banning

    if (success) {
      const update: Partial<BroadcastRecipientRow> = {
        status: "sent",
        wa_message_id: waMessageId || null,
        attempted_at: now,
        updated_at: now,
      }
      await query.graph({
        entity: "whatsapp_broadcast_recipients",
        operation: "update",
        filters: { id: r.id },
        data: update,
      })
      sent++
    } else {
      failedCount++
      await query.graph({
        entity: "whatsapp_broadcast_recipients",
        operation: "update",
        filters: { id: r.id },
        data: { status: "failed", attempted_at: now, error: "send failed", updated_at: now },
      })
    }
  }

  const remaining = recipients.length - sent - failedCount
  let final: BroadcastStatus = "sent"
  if (sent === 0 && failedCount > 0) final = "failed"
  else if (failedCount > 0) final = "partial_failed"

  // Mark everything terminal unless a session outage left work behind, in
  // which case we keep it queued so the next poll retries. Recipients break
  // above stay `queued`.
  const terminal = remaining > 0 ? "queued" : final

  await query.graph({
    entity: "whatsapp_broadcasts",
    operation: "update",
    filters: { id: broadcast.id },
    data: {
      status: terminal,
      finished_at: terminal === "queued" ? null : now,
      error: terminal === "failed" || terminal === "partial_failed" ? "one or more recipients failed" : null,
      updated_at: now,
    },
  })
}

/** Cancel a broadcast. Ignored once sending or already sent. */
export async function cancelBroadcast(container: any, id: string): Promise<boolean> {
  const current = await getBroadcast(container, id)
  if (!current) return false
  if (current.status === "sending" || current.status === "sent") return false

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  await query.graph({
    entity: "whatsapp_broadcasts",
    operation: "update",
    filters: { id },
    data: { status: "cancelled", finished_at: new Date(), updated_at: new Date() },
  })
  return true
}

/** Flip failed recipients back to queued so the next dispatch retries them. */
export async function retryFailed(container: any, id: string): Promise<boolean> {
  const current = await getBroadcast(container, id)
  if (!current) return false

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date()
  await query.graph({
    entity: "whatsapp_broadcast_recipients",
    operation: "update",
    filters: { broadcast_id: id, status: "failed" },
    data: { status: "queued", error: null, attempted_at: null, updated_at: now },
  })
  await query.graph({
    entity: "whatsapp_broadcasts",
    operation: "update",
    filters: { id },
    data: { status: "queued", finished_at: null, error: null, updated_at: now },
  })
  return true
}

/**
 * Phase-independent deliverability ack handler, exported for Phase 6's
 * webhook to call. Maps the OpenWA ack code onto the recipient row:
 * -1 → failed, 1 → sent, 2 → delivered, 3|4 → read.
 */
export async function handleBroadcastDeliverability(
  container: any,
  input: { waMessageId: string; ack?: number | string; status?: string }
): Promise<{ ok: boolean; matched: boolean }> {
  const waMessageId = input?.waMessageId
  if (!waMessageId) return { ok: true, matched: false }

  const ack = input.ack !== undefined ? Number(input.ack) : NaN
  let status: RecipientStatus | undefined
  if (input.status && ["queued", "sent", "delivered", "read", "failed"].includes(input.status)) {
    status = input.status as RecipientStatus
  } else if (!Number.isNaN(ack)) {
    if (ack === -1) status = "failed"
    else if (ack === 1) status = "sent"
    else if (ack === 2) status = "delivered"
    else if (ack === 3 || ack === 4) status = "read"
  }
  if (!status) return { ok: true, matched: false }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const found = await query.graph({
    entity: "whatsapp_broadcast_recipients",
    fields: ["id", "status"],
    filters: { wa_message_id: waMessageId },
    take: 1,
  })
  const recipient = found.data?.[0] as Pick<BroadcastRecipientRow, "id" | "status"> | undefined
  if (!recipient) return { ok: true, matched: false }

  const patch: Partial<BroadcastRecipientRow> = { status, updated_at: new Date() }
  if (status === "delivered") patch.delivered_at = new Date()
  if (status === "read") patch.read_at = new Date()

  await query.graph({
    entity: "whatsapp_broadcast_recipients",
    operation: "update",
    filters: { id: recipient.id },
    data: patch,
  })

  return { ok: true, matched: true }
}