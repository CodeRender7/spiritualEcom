import { Migration } from "@mikro-orm/migrations"

/**
 * Creates the versioned document issuance tables backing ADR-0002 §9
 * (document-builder D2):
 *
 *   document          — issuance header per (entity_type, entity_id, kind)
 *   document_version  — append-only immutable generation rows
 *
 * Reliability guarantees baked in at the schema level:
 *  - UNIQUE (document_id, version_number): concurrent issuers can never
 *    produce duplicate version numbers; a lost race fails loudly instead of
 *    silently overwriting.
 *  - Index on (entity_type, entity_id, kind): the hot lookup path (all versions
 *    of an order's invoice) is index-covered.
 *
 * `created_at`/`updated_at`/`deleted_at` are added by Medusa's DML layer.
 */
export class Migration20260817DocumentIssuance extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "document" (
        "id" text not null,
        "kind" text not null,
        "entity_type" text not null default 'order',
        "entity_id" text not null,
        "current_version" integer not null default 0,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "document_pkey" primary key ("id")
      )
    `)
    this.addSql(
      `create index if not exists "IDX_document_entity_kind" on "document" ("entity_type", "entity_id", "kind")`
    )
    this.addSql(`create index if not exists "IDX_document_kind" on "document" ("kind")`)

    this.addSql(`
      create table if not exists "document_version" (
        "id" text not null,
        "document_id" text not null,
        "version_number" integer not null default 1,
        "template_id" text null,
        "template_name" text null,
        "rendered_html" text null,
        "file_key" text null,
        "file_url" text null,
        "file_size" integer null,
        "generated_by" text not null default 'pipeline',
        "status" text not null default 'ready',
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "document_version_pkey" primary key ("id")
      )
    `)
    this.addSql(
      `create unique index if not exists "UQ_document_version_document_number" on "document_version" ("document_id", "version_number")`
    )
    this.addSql(
      `create index if not exists "IDX_document_version_document" on "document_version" ("document_id")`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_document_version_document"`)
    this.addSql(`drop index if exists "UQ_document_version_document_number"`)
    this.addSql(`drop table if exists "document_version"`)
    this.addSql(`drop index if exists "IDX_document_kind"`)
    this.addSql(`drop index if exists "IDX_document_entity_kind"`)
    this.addSql(`drop table if exists "document"`)
  }
}
