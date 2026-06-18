# 卡牌导入重构第一阶段范围

**日期:** 2026-06-15

**状态:** Scope draft，后续逐步细化

**关联文档:**

- `docs/superpowers/specs/2026-06-13-card-import-architecture-discovery.md`
- `docs/superpowers/specs/2026-06-13-card-import-modular-refactor-design.md`

## 目标

本文档记录卡牌导入重构第一阶段的讨论边界和执行边界。

第一阶段不是完整重构，也不是公开发布。它的目标是把正式导入 workflow 的前半段设计清楚，并实现一个不会写入 storage 的 dry-run pipeline。

## 第一阶段停止点

第一阶段应停止在：

> 完成一个不会 commit 的 formal import dry-run pipeline。

这个 pipeline 应能读取 Legacy Card Format 的 JSON / `.dhcb` 中的 `cards.json`，完成 source intake、legacy card adapter、英文 structural validation、dry-run validation model、semantic validation，并返回 structured diagnostics。

它需要回答：

- 这个卡牌包如果导入，会不会通过？
- 如果失败，失败在哪个 stage？
- 失败或 warning 的 structured diagnostics 是什么？
- 如果通过，会被整理成什么 dry-run validation model？

它不负责真正安装卡牌包。

## 第一阶段包含的 Module

第一阶段只细化和规划以下 Module：

1. **Validation Contract Module**
   - Card Pack Internal Validation Schema 放置路径。
   - compatibility corpus 清单。
   - Card Pack Internal Validation Schema 的 structural boundary。
   - external format routing：无 `format` 为 Legacy Card Format；`format: "daggerheart.card-pack.v1"` 为 Card Pack Internal Validation Schema；未识别 `format` 返回 `UNSUPPORTED_FORMAT`。
   - `classes`、`ancestries` 等 top-level grouped arrays，与 legacy shape 同构。
   - 各 card group 内单张卡的英文字段命名原则。
   - Legacy Card Format 到 internal validation schema input 的 adapter boundary。
   - definitions optional / derived definitions 策略。
   - unknown fields policy：Internal Validation Schema 严格拒绝未知字段；Legacy Adapter 容忍、warning 并丢弃未知 legacy 字段。

2. **Source Intake Module**
   - JSON 和 `.dhcb` 如何进入统一 source shape。
   - `.dhcb` 中 `cards.json`、`manifest.json`、`images/` 的读取规则。
   - 图片资源只发现，不写入。
   - source read、invalid zip、missing `cards.json` 等 diagnostics。

3. **External Format Adapter Module**
   - 从卡牌内容推导 effective definitions。
   - 合并显式 `customFieldDefinitions`。
   - legacy variant formats 的收敛策略。
   - formal adapter 不自动创建 ancestry pair / subclass triple；这些补齐属于 editor draft recovery。
   - legacy 中文字段到英文字段的映射和隔离策略。
   - legacy 单卡属性名到英文 card field 的映射表。

4. **Structural Validation Module**
   - Card Pack Internal Validation Schema 边界。
   - Ajv error 到 `CardImportDiagnostic` 的映射。
   - JSON Pointer path 规则。
   - `additionalProperties` / unknown fields policy。
   - definitions 只做形状验证，不要求完整列出引用关键词。

5. **Dry-run Validation Model Module**
   - dry-run validation model 的最小字段。
   - 与 Card Pack Internal Validation Schema 的区别。
   - 与 runtime card view 的区别。
   - 与 storage draft / commit plan 的区别。
   - image asset references 如何挂到 model 上。

6. **Semantic Validation Module**
   - required fields。
   - duplicate IDs。
   - card type grouping。
   - effective definitions 与引用关系。
   - 不检查 ancestry pair / subclass triple 张数；这不是 formal import 的阻断规则。
   - image references。
   - warning 和 error 的边界。

## 第一阶段不包含

第一阶段明确不做：

