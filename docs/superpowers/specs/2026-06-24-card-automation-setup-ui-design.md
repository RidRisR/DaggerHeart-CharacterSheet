# 卡牌自动化设置 UI 设计

日期：2026-06-24

状态：待 review 的设计草案

## 问题

有些卡牌自动化需要玩家提供选择状态，才能产生 modifier contribution。当前自动化运行时已经把这件事建模为 Card Instance 上的 Card Ability State；缺少必填选择时，会派生出 Card Automation Requirement。问题是当前选卡 UI 在玩家获得卡牌时没有暴露这些 requirement。

这里最重要的产品规则是：获得卡牌不以完成自动化设置为前提。玩家取消设置时，这张卡仍然保留在角色表上，仍然是一个 Card Instance。它未解析的 ability 会保持 blocked，直到玩家之后补填 required choice。

## 目标

- 把获得卡牌和设置自动化当作两个独立的用户意图。
- 用户选中卡牌后，如果新实例有 missing requirement，立即提示自动化设置。
- 用户取消或关闭设置时，保留已创建的 Card Instance。
- 提供一个简单的逐卡入口，让用户之后补填设置。
- 复用现有 Card Instance、Card Ability State、requirement、automatic-calculation boundary 概念。
- React component 只做 UI 编排；业务规则留在卡牌自动化 action 或 application helper 中。

## 非目标

- 不为所有自动化 diagnostics 设计最终精细 UX。
- 不阻塞选卡，不能要求用户完成自动化设置后才能加入卡牌。
- 不让 automation resolver 调 UI callback。
- 不把 requirement read model 存进 `SheetData`。
- 第一版不新增全局待处理自动化面板。
- 第一版不提供修改已保存 card ability choice values 的重配入口。
- 不新增 Phase 1 choice kind 之外的自由文本、自由数字或自定义表达式输入。

## 设计选项

### 选项 A：选卡前强制设置

卡牌选择弹窗会在提交选中卡牌前检测必填自动化 choice。如果玩家取消设置，这张卡不会被加入。

这个方案不采用，因为获得卡牌是主要意图。玩家可能想先拿到卡牌，之后再配置自动化。

### 选项 B：选卡后设置，取消时回滚

系统先加入卡牌、打开设置弹窗；如果用户取消设置，则移除新卡或恢复旧卡。

这个方案不采用，因为取消设置应该表示“暂时跳过设置”，不是“撤销获得这张卡”。它在替换卡牌时也会制造尴尬的回滚语义。

### 选项 C：选卡后设置，取消不回滚

系统先加入或替换卡牌，然后提示缺失的自动化 choice。取消设置会保留新的卡牌实例。卡牌上显示一个小的待设置入口，玩家之后可以继续配置。

这是选定方案。它符合现有运行时语义：Card Instance 可以存在并带有 blocked automation requirement，只有合法的 `choiceValues` 才会解锁 contribution。

## 用户流程

1. 玩家从卡牌选择器中选择一个卡牌模板，或从 Character Choice Card 选择器中选择职业、种族、社群、子职业卡。
2. sheet store 创建或替换 Card Instance，并进入 automatic-calculation sync boundary。
3. 选卡 action 把生成的 Card Instance 身份暴露给 setup prompt orchestration。
4. setup prompt orchestration 基于 post-action sheet data / 已提交的 store state 为该实例派生 setup requirements。
5. 如果没有 setup requirement，流程结束。
6. 如果有 setup requirement，UI 打开“配置卡牌自动化”弹窗。
7. 用户确认弹窗时，提交该 ability 的完整 choice values。
8. 用户取消或关闭弹窗时，Card Instance 保持不变。
9. 仍有 setup requirement 的卡牌显示一个逐卡设置按钮或警告标记。
10. 点击该标记时，为这个已有 Card Instance 重新打开同一个设置弹窗。

