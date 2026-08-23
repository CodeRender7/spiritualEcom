import { MedusaService } from "@medusajs/framework/utils"
import Document from "./models/document"
import DocumentVersion from "./models/document-version"

/**
 * Service for the document issuance module (document-builder D2, ADR-0002 §9).
 *
 * Registers `document` + `document_version` with the container + RemoteJoiner,
 * exposing generated CRUD (createDocuments, listDocuments, updateDocuments,
 * softDeleteDocuments, createDocumentVersions, listDocumentVersions, …).
 *
 * Domain logic (find-or-create header, monotonic version numbering, race-safe
 * append) lives in `src/lib/document-templates.ts` (`recordDocumentIssuance`)
 * — same thin-service + logic-lib split as the brm/whatsapp/email-template
 * modules.
 */
class DocumentModuleService extends MedusaService({
  Document,
  DocumentVersion,
}) {}

export default DocumentModuleService
