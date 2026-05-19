# Equipment Data Migration Design

日期：2026-05-07

## 目的

本文定义装备数据结构迁移的第一阶段设计。目标是把武器和护甲从旧的顶层字段迁移到 `SheetData.equipment`，并接入 modifier provider 架构的数据层。

本文是设计文档，不是实现计划。

## 背景

modifier 新架构已经确定：

```text
Provider owns source facts.
Registry resolves current entries.
Target consumes entries and owns entry state.
```

装备是 provider。武器和护甲都拥有自己的装备数据和 `modifierContributions`。registry 只收集当前生效装备槽位提供的 entries。

现有装备字段仍分散在 `SheetData` 顶层，例如：

```ts
primaryWeaponName
primaryWeaponTrait
secondaryWeaponName
armorName
armorBaseScore
armorThreshold
inventoryWeapon1Name
inventoryWeapon1Primary
```

第一阶段迁移完成后，这些旧顶层装备字段不再属于运行时 `SheetData`。它们只作为旧存档 migration 和 import validation 的输入。

迁移和导入必须按这个顺序处理：

```text
raw legacy input
-> 保留 legacy 装备字段供 migration 读取
-> 迁移到 equipment
-> 运行时 normalization
-> 删除旧顶层装备字段
```

`defaultSheetData` 和 `useSafeSheetData` 不能在迁移后重新补回旧顶层装备字段。import validation 也不能在 migration 之前丢弃 legacy 装备字段。

## 范围

本阶段包含：

- 新增 `SheetData.equipment`。
- 迁移主武器、副武器、两个备用武器槽。
- 迁移当前护甲槽。
- 修改装备模板数据，加入稳定模板 id。
- 为模板数据加入非常明确的长期无条件 modifier contributions。
- 选择模板装备时初始化装备 slot。
- registry 收集当前主武器、副武器、当前护甲的装备 contributions。
- 保持现有护甲自动化行为。

本阶段不包含：

- 装备 contribution 编辑 UI。
- 备用武器数量扩展。
- 攻击掷骰、伤害骰、条件型效果。
- 将武器 `trait`、`damage` 拆成结构化规则字段。
- 重新设计 final target 与解释字段的同步路线。
- 根据老存档装备名称自动补齐模板 contributions。

## 新数据结构

`SheetData` 新增：

```ts
interface SheetData {
  equipment: EquipmentData
}

interface EquipmentData {
  weaponSlots: {
    primary: WeaponSlot
    secondary: WeaponSlot
    inventory: [WeaponSlot, WeaponSlot]
  }
  armorSlot: ArmorSlot
}
```

备用武器第一阶段仍固定两个槽位。结构使用数组是为了让 slot swap 和未来扩展更自然，但本阶段不做动态增删。

## 武器槽

武器槽保持当前 UI 的文本字段：

```ts
interface WeaponSlot {
  name: string
  trait: string
  damage: string
  feature: string
  modifierContributions: ModifierContribution[]
}
```

字段语义：

- `name`：武器名称。
- `trait`：当前“基本信息”文本。
- `damage`：当前“伤害骰”文本。
- `feature`：武器特性文本。
- `modifierContributions`：这把武器作为 provider 提供的长期无条件来源。

`trait` 和 `damage` 暂时不拆分。它们在旧数据和当前 UI 中都是自由文本，本阶段迁移应保留用户可见内容。

主武器和副武器槽位生效。备用武器槽保存自己的 contributions，但不进入 active registry。

## 护甲槽

护甲槽使用结构化规则字段：

```ts
interface ArmorSlot {
  name: string
  baseArmorMax: number | null
  baseThresholds: {
    minor: number | null
    major: number | null
  }
  feature: string
  modifierContributions: ModifierContribution[]
}
```

字段语义：

- `baseArmorMax`：护甲本体提供的基础护甲值。
- `baseThresholds`：护甲本体提供的基础伤害阈值。
- `feature`：护甲特性文本。
- `modifierContributions`：护甲特性提供的额外长期无条件来源。

护甲核心字段和 final target 不是同一个东西：

```text
equipment.armorSlot.baseArmorMax
-> provider fact
-> registry 生成 armorMax base entry

armorMax
-> 角色卡最终护甲值字段
```

```text
equipment.armorSlot.baseThresholds
-> provider fact
-> registry 生成 minorThreshold / majorThreshold base entries

minorThreshold / majorThreshold
-> 角色卡最终伤害阈值字段
```

本阶段保持现有自动化行为：选择或编辑护甲核心字段时，仍同步更新 `armorMax`、`minorThreshold`、`majorThreshold`。未来是否改成更严格的 reference/final target 同步模型，另行设计。

保持现有自动化行为不意味着继续读写旧顶层护甲字段。实现时：

