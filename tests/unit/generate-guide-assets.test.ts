import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { afterEach, describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const { buildPromptWithSchema, generateGuideAssets } = require("../../scripts/generate-guide-assets.js")

const tempDirs: string[] = []

function createTempDir() {
  const tempDir = mkdtempSync(path.join(tmpdir(), "guide-assets-"))
  tempDirs.push(tempDir)
  return tempDir
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

describe("generate guide assets", () => {
  it("appends the equipment schema as a fenced appendix to the AI prompt", () => {
    const result = buildPromptWithSchema("# Prompt\n\nUse this.\n\n", '{\n  "format": "schema"\n}\n')

    expect(result).toBe(`# Prompt

Use this.

---

## 附录：装备包 JSON Schema

以下 Schema 来自 \`public/schemas/equipment-pack.v1.schema.json\`。当你把这份提示词交给 AI 时，可以要求 AI 以此作为最终结构约束。

\`\`\`json
{
  "format": "schema"
}
\`\`\`
`)
  })

  it("generates the schema copy and schema-appended AI prompt from the canonical schema", () => {
    const tempDir = createTempDir()
    const canonicalEquipmentSchema = path.join(tempDir, "schema.json")
    const equipmentAiPromptSource = path.join(tempDir, "prompt.md")
    const equipmentSchemaCopy = path.join(tempDir, "public", "equipment-pack.v1.schema.json")
    const equipmentAiPromptWithSchema = path.join(tempDir, "public", "prompt-with-schema.md")

    writeFileSync(canonicalEquipmentSchema, '{"title":"Equipment Schema","properties":{"format":{"const":"daggerheart.equipment-pack.v1"}}}')
    writeFileSync(equipmentAiPromptSource, "# AI Prompt\n\nGenerate valid equipment JSON.\n")

    const firstResult = generateGuideAssets({
      canonicalEquipmentSchema,
      equipmentAiPromptSource,
      equipmentAiPromptWithSchema,
      equipmentSchemaCopy,
    })

    expect(firstResult).toEqual([
      { filePath: equipmentSchemaCopy, changed: true },
      { filePath: equipmentAiPromptWithSchema, changed: true },
    ])
    expect(readFileSync(equipmentSchemaCopy, "utf8")).toBe(`{
  "title": "Equipment Schema",
  "properties": {
    "format": {
      "const": "daggerheart.equipment-pack.v1"
    }
  }
}
`)
    expect(readFileSync(equipmentAiPromptWithSchema, "utf8")).toContain("# AI Prompt\n\nGenerate valid equipment JSON.\n\n---")
    expect(readFileSync(equipmentAiPromptWithSchema, "utf8")).toContain("## 附录：装备包 JSON Schema")
    expect(readFileSync(equipmentAiPromptWithSchema, "utf8")).toContain('"const": "daggerheart.equipment-pack.v1"')

    const secondResult = generateGuideAssets({
      canonicalEquipmentSchema,
      equipmentAiPromptSource,
      equipmentAiPromptWithSchema,
      equipmentSchemaCopy,
    })

    expect(secondResult).toEqual([
      { filePath: equipmentSchemaCopy, changed: false },
      { filePath: equipmentAiPromptWithSchema, changed: false },
    ])
  })
})
