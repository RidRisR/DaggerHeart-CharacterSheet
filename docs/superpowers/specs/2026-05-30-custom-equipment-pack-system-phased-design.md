# 自定义装备卡包系统分阶段设计

日期：2026-05-30
状态：结构化设计草案
来源：整理自 `2026-05-30-custom-equipment-pack-system-outline.md` 的讨论记录

## 目标

建设一套与自定义卡牌包同等级的自定义装备卡包系统。装备模板不进入 `StandardCard`，不复用 custom card store。第一版重点是公开契约、导入 pipeline、独立存储、模板注册表、装备实例化和非 UI 测试。UI 设计暂缓到核心系统落地后再讨论。

## 全局原则

快速失败是本设计的基础规范。

- 任何结构、字段、枚举、存储、内置数据转换、registry 构建或自动化接入错误都应快速失败。
- 不做隐性向后兼容。
- 不静默跳过错误数据。
- 不在原地猜测修复异常数据。
- 兼容或迁移必须是显式设计的 adapter 或 migration。
- 自检可以清理明确不完整的数据，但不能悄悄改写可解析数据的业务含义。
- 第三方导入包错误通过结构化诊断暴露给用户或作者。
- 内置数据和系统不变量错误作为系统错误直接暴露。

## 第一版范围

第一版包含：

- 独立装备包 JSON 格式。
- 英文 canonical schema。
- 受控中文枚举值 alias。
- 严格导入校验。
- 结构化导入诊断。
- 独立 localStorage 存储。
- 启动自检和存储完整性报告。
- builtin equipment canonical adapter。
- runtime registry/query。
- explicit equipment selection payload。
- template-to-slot/display mapper。
- 现有自动化行为回归验证。
- 非 UI 测试矩阵。

第一版不包含：

- `.dhcb` 扩展。
- 统一“卡牌+装备”内容包。
- 图片或资源文件。
- UI 方案细化。
- 卡牌包导入流程改造。
- 装备槽 `SheetData.equipment` 结构化存档升级。
- 从装备描述文本中自动推断 automation modifier。

## 阶段 1：公开契约与 Canonical 类型

### 目标

定义第三方装备包的公开 JSON 契约，以及系统内部使用的英文 canonical template 类型。

### 决策

- 第一版装备包是独立 JSON 文件，不嵌入 `.dhcb`。
- 顶层使用一个带 schema 版本的 `format` 字段，不再使用 `schemaVersion` 或 `formatVersion`。
- 第一版 `format` 固定为 `daggerheart.equipment-pack.v1`。
- 顶层 `version` 是卡包作者维护的内容版本，必须是严格 semver。
- 顶层 `format`、`name`、`version`、`equipment` 必填。
- 顶层 `author`、`description` 可选。
- `equipment.weapons` 和 `equipment.armor` 可选，缺失时按空数组处理，但二者至少一个包含有效模板。
- 字段名必须是英文。
- 枚举字段可以接受受控中文 alias 值，normalize 后存储英文 canonical 值。
- 官方示例优先展示英文 canonical 值，可附中文枚举值参考表。

### 顶层格式

```json
{
  "format": "daggerheart.equipment-pack.v1",
  "name": "Example Equipment Pack",
  "version": "1.0.0",
  "author": "Author",
  "description": "Optional description",
  "equipment": {
    "weapons": [],
    "armor": []
  }
}
```

### 武器模板

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

公开输入中的 `modifierContributions` 可选；normalize 后内部 canonical 类型中必须是数组，缺失时补为 `[]`。

武器字段规则：

- `id` 必填，稳定唯一字符串。
- `name` 必填。
- `tier`: `T1 | T2 | T3 | T4`。
- `weaponType`: `primary | secondary`。
- `trait`: `agility | strength | finesse | instinct | presence | knowledge`。
- `damageType`: `physical | magic`。
- `range`: `melee | veryClose | close | far | veryFar`。
- `burden`: `oneHanded | twoHanded`。
- `damage` 必填字符串，例如 `d8`、`d10+3`。
- `featureName`、`description` 可选。

