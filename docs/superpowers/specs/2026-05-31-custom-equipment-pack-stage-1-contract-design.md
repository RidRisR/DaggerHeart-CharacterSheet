# 自定义装备卡包系统阶段 1：公开契约与 Canonical 类型细化

日期：2026-05-31
状态：已完成，待执行
上游设计：`2026-05-30-custom-equipment-pack-system-phased-design.md`

## 阶段目标

阶段 1 只负责把第三方装备包的公开 JSON 契约和系统内部 canonical 类型定义清楚，直到后续可以直接进入导入 pipeline 的实现设计。

阶段 1 不实现存储、registry、sheet store integration 或 UI。

## 已确认决策

### 术语归属

内容包导入系统使用独立术语上下文，不和自动化系统术语混写。

- 根目录 `CONTEXT.md` 作为领域上下文索引。
- 自动化和修正计算术语归属 `docs/contexts/modifiers/CONTEXT.md`。
- 内容包、卡包、装备包、schema、导入 pipeline、diagnostics、registry、storage transaction 等术语归属 `docs/contexts/content-pack-import/CONTEXT.md`。
- 装备包模板本身不是自动化来源；只有模板被实例化到角色表装备槽之后，才通过角色表装备数据影响自动化。

### JSON Schema 是公开结构契约

装备包第一版应提供公开 JSON Schema，作为第三方作者、编辑器、AI 生成工具和外部校验工具使用的结构契约。

JSON Schema 负责结构层规则：

- 顶层对象形状。
- 必填字段。
- 字段类型。
- 未知字段禁止。
- 英文 canonical 枚举允许值。
- 字符串长度。
- 数组长度。
- `format` 固定值。
- `version` 基础格式。

### 内部导入仍采用分层校验

JSON Schema 不是整个导入系统的唯一校验层。完整导入路径仍然分层：

```text
Source Read
  -> JSON Parse
  -> Authoring Preprocess
  -> Structural Validation
  -> Canonical Normalize
  -> Semantic Validation
  -> Conflict Check
  -> Stage Import Data
  -> Build Commit Plan
  -> Storage Transaction
  -> Runtime Cache Build
  -> Result Mapping
```

各层职责：

- Source Read：从 file/object/builtin/container source 读取原始输入。
- JSON Parse：将文本 JSON 转成 unknown object；parse 失败产生 `INVALID_JSON`。
- Authoring Preprocess：执行输入便利层，例如 zh-CN 枚举 alias 转英文 canonical、字符串首尾 trim；不补业务默认值、不猜测修复。
- Structural Validation：使用 AJV 执行核心 Public Schema，检查字段、类型、必填、未知字段、英文 canonical enum、长度和数组形状。
- Canonical Normalize：生成内部 canonical model，并补显式默认值。
- Semantic Validation：检查 schema 不负责的业务规则。
- Conflict Check：检查与当前系统状态相关的冲突。
- Stage Import Data：在内存中构造 staged import / commit draft，但不生成最终 storage identity，不写 storage 或 store state。
- Build Commit Plan：由 Application Service 生成最终 `packId`、`importedAt` 和 lifecycle metadata，构造 final commit plan。
- Storage Transaction：保证提交成功或完整回滚。
- Runtime Cache Build：只在 storage transaction 成功后重建 stable runtime cache/query index。
- Result Mapping：返回统一 import result 和 diagnostics。

### TypeScript 类型是内部 canonical 模型

TypeScript 类型描述 normalize 之后的系统内部模型，不直接等同于外部输入模型。

外部输入模型可以接受受控中文枚举 alias；内部 canonical 类型只保存英文 canonical 值。

### Diagnostics 由导入 pipeline 统一输出

JSON Schema validator、normalize、semantic validation 和 conflict check 的错误都必须被映射成统一结构化 diagnostics：

```ts
type EquipmentPackImportDiagnostic =
  | {
      severity: "error"
      code: EquipmentPackImportErrorCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
  | {
      severity: "warning"
      code: EquipmentPackImportWarningCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
```

Schema validator 的原始错误不能直接泄漏为 UI 最终格式。

### Template ID 沿用卡牌包作者习惯

装备模板 `id` 采用和现有卡牌包相同的作者心智模型：

```text
包名-作者-类型-标识
```

示例：

