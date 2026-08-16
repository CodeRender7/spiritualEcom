import { model } from "@medusajs/framework/utils"

/**
 * BRM subscription — a customer's purchase snapshot of an offer_template
 * (T9 schema). Snapshots the template at purchase time so later template
 * edits don't mutate live subscriptions (price-plan ≠ charge-plan).
 *
 * Lifecycle (T9): future → trialing → active → past_due → paused → expired,
 * plus non_renewing and cancelled terminal states. Renewal auto-charge rides
 * the T7 payment router seam (T32) via renewal_event rows.
 */
export default model.define("subscription", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  offer_template_id: model.text(),
  way_group_id: model.text().nullable(),
  status: model.text().default("future"), // future|trialing|active|past_due|non_renewing|paused|expired|cancelled
  current_period_start: model.dateTime().nullable(),
  current_period_end: model.dateTime().nullable(),
  billing_anchor_date: model.dateTime().nullable(),
  cycles_remaining: model.number().nullable(),
  auto_renew: model.boolean().default(true),
  grace_until: model.dateTime().nullable(),
  currency: model.text().default("inr"),
  payment_method_id: model.text().nullable(),
  provider_payment_customer: model.text().nullable(),
  metadata: model.json().nullable(),
})