### 护甲模板

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

护甲字段规则：

- `id` 必填，稳定唯一字符串。
- `name` 必填。
- `tier`: `T1 | T2 | T3 | T4`。
- `baseArmorMax` 必填，非负整数。
- `baseThresholds.minor` 必填，非负整数。
- `baseThresholds.major` 必填，非负整数。
- `featureName`、`description` 可选。
- `modifierContributions` 公开输入可选，normalize 后补为数组。
- 导入包模板中的 `baseArmorMax`、`minor`、`major` 不允许为 `null`。

### Modifier Contribution 模板

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

规则：

- `id` 必填，在当前装备模板内唯一。
- `id` 是模板 contribution id，不是运行时 contribution id。
- `definition.target` 只允许装备可修改目标。
- `definition.kind` 第一版只能是 `modifier`。
- `editable.label` 必填字符串。
- `editable.value` 必填数字，允许负数、0、正数。
- 不允许 `experienceValues.*`。

允许的 `definition.target`：

- `evasion`
- `armorMax`
- `minorThreshold`
- `majorThreshold`
- `hpMax`
- `stressMax`
- `proficiency`
- `agility.value`
- `strength.value`
- `finesse.value`
- `instinct.value`
- `presence.value`
- `knowledge.value`

### 枚举 Alias 字典

字段名不支持中文 alias。只有枚举值可以通过显式白名单支持中文 alias。

```ts
trait: {
  "敏捷": "agility",
  "力量": "strength",
  "灵巧": "finesse",
  "本能": "instinct",
  "风度": "presence",
  "知识": "knowledge"
}

damageType: {
  "物理": "physical",
  "魔法": "magic"
}

range: {
  "近战": "melee",
  "邻近": "veryClose",
  "近距离": "close",
  "远距离": "far",
  "极远": "veryFar"
}

burden: {
  "单手": "oneHanded",
  "双手": "twoHanded"
}
```

未知枚举值是 hard error。

## 阶段 2：导入 Pipeline 与诊断模型

### 目标

定义一条完整、可测试、可扩展的导入 pipeline。装备包导入吸取现有卡牌包导入流程的经验，但不在本阶段改造卡牌包导入。

### 导入源 Adapter

导入入口通过统一 source adapter interface 接收输入，而不是为文件、测试数据、内置数据分别暴露不一致入口。

```ts
interface EquipmentPackImportSource {
  sourceType: "file" | "object" | "builtin" | "container"
  fileName?: string
  read(): Promise<unknown>
}
```

统一入口：

```ts
importEquipmentPackFromSource(
  source: EquipmentPackImportSource
): Promise<EquipmentPackImportResult>
```

Adapter 职责：

- file adapter 读取文件文本并 JSON parse，parse 失败产生 `INVALID_JSON`。
- object/test adapter 直接提供 unknown object，方便测试同一条 pipeline。
- builtin adapter 用于把内置装备源数据送入同一 canonical normalize/registry 逻辑，但不提交到 custom pack storage。
- container adapter 是未来方向，用于从 `.dhcb` 或其他容器中提取 `equipment.json`。

### Pipeline

```text
Import source
  -> Read/parse via adapter
  -> Identify format
  -> Validate schema
  -> Normalize
  -> Conflict check
  -> Stage pack data
  -> Commit to storage
  -> Rebuild registry/query index
  -> Return structured result
```

阶段原则：

- `Validate`、`Normalize`、`Conflict check`、`Commit` 是独立阶段，每一阶段应能单独测试。
- `Validate schema` 检查文件自身是否合法。
- `Conflict check` 检查文件与当前系统状态是否冲突。
- `Commit` 之前不得修改 store state 或 localStorage。

### 导入结果

```ts
interface EquipmentPackImportResult {
  success: boolean
  imported: {
    packId?: string
    weaponCount: number
    armorCount: number
  }
  diagnostics: EquipmentPackImportDiagnostic[]
}
```

