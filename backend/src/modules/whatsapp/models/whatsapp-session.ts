import { model } from "@medusajs/framework/utils"

/**
 * Custom entity mirroring the `whatsapp_sessions` migration table so the
 * RemoteQuery / query.graph() engine can resolve it.
 *
 * Matches Migration20260804WhatsappSessions exactly. `created_at`,
 * `updated_at` and `deleted_at` are added implicitly by Medusa's DML layer.
 */
export default model.define("whatsapp_sessions", {
  id: model.text().primaryKey(),
  name: model.text(),
  phone_number: model.text().nullable(),
  session_key: model.text(),
  status: model.text().default("disconnected"),
  qr_code: model.text().nullable(),
})