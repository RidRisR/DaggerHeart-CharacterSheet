# Card Import Dry-run Editor Integration Scope

> Status: Deferred. 2026-06-16 讨论后决定暂不优先接入编辑器校验；下一阶段转向 formal card import commit path 设计。本文保留为编辑器集成边界记录，后续重新讨论编辑器时再恢复或改写。

## 背景

第一阶段已经实现 card import dry-run pipeline：source intake、External Contract Guard、Legacy Card Adapter、internal v1 structural validation、dry-run validation model、formal semantic validation，以及 editor-local authoring diagnostics。

原计划把 dry-run 用到最有价值且风险最低的真实调用点：编辑器校验。后续讨论认为，如果本轮不会对外发布编辑器校验体验，也不希望制造半接入状态，则优先级应后移，先设计 formal card import commit path。

## 决策

### 1. 编辑器校验校验实际导出的格式

Card Editor Validation 必须校验编辑器当前实际会导出的 legacy-compatible payload，而不是临时构造一个用户不会拿到的 internal v1 payload。

理由：
- 当前默认导出仍然是 legacy-compatible JSON / DHCB。
- 校验结果应回答“这个作者现在导出的包能否通过正式 dry-run 规则”。
- 这样可以覆盖 External Contract Guard、Legacy Card Adapter、internal schema 和 semantic validation 的完整链路。

### 2. 编辑器校验是只读动作

Editor Draft Validation 只做诊断，不修改 draft。

它可以：
- 序列化当前 draft 到实际导出 payload shape。
- 调用 formal card import dry-run pipeline。
- 合并 editor-local authoring diagnostics。

它不可以：
- 自动补 ancestry pair。
- 自动补 subclass triple。
- 清洗 keywords。
- 删除或写入图片。
- 修改 IndexedDB。

### 3. 导入恢复继续保持原行为

Editor Draft Import Recovery 可以继续做 editor-only repair，例如自动补 ancestry pair / subclass triple。

这个行为只属于“把文件打开成可继续编辑的 draft”，不属于 formal import，也不属于 validation。

### 4. 导出可以做非变异的序列化整理

Editor Draft Export Serialization 可以生成一个 cleaned export payload / bundle view，但不能修改当前 draft。

允许：
- 移除 `isModified` / `lastSaved` 等 editor-only state。
- `.dhcb` 导出时只打包当前 draft 卡牌 ID 对应的图片。
- 根据打包图片设置导出 payload 中的 `hasLocalImage` / `imageUrl`。

不允许：
- 修复 draft。
- 自动补卡。
- 清洗 authoring keywords。
- 删除 IndexedDB 中的图片。
- 因 validation error 阻止导出。

### 5. 暂不接入正式导入

在 formal card import commit path 被重新设计之前，新的 card import dry-run pipeline 不接入 live formal import flow。

理由：
- 如果 dry-run 只做 preflight，而 commit 仍走旧 importer，会形成真实用户路径上的新旧双轨。
- 当前改造尚未重写 storage transaction、image import、rollback、batch keyword index。
- 在不对外发布本轮改造的前提下，中间态 preflight 的收益不足以抵消复杂度。

原编辑器集成范围曾限定为：
- 编辑器校验接入 dry-run。
- 兼容 fixture 继续作为自动化保障。
- 正式导入保持现状，等 commit path 重构时再整体接入。

该范围现已延期，不作为下一阶段执行计划输入。

### 6. 编辑器 UI 接入延期

编辑器校验 UI 可能会随着 card import 模型继续变化而重做，因此本文不再把“适配现有 validation UI”作为下一阶段任务。

后续重新启动编辑器集成时，只需要保留以下原则：

- validation 是独立动作，不阻止宽松导出；
- validation 应校验实际导出的 payload shape；
- validation 可使用临时或简化 UI，只要不引入第二套验证规则；
- warning 展示属于 UI presentation policy，不改变 import diagnostic 的语义。

## 非目标

- 不改变编辑器导入恢复行为。
- 不改变编辑器导出默认格式。
- 不接正式导入写入路径。
- 不重写 card storage transaction。
- 不改变 public card pack contract。
- 不发布 `daggerheart.card-pack.v1` 作为默认作者格式。

## 延期前的计划输入

后续重新启动编辑器集成时，可从以下调用点开始：

- 提取或复用现有 card editor export serialization，得到实际 legacy payload。
- 新增 editor validation wrapper：`legacy payload -> importCardPackFromSource(createCardObjectSource(...), { mode: "dryRun" })`。
- 合并 `createEditorLocalCardAuthoringDiagnostics(draft)`。
- 选择当时合适的 validation UI view model，避免把旧 UI 结构固化为 import pipeline 契约。
