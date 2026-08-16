import { MedusaService } from "@medusajs/framework/utils"
import OfferTemplate from "./models/offer-template"
import WayGroup from "./models/way-group"
import PlanLine from "./models/plan-line"
import AddOnTemplate from "./models/add-on-template"
import Subscription from "./models/subscription"
import SubscriptionItem from "./models/subscription-item"
import RenewalEvent from "./models/renewal-event"

/**
 * Service for the custom BRM (Business Revenue Management) module. Extending
 * `MedusaService` with the seven T9 models registers them with the
 * RemoteJoiner, making them resolvable through `query.graph(...)` and via the
 * generated CRUD methods (createOfferTemplates, listSubscriptions, ...).
 *
 * Domain logic (offer resolution, lifecycle transitions, proration/grace/
 * dunning, renewal scheduling) lives in `src/lib/brm.ts` — same split as the
 * whatsapp/referrals modules (thin service + logic lib).
 */
class BrmModuleService extends MedusaService({
  OfferTemplate,
  WayGroup,
  PlanLine,
  AddOnTemplate,
  Subscription,
  SubscriptionItem,
  RenewalEvent,
}) {}

export default BrmModuleService