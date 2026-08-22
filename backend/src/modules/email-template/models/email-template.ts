import { model } from "@medusajs/framework/utils"

/**
 * Unified template (email-builder E1 + ADR-0002 / document-builder D2).
 *
 * One template store backs BOTH channels:
 *  - `format: "email"` (default, legacy) — email gallery template carrying the
 *    Unlayer design JSON (visual editor) and exported HTML (dispatcher render
 *    + send), a subject, and the `{{key:value}}` placeholder catalog. Behavior
 *    for these rows is unchanged from E1.
 *  - `format: "pdf"` — a document template: `doc_kind` (invoice, waybill,
 *    transit_memo, receipt, e_bill, payment_receipt, custom) selects the
 *    document type; `page_size` / `page_orientation` / `page_margin` carry the
 *    page geometry for the Puppeteer PDF engine (D4); `html` is the document
 *    body (keeps `{{key}}` placeholders) and `design` is an optional builder
 *    design the canvas editor (D5) persists.
 *
 * Consumers: the BRM notification dispatcher (brm-notify.ts) binds an event to
 * a template via `template_id` on the A5 `brm_notify.events[].email` config;
 * the document dispatcher (D7) binds pipeline stages to `format: "pdf"`
 * templates per `doc_kind` and generates the PDF (D4). The generated HTML keeps
 * `{{key:value}}` / `{{key}}` pairs intact so runtime substitution happens at
 * render time from the event's variables.
 *
 * `category` groups templates (brm / order / transactional / custom);
 * `event_key` names the process event the template is the canonical design for
 * (activated, renewal_success, order_confirmation, …) and drives the
 * suggestive per-event picker in the admin.
 */
export default model.define("email_template", {
  id: model.id().primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  category: model.text().default("custom"), // brm | order | transactional | custom
  event_key: model.text().nullable(), // process event this template is canonical for
  subject: model.text().default(""),
  /** "email" (default, legacy E1) | "pdf" (ADR-0002 document template). */
  format: model.text().default("email"),
  /**
   * Document type for `format: "pdf"` rows; null for email rows.
   * invoice | waybill | transit_memo | receipt | e_bill | payment_receipt | custom
   */
  doc_kind: model.text().nullable(),
  /** Page size for `format: "pdf"` rows: A4 | A5 | Letter. */
  page_size: model.text().nullable(),
  /** Page orientation for `format: "pdf"` rows: portrait | landscape. */
  page_orientation: model.text().nullable(),
  /** Page margin in mm for `format: "pdf"` rows. */
  page_margin: model.text().nullable(),
  /** Optional watermark text (e.g. "DRAFT") for `format: "pdf"` rows. */
  watermark: model.text().nullable(),
  design: model.json().nullable(), // Unlayer design JSON / builder design
  html: model.text().nullable(), // exported HTML (keeps {{key:value}} pairs)
  placeholders: model.json().nullable(), // [{key, value, description}]
  status: model.text().default("draft"), // draft | active | archived
  tags: model.json().nullable(),
  metadata: model.json().nullable(),
})