```text
我的装备包-作者名-weapon-影刃
我的装备包-作者名-armor-影织甲
witchpack-author-weapon-shadow-dagger
witchpack-author-armor-shadow-weave
```

原则：

- `id` 必填。
- `id` 是模板稳定身份，不是运行时实例 id。
- 同一装备包内所有 weapon 和 armor 的 `id` 必须全局唯一。
- 自定义装备模板 `id` 不能与内置装备或已导入自定义装备模板冲突。
- 官方示例优先使用 ASCII slug，方便文件名、调试、外部工具和未来引用。
- 为了保持与现有卡牌包习惯一致，第一版允许中文 `id`。
- 第一版不要求 `id` 不包含版本号，但官方指南应建议不要在 `id` 中包含内容版本号，避免同一模板升级后失去稳定身份。

Schema 层限制：

- `id` 必须是字符串。
- normalize 后 trim 不能为空。
- 长度不超过 160 个字符。
- 不允许控制字符。
- 不允许 `/`、`\`，避免未来路径、资源文件或容器格式引用产生歧义。

语义层限制：

- 模板 id 重复是 `DUPLICATE_ID`。
- 与内置或已导入模板冲突是 `ID_CONFLICT`。
- disabled pack 中的模板 id 仍参与冲突检查。

### Content Version 使用严格 SemVer，允许 prerelease

顶层 `version` 是内容包作者维护的内容版本，采用严格 SemVer。

允许：

```text
1.0.0
1.0.0-beta.1
2.3.0-rc.2
1.0.0+build.1
```

不允许：

```text
1
1.0
v1.0.0
2026.05.31
```

原则：

- prerelease 版本允许用于测试包、预发布包和社区协作。
- 第一版不要求 `version` 参与自动更新或覆盖策略。
- 重复导入仍按模板 id 冲突拒绝，不因为 `version` 更高而自动覆盖。
- `version` 只描述内容版本，不描述 schema 或 format 版本；format 版本由顶层 `format` 表达。

### JSON Schema 单真源放在 public

第一版装备包 JSON Schema 只维护一份：

```text
public/schemas/equipment-pack.v1.schema.json
```

原则：

- 这份文件是公开结构契约的单真源。
- 运行时 validator、测试和作者指南都引用这一份 schema。
- 不在源码目录或 `schemas/` 目录维护第二份 schema。
- `public/` 下的 schema 被视为产品公开资产，允许未来通过稳定 URL 被第三方作者、AI 工具和编辑器读取。
- 后续如需构建产物、npm 包或独立 schema bundle，必须从这一份单真源派生，不能手写复制。

### Runtime Structural Validation 使用 AJV

阶段 2 实现导入 pipeline 时，使用 AJV 消费 `public/schemas/equipment-pack.v1.schema.json` 做结构校验。

AJV 职责：

- 执行 JSON Schema structural validation。
- 检查字段、类型、必填、未知字段、枚举、长度、数组数量和基础格式。
- 产出原始 validation errors，供导入 pipeline 映射。

AJV 不负责：

- 中文 alias normalize。
- canonical model 构建。
- id 冲突检查。
- 与当前 storage state 相关的限制。
- storage transaction。
- runtime cache build。
- UI 展示文案。

规则：

- AJV error 不能直接作为最终 UI/API 输出。
- 导入 pipeline 必须把 AJV error 映射为 `EquipmentPackImportDiagnostic`。
- 如果项目当前没有直接依赖 `ajv`，实现阶段应把 `ajv` 作为明确依赖加入，而不是隐式依赖传递依赖。

后续方向：

- 卡牌包导入未来也可以沿用同一套 Public Schema + AJV + structured diagnostics + storage transaction 模式。
- 卡牌包导入重构不进入自定义装备包第一版范围。

### 中文枚举 Alias 只属于外部输入

受控中文枚举 alias 只允许出现在外部装备包 JSON 输入中，不进入核心 Public Schema 的 enum 列表。核心 schema 只接受英文 canonical 枚举值。

字段名必须始终保持英文，不支持中文字段名 alias。用户可见文本内容可以是中文，例如 `name`、`author`、`description`、`featureName`、`editable.label`。

边界：

- 字段名：只允许英文 schema 字段名。
- 用户可见文本内容：允许中文或其他自然语言文本。
- 枚举值：推荐英文 canonical；第一版允许受控中文 alias，经 `zh-CN authoring adapter` 转换。

允许的外部输入示例：

```json
{
  "trait": "敏捷",
  "damageType": "物理",
  "range": "近战",
  "burden": "单手"
}
```

normalize 后 canonical model：

```json
{
  "trait": "agility",
  "damageType": "physical",
  "range": "melee",
  "burden": "oneHanded"
}
```

导入顺序：

```text
raw JSON
  -> trim preprocess
  -> zh-CN authoring alias adapter
  -> core JSON Schema validation
  -> canonical model normalize
  -> semantic validation
