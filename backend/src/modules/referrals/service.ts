import { MedusaService } from "@medusajs/framework/utils"
import Referral from "./models/referral"
import ReferralAttribution from "./models/referral-attribution"

/**
 * Service for the custom referrals module. Extending `MedusaService` with the
 * referral models registers them with the RemoteJoiner, making them resolvable
 * through `query.graph({ entity: "referral" })` / `referral_attribution`.
 */
class ReferralModuleService extends MedusaService({
  Referral,
  ReferralAttribution,
}) {}

export default ReferralModuleService