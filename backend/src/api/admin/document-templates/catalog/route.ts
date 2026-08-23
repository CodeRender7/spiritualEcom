import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ALLOWED_DOC_KINDS,
  DOC_KIND_LABELS,
  DOC_KEY_CATALOG,
  EVENT_DOC_KEYS,
} from "../../../../lib/document-templates"

/**
 * Builder metadata for the admin template editors (document-builder D5).
 * GET /admin/document-templates/catalog → kinds, labels, grouped placeholder
 * catalog, and per-event available keys (suggestive picker data).
 */
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  return res.json({
    kinds: ALLOWED_DOC_KINDS,
    kind_labels: DOC_KIND_LABELS,
    key_catalog: DOC_KEY_CATALOG,
    event_keys: EVENT_DOC_KEYS,
    qrcode_token: {
      syntax: "{{qrcode:$key free text}}",
      description:
        "Renders a scannable QR of the payload; $key refs resolve at generation time.",
    },
  })
}
