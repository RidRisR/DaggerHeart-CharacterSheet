# Modifier Polish Discussion Agenda

日期：2026-05-18

## 目的

本文是本轮 modifier/provider 打磨工作的讨论议程，不是最终设计规格，也不是实现计划。

目标是把接下来需要讨论的问题集中记录下来，明确每个议题需要达成什么决策。讨论过程中如果发现新的优化点，可以继续追加到本文。

当前背景：

- modifier 架构已基本采用 provider / registry / target 三层模型。
- 装备 provider panel 已有第一阶段方案和实现基础。
- final input reconciliation 已经把用户最终值输入接入 special contribution。
- 升级项已经部分迁移到 `automationSelections` provider 模型。
- 老存档迁移需要继续在“保留旧 final value”和“显式化 provider 来源”之间取得平衡。

## 讨论原则

1. 先确认用户心智模型，再决定数据结构和 UI。
2. 迁移必须优先保留旧存档最终值，避免打开旧卡后数值静默变化。
3. 自动补 provider 必须避免双写；不能同时把同一个加值表达为 provider contribution 和 residual correction。
4. provider 只拥有来源事实；target 只拥有消费状态和 final reconciliation。
5. 任何“推断来源”的迁移规则都应有明确置信条件；置信不足时保守处理。

## 议题 1：收窄“未归因差额”，建立“其他”模型

状态：已定稿。

详细定稿文档：`docs/superpowers/specs/2026-05-18-modifier-other-adjustments-design.md`

### 现状

当前 `未归因差额` 同时承担两种语义：

- 自动计算关闭时：只读 diagnostic，表示 `final value - reference total`。
- 自动计算开启时：实体 special modifier，表示用户通过 final input 产生的 residual correction。

这让文案和概念过宽，用户很难区分“系统发现不一致”和“我手动把终值调成这样”。

讨论中形成的新洞见：

```text
没有作为兜底概念的“未归因差额”。迁移和手动修正都应从“未归因差额”中剥离。
```

这些差额不应放在“修正值”列表里，因为它们不是已知规则来源；也不应叫“总计栏”，因为总计是结果，已经由标题栏/摘要表达。它们应进入与“基础值”“修正值”并列的第三栏：

```text
基础值
修正值
其他
```

“其他”表示：影响最终值，但不属于已知基础值或已知修正来源的调整。

第一阶段已识别三类“其他”：

- 未知迁移差额：迁移时为了保留旧存档 final value 产生；系统知道它来自迁移，但不知道旧规则来源。
- 手动修正：用户明确提交 final input 产生。展示上使用 badge `用户`，label `手动修改终值`。
- 未归因差额：自动计算关闭期间，已知来源变化但 final value 不被系统写回，为解释当前 final value 产生。展示上沿用 badge `同步`。

补充决策：

