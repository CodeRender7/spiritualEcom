import { model } from "@medusajs/framework/utils"

/**
 * Custom entity mirroring the `whatsapp_conversations` migration table.
 *
 * Composite primary key (session_id, phone). Matches
 * Migration20260808WhatsappChat exactly, plus the `deleted_at` column added
 * by Migration20260814WhatsappDeletedAt (Medusa's DML layer requires the
 * implicit soft-delete column on every model).
 */
export default model.define("whatsapp_conversations", {
  session_id: model.text().primaryKey(),
  phone: model.text().primaryKey(),
  customer_id: model.text().nullable(),
  contact_name: model.text().nullable(),
  last_message: model.text().nullable(),
  last_direction: model.text().nullable(),
  last_message_at: model.dateTime().nullable(),
  unread_count: model.number().default(0),
  status: model.text().default("open"),
  assigned_to: model.text().nullable(),
})