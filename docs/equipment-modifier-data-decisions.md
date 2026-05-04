# Equipment Modifier Data Decisions

日期：2026-05-04

本文记录当前已经达成的装备、护甲与 modifier provider 改造决策。它不是实现计划；后续实现前仍需要拆成正式 spec 和 plan。

全局 modifier provider / registry / target state 架构以 `docs/superpowers/specs/2026-05-04-modifier-provider-target-architecture-design.md` 为准。本文只记录装备 provider 相关的数据和 UI 决策。

## 范围

本次装备改造只处理装备相关数据：

- 主武器、副武器、备用武器。
- 当前唯一护甲。
- 装备提供的长期、无条件 modifier/base 来源。
- `data/list` 中武器和护甲模板提供默认 modifier contributions。
- 旧装备顶层字段迁移到新结构。

不处理：

- 全局 `SheetData` 分区重构。
- 攻击掷骰、伤害骰、条件型效果。
- 经历值目标 `experienceValues.${number}`。
- “应用参考值到最终字段”按钮。
- 每次 provider mutation 后立刻执行 modifier state reconciliation。
- 将所有 final target 字符串字段改成 number。

## 核心原则

装备文本和装备规则解耦：

- 用户修改装备名称、描述、伤害骰、特性文本时，不自动改变 modifier contributions。
- modifier contributions 只有在用户明确编辑装备加值面板时改变。
- 选择预设装备只是一种填表动作，会初始化装备文本和 contributions。
- 写入 `SheetData` 后，装备不再长期依赖 `data/list` 中的模板。

现有自动化行为保持不变：

- 选择护甲仍自动填写护甲值和伤害阈值。
- 手动编辑护甲基础值仍同步最终护甲值。
- 手动编辑护甲基础阈值仍同步最终伤害阈值。
- 装备 modifier contributions 不自动写入 final target。

## 新装备结构

装备数据归拢到 `SheetData.equipment`：

```ts
interface EquipmentData {
  weaponSlots: {
    primary: WeaponSlot
    secondary: WeaponSlot
    inventory: WeaponSlot[]
  }
  armorSlot: ArmorSlot
}
```

主武器和副武器槽位中的 contributions 生效。备用武器保存 contributions，但不参与 active registry 和当前来源收集。备用武器切换到主/副武器时，交换整份 `WeaponSlot`，contribution ids 不变；再次进入主/副装备位时按新的 active 来源处理，旧的 entry state 不要求保留。

护甲没有备用概念，角色卡同时只有一个护甲。

## 武器槽

武器槽第一阶段保持现有展示字段为字符串：

```ts
interface WeaponSlot {
  name: string
  trait: string
  damage: string
  feature: string
  modifierContributions: EquipmentModifierContribution[]
}
```

`trait` 和 `damage` 是明确技术债。本次不拆成 `damageType`、`range`、`attribute` 等结构化字段，因为当前 UI 允许用户自由编辑这些文本。

武器没有核心字段自动生成 base。武器对角色数值的影响全部来自 `modifierContributions`。

## 护甲槽

护甲核心规则字段改成数字结构：

```ts
interface ArmorSlot {
  name: string
  baseArmorMax: number | null
  baseThresholds: {
    minor: number | null
    major: number | null
  }
  feature: string
  modifierContributions: EquipmentModifierContribution[]
}
```

空护甲槽必须使用 `null`，不能用 `0`。空槽不生成护甲值或阈值来源。

护甲核心字段和 final target 语义不同：

- `armorSlot.baseArmorMax`：当前护甲本体提供的基础护甲值。
- `armorMax`：角色当前最终护甲值。用户层面仍显示规则术语“护甲值”。
- `armorSlot.baseThresholds`：护甲本体提供的基础阈值。
- `minorThreshold` / `majorThreshold`：角色当前最终伤害阈值，暂时保持现有 string 类型。

同一个事实不要存两份：

- `baseArmorMax` 不复制进 `modifierContributions`。
- `baseThresholds` 不复制进 `modifierContributions`。
- registry 根据这些核心字段自动生成对应 base entries。