- 三类“其他”保留自己的成因身份，不因为自动计算开关切换而自动改名或合并。
- `手动修正` 只表示用户明确提交 final input 导致的差额变化，不能作为所有接管差额的兜底项。
- 从自动计算关闭切换为开启时，`未归因差额` 继续保留为 `未归因差额`；final value 不应因此跳变。
- `未归因差额` 是系统维护项。用户不能编辑数值，也不能直接归零。
- 自动计算关闭时，`未归因差额` 不允许删除，因为它正是关闭状态下用于解释 final value 被锁住的差额。
- 自动计算开启后，`未归因差额` 固定下来，并允许用户删除。
- `未归因差额` 只在自动计算关闭期间创建和更新。自动计算开启后，已有的 `未归因差额` 固定为当时的值，继续参与最终值计算，但不再跟随 source/reference 变化。
- 自动计算关闭期间，`未归因差额` 可以不保存，作为运行时派生值显示。
- 自动计算开启时，如果当前派生的 `未归因差额` 非 0，必须物化并保存为“其他”项。
- 自动计算关闭时，如果存在已物化保存的 `未归因差额`，必须删除它，并回到运行时派生模式。
- 自动计算开启时，删除任何“其他”项都会立刻按剩余 reference 和剩余“其他”项重算 final value。
- 自动计算关闭时，删除可编辑“其他”项不会写回 final value；剩余差额由运行时派生的 `未归因差额` 接住。
- `未知迁移差额`、`手动修改终值`、`未归因差额` 可以在同一个 target 同时存在。
- 每个 target 下，每一类已保存“其他”最多一条。
- 新增与 `userModifierContributions` 同级的专用结构保存“其他”，不再把它们混入用户修正来源。
- final value 为空时，不创建任何“其他”差额。
- final value 不可解析为数字时，原样保留，不创建“其他”差额，也不自动覆盖；直到用户提交可解析数字。
- 不可解析 final 后续被用户改成可解析数字时，产生的差额归类为 `手动修改终值`。
- 当 target 没有可计算 reference total 时，不创建“其他”差额；用户输入数值仍创建 `手动基础值`，迁移数值仍创建 `估算基础值`。
- 迁移时，压力初始值按 6 处理，经历初始值按 2 处理；超出的部分直接进入 `未知迁移差额`，不再反推这些默认初始值。

### 需要讨论的问题

- `otherAdjustments` 的具体数据结构和 id 策略是什么？
- 自动计算关闭是否只表示“不写回 final value”，而 provider/reference/其他仍实时更新？
- 自动计算关闭期间 source/reference 变化时，是否实时更新“未归因差额”来解释锁住的 final value？
- 从自动计算关闭切换为开启后，已存在的“未归因差额”是否继续保留并参与计算？
- 自动计算关闭时，`未知迁移差额` 和 `手动修正` 是否允许删除？
- 旧 `unattributed-delta` special contribution 是否需要迁移为新的三类 identity？
- popover 中是否彻底移除“同步”作为来源 badge，改用“迁移”“手动”“暂停”等明确原因？

### 期望产出

- 确认“其他”栏目和三类行项目的最终中文名。
- 确认自动计算开关的新语义。
- 确认三类差额的生成、更新、删除规则。
- 确认从旧 `未归因差额` 模型迁移到新模型的兼容策略。

### 定稿决策

新增与 `userModifierContributions` 同级的专用结构保存“其他”项。`userModifierContributions` 继续表示用户创建的已知来源；“其他”不再混入“基础值 / 修正值”来源列表。

第一阶段“其他”包含三类：

- `未知迁移差额`：迁移时为了保留旧存档 final value 产生；系统知道它来自迁移，但不知道旧规则来源。展示使用 badge `迁移`。
- `手动修改终值`：用户明确提交 final input 产生。展示使用 badge `用户`。
- `未归因差额`：自动计算关闭期间，已知来源变化但 final value 不被系统写回，为解释当前 locked final value 产生。展示沿用 badge `同步`。

每个 target 下，每一类已保存“其他”最多一条，但三类可以同时存在。

自动计算开关的新语义：

- 自动计算开启：provider / reference / 其他实时更新，并写回 final value。
- 自动计算关闭：provider / reference / 其他实时更新，但不写回 final value。

`未归因差额` 的生命周期：

- 自动计算关闭期间：运行时派生，不保存，实时变化，不可编辑、不可删除、不可归零。
- 自动计算开启时：如果当前派生的 `未归因差额` 非 0，必须物化并保存为“其他”项；保存后固定，不再跟随 source/reference 变化，并允许删除。
- 自动计算关闭时：如果存在已保存的 `未归因差额`，必须删除它，回到运行时派生模式。

删除规则：

- 自动计算开启时，删除任何“其他”项都会立刻按剩余 reference 和剩余“其他”项重算 final value。
- 自动计算关闭时，删除可编辑“其他”项不会写回 final value；剩余差额由运行时派生的 `未归因差额` 接住。

空值和不可解析值：

