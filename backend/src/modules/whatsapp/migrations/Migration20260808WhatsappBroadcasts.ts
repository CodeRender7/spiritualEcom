import { Migration } from "@mikro-orm/migrations"

/**
 * Adds the `whatsapp_broadcasts` (campaign header) and
 * `whatsapp_broadcast_recipients` (per-recipient delivery rows) tables that
 * back Phase 5 WhatsApp broadcast scheduling + analytics.
 *
 * Campaigns are admin-owned: only dashboard users can create/schedule/cancel
 * them, and the scheduled dispatcher (src/jobs/whatsapp-broadcast-dispatch.ts)
 * drains due-campaign queued/scheduled recipients in-batch.
 */
export class Migration20260808WhatsappBroadcasts extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "whatsapp_broadcasts" (
        "id" text not null,
        "name" text not null,
        "session_id" text null,
        "message" text not null,
        "image_url" text null,
        "audience_type" text not null default 'manual_numbers',
        "audience_filters" jsonb null,
        "recipient_phones" jsonb null,
        "status" text not null default 'draft',
        "scheduled_at" timestamptz null,
        "started_at" timestamptz null,
        "finished_at" timestamptz null,
        "error" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "whatsapp_broadcasts_pkey" primary key ("id")
      )
    `)
    this.addSql(
      `create index if not exists "IDX_whatsapp_broadcasts_status_scheduled_at" on "whatsapp_broadcasts" ("status", "scheduled_at")`
    )
    this.addSql(
      `create index if not exists "IDX_whatsapp_broadcasts_session_id" on "whatsapp_broadcasts" ("session_id")`
    )

    this.addSql(`
      create table if not exists "whatsapp_broadcast_recipients" (
        "id" text not null,
        "broadcast_id" text not null,
        "phone" text not null,
        "customer_id" text null,
        "status" text not null default 'queued',
        "wa_message_id" text null,
        "error" text null,
        "attempted_at" timestamptz null,
        "delivered_at" timestamptz null,
        "read_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "whatsapp_broadcast_recipients_pkey" primary key ("id")
      )
    `)
    this.addSql(
      `create index if not exists "IDX_whatsapp_broadcast_recipients_broadcast_status" on "whatsapp_broadcast_recipients" ("broadcast_id", "status")`
    )
    this.addSql(
      `create index if not exists "IDX_whatsapp_broadcast_recipients_wa_message_id" on "whatsapp_broadcast_recipients" ("wa_message_id")`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "whatsapp_broadcast_recipients"`)
    this.addSql(`drop table if exists "whatsapp_broadcasts"`)
  }
}