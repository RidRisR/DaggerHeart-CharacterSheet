# Content Pack Editor Layered Refactor Design

日期：2026-06-19
状态：设计已确认，待实施计划

## 背景

`/card-editor` 已经不只是卡牌编辑器。它现在同时编辑卡牌包草稿和装备包草稿，更接近 **Content Pack Editor**。从用户行为看，编辑器并不复杂：打开或新建一个内容包草稿，编辑内容，导入、导出、验证，并在卡牌和装备之间复制基础信息。

复杂度来自实现边界累积：

- 卡牌整包校验仍使用旧 `ValidationService`，没有复用新的 card import structured diagnostics。
- 装备编辑器校验已经走 equipment application service dry-run，卡牌和装备验证入口不一致。
- 卡牌验证 UI 和装备验证 UI 使用不同结果模型和不同文案来源。
- 卡牌 import pipeline 的内部 v1 path 与当前作者看到的 legacy 外部形状不同，可能把错误报到不存在的字段上。
- `page.tsx` 同时承担 shell 编排、装备导入导出、验证 orchestration、跨模式 metadata copy。
- card editor store 混有 draft state、业务变换、toast、IndexedDB 图片副作用、导入导出和验证调用。

本轮重构的指导思想是：**编辑器本质是在编辑一个 Content Pack Draft**。`.dhcb` 只是卡牌草稿当前可导入/导出的 legacy container 之一，不是编辑器的统一内部对象；装备草稿当前仍导入和导出普通 `daggerheart.equipment-pack.v1` JSON。卡牌和装备都应通过同一类 editor draft 边界工作，但允许各自保留领域差异。

## 目标

1. 让展示层、业务层和存储层在 editor 核心链路上分离。
2. 用 characterization tests 先固定当前老行为，再决定哪些行为保留或修改。
3. 统一卡牌和装备的 editor validation 数据流和展示结果模型。
4. 卡牌 editor validation 使用新的 card import pipeline / structured diagnostics 作为权威来源。
5. 卡牌 editor validation 和内容包管理中的正式卡牌导入使用同源 diagnostic copy。
6. 解决 internal validation path 与外部作者形状不一致的问题，UI 不直接展示 internal path。
7. 保留当前编辑器简单产品行为，不引入重型 editor framework。

## 非目标

- 不把卡牌默认导出格式改成 `daggerheart.card-pack.v1`。
- 不移除 legacy card JSON 或 legacy DHCB 支持。
- 不改变验证失败仍可导出草稿的原则。
- 不重写 runtime card store、选卡 UI 或 runtime read model。
- 不重写正式 storage backend。
- 不迁移 `/card-editor` 路由。
- 不做大规模视觉重设计或 mockup 驱动改版。
- 不一次性清理所有历史 card store 行为；只清理本轮 editor draft 文件链路相关行为。

## 核心模型

卡牌和装备统一按以下链路理解：

```text
external file or new draft
  -> editor draft recovery
  -> editor draft repair
  -> in-memory editor draft state
  -> editor draft export serialization
  -> Dry Run validation
  -> diagnostics projection
  -> shared validation UI view model
```

### Editor Draft Recovery

Editor Draft Recovery 是“打开文件继续编辑”的宽松动作。它可以恢复 editor-safe 结构，但不能声明文件可正式导入。

### Editor Draft Repair

Editor Draft Repair 是 Editor Draft Recovery 内部的独立 editor-only 阶段。它负责自动补全编辑器需要的 authoring structure，不属于 parsing、formal validation、export serialization 或 Dry Run validation。

卡牌当前允许：

- JSON / DHCB 导入成 legacy card draft。
- 在 repair 阶段自动补 ancestry pair。
- 在 repair 阶段自动补 subclass triple。
- 处理 editor 图片导入或清理。

装备当前允许：

- JSON 导入成 `daggerheart.equipment-pack.v1` draft。
- 缺失 weapons / armor 时恢复为空数组。
- 未完成字段保留为 editor-safe null placeholder。
- 导入行为是 replacement，不 merge。

### Editor Draft Export Serialization

Editor Draft Export Serialization 是只读转换。它生成导出按钮实际会写出去的 payload 或 container view，但不修改当前内存 draft。

卡牌导出继续生成 legacy-compatible JSON / DHCB：