一次玩家可见的 setup session 按顺序推进。系统先按 Card Automation IR 中的 abilities 顺序选择第一个 missing ability requirement；在同一个 ability 内，再按 choices 数组顺序处理线性 choice chain。若前序 choice 让后续 choice 的 `requiredWhen` 变为 required，弹窗继续要求用户填写后续 choice，直到该 ability 的完整 `choiceValues` 合法。

单次保存只提交一个完整 ability requirement。当前 ability 的所有 required choices 完成后，弹窗进入保存确认步骤。该步骤必须明确告诉用户：继续会保存当前能力的选择；第一版没有撤销或重配已保存选择的入口；如果需要修改，必须先返回上一个问题调整未保存 draft。保存成功后，如果同一张卡仍有后续 missing ability requirement，弹窗可以继续进入下一个 requirement。用户可以在任意未保存 requirement 开始或进行中取消；已经确认保存的上一段 Card Ability State 保留，当前未完成 draft 丢弃。若用户停止后仍有 missing requirements，逐卡 marker 继续表示剩余待处理状态。

## 运行时语义

卡牌自动化设置是在已有 Card Instance 上写入 Card Ability State。它不实例化新卡，也不从当前模板刷新 automation。

设置写入路径必须定位到：

- `cardInstanceId`
- `abilityId`
- 该 ability 的完整 `choiceValues`

boundary 必须用当前实例持有的 automation IR 校验提交的 `choiceValues`。不能信任过期的 UI read model。如果实例已经不存在、ability 不再存在，或提交值非法，写入失败，并且 sheet data 保持不变。

取消设置不是失败。它是在获得卡牌之后的 no-op。

Card Automation Setup 中的未完成输入是临时 draft。用户中途关闭或取消设置时，未完成 draft 不会写入 `SheetData`。只有当当前 ability requirement 的完整 `choiceValues` 合法并被用户确认提交后，才会写入 Card Ability State。

## Requirement Read Model

现有 `projectCardAutomationRequirements()` 足以识别缺失设置，但不足以渲染设置表单。需要新增或扩展一个更完整的 setup read model。它从 `SheetData` 和共享 card automation resolver 派生。

概念形状：

```ts
type CardAutomationSetupRequirement = {
  cardInstanceId: string
  cardTemplateId: string
  cardName: string
  zone: "loadout" | "vault"
  abilityId: string
  abilityLabel: string
  choices: CardAutomationSetupChoice[]
}

type CardAutomationSetupChoice = {
  choiceId: string
  label?: string
  kind: "selectOne" | "selectMany" | "targetSelectMany"
  cardinality: { min: number; max: number; unique: boolean }
  selectedIds: string[]
  options: Array<{ id: string; label: string }>
}
```

对 `staticOptions`，`options` 来自 choice IR。对 `modifierTargetGroup`，`options` 从当前 selectable target universe 投影：

- attributes 使用稳定 target id 和本地化属性 label；
- experiences 使用 `experienceValues.${index}` id，label 显示槽位序号和当前经历文本，例如 `经历 1：铁匠`。这样即使多个经历同名，用户仍能区分所选槽位。

这个 read model 是纯派生状态：

- 不写入 `SheetData`。
- 不持久化。
- 可以在每次 sheet 变化后重新计算。
- 应该支持按 `cardInstanceId` 过滤，用于逐卡设置。

## Store 和 Action 边界

现有 card action 层仍然应该负责创建、替换、移动、删除和更新 Card Instance。

第一版实现需要两个新增能力：

1. 增加 setup-aware、会返回结果的选卡 actions，把“选择一个卡牌模板进入卡槽”规范化成明确的 application action input，并把新创建的 `cardInstanceId` 暴露给 setup prompt orchestration。
2. sheet store 暴露一个设置 card ability choice values 的语义 action，并委托给现有 `setCardAbilityChoiceValues()` domain action。这个 store action 必须返回 success/failure result，让 setup dialog 能在保存失败时保持打开并显示错误，而不是只能依赖 console 或 toast。

