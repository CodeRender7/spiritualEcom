import { Migration } from "@mikro-orm/migrations"

/**
 * Extends the `email_template` table into the unified template store
 * (ADR-0002 / document-builder D2):
 *
 *   email_template
 *     + format                text  default 'email'   -- email | pdf
 *     + doc_kind              text  null              -- document type for format='pdf' rows
 *     + page_size             text  null              -- A4 | A5 | Letter
 *     + page_orientation      text  null              -- portrait | landscape
 *     + page_margin           text  null              -- page margin in mm
 *     + watermark             text  null              -- optional watermark text
 *
 * Every addition is `alter table ... add column if not exists` with a default,
 * so the migration is idempotently safe and the existing email gallery (E1:
 * 13 seeded rows, CRUD, reseed) is untouched — email rows keep `format='email'`
 * and all new columns at their defaults.
 */
export class Migration20260817DocumentTemplate extends Migration {
  async up(): Promise<void> {
    this.addSql(`alter table "email_template" add column if not exists "format" text not null default 'email'`)
    this.addSql(`alter table "email_template" add column if not exists "doc_kind" text null`)
    this.addSql(`alter table "email_template" add column if not exists "page_size" text null`)
    this.addSql(`alter table "email_template" add column if not exists "page_orientation" text null`)
    this.addSql(`alter table "email_template" add column if not exists "page_margin" text null`)
    this.addSql(`alter table "email_template" add column if not exists "watermark" text null`)
    this.addSql(`create index if not exists "IDX_email_template_format" on "email_template" ("format")`)
    this.addSql(`create index if not exists "IDX_email_template_doc_kind" on "email_template" ("doc_kind")`)
  }

  async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_email_template_doc_kind"`)
    this.addSql(`drop index if exists "IDX_email_template_format"`)
    this.addSql(`alter table "email_template" drop column if exists "watermark"`)
    this.addSql(`alter table "email_template" drop column if exists "page_margin"`)
    this.addSql(`alter table "email_template" drop column if exists "page_orientation"`)
    this.addSql(`alter table "email_template" drop column if exists "page_size"`)
    this.addSql(`alter table "email_template" drop column if exists "doc_kind"`)
    this.addSql(`alter table "email_template" drop column if exists "format"`)
  }
}