- 护甲区域编辑 `baseArmorMax` 时，写入 `equipment.armorSlot.baseArmorMax`，并同步 `armorMax`。
- 护甲区域编辑 `baseThresholds` 时，写入 `equipment.armorSlot.baseThresholds`，并按当前等级同步 `minorThreshold` / `majorThreshold`。
- 等级变化时，从 `equipment.armorSlot.baseThresholds` 读取护甲基础阈值，并同步 final thresholds。
- `hit-points` 区域用于 placeholder 或提示的护甲基础阈值也从 `equipment.armorSlot.baseThresholds` 读取。
- 旧 `armorValue` 不再作为运行时字段写入。

护甲 final target 字段仍保留：

```ts
armorMax
minorThreshold
majorThreshold
```

它们是角色卡最终值，不是旧装备字段。

## 迁移规则

旧顶层装备字段只作为迁移输入。迁移完成后的运行时数据读写 `equipment`。

实现时应把旧装备字段从 `SheetData` 运行时类型和默认数据中移除，但 migration/import 可以使用单独的 legacy input 类型读取这些字段。

武器迁移：

```text
primaryWeaponName/Trait/Damage/Feature
-> equipment.weaponSlots.primary

secondaryWeaponName/Trait/Damage/Feature
-> equipment.weaponSlots.secondary

inventoryWeapon1Name/Trait/Damage/Feature
-> equipment.weaponSlots.inventory[0]

inventoryWeapon2Name/Trait/Damage/Feature
-> equipment.weaponSlots.inventory[1]
```

老存档中的备用武器 checkbox 字段不迁移：

```text
inventoryWeapon1Primary
inventoryWeapon1Secondary
inventoryWeapon2Primary
inventoryWeapon2Secondary
```

原因是当前 UI 语义已经是点击后交换备用武器和主/副武器槽位，而不是持久化点亮状态。新结构应保留 slot swap 行为，不保留 checkbox state。

如果老存档中这些字段为 `true`，迁移时也直接丢弃，不执行自动 slot swap。原因是旧 `true` 只表示一个过渡兼容状态，不是新装备模型中的 source of truth。迁移后的备用武器是否生效，只由它是否位于 `primary` 或 `secondary` slot 决定。

护甲迁移：

```text
armorName -> equipment.armorSlot.name
armorFeature -> equipment.armorSlot.feature
armorBaseScore -> equipment.armorSlot.baseArmorMax
armorThreshold -> equipment.armorSlot.baseThresholds
```

护甲规则字段按数字语义迁移：

- `armorBaseScore` 能解析为数字时写入 `baseArmorMax`。
- `armorBaseScore` 不能解析时写入 `null`。
- `armorThreshold` 能解析为 `A/B` 时写入 `{ minor: A, major: B }`。
- `armorThreshold` 不能解析时写入 `{ minor: null, major: null }`。

本阶段不为非法护甲规则文本保留 raw 字段。取舍原因是护甲核心规则字段本来应该是数字，长期保留 raw 字段会让读写和计算语义变得含混。

老存档不根据装备名称自动补充 `modifierContributions`。迁移出来的旧装备 contributions 默认为 `[]`。

## 模板数据

内置武器和护甲模板需要稳定 id。id 不是中文显示名，也不是随机值。

推荐格式：

```text
builtin.weapon.primary.broadsword
builtin.weapon.secondary.dagger
builtin.armor.chainmail
```

模板 id 用于：

- 装备选择。
- 测试稳定断言。
- 初始化装备 slot。
- 生成可读的 contribution id 前缀。

模板 id 不等于运行时 contribution id。写入角色卡的 `modifierContributions[].id` 必须是整张角色卡内全局唯一 id。

装备选择链路必须改为使用模板 id：

- 武器和护甲 modal 返回模板 `id`，不再返回中文名称作为 identity。
- 模板 lookup 使用 `template.id === selectedId`。
- UI 展示继续使用中文名称。
- `all-weapons.ts` 不能再把 `id` 覆盖为 `weapon.名称`。
- `none` 和自定义装备 payload 仍然是特殊输入，不参与模板 id lookup。

武器模板第一阶段保留现有中文字段，只新增稳定 `id` 和可选 `modifierContributions`：

```ts
interface WeaponTemplate {
  id: string
  名称: string
  等级: string
  伤害类型: string
  负荷: string
  范围: string
  属性: string
  伤害: string
  特性名称?: string
  描述?: string
  modifierContributions?: EquipmentModifierContributionTemplate[]
}
```

护甲模板本阶段改为英文字段。原因是护甲模板本来就要从中文规则字段迁到结构化核心字段，继续混用中英字段会让模板语义不清。

```ts
interface ArmorTemplate {
  id: string
  name: string
  tier: "T1" | "T2" | "T3" | "T4"
  baseArmorMax: number
  baseThresholds: {
    minor: number
    major: number
  }
  featureName?: string
  description?: string
  modifierContributions?: EquipmentModifierContributionTemplate[]
}
```

旧护甲模板字段只作为改造输入：

```text
名称 -> name
等级 -> tier
护甲值 -> baseArmorMax
伤害阈值 -> baseThresholds
特性名称 -> featureName
描述 -> description
```

