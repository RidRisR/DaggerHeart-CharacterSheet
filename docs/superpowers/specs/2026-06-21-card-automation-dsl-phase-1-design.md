# Card Automation DSL Phase 1 Design

日期：2026-06-21

状态：Initial design draft / 非实施计划

## Purpose

本文固定卡牌自动化 DSL 第一阶段的设计共识，用于后续深入设计和实现计划。

当前 modifier 自动化已经覆盖职业、等级、装备、升级项和用户手动修正。卡牌包导入也已经形成独立的 dry-run / commit workflow。剩余问题是：卡牌效果比装备复杂得多，不能直接把卡面文本塞进现有自动化，也不应让卡牌自动化直接修改角色存档。

第一阶段目标是为卡牌提供一个可验证、可解释、纯函数式的自动化描述层。卡牌进入角色存档并实例化后，自动化边界才执行 normalized IR；运行结果收敛为现有 modifier 系统可以消费的 `base` 或 `modifier` contribution。

本文不是实现计划。

## Current Consensus

- 卡牌包被导入时，卡牌模板本身不触发自动化。
- 只有卡牌进入角色存档，成为当前角色持有或配置中的实例后，才参与自动化计算。
- 卡牌自动化不直接修改角色存档字段。
- 卡牌 automation runtime 的最终 contribution 输出只能是现有自动化系统可以统一处理的基础值或修正值。
- 卡牌自动化遵守 No Guessing / Fast Failure：缺少必要输入或状态不满足约束时，不猜测默认值，不输出可能错误的 contribution，而是产生诊断。
- 第一阶段只支持可以从卡面结构、用户选择和当前角色表快照稳定推导的能力。
- 第一阶段不支持需要跑团运行时语境的能力，例如近战、远程、防守、攻击中、受到攻击后、消耗资源后、直到短休、敌人状态、场景内临时 token 等。
- 第一阶段需要支持通用用户选择机制，但具体 UI 和完整选择类型可以后续分层设计。
- 第一阶段不做 prose inference。自动化数据由卡牌包作者或内建数据维护者显式写入结构化 DSL 字段。
- 第一阶段不引入卡牌 IR effect 之间的依赖图、执行顺序或 topo sort。
- 第一阶段 IR 只描述贡献派生，不描述卡牌生命周期副作用。卡牌移动、删除、替换、实例化和 choice 写入可以进入同一个 modifier-aware boundary，但必须表现为外部 intent 的 source-state 写入，而不是 IR 节点。

## Phase 1 Scope

第一阶段自动化 target 与当前 modifier target universe 对齐：

- 闪避。
- 护甲值。
- 轻伤阈值、重伤阈值。
- 生命上限。
- 压力上限。
- 熟练度。
- 六大属性。
- 经历值。

第一阶段需要能表达以下已观察到的稳定能力类型：

- 固定加值，例如猿族闪避永久 +1、人类压力上限 +1。
- 固定基础值或基础值覆盖，例如无护甲时提供基础护甲和阈值。
- 从当前快照读取值，例如阈值 += 熟练度。
- 按等级或 tier 选值，例如坚毅铁卫在不同阶段给阈值 +1/+2/+3。
- 根据用户在领取或配置时做出的稳定选择展开不同效果，例如从固定奖励中选择两个不重复奖励。
- 根据当前角色配置中的卡牌集合判断条件，例如某领域卡数量 >= 4 时提供稳定加值。
- 根据装备槽状态判断条件，例如当前未装备护甲时启用 Bare Bones 类基础值。

## Non-Goals

第一阶段明确不处理：

- 战斗过程中的触发窗口。
- 一次性、每休息、每场景、每次攻击等状态化资源。
- 自动标记 HP、Stress、Armor Slot。
- 移动、删除、替换、复制或实例化卡牌。
- 在 IR effect 中激活 ability、撤销 ability、写入 choice state 或声明 choice 可变性规则。
- 攻击骰、伤害骰、优势劣势、重骰、希望和恐惧等掷骰过程。
- 反向从卡面自然语言推断 DSL。
- 卡牌 IR effect 输出依赖同一轮卡牌 IR effect 生成的其他输出。
- 跨卡牌 IR effect 的循环检测、拓扑排序和 fixpoint evaluation。

这些能力可以在后续阶段追加，但不应进入第一阶段的核心抽象。

## Core Model

卡牌自动化可以拆成三个结构化层次：

### Card Zones

第一阶段在 DSL 语义中定义两个角色卡牌区域：

- `loadout`：当前配置卡牌，对应 `sheetData.cards` 中的非空卡牌。
- `vault`：宝库卡牌，对应 `sheetData.inventory_cards` 中的非空卡牌。

当前实现里的 `inventory_cards` 虽然 UI 文案叫库存卡组，但在卡牌自动化 DSL 中直接按规则语义视为宝库。

自动化不能简单按数组位置决定是否生效。卡牌 ability 必须声明自己的 lifetime。默认情况下，ability 使用 `whileInLoadout`，也就是只有卡牌位于 `loadout` 时才贡献自动化结果。

第一阶段保留以下 lifetime 概念：

- `whileInLoadout`：卡牌位于当前配置时生效；离开配置后 contribution 消失。
- `permanentOnceClaimed`：卡牌实例存在后即视为已被选择 / 取得；只要 ability requirements 满足，就不依赖当前 zone 输出 contribution。之后即使卡牌进入 `vault`，对应 contribution 仍然保留。

`permanentOnceClaimed` 是为“选择此牌时永久获得某项加值，然后将此牌放入宝库”这类能力中的自动化贡献部分准备的。Phase 1 fixture 中没有“卡牌实例已经在角色存档中，但永久能力尚未领取”的状态；因此第一阶段不引入单独 active / claimed gate。卡牌实例存在本身就是“已经选择 / 取得”的事实。对无 choice 的永久能力，实例存在即满足门控；对有 choice 的永久能力，实例存在且 required choice 有效时贡献。

“然后将此牌永久放入你的宝库”是 card lifecycle / intent orchestration，不属于 Card Automation IR。IR 不声明卡牌应移动到哪里，也不负责执行移动。外部选牌流程或 UI 可以在同一个用户流程中提交“选择 / 取得卡牌实例”和“移动卡牌到 vault”等明确 intent，但这些写状态动作属于自动化边界的 source-state interpretation，不属于 resolver 或 EffectIR。

Phase 1 不实现专门的“选择此牌后自动放入宝库”流程。若规则文本要求领取后进入宝库，第一阶段可以由用户手动移动卡牌，或等待后续 lifecycle orchestration 提交明确移动 intent。这个流程缺失不影响 `permanentOnceClaimed` 的数值语义：只要卡牌实例存在且 requirements 满足，resolver 就能按实例 IR 和 choice state 派生 contribution。

Phase 1 不保留 `inactiveStored`。只在 `vault` 中存放但不贡献的卡牌，不需要声明一个 lifetime mode；不满足 `whileInLoadout` 条件，或 `permanentOnceClaimed` 的 required choice 未满足，已经足以表达“不贡献”。

删除卡牌实例会删除该实例持有的 automation state，因此对应 contribution 也会消失。具体语义：

- 删除 `loadout` 中的 `whileInLoadout` 卡牌：贡献消失。
- 将 `permanentOnceClaimed` 卡牌从 `loadout` 移动到 `vault`：实例仍存在，贡献保留。
- 删除 `vault` 中的 `permanentOnceClaimed` 卡牌：实例和 choice state 都不存在，贡献消失。
- 复制或重新选择同一模板卡不应复制 choice state，除非未来显式设计“复制实例”语义；第一阶段默认新实例新状态。

### Card Ability State

第一阶段不为永久获得类能力保存独立 active / claimed state。Card ability state 只保存该 ability 需要的用户选择结果。概念模型是：

```ts
type CardAutomationState = {
  version: 1;
  abilities: Record<string, CardAbilityState>;
};

type CardAbilityState = {
  choiceValues?: Record<string, string[]>;
};
```

具体 TypeScript 定义可以在实现计划中细化，但语义必须稳定：

- `CardAbilityState` 是 ability 级别的持久 choice state 容器，不是 activation state。
- `choiceValues` 是 `CardAbilityState` 内部的原始用户选择字段。它只保存字符串 ID，不保存选项含义、label、effect 或 target 解释。
- 无 choice 的 `permanentOnceClaimed` ability 不需要 `CardAbilityState`；只要卡牌实例存在，且其它条件满足，就可以贡献。
- 有 choice 的 `permanentOnceClaimed` ability 在 required choice 缺失或无效时不贡献，并产生 requirement / diagnostic。
- `setCardAbilityChoiceValues` 对整个 ability 的 `choiceValues` 做整体替换，不做单个 choice key 的局部 patch。
- choice 替换语义不区分 `whileInLoadout` 和 `permanentOnceClaimed`。`lifetime` 只决定贡献在什么 zone / 生命周期下生效，不决定 choice 是否允许替换。
- 边界收到 choice 替换 intent 时，必须用当前实例 IR 重新校验完整 `choiceValues`。校验成功才替换旧 state；校验失败必须保持旧 state 原样。
- 如果用户需要“撤销某个选项”或“重新运行选择”，Phase 1 的语义也是提交一份新的完整 `choiceValues`。resolver 不支持反向执行，也不从旧贡献中推导补偿操作。
- automation resolver 只能读取 `CardAbilityState`，不能创建、修改或删除 choice。创建或修改 ability state 属于自动化边界收到的外部 intent interpretation。

```text
external choice / card lifecycle intent
  -> runModifierAutomationBoundary(sheetData, intent)
  -> boundary interprets intent and advances source state
  -> persisted card instance and choice state are updated
  -> build snapshot
  -> pure provider derivation reads instance existence and choice state
```

外部 intent 可以来自 UI 按钮、选牌流程、导入后的初始化流程或未来其他角色卡操作。自动化边界不关心 intent 的 UI 来源，只关心它是否是一个明确的卡牌实例 / choice 写入命令。后续 contribution 不是“执行一次效果”得到的结果，而是每轮从持久化实例 IR、choice state 和 snapshot 派生出来的稳定 contribution。

### Source-Owned Automation State

第一阶段沿用“自动化来源持有自身状态”的方向。

外部卡包和编辑器 draft 持有 author-provided Card Automation Definition。安装后的卡牌模板持有 compiled normalized IR。卡牌进入角色存档成为实例后，该实例持有执行卡牌自动化所需的 normalized IR 副本和 automation state，例如 choice state。

概念形态：

```ts
type CardInstanceAutomationState = {
  version: 1;
  abilities?: Record<string, CardAbilityState>;
};
```

它应挂在对应 `StandardCard` 实例上，而不是作为独立的 `sheetData.cardAutomationState` 全局索引保存。

所有非空卡牌实例都需要一个独立于模板 ID 的稳定 `instanceId`。现有 `StandardCard.id` 继续表示卡牌模板 / 内容 ID，用于卡牌库查找、导入冲突检查和图片关联；它不能承担实例身份。

概念形态：

```ts
type AutomatedStandardCard = StandardCard & {
  instanceId?: string;
  automation?: CardAutomationIR;
  automationSource?: CardAutomationSourceSnapshot;
  automationState?: CardInstanceAutomationState;
};

type CardAutomationSourceSnapshot = {
  templateId: string;
  packId?: string;
  templateAutomationRevision?: string;
  copiedAt?: string;
};
```

`CardAbilityState` 中的 `choiceValues` 归属到具体 ability，而不是挂在卡牌实例顶层。这样可以避免同一张卡多个 ability 的 choice id 冲突，也让 choice 替换可以以单个 ability 为边界整体发生。

`instanceId` 规则：

- 非空卡牌进入角色存档时必须拥有 `instanceId`，不管该卡当前是否带有 `automation`。
- 移动卡牌时保留 `instanceId`、`automation`、`automationSource` 和 `automationState`。
- 从卡牌库选择一张模板卡覆盖空槽时，创建新的 `instanceId`。
- 用新模板覆盖已有卡牌时，必须视为新实例，创建新的 `instanceId`，丢弃旧 `automation`、`automationSource` 和 `automationState`，避免旧 ability 状态误套到新卡。
- 旧存档中的非空卡牌通过 `SheetData` schema migration 补齐 `instanceId`。
- 空卡占位不需要稳定 `instanceId`。

第一阶段应通过 `SheetData` schema migration 为旧存档非空卡牌补齐 `instanceId`，而不是在每次加载归一化或每次自动化边界中临时懒生成。当前角色存档 schema 已有版本化迁移机制；新增 card instance identity 应提升 `CURRENT_SCHEMA_VERSION`，例如从 2 升到 3，并提供幂等迁移。

迁移补 `instanceId` 是纯结构补齐，不是规则效果推断：

- 不生成 `automation` IR。
- 不生成 `automationState`。
- 不生成 choice。
- 不输出 contribution。
- 不因为卡包当前安装状态去查模板或补模板 automation。

批量操作必须避免逐卡重复触发自动化。旧存档加载、角色导入或大批量 normalization 时，应先完成 schema migration / normalization，再在进入 production store replacement 或显式 modifier-aware boundary 时集中触发一次自动化同步。不要在“给第 N 张卡补 `instanceId`”的循环内每次重算。

角色卡选择 / 替换动作必须显式实例化模板卡，而不是把模板对象原样写入角色表：

- 选择模板放入空槽：复制模板读模型，生成新的 `instanceId`，复制模板上的 normalized `automation` IR，记录 `automationSource`，初始化空 `automationState`。
- 如果模板带有 `automation`，实例化必须成功复制完整 normalized IR；复制失败时该选卡 / 替换动作必须失败或产生明确错误，不能创建半自动化实例。
- 用新模板覆盖已有卡牌：生成新的 `instanceId`，丢弃旧 `automation`、`automationSource` 和 `automationState`。
- 在 `loadout` 和 `vault` 之间移动：保留原 `instanceId`、`automation`、`automationSource` 和 `automationState`。
- 删除卡牌：删除实例，因此 `automation`、`automationState` 和对应 contribution 一起消失。
- 旧存档或手工编辑导致实例缺少 `automation` 时，即使当前模板存在 automation，系统也不得自动补齐。它只能产生 diagnostic，并等待用户显式执行“从当前模板补齐 / 刷新自动化”动作。

