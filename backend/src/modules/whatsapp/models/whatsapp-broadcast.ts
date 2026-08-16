import { model } from "@medusajs/framework/utils"

/**
 * Custom entity mirroring the `whatsapp_broadcasts` migration table.
 *
 * Matches Migration20260808WhatsappBroadcasts exactly. `created_at`,
 * `updated_at` and `deleted_at` are added implicitly by Medusa's DML layer.
 */
export default model.define("whatsapp_broadcasts", {
  id: model.text().primaryKey(),
  name: model.text(),
  session_id: model.text().nullable(),
  message: model.text(),
  image_url: model.text().nullable(),
  audience_type: model.text().default("manual_numbers"),
  audience_filters: model.json().nullable(),
  recipient_phones: model.json().nullable(),
  status: model.text().default("draft"),
  scheduled_at: model.dateTime().nullable(),
  started_at: model.dateTime().nullable(),
  finished_at: model.dateTime().nullable(),
  error: model.text().nullable(),
})