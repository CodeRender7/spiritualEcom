import { model } from "@medusajs/framework/utils"

/**
 * Document issuance header (document-builder D2, ADR-0002 §9).
 *
 * One row per (entity_type, entity_id, kind) — e.g. the invoice for order
 * 000123. Regenerations do NOT mutate history: each emission appends an
 * immutable row to `document_version` and this header's `current_version`
 * advances. All prior versions stay retrievable for the same bill / receipt /
 * quote / waybill / invoice.
 *
 * `kind` mirrors the template store's doc_kind set (invoice | waybill |
 * transit_memo | receipt | e_bill | payment_receipt | quote | custom).
 */
export default model.define("document", {
  id: model.id().primaryKey(),
  /** Document kind: same closed set as the template gallery's doc_kind. */
  kind: model.text(),
  /** Owner entity type: "order" | "subscription" (extensible). */
  entity_type: model.text().default("order"),
  /** Owner entity id (order id / subscription id). */
  entity_id: model.text(),
  /** Highest issued version number (denormalized for cheap reads). */
  current_version: model.number().default(0),
  metadata: model.json().nullable(),
})
