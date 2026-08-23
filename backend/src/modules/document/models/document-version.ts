import { model } from "@medusajs/framework/utils"

/**
 * Immutable document version (document-builder D2, ADR-0002 §9).
 *
 * One row per generation of a document. Rows are append-only: a template edit
 * or reprint creates a NEW version; nothing ever updates an issued version's
 * rendered content. The unique (document_id, version_number) index in the
 * migration makes concurrent issuance race-safe at the DB level.
 *
 * Snapshots for reliability:
 *  - `rendered_html` — the exact HTML that produced the PDF, so any version can
 *    be regenerated if its file goes missing.
 *  - `template_name` — denormalized from the template so history stays readable
 *    even after the template is deleted.
 */
export default model.define("document_version", {
  id: model.id().primaryKey(),
  /** Parent document header id. */
  document_id: model.text(),
  /** Monotonic per-document version number starting at 1. */
  version_number: model.number().default(1),
  /** Template that produced this version (soft reference). */
  template_id: model.text().nullable(),
  template_name: model.text().nullable(),
  /** HTML snapshot with `{{key:value}}` pairs already substituted. */
  rendered_html: model.text().nullable(),
  /** Medusa File module asset (MinIO/S3 key + URL) once persisted. */
  file_key: model.text().nullable(),
  file_url: model.text().nullable(),
  file_size: model.number().nullable(),
  /** pipeline | admin | storefront | api */
  generated_by: model.text().default("pipeline"),
  /** ready | failed */
  status: model.text().default("ready"),
  metadata: model.json().nullable(),
})