- 移除 `isModified`、`lastSaved` 等 editor-only state。
- DHCB 写 root `cards.json`。
- DHCB 按现有规则写 root `images/*`。
- 图片字段按现有规则设置 `hasLocalImage` / `imageUrl`。
- 现有 DHCB 导出会在 editor image DB 中存在当前 card id 图片时写 `hasLocalImage: true` 并省略该卡的 `imageUrl`；本轮先用 characterization tests 固定该旧行为，再单独评审是否保留或修改。

卡牌导出 serialization 应拆成共享 payload cleanup 和 target-specific serializers：

```text
serializeCardDraftPayload(draft)
  -> legacy payload cleanup shared by export targets

serializeCardDraftForLegacyJson(draft)
  -> JSON payload only

serializeCardDraftForLegacyDhcb(draft, imageRepository)
  -> cards.json payload + packaged images + manifest/container view
```

普通 JSON serialization 不应依赖 editor image repository。DHCB serialization 可以依赖 image repository，但只能生成导出视图，不能修改 draft 或清理 image storage。

装备导出继续生成普通 equipment pack JSON：

- `format: "daggerheart.equipment-pack.v1"`。
- 包含完整 weapons 和 armor。
- 不拆成 weapon-only 或 armor-only 格式。

### Editor Draft Validation

Editor Draft Validation 是只读检查：

- 先对当前 draft 执行当前默认导出 target 的 export serialization。卡牌当前默认验证 legacy DHCB target，因为卡牌工具栏默认导出 DHCB；装备当前验证 scoped equipment JSON target。
- 再将序列化结果送入对应 **Dry Run** validation，即不读取 installed storage state 的 source / structural / semantic validation。
- 再合并 editor-local authoring diagnostics。
- 不修复 draft。
- 不写 localStorage、IndexedDB、runtime cache。
- 不做 installed-content conflict check；当前浏览器是否能安装该草稿属于正式导入或未来显式 installability check。
- 不阻止导出。

如果未来 UI 同时提供多个明确导出 target，Editor Draft Validation 可以增加 target selector；本轮不引入。

卡牌验证 legacy DHCB target 时，不需要真的生成 zip Blob 再读回。Validation orchestration 应使用 DHCB serializer 产出的等价 payload view：`cards.json` payload 加过滤后的 packaged image assets。真正的 zip encode/decode 由 export serialization tests 和 import source intake tests 覆盖，避免把 JSZip 容器编码耦合进 editor validation 业务检查。

当前 card import source contract 还不能表达“已经序列化好的 DHCB view”。本轮需要新增一个不经过 JSZip 的输入形状或 pipeline entrypoint，例如：

```ts
type LegacyDhcbViewSource = {
  kind: "legacyDhcbView";
  cardsJson: unknown;
  imageAssets: CardImportImageAsset[];
};
```

它必须复用真实 legacy DHCB import 在 cards payload 和 packaged image assets 之后的同一套 Dry Run 逻辑，避免 editor validation 只验证 `cards.json` 而漏掉图片资产语义。

## 分层设计

### React Shell

React 页面和组件只负责渲染和用户意图分发：

- 模式切换。
- toolbar action。
- confirm dialog。
- validation dialog open/close。
- jump target 应用到当前 tab / index。
- card/equipment metadata copy。

React 不应：

- 解释 diagnostic code。
- 推断字段是否合法。
- 拼接 import path。
- 调用 storage write 作为 validation 的一部分。
- 直接持有 formal import 业务规则。

卡牌包和装备包之间的 metadata copy 是 Content Pack Editor 的跨草稿便利功能。它属于 editor shell / application orchestration，不属于 card pack 或 equipment pack domain adapter。实现应通过两个 draft adapter/store 暴露的 metadata mutation 完成，不直接深入对方内部结构。

### Editor Application Services

新增或整理 editor application service / adapter，按领域暴露一致能力：

```text
recoverDraft(input)
serializeDraftForExport(draft)
validateDraft(draft)
projectDiagnosticsToEditorView(result)
```

卡牌和装备可以有不同实现，但 shell 只依赖这类能力。

本轮不引入一个统一的持久化或内存 `ContentPackEditorDraft` 数据结构。`Content Pack Draft` 是产品和领域概念；代码层保留 `CardPackageState` 与 `EquipmentEditorDraft` 的现有形状，通过 editor adapter contract 和 shared validation view model 统一 shell 依赖。

