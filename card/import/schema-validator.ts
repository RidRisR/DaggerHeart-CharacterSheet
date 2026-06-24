import Ajv2020, { type ErrorObject } from "ajv/dist/2020"
import { cardPackV1Schema } from "./card-pack-v1.schema"
import { makeCardImportError } from "./diagnostics"
import { appendJsonPointer, getJsonPointerValue } from "./json-pointer"
import type { CardImportDiagnostic, CardImportErrorCode, CardPackV1 } from "./types"

type StructuralSchemaErrorCode = Extract<
  CardImportErrorCode,
  "INVALID_FORMAT" | "MISSING_FIELD" | "UNKNOWN_FIELD" | "INVALID_TYPE" | "INVALID_VALUE"
>

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validate = ajv.compile(cardPackV1Schema)

const keywordPriority: Record<string, number> = {
  required: 1,
  additionalProperties: 2,
  const: 3,
  enum: 4,
  type: 5,
  minimum: 6,
  maximum: 6,
  minItems: 6,
  maxItems: 6,
  minLength: 7,
}

function pathForError(error: ErrorObject): string {
  if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
    return appendJsonPointer(error.instancePath, error.params.missingProperty)
  }

  if (error.keyword === "additionalProperties" && typeof error.params.additionalProperty === "string") {
    return appendJsonPointer(error.instancePath, error.params.additionalProperty)
  }

  return error.instancePath || ""
}

function codeForError(error: ErrorObject, path: string): StructuralSchemaErrorCode {
  if (error.keyword === "required") return "MISSING_FIELD"
  if (error.keyword === "additionalProperties") return "UNKNOWN_FIELD"
  if (error.keyword === "const" && path === "/format") return "INVALID_FORMAT"
  if (error.keyword === "const" || error.keyword === "enum") return "INVALID_VALUE"
  return "INVALID_TYPE"
}

function messageForCode(code: StructuralSchemaErrorCode): string {
  return {
    INVALID_FORMAT: "Invalid card pack format.",
    MISSING_FIELD: "Required field is missing.",
    UNKNOWN_FIELD: "Unknown field is not allowed.",
    INVALID_TYPE: "Invalid field type.",
    INVALID_VALUE: "Invalid field value.",
  }[code]
}

export function validateCardPackV1Structure(
  value: unknown,
):
  | { success: true; value: CardPackV1; diagnostics: [] }
  | { success: false; diagnostics: CardImportDiagnostic[] } {
  if (validate(value)) {
    return { success: true, value: value as CardPackV1, diagnostics: [] }
  }

  const byPath = new Map<string, { priority: number; diagnostic: CardImportDiagnostic }>()

  for (const error of validate.errors ?? []) {
    const path = pathForError(error)
    const code = codeForError(error, path)
    const priority = keywordPriority[error.keyword] ?? 99
    const current = byPath.get(path)

    if (current && current.priority <= priority) continue

    byPath.set(path, {
      priority,
      diagnostic: makeCardImportError(
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
