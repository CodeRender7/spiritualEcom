import { Module } from "@medusajs/framework/utils"
import EmailTemplateModuleService from "./service"

/**
 * The email-template module registers the gallery entity with the Medusa
 * container + RemoteJoiner, making templates queryable and CRUD-able through
 * the generated service methods (email-builder map, E1).
 *
 * Registered in medusa-config.ts under `modules` with resolve
 * "./src/modules/email-template".
 */
const emailTemplateModule = Module("email_template", {
  service: EmailTemplateModuleService,
})

export default emailTemplateModule