### Domain Import Pipelines

`card/import` 和 `equipment/import` 继续拥有 structural validation、semantic validation 和 import result shape。长期语义上，内容包导入有三个责任边界：

1. **Dry Run**：检查包自身是否有效，产出 staged/import model，不读 storage。
2. **Build Commit Plan**：基于 Dry Run 结果和当前 storage / builtin 状态判断是否能在本机导入，并产出写入计划。pack limit、template id conflict、pack id generation、write set / asset ownership planning 都属于这个边界。
3. **Commit**：执行写入计划，做 storage transaction、compensation cleanup 和 runtime refresh。

这不是新增用户可见阶段，而是澄清现有阶段职责。当前装备 `dryRun` 把 Build Commit Plan 的 storage-aware 检查放进 Dry Run，本轮应改掉。

卡牌 editor validation 必须走新的 card import dry-run pipeline，而不是旧 `app/card-editor/services/validation-service.ts` 的整包校验。

装备 editor validation 不应继续依赖当前 application service 的 `dryRun` 语义，因为该路径会读取 repository snapshot 并执行 installed-content conflict check。这个行为应在本轮修正：equipment `dryRun` 只做包自身验证；正式导入路径通过 Build Commit Plan 判断当前本机是否能够导入。

这不是一行替换。当前 equipment pipeline 的输入类型要求 `conflictContext`，pipeline 也总是执行 conflict check。本轮实现需要：

- 让 equipment dry-run pipeline 不再要求 storage-derived conflict context。
- 将 installed-content conflict、pack limit、pack id / lifecycle metadata、write set planning 移入 application service 的 Build Commit Plan 边界。
- 更新现有期待 dry-run 报 `ID_CONFLICT` 的测试，把 installed-content conflict 覆盖迁移到 commit-planning / formal import 测试。
- 为 equipment application service 增加回归测试，明确 dry-run 不调用 `repository.loadSnapshot()`、不 commit、不 rebuild runtime。

### Storage and Side Effect Adapters

文件选择、文件下载、toast、IndexedDB editor image 操作必须留在 UI adapter 或明确 side-effect adapter 中。

业务函数应尽量是纯函数，尤其是：

- draft recovery 的 shape conversion 部分。
- export serialization。
- metadata update 后 card id rewrite 计划。
- diagnostic projection。
- validation view model creation。

图片相关行为可以保留现状，但应从 store action 中逐步包进明确 adapter，例如 editor image service。新 validation 链路不得直接写图片存储。

Card editor store 本轮瘦身边界：

- store 保留 `packageData`、current index、dialog open state 和简单 draft mutations。
- file input、download、toast、validation orchestration 应移出 store。
- 新导入/导出/验证路径中的 image repository calls 应通过明确 side-effect adapter。
- 历史 draft mutation 中已经存在的 image delete / key migration 副作用先由 characterization tests 固定，再按风险逐步迁移；不要求一次性重写所有 card draft mutations。

## 诊断设计

### 同源 Diagnostic Copy

卡牌和装备都应遵循：

```text
import diagnostic
  -> localized/domain copy
  -> editor/content-import context action text
  -> UI view model
```

装备已有 `equipment/ui/diagnostic-copy.ts`，本轮应为卡牌新增对应 mapper，例如 `card/ui/diagnostic-copy.ts`。

同一个 card diagnostic code 在 editor validation 和 content manager formal import 中应使用同源解释。差异只允许体现在 context action：

- editor validation：修改草稿后重新验证。
- content import：修改文件后重新导入。

文案上下文必须区分受众：

- Editor validation 面向 Pack Author，主动作是修复草稿并重新验证。
- Content manager formal import summary 面向 Pack User，主动作是修复文件并重新导入。
- Formal import detail 可以保留对作者有用的修复方向，但不能使用 editor-only 词，例如“修改草稿”或“返回编辑器”。

### Diagnostic Source Map

Import pipeline 内部可以使用 canonical / internal diagnostic path，例如：

```text
/classes/0/name
/ancestries/0/ancestry
/variants/0/subCategory
```

但 editor 和 legacy import UI 不应直接展示这些 path。路径投影应由 **Diagnostic Source Map** 驱动，而不是由 UI 维护一张全局 legacy 映射表。

`Diagnostic Source Map` 由改变 payload shape 的边界产生：

