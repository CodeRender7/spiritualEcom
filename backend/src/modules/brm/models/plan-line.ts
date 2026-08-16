import { model } from "@medusajs/framework/utils"

/**
 * BRM plan line — a priced line attached to an offer_template (T9 schema).
 *
 * `included_qty` = the free-usage pool for usage lines; overage beyond it
 * bills as usage at period end (v1: admin-entered quantities).
 *
 * `unit_price` is in minor units (paise) — matches the repo-wide paise
 * convention (T1 unified on minor units everywhere).
 */
export default model.define("plan_line", {
  id: model.id().primaryKey(),
  offer_template_id: model.text(),
  product_id: model.text().nullable(),
  quantity: model.number().default(1),
  included_qty: model.number().default(0),
  unit_price: model.number().default(0),
  price_mode: model.text().default("flat"), // flat | quantity | tiered
  charge_type: model.text().default("recurring"), // recurring | one_time | usage
  billing_cycle_override: model.number().nullable(),
  metadata: model.json().nullable(),
})