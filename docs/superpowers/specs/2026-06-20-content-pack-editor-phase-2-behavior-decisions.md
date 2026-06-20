# Content Pack Editor Phase 2 Behavior Decisions

日期：2026-06-20
状态：已决策，待转实施计划

## 背景

第一阶段已经用 characterization tests 固定了 `/card-editor` 的卡牌、装备导入导出、校验、图片副作用和 metadata copy 旧行为。那些测试是重构前对照组，不代表所有旧行为都应长期保留。

第二阶段的目标是先把需要讨论的行为列清楚，再逐条决定：

- 哪些旧行为保留。
- 哪些旧行为修改。
- 哪些旧行为只是实现细节，应被新的分层模型替换。
- 每个行为应属于 UI 层、业务层还是存储/副作用层。

第二阶段先不以视觉样式 mockup 为重点。样式统一是目标之一，但必须建立在 validation 数据流、diagnostic 文案和层次边界清楚之后。

## 横切约束：UI / Business / Storage 分离

本轮所有行为决策都必须同时回答两个问题：

1. 业务行为本身是否保留或修改。
2. 该行为应放在哪一层。

目标分层：

```text
UI layer
  -> editor application service / adapter
  -> domain business functions
  -> storage / file / image side-effect ports
```

UI 层负责：

- 页面渲染、tab、toolbar、dialog、jump target。
- 触发用户意图，例如导入、导出、验证、复制 metadata。
- 渲染 shared validation view model。

UI 层不负责：

- 判断包是否合法。
- 解释 diagnostic code。
- 拼接或翻译 internal validation path。
- 直接执行 validation storage write。
- 直接读取 IndexedDB 参与业务判断。

业务层负责：

- editor draft recovery / repair。
- editor draft export serialization。
- editor draft validation orchestration。
- diagnostic projection。
- metadata copy 的业务规则。
- card / equipment 领域规则的薄 adapter。

存储和副作用层负责：

- 文件选择和下载。
- localStorage / IndexedDB。
- editor image repository。
- runtime cache refresh。
- toast 等 UI side effect 的 adapter 调用。

Validation 必须是只读动作；export serialization 必须是只读转换；两者都不能清理 storage 或修改 draft。

## 需要讨论的行为

### 1. Editor Draft Repair 独立阶段

决策状态：已决策

当前旧行为：

- 卡牌 JSON / DHCB 导入会自动补 ancestry pair。
- 卡牌 JSON / DHCB 导入会自动补 subclass triple。
- 这些补全目前和导入恢复逻辑混在一起。

决策：

- 保留“导入草稿时自动补全”的用户体验。
- 把它命名并抽成独立 `Editor Draft Repair` 阶段。
- 抽出 repair 阶段不改变旧的卡牌补全分组语义：ancestry pair 仍按旧兼容规则用 `种族 + 简介` 分组，subclass triple 仍按 `子职业 + 主职` 分组。
- Repair 只在“打开文件继续编辑”时发生，不属于 formal import、dry run validation 或 export serialization。
- Repair 只在导入草稿时自动运行；新建、metadata copy 和普通编辑不自动运行 repair。
- Repair 可以产出 machine-readable report，例如补了哪些 ancestry pair 或 subclass card。
- 如果导入草稿时对输入做了 repair 或跳过了可恢复内容，编辑器应在导入完成后通过小型确认弹窗、导入摘要或 toast 让用户知道。
- Repair / recovery report 属于“本次导入动作发生了什么”，不属于后续 editor validation diagnostics。

理由：

- 导入草稿需要把外部文件恢复成可继续编辑的 editor-safe draft。
- 新建、metadata copy 和普通编辑过程不应突然被系统改写 draft。
- Repair report 先服务测试和后续可观测性，不提前增加 UI 噪音。

### 2. Editor Draft Export Serialization 边界

决策状态：已决策

当前旧行为：

- 卡牌 JSON / DHCB 导出会移除 `isModified`、`lastSaved`。
- 卡牌 DHCB 导出按当前 card id 过滤 images。
- 有 packaged image 时写 `hasLocalImage: true`，并省略该卡 `imageUrl`。
- 装备导出完整 `daggerheart.equipment-pack.v1` JSON。
- 验证失败不阻止导出。

已决策：

