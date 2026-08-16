import { Module } from "@medusajs/framework/utils"
import BrmModuleService from "./service"

/**
 * The BRM (Business Revenue Management) module registers the seven T9 billing
 * entities (offer_template, way_group, plan_line, add_on_template,
 * subscription, subscription_item, renewal_event) with the Medusa container +
 * RemoteJoiner, making them queryable via query.graph() and CRUD-able through
 * the generated service methods.
 *
 * Registered in medusa-config.ts under `modules` with resolve
 * "./src/modules/brm".
 */
const brmModule = Module("brm", {
  service: BrmModuleService,
})

export default brmModule