建议的 application-facing result 形状：

```ts
type CardSelectionActionResult =
  | {
      kind: "success"
      cardInstanceId: string
      effects?: Array<{
        kind: "cardAutomationSetupAvailable"
        cardInstanceId: string
      }>
    }
  | {
      kind: "failure"
      message: string
    }
```

普通卡槽选择和 Character Choice Card 选择可以有不同 input，但应返回同一类 result：

```ts
selectCardForSlot(input: {
  zone: "loadout" | "vault"
  index: number
  template: StandardCard
}): CardSelectionActionResult

selectCharacterChoiceCard(input: {
  kind: CharacterChoiceCardKind
  ref: SheetCardReference
  template: StandardCard
}): CardSelectionActionResult
```

旧的 `updateCard(index, card, isInventory)` 可以作为兼容 facade 保留。它当前已经通过 card action 进入 modifier-aware boundary，但不会把新实例身份返回给 UI。新的 setup-aware UI 应使用会返回结果的 `selectCardForSlot` / `selectCharacterChoiceCard` action，这样才能针对实际创建的实例打开设置弹窗。

`effects` 是 post-boundary、post-action 的 application effect descriptor，不是 automation resolver callback，也不是 React UI callback。它只能描述“这次成功选卡后有一个可处理的卡牌自动化设置候选”，不能直接表达“打开某个弹窗”。执行计划可以根据代码形状决定第一版 API 是只返回 `cardInstanceId` 让 UI 自行派生 requirement，还是在 action 内部基于 post-boundary sheet data 条件返回 `cardAutomationSetupAvailable` effect。无论采用哪种 API，setup 判断都必须发生在卡牌实例写入并通过 automatic-calculation sync boundary 之后，且必须复用 requirement projector，不能用模板预判。

Character Choice Cards 也应使用同等的 post-action setup 语义。它们可以继续走 `selectCharacterChoiceCard` / `clearCharacterChoiceCard` 这条独立 action，但第一版不应区别对待：如果选中后的 protected slot Card Instance 派生出 missing setup requirement，也应触发同一个 setup prompt effect / orchestration。清除 Character Choice Card 不触发 setup prompt，因为它不会产生新的 Card Instance。

## UI

第一版 UI 应保持轻度面板风格，贴近现有工具型界面：白底、细灰边、紧凑间距、小面积状态提示。它不应做成重向导，也不需要为少见的多 ability 情况引入侧边步骤条。

### 立即提示

setup-aware 选卡成功后，独立的 setup prompt orchestration 针对新的 `cardInstanceId` 派生 setup requirements。如果存在 requirement，就用现有 modal primitives 打开弹窗。这个 orchestration 应该是单独的 hook/component/service 层，接收 post-action result 或 effect descriptor 后决定是否打开 setup dialog；它不应塞进 `CardSelectionModal`、`GenericCardSelectionModal` 或 automation resolver 内部。

弹窗应展示一个 ability requirement：

- 卡牌名；
- ability label；
- 一次只展示这个 ability 中的一个 active choice form；
- static options 用 select 或 checkbox 控件；
- target options 用 checkbox 控件；
- 右上角关闭按钮；
- 底部左侧的“上一步”（仅在当前未保存 ability draft 有问题级 history 时显示）；
- 底部右侧的当前主操作，例如“完成当前选择”“保存当前能力”“继续下一个能力”。

弹窗头部只负责定位当前上下文，不放常规状态胶囊：

- 标题优先显示卡牌名；
- 副标题显示“卡牌自动化 · ability label · 能力 N / M”；
- 右上角 `X` 关闭弹窗。关闭表示跳过当前未保存设置，Card Instance 保留。

当前 choice form 使用轻量信息层级：

