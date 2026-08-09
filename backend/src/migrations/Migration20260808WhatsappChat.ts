import { Migration } from "@mikro-orm/migrations"

/**
 * Adds the `whatsapp_chat_messages` + `whatsapp_conversations` tables that
 * back the Phase 6 WhatsApp chat support inbox.
 *
 * - Messages: one row per inbound/outbound WhatsApp message, keyed by session
 *   + normalized peer phone, with delivery status mirrored from OpenWA acks.
 * - Conversations: one row per (session, peer) thread, with unread counts and
 *   an open/resolved status so agents can triage the inbox.
 */
export class Migration20260808WhatsappChat extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "whatsapp_chat_messages" (
        "id" text not null,
        "session_id" text not null,
        "direction" text not null,
        "phone" text not null,
        "customer_id" text null,
        "contact_name" text null,
        "body" text null,
        "media_type" text null,
        "media_url" text null,
        "wa_message_id" text null,
        "status" text not null default 'received',
        "timestamp" timestamptz not null default now(),
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "whatsapp_chat_messages_pkey" primary key ("id")
      )
    `)
    this.addSql(
      `create unique index if not exists "IDX_whatsapp_chat_messages_wa_message_id" on "whatsapp_chat_messages" ("wa_message_id") where "wa_message_id" is not null`
    )
    this.addSql(
      `create index if not exists "IDX_whatsapp_chat_messages_session_phone_ts" on "whatsapp_chat_messages" ("session_id", "phone", "timestamp" desc)`
    )

    this.addSql(`
      create table if not exists "whatsapp_conversations" (
        "session_id" text not null,
        "phone" text not null,
        "customer_id" text null,
        "contact_name" text null,
        "last_message" text null,
        "last_direction" text null,
        "last_message_at" timestamptz null,
        "unread_count" integer not null default 0,
        "status" text not null default 'open',
        "assigned_to" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "whatsapp_conversations_pkey" primary key ("session_id", "phone")
      )
    `)
    this.addSql(
      `create index if not exists "IDX_whatsapp_conversations_last_message_at" on "whatsapp_conversations" ("last_message_at" desc)`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "whatsapp_chat_messages"`)
    this.addSql(`drop table if exists "whatsapp_conversations"`)
  }
}