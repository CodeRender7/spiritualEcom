import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  resolveBrmService,
  setSubscriptionStatus,
  recordUsage,
} from "../../../../../lib/brm"

/**
 * Admin BRM API — subscription by id
 * GET   /admin/brm/subscriptions/:id    → subscription + items + events
 * PATCH /admin/brm/subscriptions/:id    → { status?, note? } lifecycle (active/paused/cancelled/expired)
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brm = resolveBrmService(req.scope)
  const id = String(req.params.id)
  const [subs, items, events, templates] = await Promise.all([
    brm.listSubscriptions({ id }),
    brm.listSubscriptionItems({ subscription_id: id }),
    brm.listRenewalEvents({ subscription_id: id }),
    brm.listOfferTemplates({}),
  ])
  const sub = subs[0]
  if (!sub) return res.status(404).json({ message: "Subscription not found" })
  const template = templates.find((t: any) => t.id === sub.offer_template_id) ?? null
  return res.json({ subscription: { ...sub, template, items, events } })
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = String(req.params.id)
  const body = (req.body ?? {}) as Record<string, any>
  if (!body.status) {
    return res.status(400).json({ message: "status is required" })
  }
  try {
    const updated = await setSubscriptionStatus(req.scope, id, String(body.status), body.note)
    return res.json({ subscription: updated })
  } catch (err: any) {
    return res.status(404).json({ message: err?.message ?? String(err) })
  }
}