```ts
interface EquipmentPackImportDiagnostic {
  severity: "error" | "warning"
  code: string
  path: string
  message: string
  value?: unknown
}
```

规则：

- `success = false` 时，不写入存储层。
- `success = true` 时，可以带 warning。
- `diagnostics` 同时包含 error 和 warning，由 `severity` 区分。
- 核心导入层保留 `code`、`path`、`message`、`value`，不压平成字符串数组。
- UI 可以按 `severity`、`code` 或 `path` 分组展示。

诊断 code 候选：

- `INVALID_JSON`
- `INVALID_FORMAT`
- `MISSING_FIELD`
- `UNKNOWN_FIELD`
- `INVALID_TYPE`
- `INVALID_ENUM`
- `INVALID_SEMVER`
- `DUPLICATE_ID`
- `ID_CONFLICT`
- `INVALID_CONTRIBUTION_TARGET`
- `EMPTY_EQUIPMENT`
- `FILE_TOO_LARGE`
- `PACK_LIMIT_EXCEEDED`
- `TEMPLATE_LIMIT_EXCEEDED`
- `FIELD_TOO_LONG`
- `STORAGE_QUOTA_EXCEEDED`
- `STORAGE_SERIALIZE_FAILED`
- `STORAGE_WRITE_FAILED`
- `REGISTRY_REBUILD_FAILED`

### 校验策略

第一版采用严格 schema。任何未知字段都是 hard error。

Hard error：

- JSON 无法解析。
- `format` 缺失或不是 `daggerheart.equipment-pack.v1`。
- 顶层必填字段缺失。
- 顶层或任意嵌套对象出现未知字段。
- `version` 不是严格 semver。
- `equipment.weapons` 和 `equipment.armor` 都为空或都缺失。
- 任意模板必填字段缺失。
- 任意枚举字段非法。
- 任意数值字段非法。
- 任意字符串字段类型非法。
- 任意模板 id 重复或与系统已有 id 冲突。
- 任意 contribution 结构非法。
- 任意 contribution target 非法。
- 任意模板内 contribution id 重复。
- 容量或数量超过上限。

Warning：

- `author` 缺失。
- `description` 缺失。
- 单个模板的 `featureName` 和 `description` 都缺失。
- pack name 或 template name 前后有空白，会在规范化时 trim。
- description 很长，UI 可能截断。

### Normalize 输出

```ts
interface NormalizedEquipmentPackData {
  metadata: {
    format: "daggerheart.equipment-pack.v1"
    name: string
    version: string
    author: string
    description: string
  }
  weapons: EquipmentWeaponTemplate[]
  armor: EquipmentArmorTemplate[]
}
```

Normalize 规则：

- `author` 缺失时标准化为 `"Unknown"`。
- `description` 缺失时标准化为 `""`。
- `equipment.weapons` 缺失时标准化为 `[]`。
- `equipment.armor` 缺失时标准化为 `[]`。
- `modifierContributions` 缺失时标准化为 `[]`。
- 字符串字段进入存储层前统一 trim。
- 受控枚举 alias 转换为英文 canonical 值。
- 输出只保留 canonical 英文字段。
- 存储层保存英文 canonical 值；中文展示只属于 UI 层。

### 重复 ID 与冲突策略

- 装备模板 id 遵循和卡牌 id 类似的全局唯一原则。
- 同一个装备包内，所有 weapon id 和 armor id 不能重复，且 weapon id 与 armor id 之间也不能重复。
- 自定义装备模板 id 不能和任何内置 weapon/armor id 重复。
- 新导入装备包中的模板 id 不能和任何已导入自定义装备包中的模板 id 重复。
- disabled pack 中的模板 id 仍参与冲突检查。
- 重复导入同一个包时，第一版不自动覆盖、不 merge。用户需要先删除旧 pack，再导入新版本。
- 同一个装备模板内，`modifierContributions[].id` 不能重复。
- contribution id 的唯一性范围是当前装备模板内，不要求全局唯一，因为选择装备时会生成运行时 id。

