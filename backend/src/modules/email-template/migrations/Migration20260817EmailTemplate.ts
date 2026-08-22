import { Migration } from "@mikro-orm/migrations"

/**
 * Creates the email_template table backing the email-builder gallery
 * (`.scratch/email-builder/issues/01-email-template-store.md`, E1):
 *
 *   email_template
 *
 * Stores reusable, editable email templates: the Unlayer design JSON (visual
 * editor), the exported HTML (dispatcher render + send), subject, and the
 * `{{key:value}}` placeholder catalog. `category` groups templates
 * (brm / order / transactional / custom); `event_key` names the canonical
 * process event and drives the suggestive admin picker.
 *
 * `created_at`/`updated_at`/`deleted_at` are added by Medusa's DML layer.
 */
export class Migration20260817EmailTemplate extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "email_template" (
        "id" text not null,
        "name" text not null,
        "description" text null,
        "category" text not null default 'custom',
        "event_key" text null,
        "subject" text not null default '',
        "design" jsonb null,
        "html" text null,
        "placeholders" jsonb null,
        "status" text not null default 'draft',
        "tags" jsonb null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "email_template_pkey" primary key ("id")
      )
    `)
    this.addSql(`create index if not exists "IDX_email_template_category" on "email_template" ("category")`)
    this.addSql(`create index if not exists "IDX_email_template_event_key" on "email_template" ("event_key")`)
    this.addSql(`create index if not exists "IDX_email_template_status" on "email_template" ("status")`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "email_template"`)
  }
}