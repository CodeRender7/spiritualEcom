import { Module } from "@medusajs/framework/utils"
import WhatsappModuleService from "./service"
import whatsappSessionLoader from "./loaders/whatsapp-session"

/**
 * The whatsapp module registers the five custom whatsapp entities with the
 * Medusa container + RemoteJoiner, making them queryable via query.graph().
 *
 * Registered in medusa-config.ts under `modules` with resolve
 * "./src/modules/whatsapp".
 *
 * `loaders` runs the session rehydration at app startup so the in-memory
 * sessionRegistry is populated from the DB before any route/subscriber/job
 * reads it. (Medusa v2 loads custom loaders through modules, not src/loaders.)
 */
const whatsappModule = Module("whatsapp", {
  service: WhatsappModuleService,
  loaders: [whatsappSessionLoader],
})

export default whatsappModule
