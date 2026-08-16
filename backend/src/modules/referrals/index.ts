import { Module } from "@medusajs/framework/utils"
import ReferralModuleService from "./service"

/**
 * The referrals module registers the Referral + ReferralAttribution entities
 * with the Medusa container + RemoteJoiner, making them queryable via
 * query.graph(). Registered in medusa-config.ts under `modules` with resolve
 * "./src/modules/referrals".
 */
const referralModule = Module("referrals", {
  service: ReferralModuleService,
})

export default referralModule