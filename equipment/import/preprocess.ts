import { makeErrorDiagnostic } from "./diagnostics"
import { appendJsonPointer } from "./json-pointer"
import { zhCnEnumAliases } from "./aliases"
import type { EquipmentPackImportDiagnostic } from "./types"

type PreprocessResult = {
  value: unknown
  diagnostics: EquipmentPackImportDiagnostic[]
}

type EnumAliasField = keyof typeof zhCnEnumAliases

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function hasOwnProperty(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function defineOwnEnumerableProperty(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

function cloneAndTrim(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim()
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneAndTrim(item))
  }

  if (isRecord(value)) {
    const cloned: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(value)) {
      defineOwnEnumerableProperty(cloned, key, cloneAndTrim(item))
    }

    return cloned
  }

  return value
}

function isWeaponEnumField(parentPath: string, key: string): key is EnumAliasField {
  return /^\/equipment\/weapons\/\d+$/.test(parentPath) && hasOwnProperty(zhCnEnumAliases, key)
}

function convertEnumAlias(
  value: unknown,
  path: string,
  diagnostics: EquipmentPackImportDiagnostic[],
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => convertEnumAlias(item, appendJsonPointer(path, index), diagnostics))
  }

  if (!isRecord(value)) {
    return value
  }

  const converted: Record<string, unknown> = {}

  for (const [key, item] of Object.entries(value)) {
    const childPath = appendJsonPointer(path, key)

    if (isWeaponEnumField(path, key) && typeof item === "string") {
      const aliases = zhCnEnumAliases[key]

      if (hasOwnProperty(aliases, item)) {
        defineOwnEnumerableProperty(converted, key, aliases[item as keyof typeof aliases])
        continue
      }

      if (/[\u4e00-\u9fff]/.test(item)) {
        diagnostics.push(
          makeErrorDiagnostic("INVALID_ENUM", childPath, "Unknown Chinese enum alias.", {
            value: item,
          }),
        )
        defineOwnEnumerableProperty(converted, key, item)
        continue
      }
    }

    defineOwnEnumerableProperty(converted, key, convertEnumAlias(item, childPath, diagnostics))
  }

  return converted
}

export function preprocessAuthoringInput(value: unknown): PreprocessResult {
  const diagnostics: EquipmentPackImportDiagnostic[] = []
  const trimmed = cloneAndTrim(value)
  const converted = convertEnumAlias(trimmed, "", diagnostics)

  return {
    value: converted,
    diagnostics,
  }
}
