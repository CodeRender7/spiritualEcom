import { MedusaService } from "@medusajs/framework/utils"
import WhatsappSession from "./models/whatsapp-session"
import WhatsappBroadcast from "./models/whatsapp-broadcast"
import WhatsappBroadcastRecipient from "./models/whatsapp-broadcast-recipient"
import WhatsappChatMessage from "./models/whatsapp-chat-message"
import WhatsappConversation from "./models/whatsapp-conversation"

/**
 * Service for the custom whatsapp module. Extending `MedusaService` with the
 * five whatsapp models registers them with the RemoteJoiner, which makes the
 * entities resolvable through `query.graph({ entity: "whatsapp_*" })`.
 */
class WhatsappModuleService extends MedusaService({
  WhatsappSession,
  WhatsappBroadcast,
  WhatsappBroadcastRecipient,
  WhatsappChatMessage,
  WhatsappConversation,
}) {}

export default WhatsappModuleService
