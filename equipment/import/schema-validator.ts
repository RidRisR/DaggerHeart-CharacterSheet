import Ajv2020, { type ErrorObject } from "ajv/dist/2020"
import schema from "@/public/schemas/equipment-pack.v1.schema.json"
import { makeErrorDiagnostic } from "./diagnostics"
import { appendJsonPointer, getJsonPointerValue } from "./json-pointer"
import type { EquipmentPackImportDiagnostic, EquipmentPackImportErrorCode } from "./types"

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

const keywordPriority: Record<string, number> = {
  required: 1,
  additionalProperties: 2,
  const: 3,
  enum: 4,
  maxLength: 6,
  maxItems: 7,
  type: 8,
  minimum: 8,
  integer: 8,
  minLength: 8,
  not: 8,
}

function pathForError(error: ErrorObject): string {
  if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
    return appendJsonPointer(error.instancePath, error.params.missingProperty)
  }

  if (
    error.keyword === "additionalProperties" &&
    typeof error.params.additionalProperty === "string"
  ) {
    return appendJsonPointer(error.instancePath, error.params.additionalProperty)
  }

  return error.instancePath || ""
}

function codeForError(error: ErrorObject, path: string): EquipmentPackImportErrorCode {
  if (error.keyword === "required") return "MISSING_FIELD"
  if (error.keyword === "additionalProperties") return "UNKNOWN_FIELD"
  if (error.keyword === "const" && path === "/format") return "INVALID_FORMAT"
  if (error.keyword === "enum" || error.keyword === "const") return "INVALID_ENUM"
  if (error.keyword === "maxLength") return "FIELD_TOO_LONG"
  if (error.keyword === "maxItems") return "TEMPLATE_LIMIT_EXCEEDED"
  return "INVALID_TYPE"
}

function messageForCode(code: EquipmentPackImportErrorCode): string {
  return {
    SOURCE_READ_FAILED: "Unable to read equipment pack source.",
    INVALID_JSON: "Invalid JSON.",
    INVALID_FORMAT: "Invalid equipment pack format.",
    MISSING_FIELD: "Required field is missing.",
    UNKNOWN_FIELD: "Unknown field is not allowed.",
    INVALID_TYPE: "Invalid field type or value.",
    INVALID_ENUM: "Invalid enum value.",
    DUPLICATE_ID: "Duplicate id.",
    ID_CONFLICT: "Id conflicts with existing template.",
    INVALID_CONTRIBUTION_TARGET: "Invalid contribution target.",
    EMPTY_EQUIPMENT: "Equipment pack must contain at least one template.",
    INVALID_THRESHOLD_ORDER: "Major threshold must be greater than or equal to minor threshold.",
    FILE_TOO_LARGE: "Equipment pack source is too large.",
    PACK_LIMIT_EXCEEDED: "Custom equipment pack limit exceeded.",
    TEMPLATE_LIMIT_EXCEEDED: "Template limit exceeded.",
    FIELD_TOO_LONG: "Field is too long.",
    PACK_ID_GENERATION_FAILED: "Pack id generation failed.",
    STORAGE_QUOTA_EXCEEDED: "Storage quota exceeded.",
    STORAGE_SERIALIZE_FAILED: "Storage serialization failed.",
    STORAGE_WRITE_FAILED: "Storage write failed.",
    RUNTIME_CACHE_BUILD_FAILED: "Runtime cache build failed.",
    RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID: "Runtime cache duplicate template id.",
  }[code]
}

export function validateEquipmentPackStructure(
  value: unknown,
):
  | { success: true; value: unknown; diagnostics: [] }
  | { success: false; diagnostics: EquipmentPackImportDiagnostic[] } {
  if (validate(value)) {
    return { success: true, value, diagnostics: [] }
  }

  const byPath = new Map<string, { priority: number; diagnostic: EquipmentPackImportDiagnostic }>()

  for (const error of validate.errors ?? []) {
    const path = pathForError(error)
    const code = codeForError(error, path)
    const priority = keywordPriority[error.keyword] ?? 99
    const current = byPath.get(path)

    if (current && current.priority <= priority) {
      continue
    }

    byPath.set(path, {
      priority,
      diagnostic: makeErrorDiagnostic(
        code,
        path,
        messageForCode(code),
        error.keyword === "required" ? {} : { value: getJsonPointerValue(value, path) },
      ),
    })
  }

  return {
    success: false,
    diagnostics: Array.from(byPath.values()).map((entry) => entry.diagnostic),
  }
}