- Legacy Card Adapter 记录 legacy card path 到 internal card path 的映射。
- Card legacy DHCB export serializer 记录当前 editor/export target path 到 validation path 的映射。
- Direct internal v1 import 可以产生 identity source map。
- Equipment pack v1 当前 external/editor/internal shape 基本同形，本轮先产生 identity source map。
- 未来新增 public schema、bundle format 或装备作者格式时，由对应 adapter / serializer 产生自己的 source map，不修改 validation UI。

source map entry 应能支持：

- `internalPath`：保留原始 machine path。
- `authorPath`：当前作者看到的外部/export shape path，例如 `profession[0].名称`。
- `authorFormat`：例如 `legacy-card-format`、`legacy-card-dhcb`、`equipment-pack-v1`。
- `fieldLabel`：中文字段名，例如 `名称`。
- `groupType`：职业、种族、社群、子职业、领域、变体、基础信息、系统。
- `specificGroup`：第 N 张职业卡、卡牌包基础信息、系统问题。
- `jumpTarget`：editor tab 和 index。

Diagnostic projection 流程：

```text
diagnostic.path
  -> lookup Diagnostic Source Map
  -> if found: use authorPath + fieldLabel + jumpTarget
  -> if missing: use minimal internal card/equipment anatomy labels as fallback
```

Fallback labels 只用于无法映射的 metadata、system 或 unknown path。它们不能成为新的格式转换权威。

`Diagnostic Source Map` 应作为 import / dry-run workflow result 的 metadata 返回，供 editor validation 和 content manager import details 共用。它不是 public payload，不进入 storage，也不属于 commit plan 的业务内容。

当前 card / equipment import result types 还没有 source-map metadata。本轮需要把 `DiagnosticSourceMap` 放到共享 import/editor result 类型中，并由 adapter / serializer / normalization boundary 产出，再贯穿 dry-run result、application service result 和 editor/content-manager diagnostic projection。不能只在 UI projector 里临时硬编码映射。

Source map 粒度以字段级为目标，条目级为 fallback：

- 字段级映射用于 required/type/enum 等具体字段诊断，例如 `/classes/0/domain1` -> `/profession/0/领域1`。
- 条目级映射用于 whole-item semantic warning 或无法定位到字段的诊断，例如 `/variants/0` -> `/variant/0`。
- nested field 必须支持，例如 `/variants/0/summaryItems/item1`、`/equipment/armor/0/baseThresholds/minor`。
- 实现上优先使用 path templates 加 index 匹配，不要求为每个数组项预生成所有字段 entry。
- 对 adapter 发现并丢弃的 unknown author field，应记录实际 authorPath，避免丢失作者看到的问题位置。

用户可见 diagnostic 信息以可读性为第一优先级：

- editor validation 和 content manager import details 默认展示 author-facing message、field label、authorPath 或位置描述。
- internalPath、raw diagnostic code、raw value 只作为必要技术详情保留，不作为主文案。
- UI 主标题和描述不直接展示 JSON Pointer，除非该 path 是最清晰的位置说明。

### Editor-Local Diagnostics

Editor-local diagnostics 用于 authoring regularity，不是 formal import blocking rule，除非 formal pipeline 也产生对应 error。

编辑器验证的通过标准可以比 formal import 更严格。也就是说，一个包可能通过正式 Dry Run / formal pack validation，但因为不符合编辑器认为的整洁草稿约束而没有通过 Editor Draft Validation。UI 应把这类问题解释为 pack author 需要修复的草稿问题，而不是 formal import schema error。

卡牌本轮保留：

- ancestry pair regularity。
- subclass triple regularity。

装备本轮保留：

- editor-local duplicate equipment id diagnostics，直到 formal dry-run 覆盖同等跨 weapon/armor draft 规则。

## Shared Validation View Model

卡牌和装备 validation dialog 应消费同一类 view model，而不是分别解析领域 result。

Editor validation 文案必须面向 Pack Author 和草稿自身检查：

- 成功态表达“草稿自身检查通过，可以导出草稿 / 发布文件”。
- 失败态表达“导出发布前应修复这些草稿问题”，但不能声称验证失败会阻止导出。
- 不承诺“可以导入到内容包管理”或“正式导入前必须修复”，因为 Editor Draft Validation 不执行 storage-aware commit planning。
- 卡牌现有“可以正常导出使用”方向可以保留，但应去掉“质量优秀”“放心使用”这类评价式文案。
- 装备现有“可以导出并用于内容包管理导入”应改为只说明可以导出草稿。