- 问题行左侧显示 `choice.label ?? choiceId`；
- 问题行右侧显示选择规则，例如“单选”或“多选 1-2”；
- 问题行下方是 hint 行。Phase 1 没有 IR hint 字段时，UI 用 `kind`、`cardinality` 和当前选中数量生成短提示，例如“已选 1/2，确认后再进入保存。”或“点击一个选项后会自动进入下一步。”；
- 未来如果 Card Automation IR 增加 choice hint / prompt 字段，应复用同一 hint 位置，而不是重排弹窗。

弹窗必须明确区分已保存状态和当前未保存 draft。用户需要能看出：已经完成并确认的前序 ability 已保存；当前 ability 只有完成 requirement 并点击确认后，本轮选择才会保存；中途关闭或取消会丢弃当前未完成 draft。

这个区分应主要通过当前步骤正文表达，而不是头部常驻状态胶囊。普通选择态不显示“草稿”胶囊。保存确认步骤用一条轻提示说明“尚未保存。保存后写入角色表；要修改请先返回上一个问题。”保存成功后的过渡步骤用正文提示“当前能力已保存。继续后会开始下一个能力；上一项不能从这里撤销。”只有保存失败、无法完成这类异常状态才使用更强的提示样式。

在同一个 ability 内，choice 推进规则如下：

- `selectOne`：用户选择一个选项后自动推进到下一个 required choice 或保存确认步骤。
- `selectMany` / `targetSelectMany`：用户可以反复选择或取消选择；未达到 `min` 时不能完成当前 choice；达到 `min` 且未达到 `max` 时显示“完成当前选择”操作；达到 `max` 时自动推进到下一个 required choice 或保存确认步骤。
- “上一步”表示返回上一个 choice 问题，不表示撤销上一次选择变更。返回并修改前序 choice 时，任何不再适用于当前分支的后续 draft choices 必须丢弃。

这些推进只更新弹窗 draft，不写入 `SheetData`。当当前 ability 的所有 required choices 都已满足时，弹窗进入保存确认步骤；用户确认后才提交该 ability 的完整 `choiceValues`。

setup draft 的推进判断必须复用现有 choice resolution 逻辑。UI 每次用当前 draft `choiceValues` 调用共享 resolver/helper，基于解析结果找出下一个 missing choice、notRequired choice 和 invalid draft。UI 不应自己解释 `requiredWhen`、cardinality 或 target domain。该 pure helper 应放在 `card/automation/` 边界内，例如 `projectCardAutomationSetupDraft`，不应新增到通用 `lib/`。

弹窗可以在 React 内存状态中保存当前未完成的 draft `choiceValues` 和问题级 step history，用于返回上一个问题。step history 记录用户已经推进过的 choice question，而不是每次 draft mutation 的快照；它只覆盖当前未保存 ability draft。普通多选题内部的勾选 / 反选只更新当前 question 的 draft，不应该向 history 写入新记录；用户要修改多选题的某个已选项时，直接点击该选项反选即可。只有从一个 question 明确推进到下一个 question 或保存确认步骤时，当前 question 才进入 history。某个 ability 保存成功后，它不再属于可返回 history，进入下一个 ability 时不能返回修改上一个已保存 ability。这个 UI state 关闭即丢，不持久化。判断“下一步是谁”“当前是否可保存”“哪些后续 draft 不再适用”必须通过共享 pure helper 完成，而不是写在 React component 内部。

保存当前 ability 成功后，如果同一张卡还有下一个 missing ability requirement，弹窗显示一个过渡步骤，告诉用户“已完成并保存当前能力”，并询问是否继续处理下一个能力。这个步骤可以只有一个主要操作“继续下一个能力”，用户也可以关闭弹窗停止。保存后的前序 ability 不再能通过第一版 Card Automation Setup 返回修改。最终写入仍然必须在 action boundary 重新校验。

如果当前 required choice 没有任何可选项，弹窗仍然打开并说明当前无法完成设置。保存不可用，用户只能关闭；Card Instance 保留，missing setup marker 继续显示。