- Export serialization 是只读转换，不修改 draft。
- 卡牌 JSON 和 DHCB 共享 payload cleanup。
- DHCB target 额外依赖 image repository port 生成 container view。
- 不在 validation 中真的生成 zip Blob；validation 使用等价的 DHCB view source。
- Export serialization 必须通过 whitelist payload 构造排除 `isModified` / `lastSaved` 等旧 editor-only 残留字段。
- Export serialization 不能自动补卡、不能修复字段、不能删除图片、不能修改内存 draft。
- DHCB 导出保留旧图片语义：有 packaged local image 时写 `hasLocalImage: true`，并省略该卡的 `imageUrl`。
- 上述 `imageUrl` 省略是 legacy DHCB compatibility 行为，不代表长期格式语义；未来若需要 remote fallback，应另行设计字段语义。
- DHCB serializer 不返回 orphan image report；正常 editor image lifecycle 不应产生 orphan images，异常 / 历史 orphan 由 editor image service maintenance 处理。
- DHCB serializer 只按当前 draft card ids 读取导出所需图片，不承担 editor image storage audit。
- 旧 persisted draft 中的 unknown editor-only fields 不产出 cleanup report；whitelist payload construction 静默排除它们。

理由：

- 保留旧 DHCB 图片语义可以降低兼容风险，避免同一张卡同时声明 packaged image 和 remote URL 时出现优先级歧义。
- Orphan image cleanup 是 editor image workspace maintenance，不是 export serialization 的正常输出。
- 导出是只读发布文件构造，不应把历史残留字段过滤包装成用户可见问题。

### 3. Editor Validation 语义

决策状态：已决策

当前旧行为：

- 卡牌验证使用旧 `ValidationService`。
- 装备验证走 application service dry-run，但当前 dry-run 语义包含 storage-aware 检查。
- 验证失败仍可导出。

已决策：

- Editor validation 回答“当前草稿导出的发布文件自身是否有效”，不是“当前机器能否安装”。
- Editor validation 使用当前默认导出 target 的 serialization 结果。
- Dry Run 只检查包自身，不读取 installed storage state。
- Editor-Owned Authoring Checks 不是 import workflow stage，不属于 Dry Run，也不是 Build Commit Plan 的前置阶段。
- Editor validation orchestration 负责显式调用 Dry Run 和 Editor-Owned Authoring Checks，并合并两者结果。
- storage-aware installability 进入 Build Commit Plan。
- validation 不修复 draft、不写 localStorage、不写 IndexedDB、不刷新 runtime cache。
- 卡牌当前默认 validation target 是 legacy DHCB view，因为当前卡牌默认导出是 DHCB。
- 装备当前默认 validation target 是 `daggerheart.equipment-pack.v1` JSON。
- 本轮不引入 validation target selector。
- `passed` 文案表达：草稿完全符合当前检查要求，可以导出发布文件。
- `passedWithWarnings` 文案表达：草稿可以导出发布文件，但有建议处理的问题。
- `failed` 文案表达：导出发布前应修复这些草稿问题。
- Validation 文案不得表达“当前机器可以安装 / 导入”，storage-aware installability 属于 Build Commit Plan。
- Validation 文案不得暗示导出操作被技术性阻止；本轮保留验证失败仍可导出的旧行为。

### 4. Dry Run / Build Commit Plan / Commit 边界

决策状态：已决策

当前旧行为：

- 装备 application-service `dryRun` 会读取 repository snapshot，并执行 installed-content conflict check。
- 卡牌 editor validation 尚未接新 dry-run pipeline。

决策：

- Dry Run：source read、parse、source adaptation、structural validation、normalize、semantic validation、stage import data。
- Build Commit Plan：读取当前 storage / builtin 状态，判断 pack limit、template id conflict、pack id generation、write set 和 asset ownership。
- Commit：执行 storage transaction、compensation cleanup、runtime refresh。
- Dry Run 不读 repository snapshot，不检查已安装内容冲突，不检查 pack limit，不生成最终 `packId`，不规划 write set。
- Dry Run 成功后产出 staged import data，用于 editor validation 或后续 Build Commit Plan。
- Build Commit Plan 是 storage-aware 阶段；它基于 Dry Run / staged import data 和当前本机状态判断能否安装。
- Build Commit Plan 失败时不能写 storage。
- Commit 只执行已经构建好的 commit plan，不重新解释 raw package，不重新 validation。
- Editor Validation orchestration 先执行 Dry Run，再在 editor application service 中执行 Editor-Owned Authoring Checks；因此成功文案不能承诺“可以导入当前机器”。
- 装备当前 application-service `dryRun` 读取 repository snapshot 并执行 installed-content conflict check 的行为应迁移到 Build Commit Plan。

