import { model } from "@medusajs/framework/utils"

/**
 * BRM way group — a named set of 4 attribute filters ("ways") that gate which
 * offer_templates a customer sees at offer resolution (T9 decision).
 *
 * A "way" is an attribute-filter row, not an entity kind. Each dimension
 * defaults to "any" (null = wildcard). All four evaluate together; a template
 * whose way_group_id matches wins for that customer context.
 *
 *   - provider:       payment provider actually chosen at checkout (T6/T7 id)
 *   - plan_family:    from sale_type / plan kind (one_time | subscription ...)
 *   - payment_method: the payment method type (card | upi | wallet | cod ...)
 *   - region:         cart region id (cart.region_id)
 */
export default model.define("way_group", {
  id: model.id().primaryKey(),
  code: model.text(),
  name: model.text(),
  provider: model.text().nullable(),
  plan_family: model.text().nullable(),
  payment_method: model.text().nullable(),
  region: model.text().nullable(),
  priority: model.number().default(100),
  status: model.text().default("active"), // active | inactive
  metadata: model.json().nullable(),
})