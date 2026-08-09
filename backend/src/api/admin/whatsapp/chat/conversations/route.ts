import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listConversations } from "../../../../../lib/whatsapp-chat"

/**
 * Admin WhatsApp Chat Inbox API
 * GET /admin/whatsapp/chat/conversations?skip=&take=&status=&search=
 * → list conversations, newest activity first.
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const skip = Number(req.query.skip) || 0
  const take = Number(req.query.take) || 50
  const status = (req.query.status as string) || undefined
  const search = (req.query.search as string) || undefined

  const conversations = await listConversations(req.scope, { skip, take, status, search })
  return res.json({ conversations, count: conversations.length })
}