```

规则：

- `public/schemas/equipment-pack.v1.schema.json` 只接受英文 canonical enum。
- 中文 alias 属于 `zh-CN authoring adapter`，不是核心格式契约的一部分。
- `zh-CN authoring adapter` 只能处理显式白名单中的枚举值，不能猜测、翻译或模糊匹配。
- `zh-CN authoring adapter` 不处理中文字段名。
- 第一版不增加顶层 locale 字段。
- adapter 不根据系统语言、浏览器语言或用户设置改变导入行为。
- adapter 在 trim 后按枚举字段值逐个判断：英文 canonical 保持不变，白名单中文 alias 转换为英文 canonical。
- 同一个装备包中英文枚举值混用是允许的；normalize 后必须全部变成英文 canonical。
- storage 不保存中文枚举 alias。
- runtime cache/query 不返回中文枚举 alias。
- template-to-slot 前的 domain data 使用英文 canonical 值。
- UI 中文显示由 label mapper 负责。
- 测试 fixture 可以包含中文 alias 输入，但 normalize 输出断言必须是英文 canonical。
- 未知中文枚举值和未知英文枚举值都属于 hard error。
- 如果未来需要让中文作者在外部编辑器中也获得无报错体验，可以新增 `public/schemas/equipment-pack.v1.zh-CN.schema.json` 作为 authoring schema；它不是核心 canonical schema。

### Equipment 数组规则

顶层 `equipment` 必填。

`equipment.weapons` 和 `equipment.armor` 可选，允许只提供武器包或只提供护甲包。

合法：

```json
{
  "equipment": {
    "weapons": [{ "...": "..." }]
  }
}
```

```json
{
  "equipment": {
    "armor": [{ "...": "..." }]
  }
}
```

```json
{
  "equipment": {
    "weapons": [],
    "armor": [{ "...": "..." }]
  }
}
```

非法：

```json
{
  "equipment": {}
}
```

```json
{
  "equipment": {
    "weapons": [],
    "armor": []
  }
}
```

职责划分：

- Schema validation 检查 `equipment` 必填、`weapons`/`armor` 如果存在必须是数组、数组元素必须符合对应模板结构。
- Normalize 将缺失的 `weapons` 或 `armor` 补成 `[]`。
- Semantic validation 检查 normalize 后 `weapons.length + armor.length > 0`。
- 空装备包产生 `EMPTY_EQUIPMENT` hard error。

### 字符串 Trim 规则

所有字符串字段在进入 core schema validation 前先做首尾 trim。

导入顺序：

```text
raw JSON
  -> trim preprocess
  -> zh-CN authoring alias adapter
  -> core JSON Schema validation
  -> canonical model normalize
  -> semantic validation