## 阶段 3：存储层、事务和完整性恢复

### 目标

建立独立于 custom card store 的装备包存储系统，并保证导入、删除、启动恢复的状态一致性。

### 存储结构

沿用现有卡牌包的 `index + pack data` 大结构，但不复用 card store 类型。

建议 key：

```ts
INDEX: "daggerheart_custom_equipment_packs_index"
PACK_PREFIX: "daggerheart_custom_equipment_pack_"
```

原则：

- localStorage index 只存 pack 摘要和模板 id 列表。
- 每个装备包的完整模板数据单独存储在 pack data key 中。
- 持久化 index 不是查询索引，只负责定位、统计和管理 pack。
- 武器/护甲筛选所需的查询索引在运行时派生，不持久化。
- pack data 是自定义装备模板的真源。
- disabled pack 保留在存储层和管理 UI 中，但不进入选择用查询索引。
- 内置装备不进入 equipment pack storage，也不进入 custom `packs` map。
- 内置装备只在运行时 registry 中以 `source: "builtin"` 出现。

### 内存模型

```ts
interface EquipmentPackState {
  initialized: boolean
  loading: boolean
  error: string | null

  packs: Map<string, EquipmentPackInfo>
  weapons: Map<string, RegisteredEquipmentWeaponTemplate>
  armor: Map<string, RegisteredEquipmentArmorTemplate>

  index: EquipmentPackIndex
  queryIndex: EquipmentTemplateQueryIndex | null
}
```

`packs` 只包含自定义装备包，包括 disabled pack。`weapons` 和 `armor` 是选择用 registry，只包含内置装备和已启用自定义装备。

### Actions

```ts
initializeEquipmentPacks(): Promise<{ initialized: boolean }>

importEquipmentPackFromSource(
  source: EquipmentPackImportSource
): Promise<EquipmentPackImportResult>

removeEquipmentPack(packId: string): boolean
toggleEquipmentPackDisabled(packId: string): boolean
getAllEquipmentPacks(): EquipmentPackInfo[]
getEquipmentPackById(packId: string): EquipmentPackInfo | undefined

getAllWeaponTemplates(): RegisteredEquipmentWeaponTemplate[]
getAllArmorTemplates(): RegisteredEquipmentArmorTemplate[]
getWeaponTemplateById(id: string): RegisteredEquipmentWeaponTemplate | undefined
getArmorTemplateById(id: string): RegisteredEquipmentArmorTemplate | undefined
queryWeaponTemplates(filters: WeaponTemplateFilters): RegisteredEquipmentWeaponTemplate[]
queryArmorTemplates(filters: ArmorTemplateFilters): RegisteredEquipmentArmorTemplate[]
```

### 导入事务

导入提交顺序：

```text
1. Validate + Normalize + Conflict check
2. Build nextPackInfo / nextPackData / nextIndex / nextState in memory
3. Serialize nextIndex and nextPackData
4. Write pack data key first
5. Write index key second
6. Update in-memory state
7. Rebuild registry/query index
```

事务原则：

- 导入只有完全成功和完全失败两个最终状态。
- `Commit` 之前不得修改 store state 或 localStorage。
- pack data 先写，index 后写。index 是可发现入口，不能先指向尚未写入成功的 pack data。
- 如果 pack data 写成功但 index 写失败，应删除刚写入的 pack data key，并返回 storage failure 诊断。
- localStorage 写入成功前，UI 不应看到新 pack。
- registry/query index 只在 commit 成功后重建。

### Pack Lifecycle

状态：

```ts
type EquipmentPackStatus = "enabled" | "disabled"
```

存储层可使用 `disabled: boolean`。

导入：

- 新导入 pack 默认 enabled。
- 重复模板 id 直接拒绝。
- 重复导入不覆盖、不 merge。
- 用户更新 pack 时，需要先删除旧 pack，再导入新版本。
- 导入成功后立即进入 registry/query index。