实现影响：

- 第二阶段代码可以优先修正 equipment dry-run 边界，因为它是当前最明确的架构债。
- Build Commit Plan 先作为 application service 内部阶段，不作为新的用户可见步骤暴露。
- 现有期待 dry-run 报 installed-content conflict 的测试应迁移到 commit-plan / formal import 覆盖。

### 5. Card / Equipment Validation UI 统一

决策状态：已决策

当前旧行为：

- 卡牌和装备 validation dialog 使用不同 result model 和不同组件。
- 卡牌弹窗更完整；装备弹窗已部分追平，但仍不是同一 view model。

已决策：

- 卡牌和装备都投影成 shared `EditorValidationViewModel`。
- UI 组件只渲染 view model，不解析领域 diagnostic。
- 成功文案表达“草稿自身检查通过，可以导出草稿 / 发布文件”。
- 失败文案表达“导出发布前应修复这些草稿问题”，但不能暗示导出被阻止。
- 本轮统一 validation UI 的数据模型和语义结构，不做大视觉重设计，不做 mockup。
- 统一后的 shared validation UI 以当前卡牌编辑器 validation dialog 为视觉和信息层级基准；装备校验向卡牌现有 UI 靠拢。
- 卡牌和装备 validation dialog 必须使用同一套设计语言、组件结构、视觉层级和交互模式；不允许继续保留两套不同风格的校验窗口。
- Shared validation component 消费 `EditorValidationViewModel`；card / equipment 各自负责 projection。
- 信息结构应大致一致：顶部状态、摘要 stats、priority / specific item / type / all 分组、diagnostic 列表。
- 每条 diagnostic view 至少包含 title、description、suggestion、severity、source、field label、author-facing path 或位置、jump target。
- 跳转行为必须保留；jump target 来自 view model，不由 UI 根据 path 猜。
- “不要求像素级一致”只表示不同内容量、不同跳转 target 或不同诊断分组可以造成局部布局差异；它不允许不同配色、不同组件样式、不同状态表达或不同信息架构。
- Shared `EditorValidationViewModel` 保留三态能力：`passed`、`passedWithWarnings`、`failed`。
- `failed` 表示存在 error 级 diagnostic；`passedWithWarnings` 表示没有 error，但存在 warning 级 diagnostic。
- Warning 不参与导出阻断，也不能暗示当前本机一定可以安装；它只表示草稿 / 文件自身存在非阻断提示。
- 本轮不为了使用三态而新增 warning。新增 warning code 必须逐项有明确业务理由。
- 卡牌 ancestry / subclass 结构不完整、字段缺失、dry-run error、Editor-Owned Authoring Checks error 都应作为 error，不降级为 warning。
- 卡牌 editor validation 本轮大概率主要使用 `passed` / `failed`；`passedWithWarnings` 是共享模型能力，优先服务已有 equipment warning 和未来明确的非阻断诊断。
- Warning-only 状态应展示 diagnostic 列表。
- 纯 `passed` 使用单独成功界面，告诉用户草稿完全符合当前检查要求；不渲染空 diagnostic 列表或空分组。

### 6. Diagnostic 可读性和路径映射

决策状态：已决策

当前问题：

- Card import pipeline 内部 v1 path 可能与 legacy editor/export shape 不一致。
- 用户可能看到不存在于卡包文件里的字段路径。
- 卡牌和装备 diagnostic copy 来源不统一。

决策：

- 引入 `DiagnosticSourceMap`，并由改变 payload shape 的边界产生。
- UI 不直接展示 internal path 作为主位置，例如 `/classes/0/name` 不能作为作者-facing 位置。
- UI 不直接展示 raw diagnostic code 作为主标题。
- UI 主文案展示 author-facing field label、位置描述和修复建议。
- internal path、raw code、raw value 只作为必要技术详情，不作为主要文案。
- Card editor validation 和 content manager formal import 使用同源 card diagnostic copy。
- Equipment 当前 external/editor/internal shape 基本同形，本轮先使用 identity source map。
- Source map metadata 应随 import / dry-run result 贯穿到 diagnostic projection；不能只在 UI projector 里临时硬编码映射。
- Source map 不进入 storage，不属于 public payload。
- 字段级映射优先；无法定位字段时退到条目级映射。
- metadata、system、unknown path 需要稳定 fallback。
- adapter 发现并丢弃 unknown author field 时必须保留 authorPath，避免用户不知道自己文件里的哪个字段有问题。
- 文案差异只允许来自 context action：editor validation 使用“修改草稿后重新验证”，content import 使用“修改文件后重新导入”。