弹窗动作布局：

- 关闭或跳过当前未保存设置只通过右上角 `X` 完成，不在底部再放“取消”按钮；
- “上一步”是流程内导航，只在当前未保存 ability draft 可返回时放在底部左侧；
- 当前主操作放在底部右侧；
- 第一步没有上一步时，底部左侧留空，避免制造额外动作。

### 之后补填入口

每个可见卡牌槽位如果有 missing setup requirement，应显示一个小图标按钮。第一版可以使用 warning icon。点击后为该 card instance 打开设置。

marker 只反映当前是否仍能派生出 missing Card Automation Requirement。若用户已经保存了前序 ability，但在继续下一个 ability 前关闭弹窗，只要仍有后续 missing requirement，marker 仍然显示。第一版不引入“部分完成”的独立 marker 状态。

第一版 marker 只用于补填 missing setup，不用于编辑已经保存且当前合法的 Card Ability State。修改已保存 choice values 属于后续重配能力。

第一版 marker 也不处理 invalid saved choices。invalid choice 属于 Card Automation Diagnostic：它可能只是当前 Source State 暂时不满足，例如已保存的经历槽 target 被用户清空；如果用户之后让同一槽位重新成为合法 target，同一份 saved `choiceValues` 可以自然恢复为 valid。

这是刻意保持局部和简单的设计。全局待处理自动化列表可以等 UX 需要时再设计。

### 替换和已有待处理状态

从模板替换卡牌会创建新的 Card Instance，并丢弃旧实例状态，这遵循 Card Interaction Semantics 设计。如果新实例有 requirement，则设置提示作用于新实例。

移动卡牌会保留实例状态。如果被移动的卡牌仍有 missing setup requirement，它的标记会跟着移动，因为 requirement 是从实例派生的。

## 错误处理

内部 invariant 失败时应 fast failure，并保持 sheet data 不变：

- 目标 card instance 不再存在；
- ability id 不在实例 IR 中；
- 提交值不在当前 choice domain 内；
- 提交值违反 cardinality。

关闭或取消设置不应显示错误通知。这是预期行为。

如果弹窗打开后设置写入失败，UI 可以保持弹窗打开，并显示一个简短的通用失败提示。详细 diagnostics 仍然是 domain-level data，不存为 UI state。

## 测试策略

业务测试应主要使用非 React 测试：

- 选择一张需要 setup 的卡牌时，即使缺少 choices，也会创建 Card Instance；
- 选择一张需要 setup 的 Character Choice Card 时，也会创建 protected slot Card Instance 并暴露 setup prompt candidate；
- 生成后的 sheet 能为新实例派生 setup requirement；
- 取消 setup 不执行额外 store write；
- 提交合法 choice values 会更新已有实例，并运行 automatic calculation；
- 提交非法 choice values 会保持旧状态不变；
- 移动一张 pending 卡牌会保留它的 requirement；
- 替换一张 pending 卡牌会创建新实例，并清除旧 choice。

UI 测试只覆盖 wiring：

- 选择一张有 required setup 的卡牌后，卡牌先出现在槽位中，然后打开 setup dialog；
- 关闭 dialog 后，卡牌仍然可见；
- 点击逐卡 setup marker 会重新打开 dialog；
- 提交 setup 后，如果 requirements 已满足，marker 消失。

## 实现范围

第一版实现应覆盖所有会让用户选中卡牌模板并写入角色表可见卡位的入口，包括：

- 卡组 UI 中的普通 loadout 和 vault 卡牌选择；
- 升级区选择领域卡或子职业卡后写入普通 loadout 空位；
- 仍然可访问的首页 / 旧入口卡牌选择；
- Character Choice Cards 选择职业、种族、社群、子职业卡并写入 protected slot。

除非 focused test 证明 setup flow 确实需要某个小 helper，否则这项工作不应修改 card import、card pack storage、automation definition compilation 或 load-time card instance audit。