禁用：

- 禁用只影响未来选择。
- disabled pack 保留在 storage 和 pack manager。
- disabled pack 的模板不进入 selectable registry/query。
- disabled pack 的模板 id 仍参与冲突检查。
- 已经实例化到角色表里的装备不受影响。
- 禁用后重建 registry/query index。

启用：

- 启用时重建 registry/query index。
- 因为 disabled pack 的 id 一直占用，启用时理论上不会出现 id 冲突。
- 如果 pack data 在 disabled 期间损坏，启用应失败并报告 corrupted pack 诊断。

删除：

- 删除 pack 移除 index 记录和 pack data key。
- 删除后释放模板 id，之后可以导入同 id 的新 pack。
- 删除不影响已经实例化到角色表里的装备。
- 删除后重建 registry/query index。
- UI 层应二次确认删除，但 store action 语义不依赖 UI 确认。

删除提交顺序：

```text
1. Confirm pack exists
2. Build nextIndex / nextPacks / nextState in memory
3. Serialize nextIndex
4. Write index without pack entry
5. Remove pack data key
6. Update in-memory state
7. Rebuild registry/query index
```

删除时先删 index，再删 pack data。index 先删除成功后，即使 pack data 删除失败，也只会留下 orphan pack data，启动自检会自动清理。

### 启动自检与完整性恢复

启动自检是 equipment pack system 初始化的一部分。后续卡牌包系统也可以沿用同类思路，但不纳入本阶段实现。

```ts
interface EquipmentPackIntegrityReport {
  repaired: boolean
  removedIndexEntries: string[]
  removedOrphanPackKeys: string[]
  removedCorruptedPackKeys: string[]
  warnings: EquipmentPackImportDiagnostic[]
  errors: EquipmentPackImportDiagnostic[]
}
```

恢复规则：

- index 缺失：创建空 index，并删除所有 orphan pack data keys。
- index JSON 损坏：创建空 index，并删除所有 equipment pack data keys，记录 `CORRUPTED_INDEX`。
- index entry 指向缺失 pack data：删除该 index entry，更新统计。
- pack data key 没有 index entry：删除 orphan pack data key。
- pack data JSON 损坏或无法解析：删除该 pack data key，删除对应 index entry。
- index 摘要和 pack data 派生摘要不一致：不自动重建，也不自动删除。保留数据，记录 persistent warning，并在每次启动时继续报告。

摘要不一致处理原则：

- index 和 pack data 正常情况下不应不一致。
- 摘要不一致可能来自写入 bug、手动修改 localStorage、旧版本迁移或其他异常。
- 只要 pack data 可通过 index id 读取且可解析，自检不应自动改写或删除它。
- 保留 warning 用于保护现场，让用户或开发者后续判断原因并手动介入。
- 默认建议：如果 pack data 本身可解析且 schema 合法，可以继续加载，但在管理 UI 中显示完整性 warning。

## 阶段 4：内置装备 Canonical Adapter

### 目标

让 registry 对外只输出英文 canonical template，即使当前内置武器源数据仍使用中文字段。

### 决策

- 内置装备不进入 custom pack storage。
- 内置装备通过 adapter 转成 canonical template 后进入 registry。
- 内置转换任何错误都应立刻暴露并使初始化失败，不能静默跳过。
- 默认内置数据应完全合法。
- 单元测试必须覆盖所有内置武器和护甲都能转换。
- 后续可以把内置数据字段改成英文；装备名称、特性名、描述等用户可见内容可以继续保留中文。

### 武器映射

```ts
toCanonicalBuiltinWeaponTemplate(source): EquipmentWeaponTemplate
```

- `id` -> `id`
- `名称` -> `name`
- `等级` -> `tier`
- `属性` -> `trait`
- `伤害类型` -> `damageType`
- `范围` -> `range`
- `负荷` -> `burden`
- `伤害` -> `damage`
- `特性名称` -> `featureName`
- `描述` -> `description`
- `modifierContributions ?? []` -> `modifierContributions`