现有实现里 generic `setSheetData` 是低层局部更新入口，不保证进入自动化同步；测试也明确保留了 generic `setSheetData` 不自动同步的行为。因此 Phase 1 卡牌自动化不能依赖 React 组件直接 `setSheetData({ cards })` 或 `setSheetData({ inventory_cards })`。所有会改变卡牌实例集合、实例位置、实例 IR 或实例 choice state 的动作，都必须收敛到专门的 modifier-aware card action / boundary intent。

卡牌相关 modifier-aware 行为至少包括：

- 选牌到 `loadout`。
- 选牌到 `vault`。
- 删除 `loadout` 卡牌。
- 删除 `vault` 卡牌。
- `loadout` 和 `vault` 之间移动卡牌。
- 用新模板覆盖已有非空卡牌。
- `setCardAbilityChoiceValues`。
- 未来 `refreshCardAutomationFromTemplate`。

这些动作可以在一次用户流程中批量提交，但应作为一个边界事务集中派生 provider output，而不是每个数组写入各自触发一次自动化。

逻辑身份使用 `instanceId + abilityId`。物理存储仍在对应卡牌对象上。

需要区分两件事：

- 持久化：卡牌实例保存生成 contribution 所需的事实，例如 normalized IR 和 choice。
- 派生：自动化边界每次从卡牌实例自带的 normalized IR、卡牌实例状态和 snapshot 重新生成 `ModifierContribution[]`。

卡牌实例不应持久化一份已经算好的 card-sourced contribution。这样可以避免等级、熟练度、装备槽、loadout / vault 状态变化后出现过期 contribution。

### Instance Automation Authority And Template Drift

第一阶段采用实例 IR 权威模型：

- 卡牌模板持有新增卡牌时使用的当前 automation IR。
- 卡牌进入角色存档成为实例时，必须把当时的 normalized `automation` IR 完整复制到卡牌实例。
- requirements、diagnostics 和 runtime projectors 都以卡牌实例上的 `automation` IR 为执行权威。
- 卡包是否安装、禁用、移除或更新，不得改变已有实例的自动化输出。
- `automationSource` 只用于来源追踪、template drift diagnostics 和显式 refresh，不参与 resolver / projector 输出权威判断。

这样可以保证角色存档自足可重放。导出存档后导入到另一台未安装同一卡包的终端，只要存档中的卡牌实例带有 normalized IR，就应得到相同的自动化结果。

卡包禁用和卡包缺失的运行时语义相同：它们可以影响新增选牌、模板查找、显式 refresh availability 和 drift diagnostics，但不得阻断已有 `cardInstance.automation` 的执行。

normalized IR 必须包含 `revision`。该 revision 是实例自动化逻辑的身份，不是对当前模板的动态引用：

```ts
cardInstance.automation.revision
```

如果当前安装的模板仍可解析，系统可以比较模板 IR revision 和实例 IR revision：

```text
currentTemplate.automation.revision
vs
cardInstance.automation.revision
```

比较结果只用于 diagnostics：

- revision 相同：无提示。
- revision 不同：产生 warning / updateAvailable，但继续使用实例 IR 输出 contribution。
- 当前模板缺失：不影响实例自动化执行；可以产生 dependency warning，但不得因此移除 contribution。
- 实例自身 `automation` 缺失或无效：对应 ability 不输出 contribution，并产生 error。
- 实例 `automationState` 中存在实例 IR 未声明的 ability state：对应 state 是 orphan state，不输出 contribution，并产生 diagnostic。

系统不判断新模板语义是否“正确”，也不自动把已有实例切换到新模板。只要会改变实例 `automation` IR，就必须经过用户明确确认。

未来可以提供显式刷新 intent：

```ts
type RefreshCardAutomationFromTemplateIntent = {
  kind: "refreshCardAutomationFromTemplate";
  cardInstanceId: string;
  expectedCurrentAutomationRevision?: string;
};
```

边界收到该 intent 后，必须重新解析当前安装模板，并检查 `expectedCurrentAutomationRevision` 是否仍匹配实例当前 IR。刷新成功才会用当前模板的 normalized IR 替换实例 `automation`，并更新 `automationSource`。刷新不得自动发生；新 IR 必须能完整解释既有 `automationState`，否则刷新 intent 失败。这里的“完整解释”不是只检查旧 choice id 仍存在，而是要求既有 `choiceValues` 能按新 IR 的 requirement chain 从空状态 replay 到同一个有效状态。模板缺失、模板不可用、当前 revision 不匹配或既有 state 无法被新 IR 安全解释时，刷新必须失败并保持实例 `automation`、`automationSource` 和 `automationState` 原样。刷新失败时不得自动丢弃 choice、不得降级为半自动化状态。未来如果需要强制刷新，应作为单独的显式覆盖操作设计。

### Choice

Choice 描述用户必须提供或可以切换的结构化输入。

示例：

- 当前选择增强哪一个经历。
- 当前某个变体卡的配置项。
- 从固定选项中选择两个不重复奖励。
- 从属性或经历 target 中选择一个或多个目标。

Choice 是卡牌实例状态的一部分，而不是卡牌模板状态的一部分。同一张模板在不同角色存档中的 choice 可以不同。

`choiceValues` 不是和 `CardAbilityState` 平级的概念。它是 `CardAbilityState` 内部的字段：

```text
CardInstance
  -> automationState
    -> abilities[abilityId]: CardAbilityState
      -> choiceValues
```

也就是说，`CardAbilityState` 在 Phase 1 只负责持久化该 ability 的原始选择结果。

第一阶段 choice 采用三层模型：

```text
persisted raw choiceValues
  -> validate / resolve against ability choice IR
  -> resolved choice read model
  -> card automation resolver
```

角色存档只保存用户选择结果，不保存选项 label、effect、target 解释或 UI 状态：

```ts
type CardChoiceValues = Record<string, string[]>;
```

语义：

- key 是 ability 内部的 `choiceId`。
- value 是用户选择的稳定字符串 ID 数组。
- `selectOne` 保存一个字符串，例如 `{ benefit: ["hp"] }`。
- `selectMany` 保存多个 option id，例如 `{ benefits: ["hp-slot", "thresholds"] }`。
- `targetSelectMany` 保存 target id，例如 `{ boostedAttributes: ["strength.value", "agility.value"] }`。
- `targetSelectMany` 使用 slot identity，不使用 label / content identity。经历 target 保存的是经历槽位 id，例如 `experienceValues.0`，不是激活时的经历名称。

这些字符串没有全局意义，也不应被裸读。它们必须通过对应 ability 的 `CardChoiceIR` 解释。也就是说，存档保存的是“选择了哪个 ID”，IR 保存的是“这个 ID 在当前自动化流程中的含义”。

Choice IR 必须显式定义字符串 ID 的语义：

```ts
type CardChoiceIR = {
  id: string;
  kind: "selectOne" | "selectMany" | "targetSelectMany";
  cardinality: {
    min: number;
    max: number;
    unique: boolean;
  };
  domain: CardChoiceDomainIR;
  requiredWhen?: CardConditionIR;
};

type CardChoiceDomainIR =
  | {
      kind: "staticOptions";
      options: CardChoiceOptionIR[];
    }
  | {
      kind: "modifierTargetGroup";
      group: "attributes" | "experiences";
    };

type CardChoiceOptionIR = {
  id: string;
  label: string;
  effects?: CardOptionEffectIR[];
};
```

运行时必须先把 raw `choiceValues` 解析成结构化 read model，再交给 resolver：

```ts
type ResolvedCardChoice = {
  choiceId: string;
  kind: "selectOne" | "selectMany" | "targetSelectMany";
  selectedIds: string[];
  selectedOptions?: CardChoiceOptionIR[];
  selectedTargets?: ModifierTargetId[];
};

type ResolvedCardAbilityState = {
  choices: Record<string, ResolvedCardChoice>;
};
```

硬规则：

- `choiceValues` 是私有存储格式，只允许 card automation resolver 读取。
- UI、projector、modifier provider 不能直接消费 raw `choiceValues`。
- raw string 必须通过当前 ability 的 `choices[].domain` 解析成 option 或 target。
- 多余的 choice key 不是 harmless metadata；应产生 runtime diagnostic。

第一阶段 choice 能力边界：

- `selectOne`：从固定选项中选择一个。
- `selectMany`：从固定选项中选择多个，并支持 `min`、`max`、`unique`、每个选项最多选择次数等结构化约束。
- `targetSelectMany`：从白名单 target group 中选择一个或多个 target，例如属性或经历。

第一阶段暂不支持自由文本输入、自由数字输入、动态公式输入或依赖另一个 choice 动态生成 options。

Choice 校验遵守 No Guessing / Fast Failure：

- 缺少必填 choice 时，相关 ability 不输出 contribution。
- `choiceValues` 中出现 ability IR 未声明的 choice id 时，相关 ability 不输出 contribution，并产生 diagnostic。
- `choiceValues` 中的字符串无法在 choice domain 中解析时，相关 ability 不输出 contribution。
- choice 不满足 `min`、`max`、`unique` 或每项选择次数约束时，相关 ability 不输出 contribution。
- `setCardAbilityChoiceValues` 对整个 ability 的 `choiceValues` 做整体替换；替换后下一次自动化边界重算。
- choice 替换不按 `lifetime` 特判。`whileInLoadout` 和 `permanentOnceClaimed` 都使用同一套完整校验、成功替换、失败不写入的语义。
- 永久能力如果 required choice 数据丢失或无效，不输出 contribution，并产生存档状态异常诊断。
- 永久能力如果 target 暂时失效，例如经历槽位变空，choice state 不自动撤销，只是当前 contribution blocked。只要同一槽位重新变成合法 target，或用户提交新的合法完整 `choiceValues`，下一次 resolver 运行时 contribution 可以恢复。

纯 JSON DSL 在 choice 和 effect 增多后会变得难读。第一阶段先固定能力边界，不在本文决定最终作者语法或可视化编辑形态。

### Automation Definition And Normalized IR

第一阶段区分 external automation definition、normalized automation IR 和 runtime resolver / projectors。

```text
External Card Automation Definition
  -> normalize / validate
  -> Normalized Card Automation IR
  -> resolveCardAutomation(snapshot, instance)
  -> ResolvedCardAutomation
  -> projectRequirements / projectDiagnostics / projectContributions
```

Card Automation Definition 是卡包作者、编辑器、formal import 和 Editor Draft Export 面对的外部格式。它可以由人手写，也可以由 UI builder 生成。Normalized Card Automation IR 不直接作为卡包外部格式暴露，否则 resolver / projector 内部结构会被锁成对外语法。

Normalized Card Automation IR 是 resolver 唯一解释的内部结构。IR 必须稳定、严格、低歧义、容易测试。

外部卡包的 `automation` 字段保存 Card Automation Definition，而不是 `CardAutomationIR`：

```ts
type CardAutomationDefinition = {
  format: "daggerheart.card-automation.definition.v1";
  mode: "lowLevel";
  body: CardAutomationLowLevelDefinition;
};
```

Phase 1 只支持 `mode: "lowLevel"`。`body` 可以非常接近内部 IR，尤其适合内建卡牌、测试 fixture、早期编辑器和内部维护。因为 formal import 接受该结构，所以第三方卡包作者也可以手写它；系统必须把它当作受支持的低层结构化自动化格式进行 validation、diagnostics 和兼容性处理。

`lowLevel.body` 应尽量接近 normalized IR，只允许最小语法糖。Phase 1 允许的 sugar 白名单：

- `lifetime` 缺省时按 `whileInLoadout` 编译。
- effect id 可省略，由 normalizer 生成稳定 id。

除此之外，Phase 1 不支持表达式、effect、target、choice 或 condition 的多套简写。需要更友好的写法时，应放到 Phase 2+ authoring DSL / builder，而不是扩张 low-level definition。

Card Automation Definition wrapper 不带 `revision`。它只声明外部输入格式和模式。真正代表自动化逻辑身份、用于实例 drift / refresh 诊断的是 compiled `CardAutomationIR.revision`。第一阶段不引入 Definition revision，避免出现两个需要解释的自动化版本来源。

`body` 不允许携带 internal IR 的 `format` 或 `revision` 字段。即使 `body` 的结构接近 IR，它也只是 low-level definition，不是 `CardAutomationIR`。dry-run / normalizer 必须在编译后生成真正的 `CardAutomationIR.format` 和 `CardAutomationIR.revision`。

Card Automation Definition wrapper 和 `body` 都必须严格禁止未知字段。automation 子树中出现 schema 未声明字段时，dry-run 失败；系统不能静默丢弃这些字段，因为那会让作者误以为某个自动化配置已经生效。未来扩展应通过新的 `format`、新的 `mode` 或明确加入 schema 的字段完成。

但该格式的产品定位仍然是 low-level automation format：它适合机器生成、内建维护和精确测试，不代表推荐的人类手写体验，也不等同于长期公开权威 authoring DSL。

dry-run 会把 Card Automation Definition normalize / compile 成 `CardAutomationIR`。安装后的卡牌模板使用 `automation` 字段保存 compiled normalized IR，表示可在实例化时复制到角色存档的可执行 IR，不表示作者原始 Definition。

Card Automation Definition schema、low-level normalizer、normalized IR validator 和 revision canonicalization 必须放在同一个共享领域模块中。formal import dry-run、editor validation、builtin / fixture 编译和未来测试工具都必须调用这套模块，而不是各自实现一份 parser / validator。

共享模块的职责是：

- 校验 external `CardAutomationDefinition` wrapper。
- 校验 low-level `body` 的 strict schema。
- 把 low-level definition normalize / compile 成 `CardAutomationIR`。
- 生成或校验 stable `abilityId` / `effectId`。
- 执行 normalized IR validation。
- 生成 `CardAutomationIR.revision`。
- 输出结构化 diagnostics 和 source path。

共享模块不负责：

- 读取或写入卡包 storage。
- 读取或写入 editor draft。
- 读取或写入角色存档。
- 运行 resolver / projector。
- 从卡面自然语言推断 automation。

为避免歧义，IR 自身必须带格式标记：

```ts
type CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1";
  revision: string;
  abilities: CardAbilityIR[];
};
```

installed card template 不保存作者原始 Definition。Phase 1 不要求从 installed template IR 反向生成 Card Automation Definition，也不要求 `Definition -> IR -> Definition` 无损往返。

对外导出仅指 Editor Draft Export。编辑器导出应从 Content Pack Draft / editor draft state 写出 Card Automation Definition wrapper，而不是把 installed template IR 当作外部语法输出。运行时已安装卡包不是第一阶段的外部导出来源；如果未来需要从 installed storage 导出卡包，应作为单独导出设计处理。

