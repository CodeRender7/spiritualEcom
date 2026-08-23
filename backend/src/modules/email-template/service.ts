import { MedusaService } from "@medusajs/framework/utils"
import EmailTemplate from "./models/email-template"

/**
 * Service for the custom email-template module. Extending `MedusaService`
 * with the model registers it with the RemoteJoiner, making it queryable via
 * query.graph(...) and via the generated CRUD methods
 * (createEmailTemplates, listEmailTemplates, updateEmailTemplates,
 * deleteEmailTemplates, softDeleteEmailTemplates).
 *
 * Domain logic (placeholder parsing, template rendering, per-event
 * suggestion) lives in `src/lib/email-templates.ts` — same split as the
 * brm/whatsapp modules (thin service + logic lib).
 */
class EmailTemplateModuleService extends MedusaService({
  EmailTemplate,
}) {}

export default EmailTemplateModuleService