```

规则：

- 只 trim 字符串首尾空白。
- 不处理字符串内部空格、换行或缩进。
- `"  影刃  "` trim 成 `"影刃"`，导入成功且不产生 warning。
- `"   "` trim 成 `""`，如果字段必填或要求非空，则 hard error。
- description 内部换行和 Markdown 缩进保留，只 trim 首尾空白。
- storage 保存 trim 后的值。
- trim 不产生 `TRIMMED_STRING` warning。

### Modifier Contributions 默认值规则

`modifierContributions` 在外部输入中可选。canonical model 中必须始终存在，缺失时由 normalize 补成 `[]`。

规则：

- 外部输入可以省略 `modifierContributions`。
- 如果出现，必须是数组。
- `modifierContributions: []` 合法。
- `modifierContributions: null` 不合法。
- 数组元素必须符合 contribution template schema。
- 每个 contribution 的 `definition.target` 必须属于装备允许目标。
- 每个 contribution 的 `definition.kind` 第一版只能是 `"modifier"`。
- 每个装备模板内的 contribution id 必须唯一。
- normalize 后 weapon/armor template 必须始终包含 `modifierContributions: EquipmentModifierContributionTemplate[]`。

### Weapon Damage 字段规则

第一版不校验 `damage` 字符串是否是合法骰子表达式。

规则：

- `damage` 必填。
- trim 后必须非空。
- 最大长度 40。
- 不允许 `null`。
- 不解析、不计算、不标准化内部格式。
- 官方示例推荐 `d8`、`d10+3` 等写法，但它们不是唯一合法形式。
- 自动化系统不从 `damage` 字符串推断 modifier；长期修正必须显式写入 `modifierContributions`。

### Armor Threshold 语义规则

护甲阈值需要同时满足结构和语义规则。

Schema 层：

- `baseArmorMax` 必须是非负整数。
- `baseThresholds.minor` 必须是非负整数。
- `baseThresholds.major` 必须是非负整数。
- `null` 不允许。

Semantic validation 层：

- `baseThresholds.major >= baseThresholds.minor`。
- 如果 `major < minor`，导入失败。
- 诊断 code 使用 `INVALID_THRESHOLD_ORDER`。

理由：

- 阈值顺序是装备模板的业务不变量，不只是 JSON 结构问题。
- 允许错误阈值进入 storage 会让角色表展示和自动化 base source 不可信。

### Diagnostic Code 固定为第一版 Discriminated Union

第一版 `EquipmentPackImportDiagnostic.code` 不使用任意字符串，而是按 `severity` 固定为 discriminated union。后续新增 code 必须显式设计。

```ts
type EquipmentPackImportErrorCode =
  | "SOURCE_READ_FAILED"
  | "INVALID_JSON"
  | "INVALID_FORMAT"
  | "MISSING_FIELD"
  | "UNKNOWN_FIELD"
  | "INVALID_TYPE"
  | "INVALID_ENUM"
  | "INVALID_SEMVER"
  | "DUPLICATE_ID"
  | "ID_CONFLICT"
  | "INVALID_CONTRIBUTION_TARGET"
  | "EMPTY_EQUIPMENT"
  | "INVALID_THRESHOLD_ORDER"
  | "FILE_TOO_LARGE"
  | "PACK_LIMIT_EXCEEDED"
  | "TEMPLATE_LIMIT_EXCEEDED"
  | "FIELD_TOO_LONG"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_SERIALIZE_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "RUNTIME_CACHE_BUILD_FAILED"

type EquipmentPackImportWarningCode =
  | "MISSING_AUTHOR"
  | "MISSING_DESCRIPTION"
  | "MISSING_TEMPLATE_DESCRIPTION"
  | "DESCRIPTION_LONG"