武器模板字段暂不英文化。它们仍使用当前中文字段，避免把武器选择 modal、筛选、展示和自定义武器解析一起扩大到本阶段之外。

template contribution 使用与运行时 contribution 相同的定义和 editable 形状，但 template id 只在模板内稳定：

```ts
interface EquipmentModifierContributionTemplate {
  id: string
  definition: {
    target: EquipmentModifierTargetId
    kind: "base" | "modifier"
  }
  editable: {
    label: string
    value: number
  }
}
```

模板中的 `modifierContributions` 只记录非常明确的长期无条件加值。不明确、条件型、攻击或伤害相关规则不进入本阶段模板 contribution。

## 选择装备

选择模板装备时：

1. 从模板生成新的 `WeaponSlot` 或 `ArmorSlot`。
2. 复制文本和核心规则字段。
3. 从模板 contribution 生成新的运行时 contribution。
4. 为每个运行时 contribution 生成新的全局唯一 id。
5. 写入对应装备 slot。

选择自定义武器或护甲时：

- 初始化可解析的文本和护甲核心规则字段。
- `modifierContributions` 默认为 `[]`。
- 本阶段不提供 UI 手动编辑装备 contributions。

自定义护甲 payload 是输入格式，不是运行时结构。为兼容当前 UI，parser 必须继续接受中文 key payload：

```ts
{
  名称: string
  等级?: string
  护甲值?: number | string
  伤害阈值?: string
  特性名称?: string
  描述?: string
}
```

parser 可以同时接受英文字段 payload，但写入 `SheetData` 时统一归一化为 `equipment.armorSlot`。

清空装备时：

- 写入空 slot。
- 武器文本为空字符串。
- 护甲数字字段为 `null`。
- `modifierContributions` 为空数组。

## 备用武器交换

当前备用武器 UI 已经通过 checkbox 控件触发 slot 交换，而不是持久化选中状态。新结构应把这个行为表达成真实 slot swap：

```text
equipment.weaponSlots.inventory[index]
<-> equipment.weaponSlots.primary
```

或：

```text
equipment.weaponSlots.inventory[index]
<-> equipment.weaponSlots.secondary
```

交换整份 `WeaponSlot`，包括 `modifierContributions`。contribution ids 不变。备用武器交换到主/副槽后，它的 contributions 进入 active registry；从主/副槽换回备用后，它的 contributions 不再进入 active registry。

## Registry 行为

registry 收集装备 entries 时：

- 收集 `equipment.weaponSlots.primary.modifierContributions`。
- 收集 `equipment.weaponSlots.secondary.modifierContributions`。
- 收集 `equipment.armorSlot.modifierContributions`。
- 从 `equipment.armorSlot.baseArmorMax` 自动生成 `armorMax` base entry。
- 从 `equipment.armorSlot.baseThresholds` 自动生成 `minorThreshold` / `majorThreshold` base entries。
- 不收集 `equipment.weaponSlots.inventory`。

本阶段把当前护甲核心 base entries 也归入 equipment provider，不再使用旧顶层护甲字段作为 armor provider 输入。也就是说，护甲核心 base entries 和护甲 `modifierContributions` 的 source type 都使用 `"equipment"`：

```ts
source: { type: "equipment", id: "armor:current" }
```

`ModifierSourceType` 可以暂时保留 `"armor"` 以兼容其它代码，但新装备路径不再产出 `source.type === "armor"` 的护甲 entries。

装备 contribution 转成 runtime `ModifierEntry` 时：

```text
ModifierContribution + equipment provider context -> ModifierEntry
```

`source` 用于说明来源槽位，例如：

```ts
source: { type: "equipment", id: "weapon:primary" }
source: { type: "equipment", id: "weapon:secondary" }
source: { type: "equipment", id: "armor:current" }
```

展示 label 应动态组合装备名称和 contribution label，例如：

```text
塔盾：壁垒 +2
全板甲：极重 -1
```

不要把完整展示名直接存入 contribution label。装备名变化后，展示应自动更新。

## 兼容与验证

实现应覆盖：

- 新角色默认拥有完整空 `equipment`。
- 老存档顶层武器字段迁移到对应 weapon slots。
- 老存档顶层护甲字段迁移到 armor slot。
- 非法护甲规则字段迁移为 `null`。
- 旧备用武器 checkbox state 不迁移。
- 选择模板武器会写入 slot 文本和模板 contributions。
- 选择模板护甲会写入 slot 核心字段和模板 contributions。
- registry 只收集主/副武器和当前护甲，不收集备用武器。
- slot swap 会连同 contributions 一起交换。
- 旧顶层装备字段不再被 UI、store、registry 作为运行时字段读取。

## 开放问题

本阶段不解决以下问题：

- 装备 contribution 编辑 UI 的具体交互。
- final target 和 provider reference 的长期同步模型。
- 武器规则字段是否结构化。
- 备用武器槽数量是否可配置。
- 条件型装备效果如何表达。
