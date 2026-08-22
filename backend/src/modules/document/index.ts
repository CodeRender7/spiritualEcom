import { Module } from "@medusajs/framework/utils"
import DocumentModuleService from "./service"

/**
 * The document module persists versioned document issuances (document-builder
 * D2, ADR-0002 §9): one `document` header per (entity_type, entity_id, kind),
 * append-only immutable `document_version` rows per generation.
 *
 * Registered in medusa-config.ts under `modules` with resolve
 * "./src/modules/document".
 */
const documentModule = Module("document", {
  service: DocumentModuleService,
})

export default documentModule