```

```ts
type EquipmentPackImportDiagnostic =
  | {
      severity: "error"
      code: EquipmentPackImportErrorCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
  | {
      severity: "warning"
      code: EquipmentPackImportWarningCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
```

规则：

- `severity: "error"` 只能搭配 `EquipmentPackImportErrorCode`。
- `severity: "warning"` 只能搭配 `EquipmentPackImportWarningCode`。
- `diagnostics` 返回仍使用同一个数组，不拆成 `errors` 和 `warnings` 两个字段。
- `relatedPaths` 用于重复 id、跨数组冲突等多位置诊断。

AJV/schema error 映射原则：

- JSON parse 失败 -> `INVALID_JSON`。
- `required` 失败 -> `MISSING_FIELD`。
- `format` 缺失由 `required` 产生 `MISSING_FIELD`；`format` 存在但不等于 `daggerheart.equipment-pack.v1` -> `INVALID_FORMAT`。
- `additionalProperties` 失败 -> `UNKNOWN_FIELD`。
- `type`、`minimum`、`integer`、`minLength` 等基础类型/值失败 -> `INVALID_TYPE`。
- `enum` 失败 -> `INVALID_ENUM`。
- `version` semver pattern 失败 -> `INVALID_SEMVER`。
- `maxLength` 失败 -> `FIELD_TOO_LONG`。
- `modifierContributions` 的 `maxItems` 失败 -> `TEMPLATE_LIMIT_EXCEEDED`。
- schema 原始错误不能直接泄漏给 UI/API；必须映射成上述 code。

`INVALID_CONTRIBUTION_TARGET` 边界：

- 第一版 core schema 已将 `definition.target` 限定为装备允许目标 enum。
- 因此未知 target 默认在 Structural Validation 阶段映射为 `INVALID_ENUM`。
- 只有未来 schema 放宽 target 结构、但 Semantic Validation 仍需排除非装备目标时，才使用 `INVALID_CONTRIBUTION_TARGET`。

## Canonical TypeScript 类型

这些类型描述 Authoring Preprocess、Structural Validation 和 Canonical Normalize 之后的内部模型。

外部输入可以省略部分可默认字段，也可以在受控枚举字段中使用中文 alias；canonical 类型不能包含中文枚举 alias。

```ts
type EquipmentPackFormat = "daggerheart.equipment-pack.v1"

type EquipmentTier = "T1" | "T2" | "T3" | "T4"

type WeaponType = "primary" | "secondary"

type EquipmentTrait =
  | "agility"
  | "strength"
  | "finesse"
  | "instinct"
  | "presence"
  | "knowledge"

type WeaponDamageType = "physical" | "magic"

type WeaponRange =
  | "melee"
  | "veryClose"
  | "close"
  | "far"
  | "veryFar"

type WeaponBurden = "oneHanded" | "twoHanded" | "offHand"
```

```ts
interface EquipmentModifierContributionTemplate {
  id: string
  definition: {
    target: EquipmentModifierTargetId
    kind: "modifier"
  }
  editable: {
    label: string
    value: number
  }
}
```

```ts
interface EquipmentWeaponTemplate {
  id: string
  name: string
  tier: EquipmentTier
  weaponType: WeaponType
  trait: EquipmentTrait
  damageType: WeaponDamageType
  range: WeaponRange
  burden: WeaponBurden
  damage: string
  featureName?: string
  description?: string
  modifierContributions: EquipmentModifierContributionTemplate[]
}
```

```ts
interface EquipmentArmorTemplate {
  id: string
  name: string
  tier: EquipmentTier
  baseArmorMax: number
  baseThresholds: {
    minor: number
    major: number
  }
  featureName?: string
  description?: string
  modifierContributions: EquipmentModifierContributionTemplate[]
}
```

```ts
interface NormalizedEquipmentPackData {
  metadata: {
    format: EquipmentPackFormat
    name: string
    version: string
    author: string
    description: string
  }
  weapons: EquipmentWeaponTemplate[]
  armor: EquipmentArmorTemplate[]
}
```

Canonical 类型规则：

- `metadata.author` 缺失时 normalize 为 `"Unknown"`。
- `metadata.description` 缺失时 normalize 为 `""`。
- `weapons` 缺失时 normalize 为 `[]`。
- `armor` 缺失时 normalize 为 `[]`。
- `modifierContributions` 缺失时 normalize 为 `[]`。
- 所有字符串字段保存 trim 后的值。
- 所有枚举字段保存英文 canonical 值。
- `definition.kind` 第一版只能是 `"modifier"`。

## JSON Schema 骨架规格

实际 schema 文件在实现阶段创建：

```text
public/schemas/equipment-pack.v1.schema.json
```

阶段 1 先固定骨架和关键约束。

### Schema Metadata

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "/schemas/equipment-pack.v1.schema.json",
  "title": "DaggerHeart Equipment Pack v1",
  "type": "object"
}
```

### 顶层对象

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["format", "name", "version", "equipment"],
  "properties": {
    "format": { "const": "daggerheart.equipment-pack.v1" },
    "name": { "type": "string", "minLength": 1, "maxLength": 100 },
    "version": {
      "type": "string",
      "minLength": 1,
      "maxLength": 40,
      "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$"
    },
    "author": { "type": "string", "minLength": 1, "maxLength": 100 },
    "description": { "type": "string", "maxLength": 4000 },
    "equipment": { "$ref": "#/$defs/equipment" }
  }
}
```

### Equipment

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "weapons": {
      "type": "array",
      "items": { "$ref": "#/$defs/weaponTemplate" }
    },
    "armor": {
      "type": "array",
      "items": { "$ref": "#/$defs/armorTemplate" }
    }
  }
}
```

`equipment.weapons` 和 `equipment.armor` 都可选。空装备包由 semantic validation 产生 `EMPTY_EQUIPMENT`，不依赖 schema 表达。

### Template ID

```json
{
  "type": "string",
  "minLength": 1,
  "maxLength": 160,
  "not": {
    "pattern": "[\\u0000-\\u001F\\u007F/\\\\]"
  }
}
```

Template ID 允许中文，以保持和现有卡牌包作者习惯一致。官方示例推荐 ASCII slug。

### Weapon Template

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "id",
    "name",
    "tier",
    "weaponType",
    "trait",
    "damageType",
    "range",
    "burden",
    "damage"
  ],
  "properties": {
    "id": { "$ref": "#/$defs/templateId" },
    "name": { "type": "string", "minLength": 1, "maxLength": 120 },
    "tier": { "$ref": "#/$defs/equipmentTier" },
    "weaponType": { "$ref": "#/$defs/weaponType" },
    "trait": { "$ref": "#/$defs/equipmentTrait" },
    "damageType": { "$ref": "#/$defs/weaponDamageType" },
    "range": { "$ref": "#/$defs/weaponRange" },
    "burden": { "$ref": "#/$defs/weaponBurden" },
    "damage": { "type": "string", "minLength": 1, "maxLength": 40 },
    "featureName": { "type": "string", "maxLength": 120 },
    "description": { "type": "string", "maxLength": 4000 },
    "modifierContributions": {
      "type": "array",
      "maxItems": 20,
      "items": { "$ref": "#/$defs/modifierContributionTemplate" }
    }
  }
}
```

### Armor Template

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "name", "tier", "baseArmorMax", "baseThresholds"],
  "properties": {
    "id": { "$ref": "#/$defs/templateId" },
    "name": { "type": "string", "minLength": 1, "maxLength": 120 },
    "tier": { "$ref": "#/$defs/equipmentTier" },
    "baseArmorMax": { "type": "integer", "minimum": 0 },
    "baseThresholds": {
      "type": "object",
      "additionalProperties": false,
      "required": ["minor", "major"],
      "properties": {
        "minor": { "type": "integer", "minimum": 0 },
        "major": { "type": "integer", "minimum": 0 }
      }
    },
    "featureName": { "type": "string", "maxLength": 120 },
    "description": { "type": "string", "maxLength": 4000 },
    "modifierContributions": {
      "type": "array",
      "maxItems": 20,
      "items": { "$ref": "#/$defs/modifierContributionTemplate" }
    }
  }
}
```

