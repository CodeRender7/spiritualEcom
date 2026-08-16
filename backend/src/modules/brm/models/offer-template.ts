import { model } from "@medusajs/framework/utils"

/**
 * BRM offer template — the admin-defined price plan (T9 schema).
 *
 * Telecom invariant: price-plan ≠ charge-plan. This row defines WHAT a plan
 * looks like (kind, interval, pricing inputs via plan_line); charging happens
 * through renewal_event snapshots, never by re-reading this row mid-cycle.
 *
 * Proration/grace/dunning knobs all live here so T10's scheduler reads them
 * per subscription:
 *   - proration: none | per_day | per_day_ceil (default none)
 *   - grace_days: 0–30 (default 3) → copied to subscription.grace_until
 *   - retry_attempts / retry_interval_days (default 3 @ 0/+3/+6)
 *   - max_cycles / auto_renew / validity_days
 */
export default model.define("offer_template", {
  id: model.id().primaryKey(),
  code: model.text(),
  name: model.text(),
  kind: model.text().default("subscription"), // one_time | subscription | hybrid
  way_group_id: model.text().nullable(),
  status: model.text().default("active"), // draft | active | archived
  billing_model: model.text().default("prepaid"), // prepaid | postpaid
  interval: model.text().default("month"), // day | week | month | year
  interval_count: model.number().default(1),
  trial_days: model.number().default(0),
  billing_anchor: model.dateTime().nullable(),
  auto_renew: model.boolean().default(true),
  max_cycles: model.number().nullable(),
  validity_days: model.number().nullable(),
  proration: model.text().default("none"), // none | per_day | per_day_ceil
  grace_days: model.number().default(3),
  retry_attempts: model.number().default(3),
  retry_interval_days: model.json().nullable(),
  discount_rule_id: model.text().nullable(),
  effective_from: model.dateTime().nullable(),
  effective_to: model.dateTime().nullable(),
  metadata: model.json().nullable(),
})