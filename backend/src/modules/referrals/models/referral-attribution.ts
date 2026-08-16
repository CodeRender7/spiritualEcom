import { model } from "@medusajs/framework/utils"

/**
 * Tracks that a specific invitee came through a specific referral code and
 * whether the referral converted (first order placed). Once the invitee's
 * first order is completed, the referrer's reward is issued and this record
 * moves to `rewarded`.
 */
export default model.define("referral_attribution", {
  id: model.id().primaryKey(),
  referral_id: model.text(),
  invitee_email: model.text(),
  invitee_customer_id: model.text().nullable(),
  attributed_order_id: model.text().nullable(),
  first_order_completed_at: model.dateTime().nullable(),
  subscription_activated_at: model.dateTime().nullable(),
  reward_status: model.text().default("pending"),
})