`baseThresholds.major >= baseThresholds.minor` 由 semantic validation 检查。

### Modifier Contribution Template

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "definition", "editable"],
  "properties": {
    "id": { "$ref": "#/$defs/templateId" },
    "definition": {
      "type": "object",
      "additionalProperties": false,
      "required": ["target", "kind"],
      "properties": {
        "target": { "$ref": "#/$defs/equipmentModifierTarget" },
        "kind": { "const": "modifier" }
      }
    },
    "editable": {
      "type": "object",
      "additionalProperties": false,
      "required": ["label", "value"],
      "properties": {
        "label": { "type": "string", "minLength": 1, "maxLength": 120 },
        "value": { "type": "number" }
      }
    }
  }
}
```

### Canonical Enum `$defs`

Schema enum 只包含英文 canonical 值。

```json
{
  "equipmentTier": { "enum": ["T1", "T2", "T3", "T4"] },
  "weaponType": { "enum": ["primary", "secondary"] },
  "equipmentTrait": {
    "enum": ["agility", "strength", "finesse", "instinct", "presence", "knowledge"]
  },
  "weaponDamageType": { "enum": ["physical", "magic"] },
  "weaponRange": { "enum": ["melee", "veryClose", "close", "far", "veryFar"] },
  "weaponBurden": { "enum": ["oneHanded", "twoHanded", "offHand"] },
  "equipmentModifierTarget": {
    "enum": [
      "evasion",
      "armorMax",
      "minorThreshold",
      "majorThreshold",
      "hpMax",
      "stressMax",
      "proficiency",
      "agility.value",
      "strength.value",
      "finesse.value",
      "instinct.value",
      "presence.value",
      "knowledge.value"
    ]
  }
}
```

## 阶段 1 验收条件

阶段 1 细化完成时，必须满足：

- 明确公开 JSON Schema 文件位置和命名。
- 明确 JSON Schema 覆盖哪些规则，哪些规则不属于 Schema。
- 明确外部输入类型和内部 canonical 类型的边界。
- 明确所有枚举 canonical 值和中文 alias 值。
- 明确 `id`、`version`、字符串 trim、未知字段、空数组、可选字段默认值规则。
- 明确 schema validation diagnostic 到内部 diagnostic code 的映射原则。
- 明确阶段 1 最低测试清单。
- 不修改上游 phased design 的原则性内容。

## 待确认问题

暂无。

## 阶段 1 最低测试清单

测试按 pipeline 分层组织。阶段 1 的测试目标是证明公开契约、authoring preprocess、canonical normalize、semantic validation 和 diagnostic 映射边界清楚；不测试真实 storage、registry 或 UI。

### Core Schema / Structural Validation

有效结构：

- 最小有效 weapon-only pack。
- 最小有效 armor-only pack。
- weapons 和 armor 同时存在。
- `weapons: []` + 非空 `armor` 合法。
- `armor: []` + 非空 `weapons` 合法。
- 可选字段缺失合法：`author`、`description`、`featureName`、`modifierContributions`。
- 用户可见文本允许中文：`name`、`author`、`description`、`featureName`、`editable.label`。

顶层和未知字段：

- 缺 `format`、`name`、`version`、`equipment` 分别失败。
- 顶层未知字段失败。
- `equipment` 内未知字段失败。
- weapon、armor、`baseThresholds`、contribution、`definition`、`editable` 内未知字段分别失败。
- `format` 不是 `daggerheart.equipment-pack.v1` 失败。

canonical enum：

- 每个 enum 至少覆盖一个有效值：`tier`、`weaponType`、`trait`、`damageType`、`range`、`burden`、`definition.target`、`definition.kind`。
- 中文 alias 直接跑 core schema 必须失败，例如 `trait: "敏捷"`。
- 大小写错误失败，例如 `tier: "t1"`、`range: "VeryClose"`。
- `definition.kind` 只能是 `"modifier"`，其他值失败。
- 未知 target 在第一版 schema 层失败，并映射为 `INVALID_ENUM`。

SemVer：

- 有效：`1.0.0`、`1.0.0-beta.1`、`2.3.0-rc.2`、`1.0.0+build.1`。
- 无效：`1`、`1.0`、`v1.0.0`、`2026.05.31`。
- 前导零无效：`01.0.0`、`1.02.0`。

ID 限制：

- 中文 template id 合法。
- ASCII slug template id 合法。
- 空字符串失败。
- 超过 160 字符失败。
- 包含 `/`、`\` 失败。
- 包含控制字符失败，例如换行、`\u0000`、`\u007F`。

长度和数量：

- `name`、`author`、顶层 `description`、template `name`、`featureName`、template `description`、weapon `damage`、contribution `editable.label` 超长失败。
- `version` 超过 40 失败。
- `modifierContributions` 超过 20 失败。

数组和类型：

- `equipment.weapons` 不是数组失败。
- `equipment.armor` 不是数组失败。
- `modifierContributions` 不是数组失败。
- weapons、armor、contribution 数组元素不是 object 失败。
- weapon item 缺必填字段失败。
- armor item 缺 `baseThresholds.minor` 或 `baseThresholds.major` 失败。
- contribution item 缺 `id`、`definition`、`editable` 失败。
- 顶层不是 object 失败，例如 `null`、array、string。
- `name: null`、`version: null`、`equipment: null` 失败。
- enum 字段传 number/null 失败。
- `baseArmorMax`、`minor`、`major` 传 string/null/float/负数失败。
- `editable.value` 传 string/null 失败。
- `damage: null`、`description: null` 失败。

### Authoring Preprocess

- zh-CN alias adapter 在 core schema 前执行：`trait: "敏捷"`、`damageType: "物理"`、`range: "近战"`、`burden: "单手"` / `"副手"` 能转换为英文 canonical 并通过 core schema。
- 中文字段名不支持：例如 `名称`、`武器`、`护甲`、`伤害类型` 作为字段名应触发 `UNKNOWN_FIELD` 或 `MISSING_FIELD`；adapter 不转换字段名。
- 同一个装备包中英文枚举值混用允许，normalize 后全部为英文 canonical。
- 未知中文枚举 hard error，不做模糊翻译。
- 未知英文枚举 hard error。
- trim 在 schema 前执行：`name: "  影刃  "`、`damage: "  d8  "`、枚举 alias `" 敏捷 "` 经 trim 后可通过。
- trim 只处理首尾：`description` 内部换行、Markdown 缩进和内部空格保留。
- trim 后空必填字符串失败，例如 `name: "   "`、`damage: "   "`。
- trim 成功不产生 warning。

### Canonical Normalize

- 缺失 `author` normalize 为 `"Unknown"`。
- 缺失 `description` normalize 为 `""`。
- 只提供 `equipment.weapons` 时 `armor` normalize 为 `[]`。
- 只提供 `equipment.armor` 时 `weapons` normalize 为 `[]`。
- weapon 和 armor 缺失 `modifierContributions` 时 canonical template 中必须有 `modifierContributions: []`。
- `modifierContributions: []` 合法。
- `modifierContributions: null` 非法。
- canonical 输出不得保留中文枚举 alias，所有 enum 字段都是英文 canonical。

### Semantic Validation

- `EMPTY_EQUIPMENT`：`equipment: {}` 失败。
- `EMPTY_EQUIPMENT`：`weapons: []` + `armor: []` 失败。
- 只武器、只护甲、一个空数组加一个非空数组成功。
- `DUPLICATE_ID`：同一个 weapons 数组内 template id 重复。
- `DUPLICATE_ID`：同一个 armor 数组内 template id 重复。
- `DUPLICATE_ID`：weapons 与 armor 跨数组 template id 重复。
- `DUPLICATE_ID`：单个模板内 `modifierContributions[].id` 重复。
- `INVALID_THRESHOLD_ORDER`：`baseThresholds.major < baseThresholds.minor` 失败。
- `major === minor` 和 `major > minor` 成功。

### Diagnostic Mapping And Shape

- JSON parse 失败 -> `INVALID_JSON`。
- `required` -> `MISSING_FIELD`。
- `format` 缺失 -> `MISSING_FIELD`；`format` const 不匹配 -> `INVALID_FORMAT`。
- `additionalProperties` -> `UNKNOWN_FIELD`。
- `type`、`minimum`、`integer`、`minLength`、template id 禁止字符 -> `INVALID_TYPE`。
- enum 失败 -> `INVALID_ENUM`。
- `version` semver pattern 失败 -> `INVALID_SEMVER`。
- `maxLength` -> `FIELD_TOO_LONG`。
- `maxItems`：`modifierContributions` 超限 -> `TEMPLATE_LIMIT_EXCEEDED`。
- 所有 hard error 的 `severity` 都是 `"error"`。
- 阶段 1 不制造 warning。
- `path` 使用稳定 JSON path，至少覆盖顶层、数组元素和嵌套字段，例如 `/equipment/weapons/0/id`、`/equipment/armor/0/baseThresholds/major`。
- `value` 对错误值保留，例如重复 id、非法 enum、错误 threshold major；缺字段可省略。
- 不泄漏 AJV 原始 error 作为最终 UI/API diagnostic；测试不要过度绑定完整 `message` 文案。

### Pipeline Stage Boundary

- `INVALID_JSON` 后不进入 Authoring Preprocess 或 Structural Validation。
- Structural Validation 失败后不进入 Canonical Normalize 或 Semantic Validation。
- Semantic Validation 失败后不进入 Conflict Check 或 Stage Import Data。
- 阶段 1 可以用 spy/mock 验证阶段调用边界，不需要真实 storage、registry 或 UI。

### 可后置测试

- 每个 enum 的全量 allowed-values 快照测试。
- 中文 alias 全量矩阵测试。
- alias adapter 不受系统语言、浏览器语言或用户设置影响的测试。
- 多模板混合包的全量 canonical 化测试。
- `ID_CONFLICT` 与 disabled pack 仍参与冲突检查：属于 Conflict Check，阶段 2 更合适。
- `FILE_TOO_LARGE`、`PACK_LIMIT_EXCEEDED`：偏 Source Read/import policy，阶段 2。
- `STORAGE_QUOTA_EXCEEDED`、`STORAGE_SERIALIZE_FAILED`、`STORAGE_WRITE_FAILED`：Storage Transaction，阶段 3。
- `RUNTIME_CACHE_BUILD_FAILED`：Runtime Cache Build，阶段 3。
- 真实 storage 回滚、runtime cache 不重建、store state 不变：阶段 3 集成测试。
- UI 文案、展示顺序、多错误聚合策略。
