import { makeCardImportError } from "./diagnostics"
import { appendJsonPointer } from "./json-pointer"
import type { CardImportDiagnostic } from "./types"

type RawRecord = Record<string, unknown>

const legacyCardGroups = ["profession", "ancestry", "community", "subclass", "domain", "variant"] as const
const definitionLists = ["professions", "classes", "ancestries", "communities", "domains", "variants"] as const

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function invalidType(path: string, value: unknown): CardImportDiagnostic {
  return makeCardImportError("INVALID_TYPE", path, "Invalid legacy card pack field type.", { value })
}

function invalidValue(path: string, value: unknown): CardImportDiagnostic {
  return makeCardImportError("INVALID_VALUE", path, "Invalid legacy card pack field value.", { value })
}

function validateListContainer(value: unknown, path: string, diagnostics: CardImportDiagnostic[]) {
  if (!Array.isArray(value)) {
    diagnostics.push(invalidType(path, value))
  }
}

function validateLevelRange(value: unknown, path: string, diagnostics: CardImportDiagnostic[]) {
  if (!Array.isArray(value)) {
    diagnostics.push(invalidType(path, value))
    return
  }

  if (value.length !== 2) {
    diagnostics.push(invalidValue(path, value))
    return
  }

  value.forEach((item, index) => {
    if (typeof item !== "number") diagnostics.push(invalidType(appendJsonPointer(path, index), item))
  })
}

function validateCustomFieldDefinitions(value: unknown, diagnostics: CardImportDiagnostic[]) {
  const path = "/customFieldDefinitions"

  if (!isRecord(value)) {
    diagnostics.push(invalidType(path, value))
    return
  }

  for (const key of definitionLists) {
    if (key in value) validateListContainer(value[key], appendJsonPointer(path, key), diagnostics)
  }

  if (!("variantTypes" in value)) return

  const variantTypesPath = appendJsonPointer(path, "variantTypes")
  const variantTypes = value.variantTypes
  if (!isRecord(variantTypes)) {
    diagnostics.push(invalidType(variantTypesPath, variantTypes))
    return
  }

  for (const [type, definition] of Object.entries(variantTypes)) {
    const typePath = appendJsonPointer(variantTypesPath, type)

    if (!isRecord(definition)) {
      diagnostics.push(invalidType(typePath, definition))
      continue
    }

    if ("subclasses" in definition) {
      validateListContainer(definition.subclasses, appendJsonPointer(typePath, "subclasses"), diagnostics)
    }

    if ("levelRange" in definition) {
      validateLevelRange(definition.levelRange, appendJsonPointer(typePath, "levelRange"), diagnostics)
    }
  }
}

export function validateLegacyExternalContract(
  input: unknown,
): { success: true; value: RawRecord; diagnostics: [] } | { success: false; diagnostics: CardImportDiagnostic[] } {
  if (!isRecord(input)) {
    return { success: false, diagnostics: [invalidType("", input)] }
  }

  const diagnostics: CardImportDiagnostic[] = []

  for (const group of legacyCardGroups) {
    if (!(group in input)) continue

    const value = input[group]
    const groupPath = appendJsonPointer("", group)

    if (!Array.isArray(value)) {
      diagnostics.push(invalidType(groupPath, value))
      continue
    }

    value.forEach((item, index) => {
      if (!isRecord(item)) diagnostics.push(invalidType(appendJsonPointer(groupPath, index), item))
    })
  }

  if ("customFieldDefinitions" in input) {
    validateCustomFieldDefinitions(input.customFieldDefinitions, diagnostics)
  }

  return diagnostics.length > 0 ? { success: false, diagnostics } : { success: true, value: input, diagnostics: [] }
}