产出边界：

- Legacy Card Adapter 负责 legacy card payload 到 internal validation model 的 source map。
- DHCB serializer / view source 负责 editor draft 或 DHCB `cards.json` 到 validation model 的 source map。
- Equipment v1 当前使用 identity source map。
- 未来新增 public schema、bundle format 或 authoring format 时，由对应 adapter 产出 source map，不修改 validation UI 硬编码表。

实现建议：

- Source map 可以使用 path template + index matching，不要求为每个数组项预生成所有字段 entry。
- UI view model 默认展示 human-readable title、field label、specific group 和 authorPath。
- internalPath / raw code 只作为技术详情保留。

### 7. Editor-Local Diagnostics

决策状态：已决策

当前旧行为：

- 卡牌导入会自动补 ancestry/subclass，但旧 validation 不清晰区分 formal error 和 editor authoring issue。
- 装备有 Editor-Local duplicate id diagnostics。

决策：

- Editor validation 可以比 formal dry-run 更严格。
- Editor-Local diagnostics 是 authoring regularity，不等同 formal import schema error。
- 卡牌保留 ancestry pair regularity、subclass triple regularity。
- 装备 duplicate id 先保留，直到 formal dry-run 覆盖同等规则。
- Editor-Local diagnostics 不属于 Dry Run，也不能被塞进 dry-run pipeline。
- Editor-Local diagnostics 由 Editor-Owned Authoring Checks 产生。
- Editor-Owned Authoring Checks 属于 editor layer / editor application service，不应组织在 `card/import` 或 `equipment/import` workflow 内。
- Dry Run 结束后不会自动进入 Editor-Owned Authoring Checks；只有 editor validation orchestration 会显式调用它们。
- Content manager formal import 不运行 Editor-Owned Authoring Checks。
- Editor validation 的最终 success = formal dry-run success 且没有 error 级 Editor-Local diagnostics。
- Editor-Local diagnostics 默认使用 `error`，不是 warning。
- Editor-Local diagnostics 必须标记 `source: "authoring"`；formal dry-run diagnostics 标记 `source: "import"`。
- 导入草稿时 repair 自动补齐后，正常情况下不应再产生 ancestry/subclass regularity diagnostics。
- 如果用户后续手动编辑出不完整 ancestry pair 或 subclass triple，validation 应产生 Editor-Local error，但不能自动 repair。

理由：

- 用户点击的是编辑器里的草稿验证，不只是 formal import preflight。
- 单张 ancestry 或不完整 subclass triple 会让编辑器草稿结构不完整，不能作为可忽略 warning。
- source 标记能避免 UI、文案和未来过滤把 formal import error 与 editor authoring issue 混在一起。

### 8. 旧 Card ValidationService 去留

决策状态：已决策

当前旧行为：

- `app/card-editor/services/validation-service.ts` 是卡牌 editor validation 权威。
- `error-message-mapper.ts` 是旧 UI 文案来源。
- `validateField()` 暗示字段级第二套验证模型。

决策：

- 新整包校验模型替换完成后，删除旧 `validation-service.ts` 和 `error-message-mapper.ts`。
- 不保留双轨验证。
- 如果字段级即时提示未来需要恢复，应基于新模型重新设计，不复用旧 validator。
- `validateField()` 不保留兼容 wrapper；当前没有真实 UI 使用点需要它作为长期 API。
- 删除旧 service 必须和新 `validateCardEditorDraft()` / shared validation view model 接入放在同一切片，避免 store 或 dialog 断裂。
- `card-editor-store.ts` 不应继续直接 import editor validation service；新路径应由 editor application service / adapter 做 validation orchestration。
- `card/type-validators.ts` 暂不纳入本轮删除范围；本轮只从 editor validation 权威路径切掉旧 service。

理由：

- 旧 `ValidationService` 是 editor 私有旧验证层，和“editor validation 复用 formal dry-run”方向冲突。
- `error-message-mapper.ts` 是旧文案来源，应由 card diagnostic copy 和 source-map projection 替代。
- 字段级旧接口会暗示第二套验证权威；未来字段级提示应基于新模型另行设计。
- `card/type-validators.ts` 有独立测试和历史 import 相关用途，不能在本轮仅凭 editor 重构直接删除。

### 9. Editor-only Fields 清理

决策状态：已决策

当前已知字段：