- final value 为空时，不创建任何“其他”差额。
- final value 不可解析为数字时，原样保留，不创建“其他”差额，也不自动覆盖；直到用户提交可解析数字。
- 不可解析 final 后续被用户改成可解析数字时，产生的差额归类为 `手动修改终值`。

无 reference total：

- 当 target 没有可计算 reference total 时，不创建“其他”差额。
- 用户输入数值仍创建 `手动基础值`。
- 迁移数值仍创建 `估算基础值`。

迁移默认值：

- 迁移时，压力初始值按 6 处理，经历初始值按 2 处理。
- 超出的部分直接进入 `未知迁移差额`，不再反推这些默认初始值。

建议数据形状：

```ts
type OtherAdjustmentKind =
  | "unknownMigrationDifference"
  | "manualFinalAdjustment"
  | "unattributedDifference"

interface OtherAdjustment {
  id: string
  target: ModifierTargetId
  kind: OtherAdjustmentKind
  value: number
}
```

建议稳定 id：

```text
other:${target}:unknown-migration-difference
other:${target}:manual-final-adjustment
other:${target}:unattributed-difference
```

## 议题 2：升级项进一步迁移到 provider 模型

状态：已定稿。

详细定稿文档：`docs/superpowers/specs/2026-05-18-upgrade-states-provider-migration-design.md`

### 现状

已有部分升级项通过 `automationSelections` 生成 upgrade modifier：

- 生命上限 `+1`
- 压力上限 `+1`
- 闪避 `+1`
- 熟练度 `+1`
- 属性 `+1`
- 经历 `+1`

但仍需要确认老存档迁移和 UI 状态一致性，尤其是 `checkedUpgrades` 与 `automationSelections` 的关系。

已确认：

- 只迁移 target 明确的升级项到 provider selection。
- 参数化升级项不从历史勾选状态自动推断 selection，例如“两项属性 +1”“两项经历 +1”。
- 对于缺少历史选择参数的参数化升级，取消/反选时继续提示用户：系统不知道之前选择了什么，无法自动还原具体 selection。
- 升级状态最终应收敛为单一结构，不再用 `checkedUpgrades` 和 `automationSelections` 双重保存同一个升级格子的 UI 状态和 provider 参数。
- 新统一结构命名为 `upgradeStates`。它以完整 `checkKey` 为 key，每个 value 存储该升级格子的 UI 勾选状态和 provider 参数。

建议形状：

```ts
interface UpgradeState {
  checked: boolean
  params?: UpgradeStateParams
}

type UpgradeStates = Record<string, UpgradeState>
```

`params` 使用类型化 union，不继续使用开放的 `Record<string, unknown>`：

```ts
type UpgradeStateParams =
  | { target: "hpMax" | "stressMax" | "evasion" | "proficiency" }
  | { attributes: AttributeKey[] }
  | { experienceIndexes: number[] }
```

语义：

- `checked: true` 且 `params` 完整有效：UI 显示已勾选，registry 生成对应 upgrade provider entry。
- `checked: true` 但 `params` 缺失或无效：UI 显示已勾选，但 registry 不生成 provider entry。这个状态表示迁移历史丢失了具体选择参数。
- `checked: false`：UI 未勾选，registry 不生成 provider entry。

固定 target 多格升级按 checkKey 粒度表达。每个 `checked: true` 且 params 有效的 checkKey 生成一条 `+1` provider entry。例如两个生命槽升级格子会生成两条独立的 `hpMax +1` entries。

`doubleBox` 升级仍按一个 checkKey、一条 provider entry 处理。两个格子只是 UI 成本，不代表两个规则效果。例如熟练度 doubleBox 只生成一条 `proficiency +1` entry。

取消/反选升级时清空该 checkKey 的 params，只保留 `checked: false`。取消表示撤销这次配置；如果用户重新勾选参数化升级，应重新选择属性或经历。

固定 target 升级重新勾选时，不依赖旧 params；系统按升级规则自动写入对应 params。例如 HP、Stress、Evasion、Proficiency 升级在重新勾选时自动生成 `{ target }`。