### 护甲映射

```ts
toCanonicalBuiltinArmorTemplate(source): EquipmentArmorTemplate
```

- 现有英文字段基本直通。
- `modifierContributions` 缺失时补为 `[]`。
- `baseArmorMax`、`baseThresholds.minor`、`baseThresholds.major` 必须是非负整数。
- 输出只包含 canonical 字段。

## 阶段 5：Registry / Query

### 目标

为装备选择和 sheet action 提供统一读取模型。UI、sheet store 和测试都不应直接读静态装备数组或 localStorage。

### 决策

- registry 输出统一英文 canonical template。
- registry 提供正式 query interface，而不是把筛选逻辑留给 UI。
- query 默认只查询 selectable templates，也就是 builtin + enabled custom。
- disabled custom pack 不进入 query 结果。
- 管理 UI 查看 disabled pack 内容时，应读取 pack detail，不走选择用 query。
- 搜索第一版大小写不敏感，匹配 `name`、`featureName`、`description`。
- UI 只管理筛选控件状态，不自行复制业务筛选语义。

### 接口

```ts
getAllWeaponTemplates(): RegisteredEquipmentWeaponTemplate[]
getAllArmorTemplates(): RegisteredEquipmentArmorTemplate[]

getWeaponTemplateById(id: string): RegisteredEquipmentWeaponTemplate | undefined
getArmorTemplateById(id: string): RegisteredEquipmentArmorTemplate | undefined

queryWeaponTemplates(filters: WeaponTemplateFilters): RegisteredEquipmentWeaponTemplate[]
queryArmorTemplates(filters: ArmorTemplateFilters): RegisteredEquipmentArmorTemplate[]
```

### 筛选类型

```ts
interface WeaponTemplateFilters {
  packIds?: string[]
  source?: "builtin" | "custom"
  tiers?: EquipmentTier[]
  weaponTypes?: WeaponType[]
  traits?: EquipmentTrait[]
  damageTypes?: WeaponDamageType[]
  ranges?: WeaponRange[]
  burdens?: WeaponBurden[]
  search?: string
}

interface ArmorTemplateFilters {
  packIds?: string[]
  source?: "builtin" | "custom"
  tiers?: EquipmentTier[]
  search?: string
}
```

### 查询索引

运行时查询索引从内置模板和 enabled custom pack 派生，不持久化。

候选：

- `templatesById`
- `weaponIdsByTier`
- `weaponIdsByType`
- `weaponIdsByTrait`
- `weaponIdsByDamageType`
- `weaponIdsByRange`
- `weaponIdsByBurden`
- `weaponIdsByPack`
- `armorIdsByTier`
- `armorIdsByPack`

## 阶段 6：Template To Slot 与 Sheet Store Integration

### 目标

把 canonical template 实例化为当前角色表使用的 `WeaponSlot` 或 `ArmorSlot`，并用显式 selection payload 替代当前字符串猜测逻辑。

### 显式选择 Payload

新 UI 不再把装备选择编码成裸字符串。选择弹窗在用户点击具体装备时已经持有完整模板信息，应传递显式 selection object。

```ts
type WeaponSelection =
  | { kind: "none" }
  | { kind: "template"; template: RegisteredEquipmentWeaponTemplate }
  | { kind: "custom"; template: EquipmentWeaponTemplate }
```

```ts
type ArmorSelection =
  | { kind: "none" }
  | { kind: "template"; template: RegisteredEquipmentArmorTemplate }
  | { kind: "custom"; template: EquipmentArmorTemplate }
```

registry id lookup 可以保留给程序化调用、测试或兼容路径，但不作为新 UI 主路径。

### Display Mapper

建议模块：

```ts
equipment-labels.ts
equipment-template-to-slot.ts
```

`equipment-labels.ts`：

