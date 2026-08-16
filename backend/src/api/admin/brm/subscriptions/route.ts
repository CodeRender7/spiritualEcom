import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveBrmService, createSubscription } from "../../../../lib/brm"

/**
 * Admin BRM API — subscriptions
 * GET  /admin/brm/subscriptions?status=...&customer_id=...   → list (with items + template)
 * POST /admin/brm/subscriptions                              → create from an offer template
 *
 * POST body: { customer_id, template_id, way_group_id?, currency?,
 *              payment_method_id?, provider_payment_customer?, billing_anchor?,
 *              metadata? }
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brm = resolveBrmService(req.scope)
  const filters: Record<string, any> = {}
  if (req.query.status) filters.status = String(req.query.status)
  if (req.query.customer_id) filters.customer_id = String(req.query.customer_id)
  const subscriptions = await brm.listSubscriptions(filters)
  // Attach items + template name for a usable admin list.
  const itemsBySub = new Map<string, any[]>()
  const templateNames = new Map<string, string>()
  if (subscriptions.length) {
    const items = await brm.listSubscriptionItems({
      subscription_id: subscriptions.map((s: any) => s.id),
    })
    for (const it of items) {
      const arr = itemsBySub.get(it.subscription_id) ?? []
      arr.push(it)
      itemsBySub.set(it.subscription_id, arr)
    }
    const templateIds = [...new Set(subscriptions.map((s: any) => s.offer_template_id))]
    const templates = await brm.listOfferTemplates({ id: templateIds })
    for (const t of templates) templateNames.set(t.id, t.name)
  }
  return res.json({
    subscriptions: subscriptions.map((s: any) => ({
      ...s,
      items: itemsBySub.get(s.id) ?? [],
      template_name: templateNames.get(s.offer_template_id) ?? null,
    })),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, any>
  if (!body.customer_id || !body.template_id) {
    return res.status(400).json({ message: "customer_id and template_id are required" })
  }
  try {
    const subscription = await createSubscription(req.scope, {
      customer_id: String(body.customer_id),
      template_id: String(body.template_id),
      way_group_id: body.way_group_id ? String(body.way_group_id) : undefined,
      currency: body.currency ? String(body.currency) : undefined,
      payment_method_id: body.payment_method_id ? String(body.payment_method_id) : undefined,
      provider_payment_customer: body.provider_payment_customer
        ? String(body.provider_payment_customer)
        : undefined,
      billing_anchor: body.billing_anchor ? new Date(body.billing_anchor) : undefined,
      metadata: body.metadata ?? undefined,
    })
    return res.json({ subscription })
  } catch (err: any) {
    return res.status(400).json({ message: err?.message ?? String(err) })
  }
}