建议结构：

```ts
interface EditorValidationViewModel {
  subject: "cardPack" | "equipmentPack";
  success: boolean;
  title: string;
  description: string;
  summaryStats: Array<{
    label: string;
    value: string | number;
    hint?: string;
    tone: "error" | "warning" | "info" | "success" | "neutral";
  }>;
  tabs: Array<{
    id: "priority" | "specific" | "type" | "all";
    label: string;
    groups: EditorValidationGroup[];
  }>;
  footerText?: string;
}

interface EditorValidationGroup {
  title: string;
  severity: "error" | "warning";
  diagnostics: EditorValidationDiagnosticView[];
}

interface EditorValidationDiagnosticView {
  source: "import" | "authoring";
  title: string;
  description: string;
  suggestion: string;
  severity: "error" | "warning";
  fieldLabel?: string;
  authorPath?: string;
  code: string;
  value?: unknown;
  jumpTarget?: unknown;
}
```

UI 组件只渲染该 view model。卡牌和装备各自负责把领域 diagnostics 投影成这个结构。

## 老行为处理策略

本轮不把 characterization tests 理解为永久冻结。流程是：

1. 先用 tests 记录当前行为，建立重构前对照组。
2. 把老行为分为必须保留、先冻结后评审、应修改。
3. 对批准修改的行为，先在 spec/plan 里说明原因，再更新测试期望。

### 必须保留

- 编辑器导出不因验证失败被阻止。
- 卡牌默认导出仍为 legacy JSON / legacy DHCB。
- 装备导出仍为 `daggerheart.equipment-pack.v1` JSON。
- 装备导入草稿 replacement，不 merge。
- Editor Draft Validation 是只读动作。
- Formal import workflow 是 installability 的权威来源。

### 先冻结后评审

- 卡牌导入草稿自动补 ancestry pair。
- 卡牌导入草稿自动补 subclass triple。
- 修改卡牌包 name / author 时自动重写标准 card id。
- 自动迁移 editor image key。
- 新建卡牌包时清空所有 editor images。
- 删除卡牌、ancestry pair、subclass triple 时删除相关 editor image。
- 卡牌 JSON 导入前清空所有 editor images。
- 卡牌 DHCB 导入对 orphan image / image import failure 的宽松行为。
- 卡牌 DHCB 导出在有 packaged image 时省略该卡 `imageUrl` 的行为。

这些行为不是全部无条件保留。本轮设计允许在测试固定后逐项修改，但修改必须有明确理由和测试更新。

### 应修改

- 卡牌整包 editor validation 继续使用旧 `ValidationService` 作为权威。
- 旧 `ValidationService` 的单卡和字段级校验接口继续存在并暗示第二套验证模型。若现有 UI 没有实际使用点，本轮应删除这些老接口；未来即时字段提示应基于新模型另行设计，不能复用旧 validator。
- `app/card-editor/services/validation-service.ts` 和 `app/card-editor/services/error-message-mapper.ts` 属于 editor 私有旧验证层，本轮应删除或替换，但只能在同一步替换 `validationResult`、`validatePackage`、`validateField` 和旧 `ValidationResults` 组件依赖，不能单独删除造成 store / dialog 断裂。`card/type-validators.ts` 仍被旧 card store import path 使用，本轮只从 editor validation 路径切掉，不直接删除该领域旧模块。
- 卡牌和装备 validation dialog 使用两套 incompatible result model。
- 卡牌 UI 直接或间接展示 internal v1 path。
- 内容包管理卡牌正式导入和 editor validation 使用不同 diagnostic copy。
- 装备 application-service `dryRun` 读取 repository snapshot 并执行 installed-content conflict check。
- 新 validation 链路继续塞进 React component 或 Zustand store internals。

## 测试策略

### Characterization Tests

先补测试固定当前行为：