v1 -> v2 迁移时，所有 `checkedUpgrades` 中 `checked=true` 的 checkKey 都迁移为 `upgradeStates[checkKey] = { checked: true }`。其中只有 target 明确的 modifier 升级会补充 params；参数化升级和非 modifier 升级只保留 checked 状态。

升级选项数据应新增机器可读 automation metadata，迁移和运行时逻辑使用该 metadata 判断 provider 参数，不再依赖中文 label includes。固定 target 升级可表达为 `automation: { kind: "fixedTarget", target: "hpMax" }` 这类结构。

第一阶段 automation metadata 覆盖四类：

```ts
type UpgradeAutomationMetadata =
  | { kind: "fixedTarget"; target: "hpMax" | "stressMax" | "evasion" | "proficiency" }
  | { kind: "attributeSelection"; count: 2 }
  | { kind: "experienceSelection"; count: 2 }
  | { kind: "none" }
```

领域卡、子职业、兼职等非 modifier 升级使用 `kind: "none"`，不把 modal 行为塞进 modifier automation metadata。

v2 运行时只保留 `upgradeStates`。v1 -> v2 迁移读取 legacy `checkedUpgrades` 生成 `upgradeStates` 后，删除 `checkedUpgrades` 和 `automationSelections`。当前 modifier 分支尚未发布，不需要兼容分支中间态的 `automationSelections`。

迁移顺序必须先生成 `upgradeStates` 和对应 provider，再计算 `未知迁移差额` 来保留 legacy final value。这样固定 target 升级不会被同时表达为 provider entry 和迁移差额。

对 `checked: true` 但缺少 params 的参数化历史升级，取消时只设置 `checked: false` 并提示用户历史选择参数缺失；不生成 provider 回滚，也不直接修改 final value，因为系统无法知道应回滚哪些具体属性或经历。

Upgrade provider entry id 继续使用 `upgrade:${checkKey}:${target}`。例如 `upgrade:tier1-1-0:hpMax`、`upgrade:tier1-5-0:evasion`、`upgrade:tier1-0-2:agility.value`。这样多格同 target 升级不会冲突，参数化升级同一个 checkKey 下多个 target 也不会冲突。

### 需要讨论的问题

- 哪些 target 明确的 legacy `checkedUpgrades` 可以可靠迁移为 `automationSelections`？
- 属性升级和经历升级如果旧存档只有勾选状态、缺少选择参数，是否能推断目标？
- 对纯固定 target 升级，例如 HP、Stress、Evasion、Proficiency，是否应从勾选状态自动生成 selection？
- 迁移生成 upgrade provider 后，如何重新计算 residual，避免旧 final value 被 provider 和手动差额双写？
- 取消升级时是否只取消 selection，不再做任何旧式 final `-1` 回滚？

### 期望产出

- 列出可自动迁移的升级类型。
- 列出不可自动迁移、只能保留旧 final/residual 的升级类型。
- 确认 `checkedUpgrades` 和 `automationSelections` 的长期分工。
- 确认新的统一升级状态结构，以及现有 v1 `checkedUpgrades` 如何迁移到该结构。

## 议题 3：重伤阈值和严重阈值的联合观察与编辑

### 现状

`minorThreshold` 和 `majorThreshold` 是两个独立 modifier target。护甲提供两个 base，等级提供两个相同数值的 modifier，UI 上也有两个独立 target panel。

这在数据模型上清晰，但在用户操作上重复，因为多数来源会同时影响两个阈值。

### 需要讨论的问题

- 是否保留两个独立 target，只增加一个联合查看/编辑入口？
- 联合面板是否应支持“一条来源同时影响重伤和严重阈值”的展示？
- 用户新增自定义阈值修正时，默认是只修一个阈值，还是支持成对创建？
- 装备 provider panel 中是否需要阈值成对编辑控件，而不是两条独立 contribution？
- 未来是否需要引入 grouped contribution，还是第一阶段只做 UI 聚合，不改底层模型？

