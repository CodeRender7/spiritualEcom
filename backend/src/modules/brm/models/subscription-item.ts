import { model } from "@medusajs/framework/utils"

/**
 * BRM subscription item — per-plan-line snapshot under a subscription (T9
 * schema). Prices are frozen at purchase (unit_price snapshot) so renewals
 * re-rate from the snapshot, not the live plan_line — unless
 * billing_cycle_override changes.
 *
 * `included_qty` (copied from plan_line) is the free-usage pool; admin-entered
 * usage overage bills as usage at period end (v1 metering).
 */
export default model.define("subscription_item", {
  id: model.id().primaryKey(),
  subscription_id: model.text(),
  plan_line_id: model.text().nullable(),
  product_id: model.text().nullable(),
  quantity: model.number().default(1),
  unit_price: model.number().default(0),
  included_qty: model.number().default(0),
  used_qty: model.number().default(0),
  next_charge_at: model.dateTime().nullable(),
  status: model.text().default("active"), // active | paused | cancelled
  metadata: model.json().nullable(),
})