编辑器 draft 全程只保存 Card Automation Definition 原文。编辑器内不运行卡牌自动化，也不需要持有 compiled IR。Editor Draft Validation 可以通过 formal dry-run 临时编译 Definition，拿到 diagnostics 和 normalized preview，但该 IR 结果不得回写 draft。只有 formal import commit 后，installed template 才保存 compiled IR。

内建卡牌和 regression fixture 的源数据也应写 Card Automation Definition，而不是手写 compiled IR。它们必须通过同一套 dry-run / compile / IR validation 流程生成 installed template IR。这样 builtin-base、Void1.5 和第三方卡包使用同一外部格式入口，fixture 才能真实覆盖第三方能力。

如果后续引入短语化 DSL、可视化 builder 或其它更易读的作者格式，它们都必须编译 / normalize 到同一份 Card Automation IR。runtime resolver 仍然只解释 normalized IR。

Phase 1 不设计额外的人类友好 DSL 语法。第一阶段真正要证明的是：稳定 IR、dry-run validation、实例 IR 权威、choice state、runtime diagnostics 和 modifier contribution 输出能够共同跑通，并覆盖 `builtin-base` 与 Void1.5 的目标 fixture。

更友好的短语化 DSL、可视化 builder 或第三方作者体验属于 Phase 2+ authoring experience。它们不阻塞自动化基底实现，也不应反向改变 Phase 1 resolver 对 normalized IR 的依赖。

`revision` 是 normalized IR 的稳定签名。推荐由 dry-run / normalizer 对 canonical normalized IR 生成 hash，例如 `sha256:<digest>`。签名输入必须排除 `revision` 字段本身，避免自引用签名。第一阶段可以把除 `revision` 外的完整 normalized IR 都纳入签名，保持简单和保守；未来如果需要排除非语义字段，可以单独设计 canonicalization 规则。

IR 设计原则：

- resolver 只读取 normalized IR，不读取外部 Card Automation Definition。
- IR 不保留作者语法糖。
- IR 不允许任意 `sheetData` path reader。
- IR 不允许副作用。
- normalization 负责补默认值、生成可重算 effect id、校验 choice 约束，并把作者语法糖展开为 IR。
- IR validation 失败时 fast fail，不进入 runtime resolver。
- 内建卡牌和第三方卡牌必须使用同一套 normalized IR schema、validator、resolver 和 projector。builtin 不能拥有私有自动化路径，否则第一阶段 fixture 覆盖无法代表真实第三方能力。

概念形态：

```ts
type CardAbilityIR = {
  id: string;
  label: string;
  lifetime: CardLifetimeIR;
  choices: CardChoiceIR[];
  when?: CardConditionIR;
  effects: CardEffectIR[];
};

type CardLifetimeIR =
  | { kind: "whileInLoadout" }
  | { kind: "permanentOnceClaimed" };
```

### Normalized IR Node Boundary

Normalized IR 是有限节点集合，不是通用表达式语言。所有节点都必须是 tagged union，所有 selector 都必须读取 `CardAutomationSnapshot` 白名单。

第一阶段 `ConditionIR` 允许：

- `all`。
- `any`。
- `not`。
- `cardCount`。
- `equipmentSlotEmpty`。
- `equipmentSlotFilled`。
- `choiceEquals`：resolved choice 恰好选择某个 id。
- `choiceIncludes`：resolved choice 包含某个 id。

第一阶段 `ConditionIR` 不允许读取当前 HP、Stress、Hope、敌人、距离、攻击、防守或休息资源。

Choice validation 不通过 `ConditionIR` 表达。缺失 choice、未知 choice key、非法 option / target 或数量不合法属于 resolver diagnostic；发生这类错误时，对应 ability 不输出 contribution。`choiceEquals` 和 `choiceIncludes` 只能读取已经成功 resolve 的 choice。

第一阶段 `ValueIR` 允许：

- number literal。
- `readTarget`：读取 pre-card target value。
- `readLevel`。
- `readTier`。
- `readProficiency`。
- `readAttribute`。
- `add`。
- `subtract`。
- `multiply`。
- `divide`。
- `floor`。
- `ceil`。
- `round`。
- `min`。
- `max`。
- `valueByTier`。

`divide` 不做隐式取整。任何需要整数结果的规则都必须显式使用 `floor`、`ceil` 或 `round`，否则 evaluation 结果保留小数并由目标值校验决定是否可接受。

当卡牌规则文本只说“某个值的一半”且没有进一步指定取整方向时，Phase 1 约定默认向上取整，即表达为 `ceil(value / 2)`。例如“闪避值获得等同于敏捷值一半的加值”应使用 `ceil(readAttribute(agility) / 2)`。

第一阶段 `ValueIR` 不允许：

- random / dice。
- JavaScript expression。
- arbitrary path reader。
- 读取本轮 card output。
- mutation。

第一阶段 `TargetIR` 允许：

- fixed modifier target。
- selected targets from `targetSelectMany`。

第一阶段 `TargetIR` 不允许字符串拼接，也不允许从自然语言推断 target。

第一阶段 `EffectIR` 允许：

- `emitModifier`。
- `emitBase`。
- `emitWhen`：在 `ConditionIR` 为真时展开一组 nested effects。
- `emitEachSelectedOptionEffect`：按 resolved choice 中的 selected options 展开 option effects。
- `emitEachSelectedTarget`：按 resolved choice 中的 selected targets 逐个产出 effect。

`EffectIR` 只能产出 card-sourced contribution，不允许写 `sheetData`、标记 HP / Stress / Armor、移动卡牌、修改 choice state、生成攻击 / 伤害 / 掷骰效果，或调用外部函数。

`EffectIR` 不直接解释 raw `choiceValues` 字符串。所有 choice 相关 effect 都必须通过 resolved choice read model 消费 `selectedOptions` 或 `selectedTargets`。

第一阶段支持有限、声明式、无副作用的条件分支，但不支持通用程序控制流。`emitWhen` 只能决定一组 effects 是否参与输出；它不能循环、递归、动态生成 effect、动态生成 target、写入存档、读取本轮 provider output，或改变其他 effect 的执行环境。

这意味着第一阶段允许表达“如果用户选择模式 A，则对这两个经历 +2；如果选择模式 B，则对一个经历 +3”这类稳定分支，但不允许表达任意脚本。

### How To Read Phase 1 IR Capabilities

为了降低讨论抽象度，后续讨论 IR 时应优先使用“能力卡片”而不是直接讨论 AST 名称。

### Automation IR Responsibility Boundary

Card Automation IR 的责任边界必须比“卡牌规则文本”窄。IR 只描述当前角色表快照和当前卡牌 ability state 下，某个卡牌实例可以派生出哪些 `base` / `modifier` contribution。

IR 可以表达：

- 这张卡的某个 ability 何时具备贡献资格，例如在 `loadout` 中，或 `permanentOnceClaimed` 实例存在且 requirements 满足。
- 需要哪些结构化用户选择，以及这些选择在当前分支中是否 required。
- 如何从 snapshot 和 resolved choice 计算稳定数值。
- 在有限条件满足时，输出哪些 card-sourced contribution。
- `permanentOnceClaimed` ability 即使卡牌在 `vault` 中也可以继续贡献。

IR 不能表达：

- 把卡牌从 `loadout` 移动到 `vault`。
- 替换、删除、复制或实例化卡牌。
- 激活 ability、撤销 ability、直接写入 choice state、声明 choice 可变性规则。
- 标记 HP、Stress、Armor Slot、Hope 或任何运行时资源。
- 发起攻击、伤害、掷骰、休息、场景或回合流程。
- 要求 UI 打开哪个弹窗、执行哪个 wizard step，或决定按钮如何展示。
- 任何写入 `sheetData` 的 lifecycle 操作。

这些非 IR 责任属于 card lifecycle、UI orchestration 或 modifier-aware boundary intent。它们可以和 automation resolver 使用同一个自动化边界事务，但不能进入 `CardAutomationIR`、`ConditionIR`、`ValueIR`、`TargetIR` 或 `EffectIR`。

判断一项卡牌文本是否属于 Phase 1 IR 的方法：

```text
如果把所有写状态动作都先完成，只留下一个稳定角色表快照和 CardAbilityState，
这段文本是否还能被纯函数式地转换成 base / modifier contribution？
```

如果答案是否定的，它不是 Phase 1 IR 能力。它可能是 lifecycle intent、UI 流程、运行时触发规则，或后续阶段能力。

第一阶段 IR 可以按五类能力理解：

- 读快照：从 `CardAutomationSnapshot` 读取等级、tier、熟练度、属性、pre-card target、卡牌数量、装备槽状态和 resolved choice。
- 判断条件：用有限 `ConditionIR` 判断配置是否满足，例如领域卡数量、装备槽是否为空、用户是否选择某个 option。
- 计算数值：用有限 `ValueIR` 做加减乘除、取整、min/max、按 tier 取值。
- 选择目标：固定 target，或从 resolved `targetSelectMany` choice 取得目标列表。
- 输出贡献：输出 base / modifier，展开选中 option 的 effects，或在条件满足时展开一组 effects。

一个 IR 能力如果不能放进这五类之一，默认不进入第一阶段。

后续给非实现人员解释 IR 时，建议用 fixture-driven 表格：

```text
卡牌能力
  -> 需要读什么 snapshot
  -> 需要哪些用户选择
  -> 需要什么条件
  -> 需要怎么算数值
  -> 最终输出哪些 contribution
```

例如 Bare Bones：

```text
读：装备槽是否有护甲、力量属性、tier
选择：无
条件：armor slot empty
计算：armor = 3 + strength；threshold = valueByTier
输出：armorMax base、minorThreshold base、majorThreshold base
```

这种表格应成为后续审查 IR 表达力的主要方式；AST 细节只在实现计划中展开。

### IR Capability Boundary And Review Checklist

第一阶段 IR 设计需要被严格把关。后续可以派独立审查者或子代理按本节检查：它是否足够覆盖 fixture，同时是否避免滑向通用脚本语言。

评价一个 IR 设计是否合理，应优先使用这些指标：

- Fixture coverage：`builtin-base` 和 Void1.5 的 Phase 1 must-support 能力能否不用 hack 表达。
- Determinism：同一 boundary snapshot、同一实例 IR、同一 Card Ability State 必须产生同一 contribution 与 diagnostics。
- No Guessing：缺少 choice、缺少 snapshot 值、表达式非法、状态不一致时必须失败并诊断，不能默认 0、默认 false 或猜最近值。
- Boundary correctness：Card Automation Definition、Normalized Card Automation IR、Card Instance、Card Ability State、Requirement 和 Runtime Diagnostic 的职责不能互相泄漏。
- Instance replayability：角色存档必须自足；卡包缺失、禁用或更新不能改变已有 Card Instance 的有效实例 IR 输出。
- Minimality：没有真实 fixture 压力的节点应推迟或标记风险，避免第一阶段膨胀成通用脚本语言。
- Extensibility：未来能通过新的 definition format、mode 或 IR node 扩展，而不改变已有 IR 语义。
- Implementation fit：target、source identity、modifier registry、card instance storage 和 import dry-run 要能自然接到现有系统。
- Authoring clarity：即使 Phase 1 只提供 low-level definition，也要避免让作者误把 internal IR marker、runtime state 或裸 choice string 当作可写语义。
- Safety：schema 必须 strict；IR 不允许任意 path reader、JS 表达式、循环、递归、外部调用或副作用。

第一阶段明确支持：

- 固定 base / modifier 输出。
- 从 snapshot 读取白名单值。
- 有限数值表达式：加、减、乘、除、取整、min / max、按 tier 查表。
- 有限条件：all / any / not、卡牌数量、装备槽为空 / 非空、resolved choice 等于或包含某个 id。
- 有限条件分支：`emitWhen` 只决定一组 effects 是否参与输出。
- 固定 target 输出。
- 从 resolved `targetSelectMany` choice 展开 target 输出。
- 从 resolved `staticOptions` choice 展开选中 option 的显式 effects。
- requirement resolver 基于当前 `choiceValues` 和有限 `ConditionIR` 判断 `requiredNow`。

第一阶段明确不支持：

- 循环、递归、fixpoint evaluation。
- JavaScript expression 或任意脚本。
- 任意 `sheetData` path reader。
- 动态生成 effect。
- 动态生成 target。
- 字符串拼接 target。
- 读取本轮 provider output 或本轮 card output。
- effect 写入 `sheetData`。
- effect 标记 HP、Stress、Armor Slot。
- effect 移动卡牌、激活 ability、修改 choice。
- 随机数、骰子、攻击、伤害、优势劣势、希望 / 恐惧运行时。
- 场景、距离、敌人、盟友、回合、休息资源。
- 自由文本、自由数字或任意用户公式输入。

Requirement projection / derivation 需要额外审查，因为它消费同一份 resolved read model 但目的不是输出 contribution：

- 它不能执行 contribution。
- 它不能写状态。
- 它可以读取 resolved choice 和有限 `ConditionIR`。
- 它需要判断当前哪些 choice 是 `requiredNow`。
- 对 choice 条件可以使用三值判断：`true`、`false`、`unknown`。
- 条件为 `true` 时，收集该分支内当前需要的 choice。
- 条件为 `false` 时，不要求该分支内 choice。
- 条件为 `unknown` 时，优先要求让条件可判断的 choice，例如 `choiceEquals(mode, two)` 中缺失的 `mode`。
- 对非 choice 条件如果无法判断，不应猜测；应产生诊断或将相关 requirement 标为当前不可判定。

独立审查应至少回答：

```text
1. fixture 清单中每个必须支持能力，是否能用五类能力卡片表达？
2. 有没有必须支持的能力需要循环、递归、动态 target 或读取本轮输出？
3. choice requirement view 是否能解释分支式选择，例如 Master of the Craft？
4. 是否有两个不同 IR 写法表达同一件事，导致实现和作者心智分裂？
5. 是否有任何节点可能绕过 No Guessing / Fast Failure？
6. 是否有任何节点可能让 resolver / projector 产生副作用？
```

### Context

Context 是卡牌 automation resolver 通过 normalized IR selector 可读取的当前角色表快照。

第一阶段 Context 应是只读快照，至少包含：

- 当前角色等级或 tier。
- 当前熟练度、属性、阈值等目标在卡牌自动化运行前的可读值。
- 当前已实例化卡牌及其领域、等级、类型等元数据。
- 当前 `loadout` 和 `vault` 卡牌集合。
- 当前装备槽状态，例如是否装备护甲。
- 当前卡牌实例的 choice 值。
- 当前卡牌实例的 ability choice state。

