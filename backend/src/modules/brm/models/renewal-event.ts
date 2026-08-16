import { model } from "@medusajs/framework/utils"

/**
 * BRM renewal event — one charge attempt (or usage billing) per period end
 * (T9 schema). This is the audit + retry log: each dunning retry writes a
 * fresh row with status/amount/payment_id so the full retry chain is
 * replayable and inspectable.
 *
 * Rides the T7 payment router seam (T32) for actual charge attempts.
 */
export default model.define("renewal_event", {
  id: model.id().primaryKey(),
  subscription_id: model.text(),
  period_start: model.dateTime().nullable(),
  period_end: model.dateTime().nullable(),
  amount: model.number().default(0),
  kind: model.text().default("renewal"), // renewal | usage | add_on
  payment_id: model.text().nullable(),
  attempt: model.number().default(1),
  status: model.text().default("pending"), // pending|succeeded|failed|skipped
  error: model.text().nullable(),
  metadata: model.json().nullable(),
})