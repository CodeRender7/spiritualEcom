import { Migration } from "@mikro-orm/migrations"

/**
 * Adds the `whatsapp_sessions` table that tracks every WhatsApp session
 * (connected number, status, QR metadata) registered through the admin panel.
 *
 * Sessions are admin-owned: only dashboard users can create/start/stop them.
 */
export class Migration20260804WhatsappSessions extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "whatsapp_sessions" (
        "id" text not null,
        "name" text not null,
        "phone_number" text null,
        "session_key" text not null,
        "status" text not null default 'disconnected',
        "qr_code" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "whatsapp_sessions_pkey" primary key ("id")
      )
    `)
    this.addSql(`create unique index if not exists "IDX_whatsapp_sessions_name" on "whatsapp_sessions" ("name")`)
    this.addSql(`create index if not exists "IDX_whatsapp_sessions_status" on "whatsapp_sessions" ("status")`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "whatsapp_sessions"`)
  }
}
