import { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type ReferralService = {
  listReferrals: (filters: Record<string, any>, opts?: any) => Promise<any[]>
  listReferralAttributions: (filters: Record<string, any>, opts?: any) => Promise<any[]>
}

/**
 * GET /store/referrals/me — returns the authenticated customer's referral
 * code, reward status, and conversion stats. Used by the storefront account
 * page's "Refer & Earn" section. Requires the customer session token.
 */
export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  try {
    const customerId = req.auth_context?.actor_id as string | undefined
    if (!customerId) {
      return res.status(401).json({ message: "Please login to view your referral details." })
    }

    const referrals = req.scope.resolve("referrals") as ReferralService
    const myReferrals = await referrals.listReferrals({ referrer_customer_id: customerId })

    if (myReferrals.length === 0) {
      return res.json({ referral: null, stats: { invited: 0, completed: 0 } })
    }

    const referral = myReferrals[0]
    const attributions = await referrals.listReferralAttributions({ referral_id: referral.id })

    const completed = attributions.filter((a) => a.reward_status === "completed").length
    const pending = attributions.filter((a) => a.reward_status === "pending").length

    return res.json({
      referral: {
        id: referral.id,
        code: referral.code,
        reward_code: referral.reward_code ?? null,
        reward_status: referral.reward_status,
      },
      stats: {
        invited: attributions.length,
        completed,
        pending,
      },
    })
  } catch (err) {
    console.error("Referrals /me failed:", err)
    return res.status(500).json({ message: "Could not load referral details." })
  }
}