## Modifier Contributions

装备 contribution 使用数组：

```ts
interface EquipmentModifierContribution {
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

`id` 是 sheet data 中的真实 contribution id，必须在整张角色卡内唯一。registry entry 直接使用这个 id，不再把槽位路径编码进 id。

`definition` 创建后不可原地修改。`target` 或 `kind` 变化的语义是删除旧 contribution，并创建新的 contribution id。`editable.label` 和 `editable.value` 可以原地修改。

规则：

- 选择/替换预设装备时，创建新的 slot 数据和新的 contribution ids。
- 主/副/备用武器交换时，交换整份 slot，ids 不变。
- 用户编辑 label、value 时，id 不变。
- 用户需要改变 target 或 kind 时，删除旧 contribution，并创建新的 contribution id。
- data/list 中的模板 id 只用于可读性或生成前缀，不承担运行时身份。

`value` 只允许 number。UI 可以接受 `+1`、`-2` 输入，但保存时必须解析为 number。

## 可用 Targets

装备 contributions 只允许当前明确支持的长期无条件 targets：

```ts
type EquipmentModifierTargetId =
  | "evasion"
  | "armorMax"
  | "minorThreshold"
  | "majorThreshold"
  | "hpMax"
  | "stressMax"
  | "proficiency"
  | "agility.value"
  | "strength.value"
  | "finesse.value"
  | "instinct.value"
  | "presence.value"
  | "knowledge.value"
```

不允许：

- `armorValue`
- `experienceValues.${number}`
- 攻击掷骰
- 伤害骰
- 条件型或场景型规则

`armorValue` 在新系统中不存在。所有规则文本中的“护甲值”在内部使用 `armorMax` target 表示。

## data/list 模板

武器模板：

- `primary-weapon.ts` 和 `secondary-weapon.ts` 暂时保留现有中文字段。
- 新增 `modifierContributions` 数组。
- `all-weapons.ts` 需要透传新增字段。

护甲模板：

- `armor.ts` 改成英文结构化字段。
- `护甲值` 改为 `baseArmorMax`。
- `伤害阈值: "7/15"` 改为 `baseThresholds: { minor: 7, major: 15 }`。
- 特性修正写入 `modifierContributions`。

模板层的 contributions 只用于选择预设时初始化 slot。保存到 sheet data 后，装备实例不依赖模板继续推导。

## UI 决策

装备加值编辑器属于 provider，不属于 target 面板：

- 武器/护甲区域提供入口，编辑该装备槽提供的所有 contributions。
- 现有 target modifier 面板继续按目标显示来源、选择 active base、禁用来源。
- 不在 target 面板里编辑装备本身的 contributions。

UI 不暴露内部 target id：

- `armorMax` 显示为“护甲值”。
- `evasion` 显示为“闪避值”。
- 六属性显示中文属性名。

装备来源展示应动态组合 provider 名称和 contribution label，例如：

```text
塔盾：壁垒 +2
全板甲：极重 -1
```

不要把完整显示名直接存入 contribution label。装备名变化后，展示应自动更新。

## 迁移

旧顶层装备字段只作为 migration 输入。迁移完成后运行时 `SheetData` 不再保留旧字段。

迁移规则：

- 旧主武器字段迁移到 `equipment.weaponSlots.primary`。
- 旧副武器字段迁移到 `equipment.weaponSlots.secondary`。
- 旧备用武器字段迁移到 `equipment.weaponSlots.inventory`。
- 旧护甲字段迁移到 `equipment.armorSlot`。
- 旧 `armorValue` 迁移到 `armorMax`，迁移后删除。
- 旧 `modifierState.byTarget.armorValue` 作为 migration 输入迁移到新 `modifierState.targetStates.armorMax` / `entryStates` 语义；迁移后运行时不再保留 `armorValue` target。
- 老存档不根据装备名称自动补充 modifier contributions。
- 老装备迁移后的 `modifierContributions` 默认为 `[]`。
