import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { generateDocument } from "../../../../lib/document-generator"
import { ALLOWED_DOC_KINDS } from "../../../../lib/document-templates"

const GenerateSchema = z.object({
  entity_id: z.string().min(1),
  entity_type: z.enum(["order", "subscription"]).default("order"),
  kind: z.string().refine((k) => ALLOWED_DOC_KINDS.includes(k), {
    message: "Unknown document kind",
  }),
  template_id: z.string().optional(),
})

/**
 * Manual document generation — admin override (document-builder D7/D8).
 *
 * POST /admin/documents/generate
 * { entity_id, kind, entity_type?: "order"|"subscription", template_id? }
 * → generates a NEW immutable version through the same engine pipelines use,
 * persists it, uploads the file (MinIO/local), returns the summary.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<z.infer<typeof GenerateSchema>>,
  res: MedusaResponse
) => {
  try {
    const body = (req.validatedBody ?? req.body ?? {}) as {
      entity_id?: string
      entity_type?: string
      kind?: string
      template_id?: string
    }

    const result = await generateDocument(req.scope, {
      kind: String(body.kind),
      entityId: String(body.entity_id),
      entityType: body.entity_type ?? "order",
      templateId: body.template_id || undefined,
      generatedBy: "admin",
    })

    return res.json({
      document_id: result.document.id,
      version_number: result.version.version_number,
      version_id: result.version.id,
      file_url: result.fileUrl,
      template: { id: result.template.id, name: result.template.name },
    })
  } catch (err: any) {
    console.error("Manual document generation failed:", err?.message ?? err)
    return res.status(400).json({ message: err?.message ?? String(err) })
  }
}