- 不写入 card storage。
- 不写入 image storage。
- 不改 UI 主导入流程。
- 不发布 public schema。
- 不更新用户指南或 AI 生成提示词。
- 不迁移 Repository / Persistence Adapter。
- 不重建 runtime read model。
- 不实现 Application Service 的完整 install/remove/enable/disable workflow。
- 不做 conflict check，不读取 current imported card storage 作为校验输入。
- 不生成 final commit plan，不做 storage/runtime normalization。
- 不处理最终 Public Release Package。

## 第一阶段执行前还需细化的讨论块

进入 implementation plan 前，还需要完成这些设计讨论：

1. **Validation Contract 收尾**
   - 兼容性 corpus。
   - Card Pack Internal Validation Schema 路径。
   - External Format Adapter 与 schema 的边界。
   - unknown fields diagnostic code 命名。
   - `customFieldDefinitions` 缺失、显式补充、显式冲突的处理。

2. **Source Intake**
   - `CardImportSource` / raw payload shape。
   - `.json`、`.dhcb`、invalid zip、missing payload 的 diagnostics。
   - missing / recognized / unsupported `format` 的分流和 diagnostics。
   - image asset identity 和 orphan image 的责任归属。

3. **Legacy Adapter**
   - effective definitions 推导和合并算法。
   - variant legacy formats 的统一策略。
   - legacy unknown fields 的 warning code 与丢弃策略。
   - formal dry-run 不自动补齐 ancestry pair / subclass triple，也不把张数不足作为 blocking diagnostic。

4. **Structural Validation**
   - internal schema-first validation 的字段边界。
   - diagnostics code set。
   - path / value / relatedPaths 规则。
   - Card Pack Internal Validation Schema 使用 strict schema，未知字段是 blocking error。

5. **Dry-run Validation Model + Semantic Validation**
   - dry-run validation model shape。
   - semantic validation rule set。
   - warning / error / info policy 的 code set。
   - dry-run result shape。

6. **Editor Draft Validation Alignment**
   - 编辑器校验应复用 formal dry-run 判断 installability。
   - 编辑器校验可以额外合并 editor-local authoring diagnostics，例如 ancestry 必须两张、subclass 必须三张。
   - 这些 editor-local diagnostics 不进入 formal import blocking rules。

## 第一阶段完成标准

第一阶段可以进入执行并最终验收，当且仅当：

- 已有公开示例和内置卡牌包进入 compatibility corpus，并能通过 Legacy Card Adapter 后符合 Card Pack Internal Validation Schema。
- compatibility corpus 覆盖无 `format` legacy payload、`daggerheart.card-pack.v1` direct schema payload、未知 `format` blocking failure 三条路径。
- compatibility corpus 覆盖 internal validation schema 未知字段 blocking failure，以及 legacy 未知字段 warning 后继续导入。
- 缺失 `customFieldDefinitions` 的新 fixture 被纳入设计。
- dry-run validation 不依赖 current imported card storage；本地状态相关 conflict check 留到后续阶段。
- formal dry-run 明确不检查 ancestry pair / subclass triple 张数。
- editor draft validation 明确为 formal dry-run diagnostics + editor-local authoring diagnostics。
- dry-run pipeline 有明确 stage 顺序。
- 每个 stage 的输入、输出和 diagnostics 已定义。
- 第一阶段不写 storage 的 commit boundary 被测试覆盖。
- 设计足够具体，可以写成 implementation plan。

## 后续阶段入口

第一阶段完成后，再进入后续阶段设计：

- Conflict And Staging Module。
- Commit Adapter over existing storage。
- Application Service。
- Repository / Persistence Adapter。
- Runtime Read Model。
- Editor Recovery alignment。
- Editor Draft Validation UI wiring：把编辑器当前校验按钮接到 formal dry-run，并合并 editor-local authoring diagnostics。
- UI Rewire。
- Public Release Package。