Context 不是 mutable store。automation resolver / projector 读取 Context 后只能产出 requirements、diagnostics 或 contribution，不能写回 Context。

### Effect

Effect 描述如何把 Choice 和 Context 转换为 modifier contribution。

Effect 的产物必须落到现有自动化系统：

```ts
type CardAutomationOutput = CardModifierContribution[];
```

输出 contribution 应携带足够 source metadata，让 modifier popover 能说明来源是某张卡牌的某个能力。

`CardModifierContribution` 是 card-specific contribution fact，不等同于现有 user `ModifierContribution` 类型。它由自动化边界转换为 modifier registry 可消费的 `ModifierEntry`。

## Evaluation Boundary

卡牌自动化必须属于统一自动化边界内部，而不是在自动化边界外部预先运行。

store action 不应先调用 card automation runtime，再把结果提交给自动化系统。正确方向是：一次 modifier-aware 行为进入自动化边界后，边界内部基于同一个输入快照独立派生所有 provider output，然后统一 aggregation、normalization、derivation 和 final writeback。

```text
modifier-aware behavior
  -> runModifierAutomationBoundary(sheetData, intent)
    -> behavior interpretation / source-state normalization
    -> build BoundarySourceSnapshot
    -> independently derive provider outputs:
       - profession provider
       - level provider
       - equipment provider
       - upgrade provider
       - user provider
       - card provider
    -> aggregate provider outputs
    -> normalize modifier state
    -> derive reference totals / calculated final values
    -> write final values when auto calculation is enabled
```

Provider derivation 不是带业务依赖的线性执行链。所有 provider 共同遵守：

- 只读取进入边界时的 source snapshot。
- 不读取本轮其他 provider 生成的 contribution。
- 不读取自己本轮生成的 contribution。
- 不依赖 provider 执行顺序。
- 不写 `sheetData`。
- 只输出 contribution candidates。

`CardAutomationSnapshot` 是从 `BoundarySourceSnapshot` 投影出来的卡牌专用 read model。卡牌 provider 遵守同样规则；它不读取本轮 card output，也不读取 aggregation 之后的结果。

卡牌 automation runtime 应拆成 resolver 和 projector。resolver 不是树执行器，也不是 DAG 工作流引擎。它是纯函数式规则 resolver：读取 `CardAutomationIR`、`CardAutomationSnapshot` 和 `CardAbilityState`，派生 `ResolvedCardAutomation`。之后 requirements、diagnostics 和 contributions 都从 `ResolvedCardAutomation` 投影出来。

概念形态：

```ts
resolveCardAutomation(
  snapshot: CardAutomationSnapshot,
  instance: CardAutomationInstanceContext,
): ResolvedCardAutomation

projectRequirements(resolved: ResolvedCardAutomation): CardAutomationRequirement[]
projectDiagnostics(resolved: ResolvedCardAutomation): CardAutomationRuntimeDiagnostic[]
projectContributions(resolved: ResolvedCardAutomation): CardModifierContribution[]
```

这些纯函数由自动化边界编排和调用，而不是成为边界外的前置步骤。

`CardAutomationInstanceContext` 至少包含当前卡牌实例的 `instanceId`、zone、实例 `CardAutomationIR`、实例 `CardAbilityState` 和已解析 choice read model。也可以在实现中把这些字段内嵌进 `CardAutomationSnapshot`，但纯函数输入边界必须形式化到“同一 snapshot + 同一实例 IR + 同一实例 state”。

同一 snapshot、实例 IR 和实例 state 输入应产生稳定、幂等、可测试的输出。

Requirement、runtime diagnostics 和 contribution projector 不应各自解释 IR。IR 只由 resolver 解释一次，之后由多个 projector 消费同一份 resolved read model。

`ResolvedCardAutomation` 是派生状态，不进入存档、不参与导入 / 导出，也不是 source of truth。概念形态：

```ts
type ResolvedCardAutomation = {
  sources: ResolvedCardAutomationSource[];
  diagnostics: CardAutomationRuntimeDiagnostic[];
};

type ResolvedCardAutomationSource = {
  cardInstanceId: string;
  cardTemplateId: string;
  cardName: string;
  zone: "loadout" | "vault";
  abilities: ResolvedCardAbility[];
};

type ResolvedCardAbility = {
  abilityId: string;
  abilityLabel: string;
  lifetime: ResolvedLifetime;
  choices: Record<string, ResolvedChoice>;
  effects: ResolvedEffect[];
  diagnostics: CardAutomationRuntimeDiagnostic[];
};
```

`ResolvedCardAutomation` 描述当前状态下 ability 是否 eligible、inactive、blocked、invalid；choice 是否 requiredNow、missing、valid、invalid；effect 是否 ready、blocked、skipped 或 invalid；以及当前 runtime diagnostics。它每次都可以从 `CardAutomationIR + CardAutomationSnapshot + CardAbilityState` 重新派生。

resolver、requirement projector、diagnostic projector 和 contribution projector 都不能写状态。绝对不能写：

- `sheetData`。
- `CardAbilityState`。
- raw `choiceValues`。
- card zone / loadout / vault。
- HP、Stress、Armor Slot 等资源标记。
- 已算好的 card-sourced contribution。

所有写入只能发生在自动化边界解释明确 intent 时。写入完成后，再重新运行 resolver 派生新的 output views。用户看起来像是在“进行一个流程”，但领域模型中实际发生的是：

```text
derive requirements
  -> user submits intent
  -> boundary validates and writes source state
  -> derive requirements / diagnostics / contributions again
```

这不是 workflow execution，而是 source state 逐步变化后的 repeated pure resolution。

因为 `permanentOnceClaimed` 卡牌位于 `vault` 时仍可能产生 contribution，所有会改变卡牌实例集合或实例状态的角色卡行为都必须视为 modifier-aware behavior，包括：

- 选择卡牌模板进入 `loadout`。
- 选择卡牌模板进入 `vault`。
- 替换 `loadout` 或 `vault` 中已有卡牌。
- 删除 `loadout` 或 `vault` 中的卡牌。
- 在 `loadout` 和 `vault` 之间移动卡牌。
- 修改卡牌实例的 choice state。
- 外部传入 `setCardAbilityChoiceValues` intent。
- 外部传入未来的 `refreshCardAutomationFromTemplate` intent。

这些行为应进入统一自动化边界，而不是只在 `loadout` 变更时重算。

### Requirement Read Model And Write Boundary

用户选择流程需要在 contribution projector 输出 contribution 之前知道当前有哪些 choice 需要填写。这个信息不应持久化，也不应由 UI 自己扫描卡牌和解释 IR。

第一阶段应提供一个按需派生的 requirement read model：

```ts
deriveCardAutomationRequirements(
  sheetData: SheetData,
): CardAutomationRequirement[]
```

Requirement view 是纯派生视图：

- 不写入 `sheetData`。
- 不进入导入 / 导出。
- 不作为 source state。
- 不要求全局 singleton。
- 可以由 UI、调试面板或测试按需派生。
- 对同一份 `sheetData` 输入必须稳定。

Requirement view 依赖当前状态，但不拥有状态。它读取：

- 当前卡牌实例集合和 zone。
- 卡牌实例 `instanceId`、`automation`、`automationState` 和 `choiceValues`。
- target choice 需要的当前经历列表等 snapshot 数据。

它回答的问题是：

```text
当前有哪些卡牌 ability 需要 choice？
当前 choice 是否已满足？
当前 choice 是否已满足？
当前 choice 是否可以被提交 / 替换？
UI 可以提交哪些 intent？
```

概念形态：

```ts
type CardAutomationRequirement = {
  cardInstanceId: string;
  cardTemplateId: string;
  cardName: string;
  abilityId: string;
  abilityLabel: string;
  status: "ready" | "missingChoice" | "invalidChoice" | "inactive";
  choices: CardChoiceRequirement[];
  availableActions: Array<"setChoiceValues" | "refreshAutomationFromTemplate">;
};

type CardChoiceRequirement = {
  choiceId: string;
  kind: "selectOne" | "selectMany" | "targetSelectMany";
  cardinality: { min: number; max: number; unique: boolean };
  options?: { id: string; label: string }[];
  targetGroup?: "attributes" | "experiences";
  currentValue: string[];
  diagnostics: CardAutomationRuntimeDiagnostic[];
};
```

UI 不能直接写 `automationState`。用户完成 requirement 后，UI 只能提交自动化边界 intent：

```ts
type SetCardAbilityChoiceValuesIntent = {
  kind: "setCardAbilityChoiceValues";
  cardInstanceId: string;
  abilityId: string;
  choiceValues: Record<string, string[]>;
};
```

写入一致性由自动化边界保证，而不是由 requirement view 保证：

- requirement view 可以过期。
- intent 到达自动化边界时，边界必须基于当前 `sheetData` 中的卡牌实例 IR 重新 resolve choice schema 和 lifetime。
- 如果卡牌已删除、实例 IR 不存在或提交的完整 `choiceValues` 不合法，intent 不得盲写，且旧 state 必须保持原样。
- 合法 `setCardAbilityChoiceValues` intent 整体替换该 ability 的 `choiceValues` 后，进入统一 provider derivation 和 final writeback。
- 合法 `refreshCardAutomationFromTemplate` intent 是改变实例 IR 的显式操作，必须重新解析当前模板，并在替换实例 IR 前提示 / 确认；它不属于普通 choice 写入。

因此 requirement view 可以在多个地方分别派生；只要所有写入都通过自动化边界重新校验，就不会因为旧 view 或多处 view 破坏 source state 一致性。

### Linear Choice Chain

Phase 1 用户输入模型采用线性条件选择链，而不是并行 choice frontier。

规则：

- 所有可能 choice 必须静态声明在 ability IR 中。
- 当前主流程最多只有一个 active missing choice。
- 一个 choice value 可以选择一个后续 choice。
- 一个 choice value 不可以同时解锁多个 sibling required choices。
- requirement projector 可以保留 all requirements 用于 diagnostics / debug，但 user-facing primary requirement 必须是单个 active requirement 或 none。
- 如果 IR 允许某个 resolved branch 同时产生多个 active missing choices，normalization / validation 应尽量失败。
- 因为 `requiredWhen` 可以依赖 snapshot，静态 validation 不一定覆盖所有状态；runtime resolver 每次 resolve 后也必须检查当前分支。
- 如果 runtime resolver 发现当前分支同时存在多个 active missing choices，该 ability 不输出 contribution，并产生 diagnostic。requirement view 可以在 debug 信息中列出冲突 choice，但 primary requirement 必须是 none，不能让 UI 猜测下一步。

允许：

```text
mode
  one -> oneExperience
  two -> twoExperiences
```

不允许：

```text
mode
  advanced -> chooseAttribute
           -> chooseExperience
```

这条限制牺牲一部分表达力，但能避免 Phase 1 requirement view 变成并行流程管理器。更复杂的并行输入可以在后续阶段重新设计，或通过更高层 authoring UI 编译成一个复合 choice。

## Snapshot Rule

第一阶段使用 `BoundarySourceSnapshot` 和 `CardAutomationSnapshot` 避免复杂依赖问题。所有自动化 provider 读取的是进入自动化边界时构建的 source snapshot，而不是边界执行过程中不断变化的实时状态。

规则：

- `BoundarySourceSnapshot` 在 provider derivation 前构建，代表进入边界时的稳定 source state。
- 所有 provider 都从 `BoundarySourceSnapshot` 或其受控投影读取数据。
- Snapshot 不包含本轮任何 provider 即将生成的 contribution。
- Provider output 之间不能互相读取。
- Card provider 使用 `CardAutomationSnapshot`，这是 `BoundarySourceSnapshot` 的卡牌专用投影。
- 如果某张卡提供熟练度 +1，而另一张卡的效果读取熟练度，后者读取的是 snapshot 中的熟练度，不包含前者刚生成的 +1。
- 同理，任何非卡牌 provider 也不能读取本轮 card provider 或其他 provider 生成的 contribution。

这个限制会牺牲少量表达力，但第一阶段可以避免执行顺序、循环依赖和多轮收敛问题。

## Snapshot Read Whitelist

第一阶段 IR selector 只能读取白名单中的 snapshot 数据。白名单之外的数据即使存在于 `sheetData`，也不能被 selector 直接读取。

允许读取：

- 角色进度：`level`、`tier`、`proficiency`。
- 自动化目标的 pre-card 值：六属性、闪避、护甲值、轻伤阈值、重伤阈值、生命上限、压力上限、熟练度、经历值。
- 卡牌区域：`loadout`、`vault`、当前卡所在 zone。
- 卡牌元数据：实例 `instanceId`、模板 `id`、名称、类型、classification、等级、variant type 等受控 getter 字段。
- 卡牌自动化源状态：`CardAbilityState`，包括 raw `choiceValues`。这些 source facts 只允许 resolver 用来构建 resolved choice read model；IR selector、condition 和 effect 不得直接读取 raw `choiceValues`。
- 卡牌集合查询：按 zone 统计卡牌数量，按 type、classification、level、variant type 等受控 matcher 字段过滤。
- 装备状态：active armor slot 是否为空，active weapon / armor slot 是否存在。
- 经历列表：经历名称、经历值、经历槽位 index。

自动化目标的 pre-card 值可以包含职业、等级、装备、升级项和用户手动修正等已经存在的来源，但不能包含本轮卡牌 automation contribution 输出。

第一阶段不允许读取：

- 当前 HP、Stress、Armor Slot 标记状态。
- 当前 Hope。
- 攻击、伤害、掷骰过程状态。
- 场景、距离、敌人、盟友状态。
- “上次休息以来”“每场一次”等运行时资源状态。
- 本轮卡牌 automation contribution projector 已经生成的 contribution。

这意味着 selector 的语义应围绕 `CardAutomationSnapshot` 设计，而不是暴露通用 `sheetData` path reader。

`StandardCard` 已经是当前运行时卡牌事实模型。Phase 1 不强制新增完整的 `CardAutomationCardFact` 中间模型；真正需要固定的是 card automation 专用的受控 getter / matcher。

也就是说，`CardMatchIR` 不允许任意读取 `StandardCard` 字段路径。它只能调用 `CardAutomationSnapshot` 暴露的白名单 getter，例如 card type、classification、level、variant type 和 zone。getter 的实现可以直接读取当前 `StandardCard`，也可以在未来改为读取新的 runtime card model；只要 getter 语义不变，IR 就不需要变化。

