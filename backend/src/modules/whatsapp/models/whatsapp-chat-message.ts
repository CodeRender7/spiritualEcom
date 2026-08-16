import { model } from "@medusajs/framework/utils"

/**
 * Custom entity mirroring the `whatsapp_chat_messages` migration table.
 *
 * Matches Migration20260808WhatsappChat exactly, plus the `deleted_at`
 * column added by Migration20260814WhatsappDeletedAt (Medusa's DML layer
 * requires the implicit soft-delete column on every model).
 */
export default model.define("whatsapp_chat_messages", {
  id: model.text().primaryKey(),
  session_id: model.text(),
  direction: model.text(),
  phone: model.text(),
  customer_id: model.text().nullable(),
  contact_name: model.text().nullable(),
  body: model.text().nullable(),
  media_type: model.text().nullable(),
  media_url: model.text().nullable(),
  wa_message_id: model.text().nullable(),
  status: model.text().default("received"),
  timestamp: model.dateTime(),
})