- `isModified`
- `lastSaved`

决策：

- `isModified` 和 `lastSaved` 是历史残留 editor metadata，不应继续作为 `CardPackageState` / Content Pack Draft 字段保留。
- 本轮应从 `CardPackageState` 删除 `isModified` 和 `lastSaved`。
- Editor Draft Recovery 不再写入 `isModified` 或 `lastSaved`。
- Export serialization 和 validation target serialization 必须使用 whitelist payload 构造，兼容旧 persisted draft 中可能残留的这两个字段。
- 本轮要为 `card-editor-storage` 增加一次最小化的静默 hydration cleanup。它只处理旧 editor-only 字段、陈旧图片标记和 editor image workspace 一致性，不做完整 validation，不运行 repair，也不向用户报告“数据丢失”。
- 如果未来需要 dirty state 或 last saved time，应作为 editor workspace metadata 重新设计，不放进 content pack draft content。

理由：

- 当前没有 UI 使用 `isModified` 判断未保存更改，也没有 mutation 正确维护它。
- 当前没有 UI 展示或业务逻辑使用 `lastSaved`。
- 它们主要造成导出路径重复删除字段，增加 external payload 泄漏风险。
- 旧 persisted workspace 不是外部导入文件；打开它时仍需要把会误导 UI 的历史残留清掉。

### 10. 图片管理行为

决策状态：已决策

当前旧行为：

- 新建卡牌包会清空所有 editor images。
- 卡牌 JSON 导入前会清空所有 editor images。
- 卡牌 DHCB 导入会保存 packaged images。
- DHCB 导入 orphan images 会保存，但不会添加卡。
- image persistence failure 会跳过并继续导入。
- 删除卡牌、ancestry pair、subclass triple 会异步删除相关图片。
- 修改 metadata 导致标准 ID 重写时，会异步迁移 image key。

决策：

- 新 validation 链路不得写图片存储。
- 图片管理通过 editor image service / repository port 暴露。
- orphan image cleanup / audit 应作为 image maintenance 行为，不混入 validation。
- 正常 editor image lifecycle 不应产生 orphan images；orphan images 应视为历史残留、异常中断或 bug 后的维护对象。
- Editor image storage 是草稿工作区；可以使用 best-effort、异步、部分失败后继续编辑的策略。
- Formal import asset storage 是已提交内容；必须保持原子性，不能复用 editor 的宽松图片策略。
- Editor validation 不读写 editor image DB。
- Formal dry run 不写 asset storage。
- Build Commit Plan 负责规划 asset ownership。
- Commit 才执行正式 asset 写入，并通过 storage transaction / compensation 处理失败。
- 打开 persisted editor workspace 时，编辑器应静默执行一次本地 workspace recovery：以 editor image storage 为事实来源同步每张卡的图片状态。只有实际读到对应 image blob 时，草稿上才保留 / 设置 `hasLocalImage: true`；读不到或读取失败时移除该标记，保证 UI 的上传 / 更换 / 删除图片状态反映真实可用图片。
- Persisted workspace recovery 不是 dry-run，不是 formal import，不是 editor validation，也不是 import recovery report；它不产生用户可见 diagnostic。

本轮应修改：

- DHCB editor import 不再保存 orphan images。
- Orphan images 进入 editor import recovery report / warning。
- Formal import 如果遇到 orphan packaged asset，应由 formal pipeline 决定 warning 或 error，但不能写入不可归属 asset。

本轮先保留：

- 新建卡牌包清空全部 editor images；这是当前单草稿 workspace replacement 行为。
- 卡牌 JSON 导入前清空全部 editor images；这是当前单草稿 workspace replacement 行为。
- Editor import recovery 中 image persistence failure 可以宽松跳过并继续导入卡牌内容，但必须产出 report / warning。
- 编辑器删除卡牌、ancestry pair、subclass triple 时，异步 best-effort 删除相关 editor image。
- 修改 metadata 导致标准 ID 重写时，继续迁移 editor image key，避免用户感知图片丢失。
- Orphan image 被跳过、图片保存失败等信息应在导入完成后的 recovery report / 导入摘要中展示；后续点击 validation 时不再重复作为 validation diagnostic 出现。
- 可以在 editor image service 层静默运行一次 best-effort orphan cleanup，清理当前 draft 已不可引用的历史 / 异常 orphan images。
- 打开 persisted workspace 时可以静默运行一次 best-effort orphan cleanup；失败不阻止编辑器打开，也不进入 validation result。