Card matcher getter 必须是语义接口，而不是 `StandardCard` 字段适配层。IR 不知道、也不能依赖 `StandardCard.class`、`variantSpecial.realType` 或其它具体 runtime view 字段。当前实现可以用这些字段实现 getter，但 getter 的 contract 必须按自动化领域语义命名和测试。

Phase 1 只稳定承诺真实 fixture 需要的 getter：

- `cardType`：卡牌语义类型，例如 `domain`。
- `zone`：卡牌实例当前位于 `loadout` 或 `vault`。
- `classification`：仅在 `cardType === "domain"` 时承诺为领域名，例如 `Valor`。
- `level`：领域卡等级。

其它卡牌类型的 `classification`、variant type、variant subcategory 等投影语义不进入 Phase 1 稳定契约。后续只有在 fixture 或真实自动化能力需要时，才为对应 getter 补充语义定义和测试。

Card type 和 classification 的取值策略不同：

- `CardAutomationCardType` 是闭合集合，Phase 1 直接使用代码中的 union / enum 校验，例如 `profession`、`ancestry`、`community`、`subclass`、`domain`、`variant`。
- `classification` 是内容定义的开放字符串，不应在代码里硬编码完整领域名、职业名或变体分类名枚举。IR 只保存作者写入的字符串，runtime matcher 对 getter 结果做精确匹配，不做模糊匹配、别名推断或本地化猜测。
- resolver 运行时不需要“列出所有领域”的能力；它只需要判断当前卡牌实例是否匹配 `CardMatchIR`。
- editor / authoring UI 可以按需从当前 Content Pack Draft、已安装卡牌或当前角色卡牌集合派生可选值列表，用于自动补全或提示。这是作者体验能力，不是 resolver 依赖。
- dry-run / editor validation 对 `classification` 只做格式校验。空字符串、非字符串或不满足 schema 的值是 error；未知字符串最多产生 warning，不阻断导入或安装。无论如何，runtime 不因为未知字符串而猜测其它分类。

## Source Identity

卡牌 contribution 的 source type 应新增为 card 相关来源，例如：

```ts
type ModifierSourceType = ExistingSourceType | "card";
```

每条卡牌 contribution 应能追踪：

- card instance id。
- card template id。
- card name。
- ability id。
- ability label。
- pack id 或 builtin source。

这不是展示格式的最终设计，但 source identity 必须足够稳定，避免 UI 只能显示“卡牌修正”而无法解释来源。

## Output Contract

卡牌 provider 不直接输出 `ModifierEntry`，也不把结果写入 `userModifierContributions`。它通过 contribution projector 输出 card-sourced contribution facts，再由自动化边界内部转换成 modifier registry 消费的 `ModifierEntry`。

概念形态：

```ts
type CardModifierContribution = {
  id: string;
  kind: "base" | "modifier";
  target: CardModifierTargetId;
  value: number;
  label?: string;
  source: CardModifierSourceIdentity;
};

type CardModifierSourceIdentity = {
  type: "card";
  cardInstanceId: string;
  cardTemplateId: string;
  cardName: string;
  abilityId: string;
  abilityLabel: string;
  zone: "loadout" | "vault";
  effectId: string;
  packId?: string;
};
```

转换为 `ModifierEntry` 时，自动化边界负责补齐 registry metadata：

```ts
sourceType: "card";
sourceId: `card:${cardInstanceId}:${abilityId}`;
priority: contribution.kind === "base" ? 110 : 160;
label: `${cardName}：${contribution.label ?? abilityLabel}`;
```

第一阶段约定：

- `ModifierSourceType` 新增 `"card"`。
- card contribution id 必须稳定可重算，不使用时间戳或随机数。
- 默认 id 格式为 `card:${instanceId}:${abilityId}:${effectId}`。
- 同一 ability 输出多个 effect 时，`effectId` 必须能区分不同 contribution。
- Card Automation Definition 可以省略 effect id；compiled IR 中每个会输出 contribution 的 effect 必须有稳定 `effectId`。
- source identity 至少包含 `cardInstanceId`、`cardTemplateId`、`abilityId`。
- UI 展示至少应能显示到“卡牌名：能力名”。
- card-sourced contribution 每次自动化边界内重算，不持久化到角色存档。
- card-sourced contribution 必须作为独立 modifier source 接入现有 modifier core，不能伪装成 `equipment` 或 `user`。
- `ModifierSourceType` 必须新增 `"card"`，并新增与 system / equipment / user 同级的 card provider。
- card provider 只消费 card automation resolver / projector 输出，不直接读取 raw `choiceValues`。
- card contribution source metadata 至少包含 `cardInstanceId`、`cardTemplateId`、`abilityId` 和 `effectId`，用于 diagnostics、popover 和未来 UI 消费。
- 卡牌不能复用 equipment modifier sanitizer。card contribution 需要自己的 validation / sanitizer，以支持 card-sourced base、modifier、经历 target 和 card-specific source metadata。

默认 priority：

- card base：`110`。
- card modifier：`160`。

当前 modifier registry 按 priority 升序排序，且无 saved active base 时会选择同 target 的第一个 base。card base 排在职业、装备、等级等系统 base 之后，可以避免卡牌基础值默认抢占更稳定的系统基础值；Bare Bones 这类条件基础值在没有护甲基础值时仍能成为 active base。

card modifier 的 priority 主要影响展示顺序，不影响加总结果。`160` 表示它显示在等级修正之后、升级修正之前。

`emitModifier` 允许输出到第一阶段所有 supported targets。`emitBase` 也使用同一 target universe 中现有 modifier 系统允许 base 的 target，不做卡牌专属 allowlist。规则文本明确提供基础值、设定值或替代基础值时可以使用 `emitBase`；普通永久加值应优先表达为 `emitModifier`。如果作者把普通加值误写成 base，那属于作者数据问题，DSL 层不通过人为 allowlist 阻止；系统只保证它进入现有 active base 机制，而不是绕过最终值计算。

## Draft IR Shape

本节固定 Phase 1 normalized IR 的字段名。未来 Phase 2+ 友好作者语法可以使用不同字段，但必须编译到这里定义的 normalized IR。

命名决策：

- 保留 `requiredWhen`。它只出现在 `CardChoiceIR` 上，语义是“该 choice 在当前 resolved source state 下是否 requiredNow”。它不是 UI visibility、不是 effect eligibility、不是 JSON Schema required，也不写入或清理 `choiceValues`。
- 不使用 `targetSet`。Phase 1 用 `modifierTargetGroup` + `group` 表达 target choice domain，避免 `targetSet.targetSet` 的重复，也避免把 target group、完整 modifier target universe 和 resolved selected targets 混在一起。

下面是 Phase 1 normalized IR 的当前设计。它是从前文约束推导出来的保守形态，不追求作者手写体验，只追求有限、可验证、可执行和可诊断。

```ts
type CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1";
  revision: string;
  abilities: CardAbilityIR[];
};

type CardAbilityIR = {
  id: string;
  label: string;
  lifetime: CardLifetimeIR;
  choices?: CardChoiceIR[];
  when?: CardConditionIR;
  effects: CardEffectIR[];
};

type CardLifetimeIR =
  | {
      kind: "whileInLoadout";
    }
  | {
      kind: "permanentOnceClaimed";
    };
```

### Target IR

Phase 1 的 target 直接收敛到现有 `ModifierTargetId`。IR 不发明另一套卡牌专用 target 名称。

```ts
type CardModifierTargetId =
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
  | `experienceValues.${number}`;

type CardSelectableTargetGroupId = "attributes" | "experiences";
```

确定结论：

- effect 输出 target 必须是 `CardModifierTargetId` 或来自 `targetSelectMany` resolver 的 `CardModifierTargetId`。
- target 字符串不能拼接生成，不能读取任意 `sheetData` path。
- `attributes` target group 展开为六大属性 target。
- `experiences` target group 展开为当前角色表中存在且名称非空的经历值 target，例如 `experienceValues.0`。
- Phase 1 不允许 `targetSelectMany` 选择空经历槽，避免产生“有经历值但没有经历名”的状态。
- 经历 target 使用 slot identity。`choiceValues` 中保存 `experienceValues.${index}` 后，后续贡献跟随该经历槽位当前内容；如果用户修改该槽位的经历名称，卡牌贡献仍作用于同一槽位。
- resolver 不按经历名称匹配，也不尝试在经历名称变化后寻找“同名经历”。如果已保存的经历槽位不存在、超出 target universe，或在当前 snapshot 中不再是合法 target，对应 ability 不输出 contribution，并产生 diagnostic。

仍需实现时审查：

- `experienceValues.${number}` 的最大数量应跟随当前 modifier target universe；当前实现是 5 个经历槽。

### Choice IR

```ts
type CardChoiceIR =
  | CardStaticChoiceIR
  | CardTargetChoiceIR;

type CardChoiceBaseIR = {
  id: string;
  label?: string;
  requiredWhen?: CardConditionIR;
  cardinality: {
    min: number;
    max: number;
    unique: boolean;
  };
};

type CardStaticChoiceIR = CardChoiceBaseIR & {
  kind: "selectOne" | "selectMany";
  domain: {
    kind: "staticOptions";
    options: CardChoiceOptionIR[];
  };
};

type CardTargetChoiceIR = CardChoiceBaseIR & {
  kind: "targetSelectMany";
  domain: {
    kind: "modifierTargetGroup";
    group: CardSelectableTargetGroupId;
  };
};

type CardChoiceOptionIR = {
  id: string;
  label: string;
  effects?: CardOptionEffectIR[];
};
```

确定结论：

- 存档只保存 `choiceValues: Record<string, string[]>`。
- raw choice string 必须通过当前 ability 的 `CardChoiceIR` 解析。
- `requiredWhen` 决定该 choice 在当前 source state 中是否 required；缺省表示 ability eligible 时 required。
- `requiredWhen` 可以引用 snapshot condition 和同 ability 内已声明 choice，但必须遵守线性条件选择链。
- `requiredWhen` 只能引用当前 ability 中按 `choices` 数组顺序位于自己之前的 choice；不得自引用、不得引用后序 choice、不得形成依赖环。
- `modifierTargetGroup.group` 是 `CardSelectableTargetGroupId`，不是 target 数组，也不是任意 target path。resolver 基于 snapshot 把它展开为合法 target universe 的受控子集。
- `selectOne` 仍用 `cardinality: { min: 1, max: 1, unique: true }` 表达，不另开特殊存储。
- `staticOptions.options[].effects` 是 option id 的含义所在。
- `targetSelectMany` 的 selected id 必须解析成白名单 target。

确定结论：

- Phase 1 不支持同一 option 选择多次。`selectMany` 必须使用 `unique: true`；`unique: false` 在 normalization / validation 阶段失败。

### Value IR

```ts
type CardValueIR =
  | number
  | { kind: "readTarget"; target: CardModifierTargetId }
  | { kind: "level" }
  | { kind: "tier" }
  | { kind: "proficiency" }
  | { kind: "attribute"; attribute: CardAttributeKey }
  | { kind: "add"; values: CardValueIR[] }
  | { kind: "subtract"; left: CardValueIR; right: CardValueIR }
  | { kind: "multiply"; values: CardValueIR[] }
  | { kind: "divide"; left: CardValueIR; right: CardValueIR }
  | { kind: "floor"; value: CardValueIR }
  | { kind: "ceil"; value: CardValueIR }
  | { kind: "round"; value: CardValueIR }
  | { kind: "min"; values: CardValueIR[] }
  | { kind: "max"; values: CardValueIR[] }
  | { kind: "valueByTier"; values: Record<CardTier, CardValueIR> };

type CardTier = "1" | "2" | "3" | "4";

type CardAttributeKey =
  | "agility"
  | "strength"
  | "finesse"
  | "instinct"
  | "presence"
  | "knowledge";
```

确定结论：

- number literal 是合法 `CardValueIR`，减少低层格式噪音。
- `readTarget` 读取的是进入卡牌 provider 前的 snapshot target value，不读取本轮卡牌产出。
- `attribute` 是 `readTarget` 的受限快捷读法，编译或执行时映射到 `${attribute}.value`。
- `divide` 不隐式取整；需要整数时显式使用 `floor`、`ceil` 或 `round`。
- 所有 value 最终必须是有限数字。
- normalized IR 中的 `valueByTier` 必须包含所有 tier key；Card Automation Definition 如果允许省略，normalizer 必须补齐或失败，不能让缺 key 进入 IR。

仍需实现时审查：

- `divide` 除以 0 应失败并产生 diagnostic。
- `readTarget` 读不到可计算的 pre-card reference value 时应失败并产生 diagnostic，不读取 Stored Final Value，也不猜测默认 0。

### Condition IR

```ts
type CardConditionIR =
  | { kind: "all"; conditions: [CardConditionIR, ...CardConditionIR[]] }
  | { kind: "any"; conditions: [CardConditionIR, ...CardConditionIR[]] }
  | { kind: "not"; condition: CardConditionIR }
  | {
      kind: "cardCount";
      zone: "loadout" | "vault" | "any";
      match: CardMatchIR;
      atLeast?: number;
      exactly?: number;
    }
  | {
      kind: "equipmentSlotEmpty";
      slot: "armor" | "primaryWeapon" | "secondaryWeapon";
    }
  | {
      kind: "equipmentSlotFilled";
      slot: "armor" | "primaryWeapon" | "secondaryWeapon";
    }
  | {
      kind: "choiceEquals";
      choiceId: string;
      valueId: string;
    }
  | {
      kind: "choiceIncludes";
      choiceId: string;
      valueId: string;
    };

type CardMatchIR = {
  type?: CardAutomationCardType;
  classification?: string;
  level?: number;
  variantType?: string;
  variantSubCategory?: string;
};

type CardAutomationCardType =
  | "profession"
  | "ancestry"
  | "community"
  | "subclass"
  | "domain"
  | "variant";
```

确定结论：

