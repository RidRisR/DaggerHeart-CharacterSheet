#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const rootDir = path.join(__dirname, "..")

const paths = {
  canonicalEquipmentSchema: path.join(rootDir, "public/schemas/equipment-pack.v1.schema.json"),
  equipmentAiPromptSource: path.join(rootDir, "public/自定义装备包指南和示例/AI-装备包生成提示词.md"),
  equipmentAiPromptWithSchema: path.join(rootDir, "public/自定义装备包指南和示例/AI-装备包生成提示词-含Schema.md"),
  equipmentSchemaCopy: path.join(rootDir, "public/自定义装备包指南和示例/equipment-pack.v1.schema.json"),
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function writeIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? readUtf8(filePath) : null

  if (current === content) {
    return false
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, "utf8")
  return true
}

function readPrettyJson(filePath) {
  const raw = readUtf8(filePath)
  return `${JSON.stringify(JSON.parse(raw), null, 2)}\n`
}

function buildPromptWithSchema(promptSource, schemaJson) {
  return `${promptSource.trimEnd()}

---

## 附录：装备包 JSON Schema

以下 Schema 来自 \`public/schemas/equipment-pack.v1.schema.json\`。当你把这份提示词交给 AI 时，可以要求 AI 以此作为最终结构约束。

\`\`\`json
${schemaJson.trimEnd()}
\`\`\`
`
}

function main() {
  const results = generateGuideAssets(paths)

  for (const result of results) {
    const status = result.changed ? "generated" : "unchanged"
    console.log(`Guide asset ${status}: ${path.relative(rootDir, result.filePath)}`)
  }
}

function generateGuideAssets(assetPaths) {
  const equipmentSchemaJson = readPrettyJson(assetPaths.canonicalEquipmentSchema)
  const equipmentAiPromptSource = readUtf8(assetPaths.equipmentAiPromptSource)

  return [
    {
      filePath: assetPaths.equipmentSchemaCopy,
      changed: writeIfChanged(assetPaths.equipmentSchemaCopy, equipmentSchemaJson),
    },
    {
      filePath: assetPaths.equipmentAiPromptWithSchema,
      changed: writeIfChanged(
        assetPaths.equipmentAiPromptWithSchema,
        buildPromptWithSchema(equipmentAiPromptSource, equipmentSchemaJson),
      ),
    },
  ]
}

if (require.main === module) {
  main()
}

module.exports = {
  buildPromptWithSchema,
  generateGuideAssets,
  paths,
}
