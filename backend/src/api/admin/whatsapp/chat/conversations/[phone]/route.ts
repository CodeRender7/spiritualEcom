import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getThread,
  markConversationRead,
  resolveConversation,
} from "../../../../../../lib/whatsapp-chat"

/**
 * GET  /admin/whatsapp/chat/conversations/:phone?sessionId=
 *   → fetch the thread; also clears the unread badge on read.
 * POST /admin/whatsapp/chat/conversations/:phone  { action: "resolve" | "unresolve" }
 *   → update conversation status.
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { phone } = req.params
  const sessionId = (req.query.sessionId as string) || ""
  if (!sessionId) {
    return res.status(400).json({ message: "sessionId query param is required" })
  }

  const skip = Number(req.query.skip) || 0
  const take = Number(req.query.take) || 50

  const messages = await getThread(req.scope, sessionId, phone, { skip, take })

  await markConversationRead(req.scope, sessionId, phone).catch(() => {})

  return res.json({ messages, count: messages.length })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { phone } = req.params
  const { action } = (req.body || {}) as { action?: string }
  const sessionId = (req.body?.sessionId as string) || (req.query.sessionId as string) || ""
  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" })
  }

  if (action === "resolve" || action === "unresolve") {
    await resolveConversation(req.scope, sessionId, phone, action === "resolve")
    return res.json({ ok: true })
  }

  return res.status(400).json({ message: 'action must be "resolve" or "unresolve"' })
}