- `when` 只做有限条件判断，不执行 effect。
- `cardCount` 读取的是卡牌实例 snapshot，不读取模板 registry。
- `choiceEquals` / `choiceIncludes` 只允许引用同 ability 已声明 choice。
- `cardCount` 必须且只能提供 `atLeast` 或 `exactly` 之一。
- `all.conditions` 和 `any.conditions` 必须是非空数组，避免引入隐式 true / false。
- `equipmentSlotEmpty` 和 `equipmentSlotFilled` 是对称条件。前者表示指定装备槽为空，后者表示指定装备槽非空。
- 装备槽条件不提供 `anyWeapon`。如果需要表达“未装备任何武器”，使用 `all(primaryWeapon empty, secondaryWeapon empty)`，避免把它误实现成“任一武器槽为空”。
- Phase 1 不提供 `activationActive` condition。`permanentOnceClaimed` 的贡献资格由 lifetime resolver 根据实例存在和 choice validity 处理，不进入通用条件表达式。
- `CardMatchIR` 匹配的是 `CardAutomationSnapshot` 暴露的受控 card matcher，不直接匹配任意 `StandardCard` 字段路径。
- card matcher getter 是语义接口，不能依赖 `StandardCard` 的具体字段结构作为 IR contract。
- Phase 1 只稳定承诺 `cardType`、`zone`、领域卡 `classification` 和领域卡 `level`。其它卡牌类型的 classification / variant 语义只在 fixture 需要时补充。
- `CardMatchIR` 中多个字段同时出现时按 AND 语义匹配。

仍需实现时审查：

- card matcher getter 的具体实现需要在 implementation plan 中对照现有 runtime card view 写测试；测试的是语义 getter 输出，不是把 `StandardCard` 字段暴露成 IR contract。

### Effect IR

```ts
type CardEffectIR =
  | CardContributionEffectIR
  | CardConditionalEffectIR
  | CardSelectedOptionEffectIR
  | CardSelectedTargetEffectIR;

type CardOptionEffectIR =
  | CardContributionEffectIR
  | CardOptionConditionalEffectIR;

type CardContributionEffectIR =
  | {
      kind: "emitModifier";
      id: string;
      target: CardModifierTargetId;
      value: CardValueIR;
      label?: string;
    }
  | {
      kind: "emitBase";
      id: string;
      target: CardModifierTargetId;
      value: CardValueIR;
      label?: string;
    };

type CardConditionalEffectIR = {
  kind: "emitWhen";
  id?: string;
  when: CardConditionIR;
  effects: CardEffectIR[];
};

type CardOptionConditionalEffectIR = {
  kind: "emitWhen";
  id?: string;
  when: CardConditionIR;
  effects: CardContributionEffectIR[];
};

type CardSelectedOptionEffectIR = {
  kind: "emitEachSelectedOptionEffect";
  id?: string;
  choiceId: string;
};

type CardSelectedTargetEffectIR = {
  kind: "emitEachSelectedTarget";
  id: string;
  choiceId: string;
  value: CardValueIR;
  label?: string;
};
```

确定结论：

- 只有 `emitModifier` 和 `emitBase` 直接产出 contribution。
- `emitEachSelectedOptionEffect` 展开 selected static option 上声明的 effects。
- `emitEachSelectedTarget` 只产出 modifier，不产出 base；当前 fixture 只需要经历 / 属性选择加值。
- option effects 不允许再嵌套 `emitEachSelectedOptionEffect` 或 `emitEachSelectedTarget`，也不能通过 option 内的 `emitWhen` 间接展开它们；option 内 `emitWhen.effects` 只能包含 contribution effects，避免递归和二次 choice 展开。
- `emitWhen` 只决定一组 nested effects 是否参与输出，不改变执行环境。
- `emitWhen.effects` 可以包含 `emitEachSelectedTarget`，用于表达“先选模式，再按模式要求选择目标并输出加值”的分支式 target choice。

仍需实现时审查：

- `emitBase` 只校验 target 是否是现有 modifier 系统允许 base 的 target，不校验卡牌规则文本是否“应该”使用 base。
- `emitWhen.id` 可选，因为它本身不输出 contribution；nested contribution effect 仍必须有稳定 id。

以下 JSON 示例展示的是 `CardAutomationDefinition.body` / `lowLevel.body` 片段，而不是完整 compiled IR。因此示例中不包含 `format`、`revision`，也可以省略 effect id；这些字段由 dry-run / normalizer 生成到 `CardAutomationIR`。

### Static Modifier

猿族：闪避永久 +1。

```json
{
  "abilities": [
    {
      "id": "simiah-natural-agility",
      "label": "Natural Agility",
      "lifetime": { "kind": "whileInLoadout" },
      "effects": [
        {
          "kind": "emitModifier",
          "target": "evasion",
          "value": 1,
          "label": "Simiah"
        }
      ]
    }
  ]
}
```

### Static Max Modifier

巨人：生命上限 +1。

```json
{
  "abilities": [
    {
      "id": "giant-endurance",
      "label": "Endurance",
      "lifetime": { "kind": "whileInLoadout" },
      "effects": [
        {
          "kind": "emitModifier",
          "target": "hpMax",
          "value": 1,
          "label": "Giant"
        }
      ]
    }
  ]
}
```

### Value From Snapshot Target

龟人：轻伤阈值、重伤阈值获得熟练度加值。

```json
{
  "abilities": [
    {
      "id": "galapa-shell",
      "label": "Shell",
      "effects": [
        {
          "kind": "emitModifier",
          "target": "minorThreshold",
          "value": { "kind": "readTarget", "target": "proficiency" },
          "label": "Shell"
        },
        {
          "kind": "emitModifier",
          "target": "majorThreshold",
          "value": { "kind": "readTarget", "target": "proficiency" },
          "label": "Shell"
        }
      ]
    }
  ]
}
```

### Tier-Based Value

坚毅铁卫：阈值永久 +1/+2/+3。

```json
{
  "abilities": [
    {
      "id": "stalwart-thresholds",
      "label": "Stalwart",
      "effects": [
        {
          "kind": "emitModifier",
          "target": "minorThreshold",
          "value": {
            "kind": "valueByTier",
            "values": { "1": 1, "2": 2, "3": 3, "4": 3 }
          },
          "label": "Stalwart"
        },
        {
          "kind": "emitModifier",
          "target": "majorThreshold",
          "value": {
            "kind": "valueByTier",
            "values": { "1": 1, "2": 2, "3": 3, "4": 3 }
          },
          "label": "Stalwart"
        }
      ]
    }
  ]
}
```

### Target Choice

定制设计类：选择一个已有经历获得永久 +1 加值。

```json
{
  "abilities": [
    {
      "id": "clank-purposeful-design",
      "label": "定制设计",
      "lifetime": { "kind": "permanentOnceClaimed" },
      "choices": [
        {
          "id": "boostedExperience",
          "kind": "targetSelectMany",
          "cardinality": { "min": 1, "max": 1, "unique": true },
          "domain": {
            "kind": "modifierTargetGroup",
            "group": "experiences"
          }
        }
      ],
      "effects": [
        {
          "kind": "emitEachSelectedTarget",
          "choiceId": "boostedExperience",
          "value": 1,
          "label": "定制设计"
        }
      ]
    }
  ]
}
```

存档中只保存选择结果：

```json
{
  "automationState": {
    "version": 1,
    "abilities": {
      "clank-purposeful-design": {
        "choiceValues": {
          "boostedExperience": ["experienceValues.0"]
        }
      }
    }
  }
}
```

`"experienceValues.0"` 的含义由 `boostedExperience` choice 的 `domain.group` 和当前角色经历槽解析。它表示经历槽位 0，而不是选择时的经历名称。resolver 不直接信任 raw string，而是先把它解析成 selected targets。对需要 choice 的 `permanentOnceClaimed` ability，合法 `choiceValues` 是 contribution 输出的必要条件。

### Card Count Condition

领域恩泽：当前配置中某领域卡 >= 4 时，提供稳定加值。

```json
{
  "abilities": [
    {
      "id": "domain-blessing",
      "label": "Domain Blessing",
      "when": {
        "kind": "cardCount",
        "zone": "loadout",
        "match": { "type": "domain", "classification": "Valor" },
        "atLeast": 4
      },
      "effects": [
        {
          "kind": "emitModifier",
          "target": "armorMax",
          "value": 1,
          "label": "Domain Blessing"
        }
      ]
    }
  ]
}
```

### Permanent Once Claimed Effect

“选择此牌时永久获得加值，然后将此牌永久放入宝库”这类能力在 IR 中只表达永久贡献部分：卡牌实例存在且 requirements 满足后不再依赖 zone，即使卡牌后来进入 `vault` 也继续贡献。将卡牌放入宝库属于 card lifecycle / boundary intent，不属于 automation IR。

```json
{
  "abilities": [
    {
      "id": "permanent-body-change",
      "label": "Permanent Body Change",
      "lifetime": { "kind": "permanentOnceClaimed" },
      "choices": [
        {
          "id": "benefit",
          "kind": "selectMany",
          "cardinality": { "min": 1, "max": 1, "unique": true },
          "domain": {
            "kind": "staticOptions",
            "options": [
              {
                "id": "stress-slot",
                "label": "Stress Slot",
                "effects": [
                  { "kind": "emitModifier", "target": "stressMax", "value": 1 }
                ]
              },
              {
                "id": "hp-slot",
                "label": "Hit Point Slot",
                "effects": [
                  { "kind": "emitModifier", "target": "hpMax", "value": 1 }
                ]
              },
              {
                "id": "thresholds",
                "label": "Thresholds",
                "effects": [
                  { "kind": "emitModifier", "target": "minorThreshold", "value": 2 },
                  { "kind": "emitModifier", "target": "majorThreshold", "value": 2 }
                ]
              }
            ]
          }
        }
      ],
      "effects": [
        {
          "kind": "emitEachSelectedOptionEffect",
          "choiceId": "benefit"
        }
      ]
    }
  ]
}
```

如果 required choice 尚未填写或无效，contribution projector 不输出 contribution。choice 写入来自外部 `setCardAbilityChoiceValues` intent 在自动化边界内的解释，不属于 automation resolver / projector 的副作用。

### Equipment Slot Condition And Base

Bare Bones 类：如果当前未装备护甲，则提供基础护甲和阈值。

```json
{
  "abilities": [
    {
      "id": "bare-bones",
      "label": "Bare Bones",
      "when": {
        "kind": "equipmentSlotEmpty",
        "slot": "armor"
      },
      "effects": [
        {
          "kind": "emitBase",
          "target": "armorMax",
          "value": {
            "kind": "add",
            "values": [
              3,
              { "kind": "attribute", "attribute": "strength" }
            ]
          },
          "label": "Bare Bones"
        },
        {
          "kind": "emitBase",
          "target": "minorThreshold",
          "value": {
            "kind": "valueByTier",
            "values": { "1": 9, "2": 11, "3": 13, "4": 15 }
          },
          "label": "Bare Bones"
        },
        {
          "kind": "emitBase",
          "target": "majorThreshold",
          "value": {
            "kind": "valueByTier",
            "values": { "1": 19, "2": 24, "3": 31, "4": 38 }
          },
          "label": "Bare Bones"
        }
      ]
    }
  ]
}
```

## Phase 1 Fixture Coverage Targets

第一阶段的设计验收应以真实卡牌 fixture 反向校验，而不是只校验抽象 IR node。实现计划应把下列能力转成 regression fixtures。

### Must Support From `builtin-base`

- 猿族：闪避永久 +1。
- 巨人：生命上限 +1。
- 人类：压力上限 +1。
- 龟人：轻伤阈值、重伤阈值 += 熟练度。
- 坚毅铁卫：阈值永久 +1 / +2 / +3。
- 黑夜行者大师：闪避永久 +1。
- 战争学派基石：生命上限 +1。
- 复仇战卫基石：压力上限 +1。
- 领域恩泽类：当前配置中某领域卡 >= 4 时提供稳定加值，例如护甲值或阈值。
- 铁骨铮铮 / Bare Bones：未装备护甲时提供基础护甲值和基础阈值。
- 蓬勃生命 / Vitality：从固定奖励中选择两个不重复奖励，永久生效；“入宝库”由 lifecycle / intent 流程处理，不进入 IR。
- 技艺大师 / Master of the Craft：选择经历获得永久加值。

### Must Support From Void1.5

- 石肤：护甲值 +1，轻伤阈值和重伤阈值 +1。
- 坚定：轻伤阈值和重伤阈值 +2。
- 稳健：闪避 -1。
- 钢筋铁骨：重伤阈值永久 +3。
- 格斗家 / I Am the Weapon：未装备武器时闪避 +1；徒手攻击、伤害和战斗触发部分不进入第一阶段。

### Explicitly Deferred Fixture Types

下列真实卡牌能力不作为第一阶段支持承诺，即使它们出现在 `builtin-base` 或 Void1.5 中：

- 依赖当前 HP、Stress、Armor Slot 标记数量的效果。
- 直到短休、长休、每场、每次攻击、受到攻击时等运行时或临时效果。
- 攻击骰、伤害骰、优势劣势、重骰、希望和恐惧相关效果。
- 依赖敌人、距离、范围、场景、盟友位置或 GM 即时裁定的效果。
- 需要自由文本目标、自由数字输入或自定义非白名单 target 的效果。
- 移动卡牌、标记资源、改变存档字段或执行其他副作用的效果。
- 野兽形态这类当前可切换形态自动化。即使其中部分数值可结构化表达，Phase 1 暂不承诺支持“当前形态”状态管理与自动化。

### Fixture Stress Cases

这些 fixture 不一定要求第一版 UI 完整优雅，但 IR、validation 和 runtime diagnostics 必须能支撑：

- `selectMany`：选择两个不重复奖励。
- `targetSelectMany`：选择一个或多个经历或属性目标。
- 条件基础值：无护甲时输出 card-sourced base。
- 条件修正值：领域卡数量达到阈值时输出 card-sourced modifier。
- choice 整体替换：`setCardAbilityChoiceValues` 对任意 lifetime 的 ability 都整体替换 `choiceValues`；非法替换失败且旧 state 不变。
- source-owned state cleanup：删除卡牌实例后，该实例的 automation IR、automation state 和 contribution 一起消失。删除动作本身不是 IR 能力。

## Validation Direction

Card Automation Definition normalization 和 IR validation 应在卡牌导入 dry-run 和编辑器校验中都产生结构化 diagnostics。

### Automation Diagnostic Codes

Phase 1 应新增少量 automation 专用导入 / 编辑器 diagnostic code，而不是把所有 automation 问题都塞进现有 `INVALID_VALUE` 或 `UNKNOWN_FIELD`。

推荐最小导入错误码：

```ts
type CardImportAutomationErrorCode =
  | "UNSUPPORTED_AUTOMATION_FORMAT"
  | "INVALID_AUTOMATION_DEFINITION"
  | "INVALID_AUTOMATION_IR"
  | "AUTOMATION_LIMIT_EXCEEDED";
```

