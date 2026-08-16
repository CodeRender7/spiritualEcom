import { model } from "@medusajs/framework/utils"

/**
 * Custom entity mirroring the `whatsapp_broadcast_recipients` migration table.
 *
 * Matches Migration20260808WhatsappBroadcasts exactly, plus the
 * `deleted_at` column added by Migration20260814WhatsappDeletedAt (Medusa's
 * DML layer requires the implicit soft-delete column on every model).
 */
export default model.define("whatsapp_broadcast_recipients", {
  id: model.text().primaryKey(),
  broadcast_id: model.text(),
  phone: model.text(),
  customer_id: model.text().nullable(),
  status: model.text().default("queued"),
  wa_message_id: model.text().nullable(),
  error: model.text().nullable(),
  attempted_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),
  read_at: model.dateTime().nullable(),
})