### 期望产出

- 确认阈值是否只做 UI 聚合，还是引入新的成组 contribution 模型。
- 确认 target panel、装备 provider panel、final input 的交互边界。

## 议题 4：老存档装备和护甲是否自动接入 provider 模型

### 现状

当前迁移规则对 legacy flat equipment 字段很保守：

- 旧装备字段迁移到 `equipment.weaponSlots.*` 和 `equipment.armorSlot`。
- legacy flat equipment 不根据名称自动匹配模板。
- `modifierContributions` 默认保持为空。
- 旧 final value 通过 special contribution 保留。

新的问题是：如果能确认旧装备没有被玩家修改过，是否可以自动套用内置模板的 provider contributions。

### 需要讨论的问题

- 如何判断 legacy 武器或护甲“确实是内置模板且未修改”？
- 匹配条件是否需要同时比较名称、trait、damage、feature、护甲值、阈值等关键字段？
- 如果模板名称重名或字段不足，是否一律不自动补 provider？
- 自动补 provider 后，是否必须重新计算 residual，以保证最终值不变？
- 如果补 provider 会导致 residual 出现反向抵消，是否说明存在双写风险，应撤回自动补？
- 当前装备模板 contributions 中哪些属于纯加值、可迁移；哪些是条件型或文本规则，不应自动迁移？

### 候选方向

- A. 完全保守：迁移不自动补装备 provider。
- B. 严格匹配：只有可证明未修改的内置模板装备才自动补 provider。
- C. 建议模式：迁移不写入 provider，只在 UI 提示用户可以套用模板来源。

当前待讨论重点是 B 是否值得做，以及置信条件要多严格。

### 期望产出

- 确认是否自动补装备/护甲 provider。
- 如果自动补，定义精确的匹配和回退规则。
- 确认如何避免与旧 final preservation 双写。

## 议题 5：其它可优化点候选池

这些不一定都进入本轮实现，但需要评估优先级。

### 5.1 自动计算文案

当前 popover 标题使用“同步中 / 暂停同步”，按钮使用“开启自动计算 / 关闭自动计算”。术语不完全统一。

需要讨论是否统一为“自动计算开启 / 自动计算关闭”，减少“同步”残留心智。

### 5.2 Special contribution ownership

当前 `手动基础值`、`估算基础值`、`未归因差额` 复用 `userModifierContributions`，通过稳定 id 识别。

需要讨论第一阶段是否继续保持 id convention，还是引入显式 metadata，例如 `managedBy: "target"`。后者更清楚，但需要存档迁移和更多类型改动。

### 5.3 Provider 修改入口的一致性

装备 contribution 要在装备 provider panel 编辑；升级 contribution 要回升级区取消或修改；职业/等级/护甲 base 要回对应来源修改。

需要讨论 target panel 是否要给系统来源显示“去来源修改”的提示或入口。

### 5.4 空 label 和 placeholder 一致性

装备 provider panel 已采用空 label + placeholder。target panel 中新增用户来源是否也应保持同样规则，避免 placeholder 写入存档。

### 5.5 迁移可解释性

老存档迁移后可能出现 `估算基础值` 或 residual correction。

需要讨论是否需要轻量提示，让用户知道这些来源是迁移为保留旧数值而生成的。

### 5.6 测试矩阵整理

本轮变更会跨越 migration、registry、target reconciliation、upgrade UI、equipment provider UI。

需要提前列出测试矩阵，避免只测 happy path。

## 讨论顺序建议

1. 先讨论议题 1：术语拆分。它会影响后续所有文案。
2. 再讨论议题 2 和议题 4：升级和装备的迁移策略。它们都属于“从旧事实推断 provider，且避免双写”。
3. 再讨论议题 3：阈值双 target 的联合 UI。这个更偏交互和模型演进。
4. 最后从议题 5 中挑选本轮必须做的优化点。

## 待追加

讨论过程中发现的新问题追加到这里：

- 暂无。
