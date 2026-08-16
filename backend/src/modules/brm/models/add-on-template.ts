import { model } from "@medusajs/framework/utils"

/**
 * BRM add-on template — the "top-up/voucher" (T9 schema).
 *
 * Telecom invariant kept: recharge ≠ top-up. An add-on is an instant credit
 * purchase tied to an offer_template; it NEVER touches the base subscription's
 * subscription_item. Add-ons bill independently (one_time charge_type rows).
 */
export default model.define("add_on_template", {
  id: model.id().primaryKey(),
  code: model.text(),
  name: model.text(),
  offer_template_id: model.text(),
  product_id: model.text().nullable(),
  charge_type: model.text().default("one_time"), // one_time | usage
  unit_price: model.number().default(0),
  quantity: model.number().default(1),
  billing_cycles: model.number().nullable(),
  metadata: model.json().nullable(),
})