import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sessionRegistry, updateSessionRecord } from "../../../lib/whatsapp-session"
import {
  mapAckToStatus,
  recordChatMessage,
  updateMessageAck,
} from "../../../lib/whatsapp-chat"

/**
 * OpenWA Webhook Receiver
 * POST /webhooks/whatsapp → receives QR codes, status updates, inbound messages
 *
 * Webhook events from OpenWA:
 * - qr: { sessionKey, qr }
 * - status: { sessionKey, status, phone }
 * - message: { sessionKey, from, to, body, isGroupMsg, timestamp }
 * - ack / message_ack / onAck: { messageId, ack } → outbound delivery status
 *
 * This route is deliberately tolerant: it accepts both the legacy
 * `{ event, data }` envelope and OpenWA's raw payloads (`{ namespace|event,
 * data }` where the session is a plain id string). It never throws.
 */

interface NormalizedWebhook {
  event: string
  data: Record<string, unknown>
  rawData: unknown
  sessionKey?: string
}

function normalizeWebhook(body: unknown): NormalizedWebhook | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null
  const obj = body as Record<string, unknown>
  const rawData = obj.data
  const data =
    rawData && typeof rawData === "object" && !Array.isArray(rawData)
      ? (rawData as Record<string, unknown>)
      : {}
  const event = String(obj.event || obj.namespace || obj.ev || obj.type || obj.name || "")
  const sessionKey =
    data.sessionKey ||
    data.session_key ||
    data.sessionId ||
    data.session_id ||
    data.session ||
    data.instance ||
    data.clientId ||
    obj.sessionKey ||
    obj.sessionId ||
    obj.session_id ||
    undefined
  return {
    event: event.toLowerCase().trim(),
    data,
    rawData,
    sessionKey: sessionKey ? String(sessionKey) : undefined,
  }
}

function resolveSession(sessionKey?: string) {
  if (!sessionKey) return undefined
  return sessionRegistry.all().find((s) => s.session_key === sessionKey)
}

/** Extract a QR image from either the legacy or OpenWA payload shape. */
function qrValueOf(w: NormalizedWebhook): string | undefined {
  if (typeof w.rawData === "string") return w.rawData
  const d = w.data as Record<string, any>
  return (
    d.qr ||
    d.qr_code ||
    d.url ||
    d.image ||
    (typeof d.data === "string" ? d.data : undefined) ||
    d.data?.qr ||
    d.data?.data ||
    undefined
  )
}

/**
 * Forward acks to the broadcast recipient deliverability feed when Phase 5
 * has landed. Imported dynamically + guarded so this file keeps booting
 * before that lib exists.
 */
async function touchBroadcastDeliverability(
  container: any,
  messageId: string,
  ack: unknown
) {
  try {
    const mod = await import("../../../lib/whatsapp-broadcast.js")
    if (typeof mod?.handleBroadcastDeliverability === "function") {
      const status = mapAckToStatus(ack)
      await mod.handleBroadcastDeliverability?.(container, {
        waMessageId: messageId,
        ack: ack as number | string | undefined,
        ...(status ? { status } : {}),
      })
    }
  } catch (err) {
    // Phase 5 broadcast lib not present yet — safely ignore during dev.
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = normalizeWebhook(req.body)
  if (!parsed) {
    return res.status(400).json({ message: "Invalid webhook payload" })
  }

  const { event, data, sessionKey } = parsed

  try {
    // OpenWA's QRManager emits under three namespaces: plain "qr" (PNG), "qrData"
    // (raw QR string) and "qrUrl" (link code URL when ezqr is on). The forwarded
    // lifecycle payload uses the same namespace verbatim, so accept any qr*.
    if (event === "qr" || event.startsWith("qr")) {
      const session = resolveSession(sessionKey)
      if (session) {
        await updateSessionRecord(req.scope, session.id, {
          qr_code: qrValueOf(parsed),
          status: "qr_ready",
        })
      }
      return res.json({ received: true })
    }

    if (event === "status" || event === "connection_status" || event === "state") {
      const session = resolveSession(sessionKey)
      if (session) {
        await updateSessionRecord(req.scope, session.id, {
          status: (data.status as any) ?? (data.state as any) ?? session.status,
          phone_number: (data.phone as string) || (data.phone_number as string) || session.phone_number,
        })
      }
      return res.json({ received: true })
    }

    if (event === "message" || event === "onmessage") {
      if (data.isGroupMsg || data.isGroup) {
        return res.json({ received: true })
      }
      if (!sessionKey) {
        console.warn("WhatsApp inbound message had no session key — skipping:", data)
        return res.json({ received: true })
      }
      await recordChatMessage(req.scope, {
        sessionKey,
        direction: "inbound",
        body:
          (data.body as string) ||
          (typeof data.text === "string" ? (data.text as string) : undefined),
        from:
          (data.from as string) ||
          (data.sender as string) ||
          (data.remoteJid as string) ||
          undefined,
        mediaType: (data.mimeType as string) || (data.mediaType as string) || undefined,
        mediaUrl: (data.mediaUrl as string) || undefined,
        timestamp: (data.timestamp as any) || undefined,
      })
      return res.json({ received: true })
    }

    if (event === "ack" || event === "message_ack" || event === "onack") {
      const waMessageId =
        (data.messageId as string) || (data.id as string) || (data.waMessageId as string)
      const status = mapAckToStatus(data.ack)
      if (waMessageId && status) {
        await updateMessageAck(req.scope, waMessageId, status).catch((err) =>
          console.warn(`WhatsApp ack update failed for ${waMessageId}:`, err)
        )
      }
      if (waMessageId) {
        await touchBroadcastDeliverability(req.scope, waMessageId, data.ack)
      }
      return res.json({ received: true })
    }

    // Known-ignorable OpenWA lifecycle events (STARTUP, MD_* handshakes, etc.)
    if (
      event.startsWith("start") ||
      event.startsWith("md") ||
      event.startsWith("udp") ||
      event.startsWith("wa:")
    ) {
      return res.json({ received: true })
    }

    // OpenWA forwards every event (ef: *) — including lifecycle noise we don't
    // model (onmessagedeleted, onchatstatechange, battery, typing...) and
    // payloads with no event field at all. A 400 makes OpenWA treat the
    // delivery as failed, so it stops forwarding real events. Acknowledge
    // anything unknown instead; log at debug level for triage.
    console.debug("DivineKart WhatsApp webhook: unhandled event", event, parsed)
    return res.json({ received: true })
  } catch (err) {
    console.error("DivineKart WhatsApp webhook processing failed:", err)
    return res.json({ received: true })
  }
}