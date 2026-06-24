# Card Automation Implementation Planning Notes

日期：2026-06-22

状态：Planning guidance / 非实施计划

## Purpose

本文不是 implementation plan。它用于约束后续正式 implementation plan 的写法：需要遵守哪些原则、拆哪些边界、参考哪些现有文档和代码、哪些问题不能在实现时重新发明。

正式 implementation plan 应另存到 `docs/superpowers/plans/YYYY-MM-DD-card-automation-phase-1.md`，并按 `superpowers:writing-plans` 要求写成可执行 checklist。

## Authoritative Inputs

后续 implementation plan 必须以这些文档为权威输入：

- `docs/superpowers/specs/2026-06-21-card-automation-dsl-phase-1-design.md`
- `docs/superpowers/specs/2026-06-22-card-automation-phase-1-fixture-matrix.md`
- `CONTEXT.md`
- `docs/contexts/content-pack-import/CONTEXT.md`
- `docs/architecture/character-data.md`
- `docs/architecture/storage-boundaries.md`
- `docs/architecture/ui-business-boundaries.md`
- `docs/architecture/testing.md`

如果这些文档与代码事实冲突，implementation plan 应先说明冲突，并把修正作为计划任务之一；不要在实现中隐式绕开。

## Non-Negotiable Design Principles

### 1. No Guessing / Fast Failure

自动化不能猜。

- 缺少 choice、非法 choice、无效 target、无效 IR、超出 Phase 1 限制时，不输出可能错误的 contribution。
- dry-run / validation 阶段能发现的问题必须尽早失败。
- runtime 阶段遇到异常 instance state 时，保留卡面数据，但阻断该实例自动化并产生 diagnostic。
- 不默认 0、不默认 false、不按名称猜测经历槽、不从卡面自然语言推断 automation。

### 2. Instance IR Is Runtime Authority

运行时以角色存档中的 card instance IR 为权威。

- 外部 card pack / editor draft 保存 `CardAutomationDefinition`。
- installed card template 保存 compiled `CardAutomationIR`。
- character sheet card instance 复制并保存自己的 `CardAutomationIR`。
- 卡包缺失、禁用、更新不能改变已有实例的自动化输出。
- 模板 revision drift 只产生 diagnostic；改变实例 IR 必须是显式 refresh / replace 流程。

### 3. Resolver Is Pure

Card automation resolver 不是 workflow engine，不写状态。

输入：

- `CardAutomationIR`
- `CardAutomationSnapshot`
- `CardAbilityState`

输出派生视图：

- requirements
- runtime diagnostics
- card-sourced contribution facts

resolver / projector 绝对不能写：

- `sheetData`
- card zone
- `choiceValues`
- HP / Stress / Armor Slot
- 已算好的 contribution

### 4. One Shared Automation Compiler

`CardAutomationDefinition` schema、low-level normalizer、IR validator、revision canonicalization 必须是共享领域模块。

这些入口都必须调用同一套模块：

- formal import dry-run
- editor validation
- builtin / fixture 编译
- tests

不得为 editor validation、builtin card 或 import path 各写一套 parser / validator。

### 5. Modifier Boundary Owns Integration

卡牌 provider 必须在统一 modifier-aware boundary 内运行。

- card provider 不在 boundary 外预先运行。
- provider 只读取 boundary source snapshot，不读取本轮 provider output。
- card contribution 进入 modifier registry，不写进 `userModifierContributions`。
- `ModifierSourceType` 必须新增 `"card"`，不能伪装成 `equipment` 或 `user`。

### 6. Card Lifecycle Is Not IR

移动、删除、替换、实例化和 choice 写入不是 IR effect。

这些行为可以进入 modifier-aware boundary intent / card action，但不能进入：

- `CardAutomationIR`
- `ConditionIR`
- `ValueIR`
- `TargetIR`
- `EffectIR`

Phase 1 不实现“选择此牌后自动放入宝库”的专门 lifecycle flow。

### 7. Fixture-Driven Scope

Phase 1 实现验收以 fixture matrix 为准。

实现计划必须逐项覆盖 `Must Support` 表中的卡牌，并明确每个 deferred text 不被自动化。不要因为某张卡还有运行时文本，就跳过它的稳定 contribution 部分。

