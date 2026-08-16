import { Migration } from "@mikro-orm/migrations"

/**
 * Adds the implicit `deleted_at` soft-delete column to the three WhatsApp
 * tables that were created before Medusa's DML layer was wired up.
 *
 * Medusa's DML (`model.define(...)`) always adds `created_at`, `updated_at`
 * and `deleted_at` to the entity metadata, so every table backing a custom
 * entity must physically contain `deleted_at` (soft-delete filters like
 * `deleted_at IS NULL` are applied automatically by the query engine).
 *
 * `whatsapp_sessions` and `whatsapp_broadcasts` already have the column.
 * This migration backfills the remaining three:
 *   - whatsapp_broadcast_recipients
 *   - whatsapp_chat_messages
 *   - whatsapp_conversations
 */
export class Migration20260814WhatsappDeletedAt extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      alter table "whatsapp_broadcast_recipients"
        add column if not exists "deleted_at" timestamptz null
    `)
    this.addSql(`
      alter table "whatsapp_chat_messages"
        add column if not exists "deleted_at" timestamptz null
    `)
    this.addSql(`
      alter table "whatsapp_conversations"
        add column if not exists "deleted_at" timestamptz null
    `)
  }

  async down(): Promise<void> {
    this.addSql(`alter table "whatsapp_broadcast_recipients" drop column if exists "deleted_at"`)
    this.addSql(`alter table "whatsapp_chat_messages" drop column if exists "deleted_at"`)
    this.addSql(`alter table "whatsapp_conversations" drop column if exists "deleted_at"`)
  }
}