实现约束：

- 以上宽松行为只适用于 editor draft / editor image workspace。
- Formal import / uninstall / replacement 的 asset 写入和删除不能使用 best-effort 策略。
- store 不应长期直接动态 import image helper；新链路应通过 editor image service port 调用。
- 显式 orphan image cleanup / audit 可以作为后续 image service API，但不塞进 validation。
- 静默 orphan cleanup 不能成为 export serializer 或 validation 的隐式职责；serializer 只按当前 draft card ids 读取导出所需图片。
- Editor validation 只判断当前 draft 序列化后的发布文件和 Editor-Owned Authoring Checks，不承载 editor import action report。
- Persisted workspace recovery 必须幂等；不能改变卡牌业务字段，不能自动补 ancestry / subclass，不能清空全部 editor images。

### 11. Metadata Copy 行为

决策状态：已决策

当前旧行为：

- 卡牌包 metadata 可复制到装备 draft。
- 装备 draft metadata 可复制到卡牌包。
- 复制时会弹确认框。
- 复制后标准 card/equipment id 前缀会同步更新。
- card id 更新会触发 image key migration。

决策：

- Metadata copy 是 Content Pack Editor shell / application orchestration，不属于 card 或 equipment domain 内部规则。
- 保留确认框和 ID 前缀同步。
- 本轮继续触发 card image key migration，避免 metadata copy 导致标准 card id 改写后用户感知图片丢失。
- 本轮不为 metadata copy 引入 mutation plan / report；确认框足够覆盖当前用户可见风险。
- 本轮不改成“一份共享 metadata”。共享 metadata 属于未来 Content Pack Draft 模型设计，不混入本轮重构。

理由：

- Metadata copy 跨 card draft 和 equipment draft，边界在 editor shell，而不是单个内容类型的 domain service。
- 图片 key migration 是 editor image workspace 的一致性维护，保留它比让用户手动重新上传图片更合理。
- 共享 metadata 会改变编辑器 draft model，不是本轮 validation / serialization / side-effect 收口的必要前提。

### 12. Store / Side Effect 收口

决策状态：已决策

当前问题：

- card editor store 混合了 draft state、dialog state、toast、导入导出、validation、IndexedDB image side effect。
- page shell 也承担了过多 orchestration。

决策：

- store 保留 draft state、selection state 和简单 mutation。
- file input、download、toast、validation orchestration 移到 application service / UI adapter。
- 新链路中的 image repository calls 通过明确 side-effect adapter。
- 不要求一次性重写所有旧 store mutation；优先保证新 validation / serialization 链路分层清楚。
- 第二阶段不只写边界；凡是新 validation / serialization / import recovery 链路触及的 side effects，都应按新边界落地。
- 本轮必须从 store 权威路径移出的能力：validation orchestration、export serialization、import recovery/report orchestration、editor image repository 直接调用、download / file IO 触发。
- 普通 draft mutation、selection state、dialog open/close state 可以暂时留在 store，除非本轮改动直接触碰。
- `page.tsx` 可以拆出 editor shell hook / application adapter 来承接 file input、download、toast 和 orchestration；不要求一次性重写整个 page shell。
- store 不应长期直接动态 import image helper；本轮新增或重写路径必须通过 editor image service port。

理由：

- 本轮目标是分离 UI、业务层和 storage / side effects；只写文档不移动新链路无法兑现架构目标。
- 全量 store 重写风险过大，而且与 validation / serialization 行为修正不是一一必要关系。
- 以新链路为切片收口，可以避免继续扩张旧混合模式，同时保留已有简单编辑行为的稳定性。

## 初步讨论顺序

建议按以下顺序逐条完善：

1. Repair / Serialization / Validation 三阶段边界。
2. Dry Run / Build Commit Plan / Commit 边界。
3. 旧 Card ValidationService 去留。
4. DiagnosticSourceMap 和可读文案。
5. Editor-Local diagnostics。
6. 图片管理旧行为。
7. editor-only fields 清理。
8. Validation UI 统一范围。
9. Metadata copy 行为。
10. Store / side effect 收口。

## 第二阶段产出

第二阶段结束时，应产出：

- 每个行为的决策：保留、修改、替换、延期。
- 每个行为所属层次：UI、business、storage/side effect。
- 本轮实现范围。
- 需要更新的 characterization test 期望。
- 下一阶段 implementation plan 的任务切片。

第二阶段不直接要求完成所有重构代码。代码实现应在行为决策稳定后再写计划。