```ts
labelEquipmentTrait("agility") -> "敏捷"
labelWeaponDamageType("physical") -> "物理"
labelWeaponRange("melee") -> "近战"
labelWeaponBurden("oneHanded") -> "单手"
```

未知 enum 说明系统不变量被破坏，应快速失败，不显示原值。

### Template To Slot

```ts
createWeaponSlotFromEquipmentTemplate(
  template: EquipmentWeaponTemplate,
  idFactory: (templateContributionId: string) => string
): WeaponSlot

createArmorSlotFromEquipmentTemplate(
  template: EquipmentArmorTemplate,
  idFactory: (templateContributionId: string) => string
): ArmorSlot
```

武器实例化：

```ts
WeaponSlot {
  name: template.name,
  trait: `${damageTypeLabel}/${burdenLabel}/${rangeLabel}`,
  damage: `${traitLabel}: ${template.damage}`,
  feature: featureName && description
    ? `${featureName}: ${description}`
    : featureName || description || "",
  modifierContributions: instantiateContributions(...)
}
```

护甲实例化：

```ts
ArmorSlot {
  name: template.name,
  baseArmorMax: template.baseArmorMax,
  baseThresholds: { ...template.baseThresholds },
  feature: same feature formatter,
  modifierContributions: instantiateContributions(...)
}
```

Contribution 实例化：

- 模板 contribution id 必须转换为运行时 contribution id。
- `definition` 复制。
- `editable` 复制。
- 运行时 id 必须避免不同角色或不同装备槽共享 entry state。
- id factory 可以复用现有 equipment contribution id 生成策略，只要保证唯一。

### 兼容路径

- 旧的 `createWeaponSlotFromCustomPayload` 和 `createArmorSlotFromCustomPayload` 可以先保留给现有 UI 或迁移兼容。
- 新 UI 不再使用 JSON string payload。

### 装备槽结构化后续方向

当前第一版不改 `SheetData.equipment` 存档结构。后续可以考虑给 `WeaponSlot` 增加结构化字段，同时保留展示 fallback 字符串。这个议题不进入第一版实现。

## 阶段 7：自动化回归验证

### 目标

验证新数据源实例化出的装备槽能被现有自动化系统正确消费。第一版不修改自动化系统语义。

### 决策

- 自定义装备包不直接接入 automation registry。
- 装备包系统只改变角色表装备槽的数据来源。
- 自动化系统仍然只读取 `SheetData.equipment` 中已经实例化的 `WeaponSlot` 和 `ArmorSlot`。
- 选择、清空、替换装备仍然属于 Modifier-Aware Behavior，必须进入现有自动计算边界。
- 继续通过 `applyAutoCalculationForTargets(nextSheetData)` 完成同步。

沿用现有行为：

- primary weapon contributions 生效。
- secondary weapon contributions 生效。
- armor slot contributions 生效。
- inventory weapon contributions 不生效，直到交换到 active slot。
- armor 的 `baseArmorMax` 和 `baseThresholds` 作为 equipment base sources 生效。
- 禁用或删除 pack 只影响未来模板选择；它和已实例化装备槽是无关层面。

Entry state：

- 模板 contribution id 不是 runtime entry id。
- 每次实例化生成新的 runtime contribution id。
- 不同角色、不同槽位、不同选择次数不能共享 entry state。
- 替换装备后，旧 contribution 不再出现在 active registry。
- normalize modifier state 时沿用现有逻辑清理消失 entry state。

## 阶段 8：容量限制与非 UI 测试矩阵

### 容量限制

```ts
MAX_EQUIPMENT_PACK_FILE_SIZE = 500 * 1024
MAX_EQUIPMENT_PACKS = 50
MAX_TEMPLATES_PER_PACK = 500
MAX_WEAPONS_PER_PACK = 300
MAX_ARMOR_PER_PACK = 300

MAX_NAME_LENGTH = 120
MAX_AUTHOR_LENGTH = 120
MAX_VERSION_LENGTH = 40
MAX_DESCRIPTION_LENGTH = 4000

MAX_TEMPLATE_NAME_LENGTH = 120
MAX_FEATURE_NAME_LENGTH = 120
MAX_TEMPLATE_DESCRIPTION_LENGTH = 4000
MAX_DAMAGE_LENGTH = 40

MAX_CONTRIBUTIONS_PER_TEMPLATE = 20
MAX_CONTRIBUTION_LABEL_LENGTH = 120
```