## Required Implementation Plan Shape

正式 implementation plan 应分阶段，每个阶段都必须能独立测试。推荐阶段：

1. Types and storage model
2. Shared automation compiler
3. Import / editor validation integration
4. Card instance lifecycle boundary
5. Resolver and projectors
6. Modifier registry integration
7. Fixture-driven tests

每个阶段至少写清楚：

- 修改哪些文件。
- 新增哪些文件。
- 先写哪些失败测试。
- 运行哪些 test command。
- 预期失败 / 通过结果。
- 不允许触碰哪些边界。

不要写 “TODO / TBD / add validation / handle edge cases”。所有 validation 和 edge cases 应具体列出。

## Code References

### Card Pack Import

重点文件：

- `card/import/card-pack-v1.schema.ts`
- `card/import/types.ts`
- `card/import/dry-run-model.ts`
- `card/import/import-pipeline.ts`
- `card/import/schema-validator.ts`
- `card/import/semantic-validation.ts`
- `card/packs/application-service.ts`
- `card/packs/storage-types.ts`
- `card/packs/legacy-storage-format-adapter.ts`
- `card/packs/local-storage-repository.ts`

规划注意：

- 当前 `card-pack-v1.schema.ts` 是 strict schema，卡牌 item 未声明 `automation` 会被拒绝。
- `automation?: CardAutomationDefinition` 应直接加在每个卡牌条目上，不使用 pack 顶层 map。
- dry-run model 应接收 external Definition 并保存 compiled IR。
- storage projection 当前手工构造 `ExtendedStandardCard`，新增 template automation IR 时必须显式拷贝，否则会被丢弃。
- installed template 不保存 Definition 原文。

### Card Runtime Model

重点文件：

- `card/card-types.ts`
- `card/stores/store-types.ts`
- `card/stores/store-actions.ts`
- `card/stores/unified-card-store.ts`
- `components/character-sheet-page-two.tsx`

规划注意：

- 当前 `StandardCard` 没有 `instanceId`、`automation`、`automationSource`、`automationState`。
- 选牌、替换、移动、删除不能继续分散在组件里直接写 `cards` / `inventory_cards`。
- 所有改变 card instance 集合、zone、IR 或 choice state 的行为都应收敛到 modifier-aware card action / boundary intent。
- 空卡占位不需要 `instanceId`。
- 非空旧卡需要 migration 补 `instanceId`，但 migration 不补 automation IR。

### Character Data And Migration

重点文件：

- `lib/sheet-schema-version.ts`
- `lib/sheet-data-migration.ts`
- `lib/character-data-validator.ts`
- `lib/multi-character-storage.ts`
- `lib/sheet-store.ts`
- `lib/default-sheet-data.ts`
- `lib/sheet-data.ts`

规划注意：

- 当前 `CURRENT_SCHEMA_VERSION = 2`；card instance identity 需要新 schema migration。
- migration 只做结构补齐：补非空卡 `instanceId`。
- migration 不查模板、不生成 automation IR、不生成 choice、不输出 contribution。
- generic `setSheetData` 是低层入口，不保证 modifier sync；card automation transaction 不能依赖组件直接调用它。
- 批量导入 / 加载旧存档时，不要逐卡触发自动化；完成 migration / normalization 后集中触发一次 boundary。

### Modifier Automation Core

重点文件：

- `automation/core/types.ts`
- `automation/core/registry.ts`
- `automation/core/source-definitions.ts`
- `automation/core/target-sync.ts`
- `automation/core/target-accessors.ts`
- `automation/core/reference-calculator.ts`
- `automation/core/reconcile.ts`
- `automation/core/entry-utils.ts`
- `automation/core/other-adjustments.ts`
- `automation/equipment/*`
- `automation/actions/*`

规划注意：

- `ModifierSourceType` 当前没有 `"card"`，必须新增。
- 现有 target id 使用 `hpMax`，不是 `hitPointMax`。
- attribute targets 使用 `agility.value` 等形式。
- experience targets 使用 `experienceValues.${index}`，必须按 slot identity，不按经历名称。
- card source priority 已在主设计固定：card base `110`，card modifier `160`。
- card contribution 要有自己的 sanitizer / validation，不能复用 equipment sanitizer。