使用原则：

- JSON parse、外部卡包顶层结构、普通卡牌字段类型错误继续使用现有 import diagnostic code。
- `automation` wrapper 或 low-level `body` 出现未知字段时，继续使用 `UNKNOWN_FIELD`，但 path 必须落在 `/.../automation/...`。
- `format` 或 `mode` 不受支持时使用 `UNSUPPORTED_AUTOMATION_FORMAT`。
- Definition schema 合法性、choice 约束、effect id、requiredWhen 顺序、非法 sugar、internal-only 字段等输入定义问题使用 `INVALID_AUTOMATION_DEFINITION`。
- normalized IR validation 失败，例如非法 node、非法 selector、target 不支持、value expression 不合法或 effect 展开规则不满足，使用 `INVALID_AUTOMATION_IR`。
- 超过 Phase 1 集中定义的节点数、深度、choice 数、effect 数或展开数限制时使用 `AUTOMATION_LIMIT_EXCEEDED`。
- 不为每一种 IR node 设计独立错误码。具体原因通过 `path`、`message`、`value` 和可选 structured details 表达。

这样做的目的不是增加 UI 复杂度，而是给 formal import、editor validation、测试和未来诊断视图一个稳定分类：外部格式不支持、Definition 写错、编译后的 IR 不合法、工程护栏超限。

第一阶段至少需要校验：

- ability id 在单卡内唯一。
- `lifetime` 缺省时按 `whileInLoadout` 解释。
- choice id 在 ability 内唯一。
- choice IR 必须声明 `kind`、`cardinality` 和 `domain`。
- Phase 1 中所有 choice 必须使用 `cardinality.unique: true`；`unique: false` 不进入 normalized IR。
- `requiredWhen` 只能引用当前 ability 内按 `choices` 数组顺序位于自己之前的 choice；自引用、后序引用或循环依赖都失败。
- `staticOptions` domain 中 option id 必须在同一 choice 内唯一。
- `modifierTargetGroup` domain 只能引用第一阶段允许的 `CardSelectableTargetGroupId`，例如 `attributes` 或 `experiences`。
- runtime `choiceValues` 缺失、不满足选择数量约束、包含未知 choice id，或引用不存在的 option / target 时，必须产生 diagnostic。
- `unique: true` 的 choice 在 resolver 中应归一化为稳定顺序；`staticOptions` 按 IR option 顺序，`targetSelectMany` 按 target universe 顺序。数组输入顺序不能影响 contribution identity。
- `targetSelectMany` 的经历 target 必须按 slot identity 校验。保存的经历槽位 id 无效、越界或当前不是合法 target 时，对应 ability 不输出 contribution 并产生 diagnostic；不得按经历名称猜测替代目标。
- normalized IR 必须包含稳定 `revision`。该 revision 应由 canonical normalized IR 生成，或由 normalizer 校验为与 canonical IR 一致的稳定值。
- canonical revision hash 输入必须排除 `revision` 字段本身。
- Card Automation Definition 中的 effect id 可以省略；如果作者提供，则必须在 ability 内稳定且唯一。
- compiled IR 中 effect id 必须存在、稳定且唯一；省略的 effect id 由 normalizer 根据 canonical effect path 生成可重算 id。
- card-sourced contribution id 在同一角色卡 snapshot 中不得冲突。
- effect target 必须属于支持的 modifier target。
- `kind: "emitBase"` 只能用于允许 base 的 target。
- `value` 必须是合法 `CardValueIR`。
- `CardValueIR` 只能引用白名单 snapshot selector，最终 evaluation result 必须是有限数字。
- `CardValueIR` 必须定义并校验算术节点的输入数量：`add` / `multiply` / `min` / `max` 不允许空数组；`divide` 除零失败；任何 `NaN` / `Infinity` 都失败。
- `readTarget` 只能读取 pre-card reference value；目标没有可计算 reference value 时失败，不读取 Stored Final Value。
- `when` 只能使用白名单 condition。
- `all.conditions` 和 `any.conditions` 必须是非空数组。
- `equipmentSlotEmpty` 和 `equipmentSlotFilled` 只能引用第一阶段允许的装备槽：`armor`、`primaryWeapon`、`secondaryWeapon`。
- IR node kind 必须属于第一阶段允许的有限集合。
- `choiceEquals` / `choiceIncludes` 只能引用同 ability 内已声明的 choice id，且只能比较该 choice domain 可解析的 id。
- `CardMatchIR.classification` 是开放字符串。validation 只因空值、类型错误或 schema 格式错误失败；当前上下文没有已知候选时最多产生 warning，不阻断 dry-run / commit。
- 顶层 `emitWhen` 只能嵌套第一阶段允许的 effect node，不能表达循环、递归、动态 effect 或副作用。
- option effect 中的 `emitWhen.effects` 只能包含 contribution effects，不得包含 `emitEachSelectedOptionEffect` 或 `emitEachSelectedTarget`。
- choice requirement flow 必须是线性条件链；当前分支 resolve 后如果同时出现多个 active missing choice，validation 或 runtime resolver 必须失败并产生 diagnostic。
- normalized IR validation 必须设置最大节点深度、最大节点数和最大 effect 展开数；超限 fast fail。
- `divide` 结果不会隐式取整；需要整数 target 时必须显式使用 `floor`、`ceil` 或 `round`。
- `targetFrom` 如果后续支持，必须限制到安全枚举，不能拼接任意 target 字符串。
- IR 不允许引用本轮 card output。
- IR 不允许表达副作用。
- Editor Draft Export 无法降级到旧卡包格式的 Card Automation Definition 字段时，必须有明确导出诊断。
- legacy JSON / DHCB 的 Editor Draft Export 应尽量保持向后兼容：draft 卡牌有 Card Automation Definition 时导出该 wrapper；没有 automation 时省略该字段。默认不为了旧格式主动剥离 automation。
- 只有当用户显式选择某种会丢弃未知字段或禁止扩展字段的 legacy-compatible 导出模式时，才需要产生诊断说明 automation 会被移除。普通新增字段不视为严重兼容问题。

导入 workflow 应保持 fast failure。Card Automation Definition 或 normalized IR 无效的卡牌包不应被安装成半可用状态。

Phase 1 validation 上限先采用保守工程护栏，而不是规则语义：

```ts
const CARD_AUTOMATION_PHASE_1_LIMITS = {
  maxAbilitiesPerCard: 8,
  maxChoicesPerAbility: 8,
  maxEffectsPerAbility: 32,
  maxNestedEffectDepth: 4,
  maxValueExpressionDepth: 6,
  maxConditionDepth: 6,
  maxExpandedContributionsPerAbility: 32,
} as const;
```

这些限制用于避免异常或恶意 automation definition 让 dry-run、resolver 或 diagnostics 变得不可控。它们不是 DaggerHeart 规则限制；如果后续真实 fixture 证明需要更大上限，可以在保留 fast failure 语义的前提下调整。

实现要求：

- 上限必须集中定义并由 normalizer / validator / resolver / projector 共享，不能散落成多个魔法数字。
- 超限必须 fast fail，不能截断、部分执行或静默降级。
- 测试必须覆盖每个上限的边界值和超限值。

## Import And Editor Boundary

Automation IR normalization / validation 属于 formal dry-run workflow 的组成部分。它不是 commit-only 阶段，也不是 editor-local 阶段。

概念流程：

```text
Formal Dry Run Workflow
  -> sourceRead
  -> jsonParse
  -> externalContractGuard
  -> externalFormatAdapter
  -> structuralValidation
  -> buildDryRunValidationModel
  -> normalizeAndValidateAutomationIR
  -> semanticValidation
  -> stageImportDataPreview

Commit Workflow
  -> formal dry run must succeed
  -> storage-aware conflict check / pack limit check
  -> buildCommitPlan
  -> storageTransaction
  -> runtimeRefresh
```

Dry run 的职责是把外部输入变成结构上可安装、语义上可运行的 normalized model。外部 `automation` 字段是 Card Automation Definition；dry run 必须把它 normalize / compile 成 Normalized Card Automation IR，作为 normalized model 的一部分。

Storage-aware conflict check、pack limit check 和实际 commitability check 不属于 formal dry-run 本体；它们属于 commit workflow / application service preflight。dry-run diagnostics 只描述 payload 自身的结构、语义和 automation 编译问题。

第一阶段约定：

- 外部卡包的 `automation` 字段直接挂在每个卡牌条目上，例如 `/domains/3/automation` 或 `/ancestries/1/automation`。
- 不使用 pack 顶层 automation map，也不通过卡牌 id 在其它结构中间接引用 automation。自动化定义随卡牌条目一起 structural validation、dry-run normalization 和 diagnostic path 定位。
- 当前 `card-pack-v1.schema.ts` 是 strict schema；实现时应在 shared card base 或每类 card item schema 上显式声明可选 `automation` 字段。schema 未声明字段仍然按 unknown field 失败。
- automation 字段不存在时允许导入，表示该卡牌没有自动化。
- automation 字段存在但不是受支持的 Card Automation Definition、无法 normalize，或 IR validation 失败时，dry run 失败。
- Card Automation Definition wrapper 或 body 出现未知字段时，dry run 失败。
- Card Automation Definition body 如果携带 internal-only 字段，例如 `format` 或 `revision`，dry run 失败。
- low-level Definition normalizer 只处理白名单 sugar：缺省 `lifetime` 和省略 effect id。其它别名、简写或多套写法都必须失败。
- dry-run result 的 normalized model 中应包含 `automation: CardAutomationIR`。
- commit 只保存 dry run 已验证过且带 `revision` 的 `automation: CardAutomationIR`。
- installed card template 不保存外部 Card Automation Definition 原文。
- editor draft 只保存外部 Card Automation Definition 原文；editor validation 的临时 compiled IR 只用于 diagnostics / preview，不回写 draft。
- runtime resolver 只消费卡牌实例上的 normalized IR，不在运行时重新 normalize Card Automation Definition，也不从卡面文本推断自动化。
- editor validation 复用 formal dry-run workflow 和共享 Card Automation Definition normalizer / IR validator；editor 可以追加 authoring-friendly diagnostics，但不能替代 formal diagnostics，也不能维护第二套 automation parser。
- 第一版编辑器不要求完整可视化 DSL builder。可以先提供 JSON / structured editor field，复用 formal dry-run workflow 做 normalization 和 diagnostics；但该 JSON 输入不应被公开描述为最终作者权威格式，可视化 builder 或更高层 authoring DSL 后续再设计。

Diagnostic path 应能定位到卡牌条目上的 automation 字段，例如：

```text
/domains/3/automation/abilities/0/effects/1/value
/ancestries/1/automation/abilities/0/choices/0/options/2
```

编辑器可以再把这些 path 映射到 tab / index / field。

## Runtime Diagnostics

Runtime diagnostics 是派生视图，不是角色存档状态。

第一阶段约定：

- diagnostics 不写入 `sheetData`。
- diagnostics 不参与导出 / 导入。
- diagnostics 不成为 source state。
- diagnostics 每次基于当前 `BoundarySourceSnapshot`、card instance automation IR 和 card instance automation state 重新派生。
- UI 层如何展示 diagnostics 不在本文固定；领域层只需要提供统一诊断视图。

建议提供一个统一派生入口：

```ts
deriveCardAutomationRuntimeDiagnostics(sheetData): CardAutomationRuntimeDiagnostic[]
```

这个入口应与 automation resolver 使用同一套 snapshot、IR validation assumptions 和 choice validation 规则。它可以被 UI、调试面板、测试或未来的角色诊断面板消费，但消费方式不属于第一阶段核心设计。

Requirements、runtime diagnostics 和 card automation provider 应共享同一套 source collector / resolver，而不是各自扫描卡牌。概念入口：

```ts
collectCardAutomationSources(
  sheetData: SheetData,
): CardAutomationSource[]
```

collector 负责从 `loadout` 和 `vault` 收集卡牌实例，解析 `instanceId`、template id、instance automation IR、zone 和 automation state。缺少实例 id、实例 IR 缺失或实例 IR 异常时，collector / resolver 必须产生 diagnostic，不得猜测或静默跳过。当前安装模板只用于可选的 template drift diagnostics 和显式刷新 intent，不是执行权威。

概念形态：

```ts
type CardAutomationRuntimeDiagnostic = {
  severity: "error" | "warning";
  code:
    | "MISSING_CHOICE"
    | "INVALID_CHOICE"
    | "UNKNOWN_CHOICE_STATE"
    | "MISSING_INSTANCE_ID"
    | "INVALID_ABILITY_STATE"
    | "MISSING_INSTANCE_AUTOMATION_IR"
    | "INVALID_INSTANCE_AUTOMATION_IR"
    | "CARD_AUTOMATION_TEMPLATE_CHANGED"
    | "CARD_AUTOMATION_TEMPLATE_MISSING"
    | "ORPHAN_CARD_AUTOMATION_STATE"
    | "REFRESH_CARD_AUTOMATION_FAILED";
  cardInstanceId?: string;
  cardTemplateId: string;
  cardName: string;
  abilityId?: string;
  abilityLabel?: string;
  path: string;
  message: string;
};
```

第一阶段 runtime diagnostics 主要覆盖：

- 缺少必填 choice。
- `choiceValues` 中存在 ability IR 未声明的 choice id。
- choice 不满足 `min`、`max`、`unique` 或每项选择次数约束。
- choice 引用不存在的 option 或 target。
- `permanentOnceClaimed` 的 required choice 数据丢失或无效。
- 实例缺少 `automation` IR。
- 实例 `automation` IR 异常。正常情况下卡牌实例化应挡住这类问题，但旧存档、手工编辑或未来迁移可能制造异常状态。
- 当前安装模板的 automation revision 与实例 IR revision 不一致。该诊断只是提示模板有变化，contribution 仍按实例 IR 输出。
- 当前安装模板缺失。该诊断只是提示无法从模板刷新，不影响实例 IR 执行。
- 实例保存了实例 IR 中已不存在的 ability state。
- 非空卡牌缺少 `instanceId` 且无法补齐。
- 显式刷新实例 IR 失败。

`error` diagnostic 表示对应 ability 不输出 contribution。`warning` 表示 contribution 可以输出，但存在需要上层展示或提示的状态。

## Storage And Import Implications