- Card editor JSON import recovery 会补 ancestry pair。
- Card editor JSON import recovery 会补 subclass triple。
- Card editor JSON import recovery 会先清空当前 editor images。
- Card editor export serialization 移除 `isModified` / `lastSaved`，保留 legacy field names。
- Card editor DHCB serialization 写 root `cards.json` 和现有 images 结构。
- Card editor DHCB serialization 在 packaged image 存在时写 `hasLocalImage: true` 并省略该卡 `imageUrl`。
- Card editor metadata update 后标准 card id rewrite 行为。
- Card editor image key migration 行为。
- 新建、删除、JSON import 对 editor images 的当前清理行为。
- Equipment editor import replacement 行为。
- Equipment editor export JSON shape。
- Equipment editor validation 走 application service dry-run。
- Metadata copy between card and equipment。

### Boundary Tests

重构后新增边界测试：

- `serializeCardDraftForExport()` 是只读，不改变 draft。
- `validateCardEditorDraft()` 校验 export serialization 的结果。
- `validateCardEditorDraft()` 不写 storage。
- Equipment `dryRun` 不读取 repository snapshot，不执行 installed-content conflict check。
- Equipment commit-planning / formal import 仍覆盖 installed-content conflict、pack limit 和 template id conflict。
- Card legacy DHCB view source 不生成 zip Blob，但携带 `cardsJson` 和 packaged image assets，且复用真实 DHCB import 的后半段 Dry Run 逻辑。
- Legacy Card Adapter、DHCB serializer 和 equipment identity adapter 都会产出 `Diagnostic Source Map`，并由 dry-run result 携带。
- `projectCardDiagnosticsToEditorView()` 通过 `Diagnostic Source Map` 把 `/classes/0/name` 投影为职业卡 legacy/editor 位置。
- Equipment validation 通过 identity `Diagnostic Source Map` 投影 `/equipment/weapons/0/name` 等同形路径。
- Diagnostic projection 为 metadata、system、unknown path 提供稳定 fallback。
- Diagnostic projection 测试应包含负向断言：主标题和描述不展示 internal v1 path 或 raw diagnostic code，internalPath 只保留为技术详情。
- `localizeCardDiagnostic()` 在 editor validation 和 content import context 使用同源 copy。
- Shared validation view model 对 card/equipment 都能按 priority、specific、type、all 分组。

### Integration Tests

- `/card-editor` 卡牌模式点击验证后展示新 shared validation dialog。
- `/card-editor` 装备模式点击验证后仍展示等价信息。
- 从 validation dialog 定位卡牌/装备条目保持可用。
- Content manager card import failure 使用 card diagnostic copy。
- Content manager equipment import failure 继续使用 equipment diagnostic copy。

## 执行顺序

1. 补 characterization tests，记录当前 editor 行为。
2. 审视“先冻结后评审”清单，决定本轮修改项。
3. 修正 equipment dry-run / Build Commit Plan 边界，更新 dry-run 不读 storage 和 commit-planning conflict 覆盖。
4. 抽 card draft recovery / export serialization 纯函数。
5. 抽 card editor side-effect adapter，至少让新链路不直接依赖 store 副作用。
6. 为 card legacy DHCB view validation 增加不生成 zip Blob 的 source / pipeline entrypoint。
7. 建立 `DiagnosticSourceMap` result metadata，并接入 card legacy adapter、DHCB serializer、equipment identity adapter。
8. 建立 card diagnostic copy 和 source-map driven path projection。
9. 建立 shared editor validation view model 和共享 validation results component。
10. 将 card editor validation 接到新 card import dry-run pipeline。
11. 将 equipment validation 投影到 shared view model。
12. 将 content manager card import diagnostics 接到同源 card diagnostic copy，并避免把 structured diagnostics flatten 成 generic string。
13. 在 shared view model 替换完成后移除或降级旧 `ValidationService` 的整包校验权威地位。
14. 跑 unit、integration 和相关 local fixture tests。

## 验收标准

- React validation UI 不直接解析 import diagnostic code。
- Editor Draft Validation 不写 localStorage、IndexedDB 或 runtime cache。
- Card editor validation 和 content manager card import 对同一 diagnostic code 使用同源文案。
- Content manager card import 保留 structured diagnostic code/path/source-map metadata，不能只包装成 generic string。
- Card editor validation 不展示 internal v1 path 作为作者-facing path。
- Card/equipment validation dialog 消费同一 shared view model。
- 旧行为中被批准保留的部分有 characterization tests。
- 旧行为中被批准修改的部分有明确测试期望变更。
- `pnpm test:run` 或对应 scoped tests 通过。