### Editor Validation

重点文件：

- `app/card-editor/components/editor-validation-results.tsx`
- `app/card-editor/services/__tests__/card-editor-recovery.test.ts`
- `app/card-editor/utils/import-export.ts`
- `app/card-editor/types/index.ts`
- `components/card-editor/*`

规划注意：

- editor draft 保存 Definition 原文，不保存 compiled IR。
- editor validation 可以临时调用 formal dry-run / shared compiler，拿 diagnostics / preview。
- compiled IR 不能回写 editor draft。
- 第一阶段不做完整可视化 DSL builder；可以先支持 JSON / structured field。

## Suggested New Module Boundaries

正式 plan 可以调整具体路径，但应保持职责分离。

建议新增：

- `card/automation/definition-schema.ts`：external Definition schema / type guard。
- `card/automation/ir-types.ts`：normalized IR TypeScript types。
- `card/automation/normalize-definition.ts`：Definition -> IR normalizer。
- `card/automation/validate-ir.ts`：normalized IR validation。
- `card/automation/revision.ts`：canonicalization and revision hash。
- `card/automation/diagnostics.ts`：automation diagnostic helpers.
- `card/automation/snapshot.ts`：`CardAutomationSnapshot` builder / card matcher getters。
- `card/automation/resolve.ts`：pure resolver.
- `card/automation/project-requirements.ts`。
- `card/automation/project-diagnostics.ts`。
- `card/automation/project-contributions.ts`。
- `automation/card/provider.ts`：modifier registry provider integration.

原则：

- Definition compiler 不依赖 React、store、localStorage 或 modifier registry。
- Resolver 不依赖 import pipeline、editor draft 或 storage backend。
- Provider 依赖 resolver / projector output，不直接读 raw `choiceValues`。

## Diagnostic And Validation Constraints

实现计划必须覆盖这些 diagnostics：

- unsupported automation format / mode
- invalid automation definition
- invalid normalized IR
- automation limit exceeded
- missing choice
- invalid choice
- unknown choice state
- missing instance id
- invalid ability state
- missing instance automation IR
- invalid instance automation IR
- template changed
- template missing
- orphan automation state
- refresh failed

Validation 上限必须集中定义，不散落魔法数字。超限 fast fail，不截断、不部分执行。

## Fixture Matrix Requirements

正式 implementation plan 必须逐项引用：

- `docs/superpowers/specs/2026-06-22-card-automation-phase-1-fixture-matrix.md`

测试至少覆盖：

- fixed modifier
- fixed base
- condition on armor empty
- condition on armor filled
- condition on domain card count
- read proficiency
- read attribute
- half rounding via `ceil(value / 2)`
- valueByTier
- selectMany static options
- linear choice chain
- targetSelectMany experiences
- invalid experience slot diagnostic
- permanentOnceClaimed contribution while in vault
- deletion cleanup
- template drift warning
- missing pack still runs instance IR

## Known Deferred Work

不要在 Phase 1 implementation plan 中实现：

- human-friendly phrase DSL
- full visual DSL builder
- automatic prose inference
- combat trigger windows
- dice / attack / damage automation
- HP / Stress / Armor Slot marking
- hope / fear runtime resource effects
- per-rest / per-scene resource tracking
- beast / form / stance current-state automation
- automatic “move card to vault after claim” lifecycle
- installed pack export back to external Definition

## Plan Review Checklist

正式 implementation plan 写完后，必须自查：

- 是否每个 fixture matrix must-support 条目都有测试任务。
- 是否没有使用 `hitPointMax`，只使用 `hpMax`。
- 是否没有恢复 `activateCardAbility` 或 independent activation state。
- 是否没有让 runtime 读取 external Definition。
- 是否没有让 editor draft 保存 compiled IR。
- 是否没有让 resolver / projector 写状态。
- 是否没有把 card contribution 写入 `userModifierContributions`。
- 是否没有让 card provider 读取本轮 provider output。
- 是否所有 card action 都进入 modifier-aware boundary。
- 是否所有迁移都是幂等的。
- 是否每个任务都有明确 test command。