外部卡包保存的是 Card Automation Definition wrapper；导入 dry run 编译后，安装模板和角色存档中的卡牌实例保存的是 Normalized Card Automation IR。运行时权威是实例 IR。模板 IR 是新增 / 刷新实例时的来源；实例 IR 是已有角色存档计算时的来源。卡牌 choice state 也属于角色存档中的卡牌实例。

运行时安装后的 card pack storage 不是第一阶段的外部导出来源。只有编辑器 draft/export 面向外部卡包格式；编辑器 draft 应保留或生成 Card Automation Definition wrapper，并在导出前通过 dry-run validation 验证。第一阶段不要求从 installed template IR 反向恢复 Definition wrapper。

因此至少有三类存储边界：

- Card pack external payload 在每个卡牌条目上使用 `automation?: CardAutomationDefinition`。字段不存在表示该卡牌没有自动化。
- Card pack storage 在安装后的卡牌模板上保存 `automation?: CardAutomationIR`。
- Character sheet storage 在对应 `StandardCard` 实例上保存 `instanceId?: string`、`automation?: CardAutomationIR`、`automationSource?: CardAutomationSourceSnapshot` 和 `automationState?: CardInstanceAutomationState`。

导入 dry run 负责把 Card Automation Definition normalize / compile 成 IR，并校验 IR。commit 后的 installed card template 只保留 normalized IR。角色表选择模板卡时，把该 normalized IR 复制到卡牌实例。角色表运行时加载卡牌实例后，由 automation runtime 读取实例 IR 和实例 automation state。

角色存档导出必须包含实例 IR。导入到另一台未安装同一卡包的终端时，已有实例仍应能按存档内 IR 计算 contribution。缺少卡包只能影响新增、刷新和 template drift diagnostics，不能改变已有实例的自动化结果。

角色存档导入时，如果某个卡牌实例的 `automation` 缺失或无效，应保留该卡牌的卡面 / 显示数据，但该实例自动化失败并产生 runtime diagnostic。除非角色存档整体结构损坏，单张卡牌实例的 automation 问题不应阻止整个角色导入。

如果当前安装模板与实例 IR 不一致，系统不得自动切换到模板。任何会改变实例 `automation` 的操作都必须是用户明确发起的刷新 / 替换流程，并在写入前重新校验当前状态。

`instanceId` 生成应使用英文内部标识。优先使用 `cardinst_${crypto.randomUUID()}`；如果运行环境不支持 UUID，可 fallback 到 `cardinst_<timestamp>_<random>`。生成后必须随存档稳定保存，移动卡牌、导出 / 导入角色都不得重新生成。

第一阶段不新增独立的全局 `sheetData.cardAutomationState` 索引。若后续发现跨实例查询或迁移需求很强，可以再设计索引或缓存，但它不应成为第一阶段的 source of truth。

`StandardCard` 仍是当前运行时卡牌读模型，不因此成为长期公开卡包契约。第一阶段只是为了兼容当前选择、展示和角色表存储路径，在 installed runtime card template 与 character sheet card instance 上增加最小字段。长期 card pack data authority 可以在后续重构中与 `StandardCard` 解耦。

Legacy Published Format 直接在每个卡牌条目上扩展 `automation` 字段。字段存在表示该卡带有 Card Automation Definition wrapper；字段不存在表示该卡无自动化。系统不得从现有中文规则文本推断 automation。

## Interface Implications

第一阶段不设计具体 UI / UX 消费形态。领域层和自动化边界只需要提供足够稳定的能力接口，让 UI、调试面板或测试以后按需消费。

第一阶段接口至少包括：

- import / editor validation 能返回 Card Automation Definition normalization 和 IR validation diagnostics。
- requirement read model 能描述已实例化卡牌当前需要哪些 choice、哪些 action 可提交。
- boundary intents 能表达 `setCardAbilityChoiceValues` 和未来的 `refreshCardAutomationFromTemplate`。
- card lifecycle intent 或现有卡牌操作需要进入 modifier-aware boundary，例如选择、移动、替换、删除卡牌实例。它们不是 Card Automation IR 的一部分，但会改变 card provider 的 source state。
- runtime diagnostics 能统一报告缺失 choice、无效 state、实例 IR 缺失 / 无效、模板差异等状态。
- card contribution metadata 能携带 card / ability source，供 modifier popover 或其它视图未来消费。

第一版不设计独立 activation 入口。永久领取类能力的门控由卡牌实例存在和 required choice 是否满足共同决定；选中卡牌、移动卡牌和写入 choice 都是普通 source-state intent。card base 与系统 base 并存时，第一阶段不新增 active base 提示 UI，沿用现有 active base 规则；需要解释来源时由 diagnostics 或 contribution metadata 提供信息。

本设计不要求第一阶段完成完整可视化 DSL 编辑器。早期先支持 JSON / structured editor field，再逐步做 authoring UI。

## Testing Direction

第一阶段测试应覆盖：

- Pure resolver / projector unit tests：给定 snapshot、实例 IR 和实例 state，派生 requirements、diagnostics 与 contribution。
- Import validation tests：非法 Card Automation Definition 或 normalized IR 产生结构化 diagnostics。
- Builtin parity tests：builtin 和第三方卡牌源数据都使用 Card Automation Definition，并经过同一 compile、IR validator、resolver 和 projector；不允许 builtin 私有自动化分支。
- Dry-run model tests：外部 automation definition 被 normalize / compile 成 IR，并出现在 dry-run normalized model 中。
- Effect id normalization tests：Definition 省略 effect id 时 compiled IR 生成稳定 id；作者提供重复 effect id 时 dry-run 失败。
- Commit projection tests：installed card template 只保存 normalized IR，不保存外部 Card Automation Definition 原文。
- Editor draft tests：editor draft 保存 Card Automation Definition 原文；validation 临时编译 IR 不回写 draft。
- Editor draft export tests：draft 中有 Card Automation Definition 的卡导出 `automation` definition wrapper，无 automation 的卡省略该字段；显式 legacy-compatible 降级模式若会移除 automation，必须产生诊断。
- Runtime integration tests：卡牌实例进入角色表后触发 automation boundary。
- Card instantiation tests：所有非空卡牌实例都会生成 `instanceId`；模板带有 automation 时实例化必须复制完整 IR，复制失败不得创建半自动化实例。
- Character export/import tests：存档导出包含实例 IR；导入到未安装原卡包的环境后，已有实例仍按实例 IR 生成相同 contribution。
- Character import diagnostics tests：导入角色时单张卡牌实例 IR 缺失或无效会保留卡面数据、阻断该实例自动化并产生 diagnostic，但不阻断整个角色导入。
- Choice persistence tests：同一模板不同实例 choice 独立生效。
- Choice resolver tests：raw `choiceValues` 必须通过 ability choice IR 解析成 resolved choice read model；UI、projector 和 provider 不直接消费 raw string。
- Choice validation tests：缺失 choice、未知 choice key、重复选择、数量不满足约束、无法解析 option / target 时不输出 contribution 并产生 diagnostic。
- Target slot identity tests：经历 target choice 保存 `experienceValues.${index}`；经历名称变化后 contribution 仍跟随同一槽位；槽位无效或不再合法时产生 diagnostic，不按名称重匹配。
- Requirement view tests：同一份 `sheetData` 派生稳定 requirements；requirements 不写入 `sheetData`。
- Boundary intent tests：`setCardAbilityChoiceValues` 到达边界时必须基于当前 state 重新校验，不能信任旧 requirement view；合法 intent 整体替换该 ability 的 `choiceValues`，非法 intent 保持旧 state 原样。
- Template drift tests：当前模板 revision 与实例 IR revision 不一致时继续按实例 IR 输出 contribution，并产生 warning。
- Refresh intent tests：`refreshCardAutomationFromTemplate` 只有在用户显式发起、模板存在且当前 state 可被新 IR 安全解析时才能替换实例 IR；失败时不得改变 choice。
- Replacement tests：用新模板覆盖已有卡牌会创建新 `instanceId`，丢弃旧 `automation`、`automationSource` 和 `automationState`。
- Source collector tests：requirements、diagnostics 和 provider 共享 collector；collector 同时覆盖 `loadout` 和 `vault`，并对 missing / invalid instance IR 产生 diagnostic。
- IR validation tests：未知 node、非法 selector、隐式取整需求和副作用 node 都产生 diagnostic。
- Runtime diagnostics tests：统一诊断视图能派生缺失 choice、无效 choice state、缺失 instanceId 等错误，且不写入 `sheetData`。
- Regression fixtures：builtin-base 和 Void1.5 中第一阶段声明支持的卡牌都能生成预期 contribution。
- Negative tests：战斗触发、消耗型、临时状态型能力不应被误表达或误启用。

## Independent Review Findings

2026-06-22 对当前设计做了五个方向的只读审查：fixture 覆盖、IR 语义安全、边界 / 存储、实现贴合度、作者可读性。总体结论是：方向合理，但当前 IR 草案仍有若干 Phase 1 之前必须收敛的风险。

### Confirmed Strengths

- 实例 IR 权威模型是正确方向。它解决卡包禁用、缺失、更新和跨终端存档导入导致的自动化不一致问题。
- Card Automation Definition 与 Normalized Card Automation IR 的分层是必要的。即使 low-level definition 很接近 IR，也不能把 internal IR marker 当作外部输入格式。
- 自动化必须在统一 modifier boundary 内运行，且只能读取 pre-card snapshot，不能读取本轮 provider output。
- No Guessing / Fast Failure 是核心评价标准。错误 choice、缺失状态、非法 value 或无效 IR 都应产生 diagnostics，而不是输出猜测值。
- Card matcher getter 必须是语义接口。Phase 1 不新增完整中间模型，但也不把 `StandardCard` 具体字段结构暴露为 IR contract；第一阶段只稳定承诺领域卡相关 matcher。

### Resolved By Resolver Refinement

- `Master of the Craft` 这类“先选模式，再按模式要求不同数量目标和不同数值”的能力通过线性 choice chain 和 `emitWhen.effects: CardEffectIR[]` 表达。`emitWhen` 可以包含 `emitEachSelectedTarget`，但同一时刻不能展开多个 active missing choice。
- `permanentOnceClaimed` 只表达实例存在且 requirements 满足后的跨 zone 持续贡献。入宝库属于 card lifecycle / boundary intent，不进入 Card Automation IR。
- 卡牌生命周期动作不进入 IR。移动、删除、替换、实例化和 choice 写入都必须是 modifier-aware boundary 中的外部 intent 或既有卡牌操作；resolver / projector 只能读取动作完成后的 source state。
- `equipmentSlotEmpty` 和 `equipmentSlotFilled` 是 Phase 1 对称条件；不提供 `anyWeapon`。未装备任何武器用 `all(primaryWeapon empty, secondaryWeapon empty)` 表达，避免命名歧义。
- `inactiveStored` 不进入 Phase 1。只在 `vault` 中存放但不贡献的卡牌，不需要声明 lifetime mode；不满足 `whileInLoadout` 或缺少 required choice 已足以表达“不贡献”。
- `activationActive` 不进入 Phase 1 condition。`permanentOnceClaimed` 的贡献资格由 lifetime resolver 处理，不进入通用 `ConditionIR`。
- `valueByTier` 的 normalized IR 必须包含所有 tier key。Definition 如果允许省略，只能由 normalizer 补齐或失败，缺 key 不得进入 IR。
- 字段命名已收敛：保留 `requiredWhen`；target choice domain 使用 `modifierTargetGroup` + `group`，不使用 `targetSet`。
- 线性 choice chain 是 Phase 1 硬约束。当前 resolved branch 同时出现多个 active missing choice 时，normalization / validation 应尽量失败；runtime resolver 必须失败并产生 diagnostic。
- Phase 1 validation 上限已固定为工程护栏；实现时集中定义，超限 fast fail，并用边界测试覆盖。若真实 fixture 需要更大值，后续显式调整。
- Phase 1 不实现“选择此牌后自动放入宝库”的专门 lifecycle flow。卡牌移动仍必须是 modifier-aware action，但该自动化流程不阻塞 DSL / resolver 基底。

### Implementation Alignment Risks

- 当前 `StandardCard` 没有 `instanceId`、`automation`、`automationSource`、`automationState` 字段。实现需要新增 `SheetData` schema version migration、实例化 helper 和 modifier-aware card actions。
- 当前存在组件直接 `setSheetData` 修改 `cards` / `inventory_cards` 的路径，且 generic `setSheetData` 设计上不自动同步。实现必须把卡牌实例化、替换、移动、删除和 choice 写入收敛到专用边界，不能继续让 UI 直接写卡牌数组。
- 当前库存卡删除和部分库存卡变更路径不一定进入完整 modifier-aware boundary。`permanentOnceClaimed` vault card 会让这些路径必须参与集中自动化同步。
- Card pack schema 当前 strict 且未声明 `automation` 字段；formal dry-run 需要在卡牌 item schema 上扩展 external Definition schema，并在 projection 中保存 compiled IR。

### Authoring Clarity Risks

- `automation` 字段在 external payload、installed template 和 character instance 中类型不同。实现文档和 schema 命名必须反复区分 Card Automation Definition、Template Automation IR 和 Instance Automation IR。
- 示例需要展示完整 `CardAutomationDefinition` wrapper，而不只是 `body` 片段；也需要展示 `body` 携带 internal `format` / `revision` 会失败的反例。
- `selectMany` 需要真实“选两个不重复奖励”示例。单选却用 `selectMany max: 1` 会增加作者心智负担。
- `choiceValues` 中的字符串没有裸语义。示例应强调它们必须由当前 ability 的 `choices[].domain` 解释，不能由 UI 或 projector 直接读取。

## Open Questions

- Phase 2+ 是否需要更友好的人类作者语法，例如短语化 DSL、完整可视化 builder，或两者并存。该问题不阻塞 Phase 1 自动化基底。

## Recommended Next Step

下一步应围绕本文写 implementation plan，而不是直接实现 resolver / provider。

建议先补一份 implementation plan，明确：

- 卡牌 item schema 的 `automation?: CardAutomationDefinition` 类型定义、strict validation 和 dry-run compile 接线。
- 共享 Card Automation Definition normalizer / IR validator 模块的位置、输入输出和 diagnostics path 约定。
- 卡牌实例 choice state 的角色表模型。
- resolver、projector 和 card provider 所属 module 边界。
- modifier registry 如何消费 card contribution。
- editor / import diagnostics 如何接入。
- builtin-base 与 Void1.5 第一批卡牌的 fixture 清单。
