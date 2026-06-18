import { describe, expect, expectTypeOf, it } from "vitest"
import { appendJsonPointer, escapeJsonPointerSegment, getJsonPointerValue, joinJsonPointer } from "@/card/import/json-pointer"
import {
  countCardImportDiagnostics,
  makeCardImportError,
  makeCardImportWarning,
  makeDiagnostic,
} from "@/card/import/diagnostics"
import type {
  CardPackDryRunValidationModel,
  ImportDryRunReport,
  PackAdapter,
  PackSourceDescriptor,
  PackSourceKind,
  PackValidator,
} from "@/card/import/types"

describe("card import diagnostics", () => {
  it("builds diagnostics and counts severities", () => {
    const diagnostics = [
      makeCardImportError("INVALID_JSON", "", "Invalid JSON."),
      makeCardImportWarning("LEGACY_FORMAT_ASSUMED", "", "No format field; using legacy card format."),
      makeDiagnostic("warning", "VARIANT_TYPES_DERIVED", "/definitions", "Variant types derived."),
    ]

    expect(countCardImportDiagnostics(diagnostics)).toEqual({ errorCount: 1, warningCount: 2 })
    expect(diagnostics[0]).toMatchObject({ severity: "error", code: "INVALID_JSON", path: "" })
    expect(diagnostics[1]).toMatchObject({ severity: "warning", code: "LEGACY_FORMAT_ASSUMED", path: "" })
    expect(diagnostics[2]).toMatchObject({ severity: "warning", code: "VARIANT_TYPES_DERIVED", path: "/definitions" })
  })

  it("handles json pointer append and lookup", () => {
    const value = { classes: [{ name: "战士" }] }

    expect(appendJsonPointer("", "classes")).toBe("/classes")
    expect(appendJsonPointer("/classes", 0)).toBe("/classes/0")
    expect(getJsonPointerValue(value, "/classes/0/name")).toBe("战士")
    expect(getJsonPointerValue(value, "/missing")).toBeUndefined()
  })

  it("escapes and joins json pointer segments", () => {
    const value = { "a/b": { "~key": ["zero"] } }

    expect(escapeJsonPointerSegment("a/b~c")).toBe("a~1b~0c")
    expect(joinJsonPointer(["a/b", "~key", 0])).toBe("/a~1b/~0key/0")
    expect(appendJsonPointer("/a~1b", "~key")).toBe("/a~1b/~0key")
    expect(getJsonPointerValue(value, "/a~1b/~0key/0")).toBe("zero")
  })

  it("handles root lookup and invalid paths", () => {
    const value = { "": "empty-key", nested: true }

    expect(getJsonPointerValue(value, "")).toBe(value)
    expect(getJsonPointerValue(value, "/")).toBe("empty-key")
    expect(getJsonPointerValue(value, "nested")).toBeUndefined()
    expect(getJsonPointerValue(value, "#/nested")).toBeUndefined()
  })

  it("does not coerce invalid array segments into indexes", () => {
    const value = { items: ["zero", "one"], object: { "01": "literal" } }

    expect(getJsonPointerValue(value, "/items/0")).toBe("zero")
    expect(getJsonPointerValue(value, "/items/1")).toBe("one")
    expect(getJsonPointerValue(value, "/items/01")).toBeUndefined()
    expect(getJsonPointerValue(value, "/items/")).toBeUndefined()
    expect(getJsonPointerValue(value, "/items/-1")).toBeUndefined()
    expect(getJsonPointerValue(value, "/items/1.0")).toBeUndefined()
    expect(getJsonPointerValue(value, "/object/01")).toBe("literal")
  })

  it("exposes dry-run source adapter and validator core contracts", async () => {
    const sourceKind: PackSourceKind = "localStorage"
    const source: PackSourceDescriptor = {
      kind: sourceKind,
      label: "Saved pack",
      storageKey: "cards:pack",
      sizeBytes: 128,
    }
    const warning = makeCardImportWarning("DEFINITIONS_DERIVED", "/definitions", "Definitions derived.")
    const normalizedPack = { cards: [] }
    const report: ImportDryRunReport<typeof normalizedPack> = {
      ok: true,
      errors: [],
      warnings: [warning],
      normalizedPack,
    }
    const adapter: PackAdapter<unknown, typeof normalizedPack> = {
      fromFormat: "legacy",
      toFormat: "daggerheart.card-pack.v1",
      adapt(value, descriptor) {
        expect(value).toEqual({ raw: true })
        expect(descriptor.kind).toBe("localStorage")
        return report
      },
    }
    const validator: PackValidator<typeof normalizedPack, typeof normalizedPack> = {
      validate(pack, descriptor) {
        expect(pack).toBe(normalizedPack)
        expect(descriptor.storageKey).toBe("cards:pack")
        return report
      },
    }

    expectTypeOf<ImportDryRunReport<CardPackDryRunValidationModel>>().toHaveProperty("ok").toEqualTypeOf<boolean>()
    expect(await adapter.adapt({ raw: true }, source)).toBe(report)
    expect(await validator.validate(normalizedPack, source)).toBe(report)
  })
})