规则：

- 单个装备包 JSON 最大 500KB。
- 最多 50 个自定义装备包。
- 单包最多 500 个模板。
- 超过限制直接 hard error。
- 不自动清理已有 pack。
- 不做压缩。

### 测试矩阵

测试范围限定在装备包系统。卡牌包导入流程升级是后续议题。

Validator：

- valid minimal pack。
- 缺失必填字段。
- invalid format。
- invalid semver。
- unknown field hard error。
- empty equipment hard error。
- invalid enum。
- Chinese enum alias accepted and normalized。
- invalid number fields。
- field too long。
- too many packs/templates/contributions。
- invalid contribution target。
- duplicate template id within pack。
- duplicate contribution id within template。

Normalize：

- optional fields default。
- string trim。
- Chinese enum alias -> English canonical。
- output only canonical English fields。

Conflict Check：

- conflicts with builtin weapon/armor id。
- conflicts with enabled custom pack。
- conflicts with disabled custom pack。
- repeated import rejected。
- after deletion, same ids can be imported again。

Storage Transaction：

- import writes pack data before index。
- index write failure cleans written pack data。
- pack data write failure does not write index。
- import failure does not mutate memory state。
- successful import updates memory after storage commit。
- remove writes index first, then removes pack data。
- startup removes missing/orphan/corrupted storage data。
- summary mismatch produces persistent warning, not delete or repair。

Builtin Canonical Adapter：

- all builtin weapons convert。
- all builtin armor convert。
- unknown builtin enum fails fast。
- output contains no Chinese field names。
- visible content text may remain Chinese。
- contribution templates preserved。

Registry / Query：

- includes builtin and enabled custom。
- excludes disabled custom。
- get by id works。
- query by source, pack, tier, weapon type, trait, damage type, range, burden。
- search matches name/featureName/description。

Template To Slot：

- weapon canonical template becomes current `WeaponSlot` display strings。
- armor canonical template becomes current `ArmorSlot`。
- label mapper unknown enum fails fast。
- runtime contribution ids are unique。
- same template selected twice creates different runtime ids。
- feature formatter variants。

Sheet Store Integration：

- explicit `WeaponSelection` selects without string guessing。
- explicit `ArmorSelection` selects without string guessing。
- `none` clears slot。
- old JSON payload compatibility remains only where intended。
- selection calls automatic calculation boundary。

Automation Regression：

- custom primary/secondary/armor contributions consumed by existing automation。
- custom armor base values consumed。
- inventory weapon contribution inactive until swapped。
- disabled/deleted pack does not mutate instantiated slot。
- illegal target fails at import, never reaches automation path。

## 阶段 9：UI 后置设计

UI 设计暂缓。核心系统落地前不细化页面结构和交互细节。

当前只保留最低约束：

- UI 需要展示导入成功摘要。
- UI 需要展示结构化 diagnostics。
- UI 需要支持 enable/disable/delete。
- UI 需要在选择弹窗支持 pack/source filter。
- UI 需要展示 source badges。
- UI 需要展示 integrity mismatch warning。

具体 UI 入口是独立装备包页面还是内容管理页 tab，后续再定。

## 后续方向

后续可以单独讨论：

- `.dhcb` 或新容器格式同时包含 `cards.json` 和 `equipment.json`。
- 卡牌包导入流程升级，吸收装备包导入 pipeline、结构化诊断和启动自检经验。
- 图片或图标资源。
- 导出/编辑工具。
- 卡包制作 UI。
- 角色表装备槽结构化存储。
