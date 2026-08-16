import { model } from "@medusajs/framework/utils"

/**
 * A referral code belonging to a referrer customer. Every customer gets a
 * unique shareable code (auto-issued on customer.created); friends who
 * register through `/join?ref=CODE` become attributions.
 *
 * `created_at`, `updated_at` and `deleted_at` are added implicitly by Medusa's
 * DML layer; the migration provides the column defaults.
 */
export default model.define("referral", {
  id: model.id().primaryKey(),
  code: model.text(),
  referrer_customer_id: model.text(),
  source: model.text().default("storefront"),
  // Reward coupon code issued to the referrer once an invitee completes their
  // first order (real promotion created via the promotion module).
  reward_code: model.text().nullable(),
  reward_status: model.text().default("pending"),
})