# 卡牌导入模块化重构方案

**日期:** 2026-06-13

**状态:** 模块化方案草案，等待逐模块细化

**关联调研:** `docs/superpowers/specs/2026-06-13-card-import-architecture-discovery.md`

> **Superseded note (2026-06-16):** 本文是模块边界草案。后续 commit path、CommitDraft / FinalCommitPlan、storage transaction、图片强一致和测试策略以 `2026-06-16-card-import-commit-path-scope.md` 与 `2026-06-16-card-import-commit-path-test-strategy.md` 为准。本文中如出现 `CardPackCommitPlan` 同时包含 legacy storage projection、或 formal adapter 自动补齐 ancestry / subclass 的描述，均已被后续决策替代：formal adapter 不自动造卡；pipeline 产 `CardPackCommitDraft`；application service 产 `CardImportFinalCommitPlan`；storage format adapter 才产 legacy batch projection。

## 目标

本文档把卡牌导入架构调研转化为一个按 Module 组织的重构方案。调研文档负责记录问题、证据和现状；本文档负责指导后续设计和实施，重点是模块边界、责任归属、依赖方向和迁移顺序。

本次重构必须保留当前已经公开的卡牌导入契约。所有今天可以成功导入的第三方材料，在重构后仍然必须可以成功导入。

## 设计原则

重构方案按 Module 切分，而不是按单个问题切分。

例如“储存耦合”“公开契约只有文字说明”“中文内部变量过多”“技术债积累”“编辑器和运行时责任混杂”等，都是横切约束。它们应该成为每个 Module 设计时必须检查的条件，而不是拆成互相独立的功能开发。

每个 Module 都需要回答四个问题：

1. 这个 Module 拥有什么责任？
2. 哪些责任必须留在这个 Module 外面？
3. 这个 Module 向下一个 Module 暴露什么 Interface？
4. 这个 Module 必须保留哪些兼容性约束？

## 必须保留的公开契约

卡牌包第一阶段的结构化契约应是 Card Pack Internal Validation Schema。它是全英文、shape-preserving 的 workflow validation schema，风格参考装备包 schema，格式标识为 `daggerheart.card-pack.v1`。外部如果提供符合 v1 结构的卡包，导入器应接受；但编辑器默认导出仍保持 Legacy Card Format。

当前已经发布的中文分组格式应作为 Legacy Card Format 继续被支持。它不是未来要公开推广的 schema 形态，而是必须长期兼容的旧作者格式。

重构后必须继续支持以下导入路径：

- 使用顶层分组数组的普通 JSON 卡牌包，例如 `profession`、`ancestry`、`community`、`subclass`、`domain`、`variant`。
- `public/自定义卡包指南和示例/` 下已经发布的示例和指南。
- 遵循同一分组 JSON 结构的内置和示例卡牌包。
- Legacy `.dhcb` 文件：根目录 `cards.json`、可选 `manifest.json`、可选 `images/` 图片目录。
- 当前卡牌编辑器导出的文件，以及编辑器已经接受或生成的 authoring conveniences。

本方案不把 v1 作为默认编辑器导出格式。第一阶段建立 Card Pack Internal Validation Schema 作为 workflow stabilization artifact；Legacy Card Format 通过 Legacy Card Adapter 转换后进入这个 schema；直接提供 `format: "daggerheart.card-pack.v1"` 的外部 payload 也应进入同一个 schema。未来是否把 v1 作为默认导出格式，应作为单独的 Public Release Gate 决策。

## 宏观发布决策

本轮重构采用 **Gradual internal merge, atomic public release**。

含义：

- 代码可以按 Slice 逐步合并，以便尽早得到测试、集成和真实使用反馈。
- 对外发布必须原子化。公开 schema、用户指南、AI 生成提示词、示例包、changelog 和 UI 中的新能力说明，只有在整轮导入链路稳定后才一起发布。
- 中间阶段可以新增 internal schema、fixtures、Module、Adapter、Pipeline 和 tests，但不能改变用户可见导入契约。
- 中间阶段不能把半成品 schema 放到 `public/schemas/`，也不能更新用户指南去宣传尚未完成的能力。

因此，Card Pack Internal Validation Schema 在内部合并阶段应先作为 stabilization artifact 使用，同时作为可接受的 non-default forward import format。Legacy Card Format 仍是默认编辑器导出目标；v1 是否成为默认导出目标要等 Public Release Gate 明确决定。Legacy Card Format 的中文字段兼容性由 Adapter 和 compatibility fixtures 保障，而不是把中文字段作为新的 schema 推广。

## 宏观架构决策

### Decision 1: Formal Import Workflow 是唯一权威安装路径

所有可以把卡牌包安装进应用的入口，最终都必须经过同一条 formal import workflow。

适用入口包括：

- Content Pack Manager 的 JSON 导入。
- Legacy `.dhcb` 导入。
- Card Editor 中用于判断“这个 draft 是否可安装”的 preview 或 install flow。

Editor Draft Import Recovery 和 Editor Draft Export 可以保留更宽松的 authoring round-trip 能力，用来恢复草稿、补齐编辑器便利结构、保留作者输入，或者导出一个仍需继续编辑的 draft-like 文件。它们不能绕过 formal import workflow 直接完成安装，也不能成为 installed packs 的第二套 canonical validator。

Editor Draft Validation 是独立动作，不是导出动作的一部分。它必须把当前 editor draft 序列化为目标导出 payload 后，复用 formal import workflow 的 dry-run 来判断这个 draft 是否可正式安装。它也可以像装备包编辑器一样合并 editor-local authoring diagnostics，用来检查编辑器希望保持的正规化结构，例如 ancestry 两张一组、subclass 三张一组。导出本身不隐式执行验证。

这个决策的目标是让 formal importability 的 validation、diagnostics、conflict policy 和 commit boundary 只有一个权威来源，避免 UI、`.dhcb`、editor 各自维护一套不一致的安装规则，同时允许 editor import/export 为 authoring round-trip 保持宽松，并允许 editor validation 额外报告 authoring regularity 问题。

### Decision 2: Commit Boundary 在所有检查之后

导入流程必须先完成 structural validation、semantic validation 和 conflict check，全部通过后才能进入 commit。

在 commit boundary 之前：

- 不写入 cards。
- 不写入 images。
- 不写入 imported batch metadata。
- 不修改 runtime read model。
- 不清空或覆盖 editor / imported image storage。

Cards 和 images 都必须先进入同一个 `CardPackCommitPlan`。只有当 commit plan 构建完成并确认可提交后，Application Service 才能调用 Repository / Persistence Adapter 执行 durable writes。

这个决策的目标是避免失败导入留下 partial durable state。尤其是 `.dhcb` 和 editor import recovery 不能在验证成功前提前写入 IndexedDB 图片。

### Decision 3: 第一阶段只做 dry-run，不进入 Storage

第一阶段不改变现有 imported card storage authority，也不实现写入路径。

第一阶段应先稳定 Source Intake、Legacy Adapter、Validation Contract、Dry-run Validation Model、Semantic Validation 和 structured diagnostics。它不读取 current imported card storage 作为校验输入，不做 conflict check，不生成 final commit plan，也不写 localStorage 或 IndexedDB image storage。

Commit Adapter、Repository Port、Persistence Adapter 和 runtime read model rebuild 属于后续阶段。后续实现真正安装时，可以先通过 `Commit Adapter` 写入当前已有的 custom card batch、localStorage 和 IndexedDB image storage 结构，再逐步推进 storage 解耦。

这个决策的目标是降低迁移风险：先让 dry-run 导入规则和 diagnostics 收敛，再设计 commit boundary 和持久化抽离。

### Decision 4: Diagnostics 参考装备包，作为稳定内部 Interface

卡牌导入的 diagnostics 应参考装备包导入实现，成为 import workflow 内部稳定 Interface。

所有导入阶段都应产出同一种 `CardImportDiagnostic`：

```ts
type CardImportDiagnostic =
  | {
      severity: "error";
      code: CardImportErrorCode;
      path: string;
      message: string;
      value?: unknown;
      relatedPaths?: string[];
    }
  | {
      severity: "warning";
      code: CardImportWarningCode;
      path: string;
      message: string;
      value?: unknown;
      relatedPaths?: string[];
    };
```

这个结构与装备包的 `EquipmentPackImportDiagnostic` 对齐：

- `severity` 区分 blocking error 和 non-blocking warning。
- `code` 是稳定机器可读错误码。
- `path` 使用 JSON Pointer 风格定位输入位置。
- `message` 是内部默认说明，不是 UI 唯一文案来源。
- `value` 保留相关输入值，供调试或高级 UI 展示。
- `relatedPaths` 用于表达重复 ID、跨字段关系等多位置问题。

Import result 也应参考装备包，携带 `stage`、`mode`、`summary` 和 `diagnostics`。UI 不解析 thrown string，也不直接依赖底层 validator 文案；UI 通过单独的 diagnostic copy / mapping layer 把 structured diagnostics 转成用户可见信息。

这个决策的目标是让 Adapter、Structural Validation、Semantic Validation、Conflict/Staging、Application Service 和 UI 共享同一个错误模型，同时保留后续本地化和不同上下文文案的空间。

### Decision 5: Definitions 可省略，但不废弃

`customFieldDefinitions` 不应再作为作者必须手填的硬性前提。导入 workflow 应支持从卡牌内容中推导 definitions，并将显式 `customFieldDefinitions` 视为 optional metadata / override。

推导规则的方向：

- `classes` 可从 Legacy Card Format 的 `profession[].名称` 推导。
- `ancestries` 可从 `ancestry[].种族` 推导。
- `communities` 可从 `community[].名称` 推导。
- `domains` 可从 Legacy Card Format 的 `profession[].领域1`、`profession[].领域2` 和 `domain[].领域` 推导。
- `variants` 可从 `variant[].类型` 推导。
- `variantTypes.subclasses` 可从 `variant[].子类别` 推导。
- `variantTypes.levelRange` 可从 `variant[].等级` 推导，但必须在设计中明确 inclusive / exclusive 语义，不能继续继承现有 max-plus-one 混乱。

显式 `customFieldDefinitions` 仍然有价值：

- 可以声明当前包中暂未使用、但作者希望保留的关键词。
- 可以携带 `variantTypes.description` 等无法从卡牌稳定推导的 metadata。
- 可以作为编辑器 authoring UI 的初始词表。
- 可以作为 backward-compatible legacy input 继续被接受。

因此，Validation Contract Module 的方向不是删除 definitions，而是把 definitions 从 required authoring burden 改成 optional enrichment。Legacy Adapter / Semantic Validation 应先构造 effective definitions：从卡牌内容推导，再合并显式 definitions，并对冲突或无法推导的 metadata 产出 diagnostics。

### Decision 6: External adapters 负责兼容，Internal Validation Schema 负责严格

Card Pack Internal Validation Schema 应采用严格契约。Schema 中未声明的顶层字段、分组字段和单卡字段都应被 structural validation 拒绝，等价于 JSON Schema 中的 `additionalProperties: false` 策略。

External Format Adapter 则保持兼容导向。Legacy 输入中的未知字段可以被容忍并丢弃，但必须产生 warning diagnostic，让作者知道这些内容没有进入正式导入模型。这个兼容宽容只存在于 adapter 边界，不能穿透到 Card Pack Internal Validation Schema、Card Pack Import Model 或后续 storage model。

Diagnostics 的严重级别边界：

- **Blocking error**：继续导入会产生错误数据、丢失核心语义或无法判断作者意图。例如未识别 `format`、非对象 payload、分组不是数组、必需字段缺失、字段类型错误、包内重复 ID、无法推导的核心引用、Internal Validation Schema 中出现未知字段。
- **Warning**：允许继续导入，但系统做了兼容处理、推导、默认值填充或丢弃了非契约内容。例如无 `format` 进入 Legacy Adapter、legacy 未知字段被忽略、缺失 definitions 但可从 cards 推导、显式 definitions 声明了未使用值、可选字段缺失后使用空值。
- **Info**：不表示问题，只记录可追踪流程事件。例如识别到某个外部格式、从 legacy 字段完成映射、从 cards 推导 definitions、dry run 成功生成 import model。

这个决策的目标是把兼容性放在 External Format Adapter，把稳定性放在 Internal Validation Schema，并让所有自动修正和丢弃行为通过 structured diagnostics 透明呈现。

## 目标 Module Map

目标设计复用装备导入的 Pipeline 思路，但保持卡牌契约的保守性。第一阶段只实现到 `Semantic Validation`，不进入 `Conflict Check`、`Stage Import Data` 或任何 storage/runtime 步骤：

```text
Source Intake
  -> JSON Parse
  -> External Format Adapter
  -> Structural Validation
  -> Dry-run Validation Model
  -> Semantic Validation
  -> Conflict Check
  -> Stage Import Data
  -> Build Commit Plan
  -> Storage Transaction
  -> Runtime Read Model Rebuild
  -> Result Mapping
```

下面按 Module 描述每一段责任边界。

## Module 1: Validation Contract Module

**当前代码和文档**

- `public/自定义卡包指南和示例/用户指南.md`
- `public/自定义卡包指南和示例/AI-卡包生成提示词.md`
- `public/自定义卡包指南和示例/神州战役卡牌包.json`
- `data/cards/builtin-base.json`
- 内部阶段 schema 位置：card import module 或 test fixtures 下的 internal schema path。
- 未来公开发布阶段 schema 位置：`public/schemas/`

**责任**

这个 Module 拥有 Card Pack Internal Validation Schema。它应该用 machine-readable schema 描述导入 workflow 内部接受的英文标准化结构，并让 adapters、validators、diagnostics 和 tests 对齐。

第一阶段 schema 不直接描述当前中文 Legacy Card Format。旧中文卡牌包必须先经过 Legacy Card Adapter，转换成 internal validation shape 后再进入 structural validation。

Schema 应为导入 workflow 放宽 definitions 要求做准备：显式 definitions 可以存在，但不应成为所有自定义关键词的唯一来源。

已批准的 internal validation schema 顶层方向：

```json
{
  "format": "daggerheart.card-pack.v1",
  "name": "...",
  "version": "...",
  "author": "...",
  "description": "...",
  "classes": [],
  "ancestries": [],
  "communities": [],
  "subclasses": [],
  "domains": [],
  "variants": [],
  "definitions": {}
}
```

第一阶段可以用这个结构作为 Card Pack Internal Validation Schema 的目标 shape。外部输入的格式识别属于 Source Intake / External Format Adapter：缺少 `format` 的 payload 视为 Legacy Card Format；`format: "daggerheart.card-pack.v1"` 的 payload 直接按 Card Pack Internal Validation Schema 校验；存在未识别 `format` 的 payload 必须返回 `UNSUPPORTED_FORMAT` diagnostic，不能 fallback 到 Legacy Card Adapter。

Internal validation schema 内的单张卡字段也必须使用英文 official-facing names。Legacy Card Format 中的中文属性名，例如 `名称`、`领域`、`描述`、`类别`、`主职`、`子职业`、`等级`、`施法`，只能作为 Legacy Card Adapter 的输入字段存在。

### Shape-preserving field mapping

第一阶段的 Card Pack Internal Validation Schema 只做字段英文命名和必要术语修正，不调整 legacy payload 的结构。也就是说：

- legacy 顶层分组数组仍然对应 forward 顶层分组数组。
- legacy 单卡字段仍然对应 forward 单卡字段。
- 不把两个字段合并成数组。
- 不把正文类字段重新拆分成新的语义结构。

#### `classes`

`profession[]` 映射为 `classes[]`。字段映射如下：

| Legacy Card Format | Card Pack Internal Validation Schema |
| --- | --- |
| `id` | `id` |
| `名称` | `name` |
| `简介` | `summary` |
| `imageUrl` | `imageUrl` |
| `hasLocalImage` | `hasLocalImage` |
| `领域1` | `domain1` |
| `领域2` | `domain2` |
| `起始生命` | `startingHitPoints` |
| `起始闪避` | `startingEvasion` |
| `起始物品` | `startingItems` |
| `希望特性` | `hopeFeature` |
| `职业特性` | `classFeature` |

#### `ancestries`

`ancestry[]` 映射为 `ancestries[]`。字段映射如下：

| Legacy Card Format | Card Pack Internal Validation Schema |
| --- | --- |
| `id` | `id` |
| `名称` | `name` |
| `种族` | `ancestry` |
| `简介` | `summary` |
| `效果` | `effect` |
| `类别` | `category` |
| `imageUrl` | `imageUrl` |
| `hasLocalImage` | `hasLocalImage` |

#### `communities`

`community[]` 映射为 `communities[]`。字段映射如下：

| Legacy Card Format | Card Pack Internal Validation Schema |
| --- | --- |
| `id` | `id` |
| `名称` | `name` |
| `特性` | `feature` |
| `简介` | `summary` |
| `描述` | `description` |
| `imageUrl` | `imageUrl` |
| `hasLocalImage` | `hasLocalImage` |

#### `subclasses`

`subclass[]` 映射为 `subclasses[]`。字段映射如下：

| Legacy Card Format | Card Pack Internal Validation Schema |
| --- | --- |
| `id` | `id` |
| `名称` | `name` |
| `描述` | `description` |
| `imageUrl` | `imageUrl` |
| `hasLocalImage` | `hasLocalImage` |
| `主职` | `class` |
| `子职业` | `subclass` |
| `等级` | `level` |
| `施法` | `spellcastTrait` |

#### `domains`

`domain[]` 映射为 `domains[]`。字段映射如下：

| Legacy Card Format | Card Pack Internal Validation Schema |
| --- | --- |
| `id` | `id` |
| `名称` | `name` |
| `领域` | `domain` |
| `描述` | `description` |
| `imageUrl` | `imageUrl` |
| `hasLocalImage` | `hasLocalImage` |
| `等级` | `level` |
| `属性` | `trait` |
| `回想` | `recallCost` |

#### `variants`

`variant[]` 映射为 `variants[]`。字段映射如下：

| Legacy Card Format | Card Pack Internal Validation Schema |
| --- | --- |
| `id` | `id` |
| `名称` | `name` |
| `类型` | `type` |
| `子类别` | `subCategory` |
| `等级` | `level` |
| `效果` | `effect` |
| `imageUrl` | `imageUrl` |
| `hasLocalImage` | `hasLocalImage` |
| `简略信息` | `summaryItems` |

Legacy `RawVariantCard` 曾在 TypeScript 类型上允许任意扩展字段，但现有 runtime import 不消费这些字段。Internal validation schema 不继承任意扩展字段能力；legacy 输入可以容忍未知字段并 warning 后丢弃。

**不负责**

- 不定义 runtime store shape。
- 不定义 editor draft-only recovery shape。
- 不把 v1 设为编辑器默认导出格式。
- 不负责兼容旧中文字段；旧格式兼容归 Legacy Card Adapter。

**目标 Interface**

- Card Pack Internal Validation Schema：用于测试和 workflow validation。
- Non-default v1 import schema：`daggerheart.card-pack.v1`，外部 payload 可以直接使用；编辑器默认仍导出 Legacy Card Format。
- Future default export schema：Public Release Gate 通过后才可替换默认导出目标。
- 用于验证兼容性的 fixtures，覆盖已发布示例和 legacy edge cases。

**设计约束**

- Schema 必须使用英文字段，并与装备包 validation schema 风格保持一致。
- `format: "daggerheart.card-pack.v1"` 是 recognized forward input；未识别的外部 `format` 是 blocking error，不允许按 Legacy Card Format 尝试导入。
- Internal validation schema 中 character class 卡牌分组应命名为 `classes`；`profession` 只作为 Legacy Card Format 的旧字段由 Adapter 接入。
- Internal validation schema 应保持 legacy 的顶层分组数组结构，只做字段英文命名和术语修正；第一阶段不引入 `cards.{group}` 包装层，也不摊平成单一 cards array。
- Internal validation schema 的单卡属性名也必须全英文；中文属性名不得穿透到 Structural Validation、Card Pack Import Model 或 Semantic Validation。
- Internal validation schema 应拒绝未知字段；schema 未声明的字段是 structural blocking error。
- Legacy Card Adapter 可容忍未知 legacy 字段，但必须 warning 并丢弃，不能把任意扩展字段带进 internal validation schema。
- 现有已发布材料必须能通过 Legacy Card Adapter 后验证通过。
- Schema 不应允许中文 legacy 字段直接穿透到公开英文契约中。
- Contract error 应足够稳定，可以支持 UI 映射和指南反馈。
- Definitions 在未来公开契约中应为 optional；缺失 definitions 不应在 structural validation 阶段直接阻止导入。

## Module 2: Source Intake Module

**当前代码**

- `components/content-pack-manager/import-content-pack.ts`
- `card/utils/dhcb-importer.ts`
- `app/card-editor/utils/zip-import.ts`
- `app/card-editor/utils/import-export.ts`

**责任**

这个 Module 负责判断用户提供了什么文件，并读取成 neutral source object。它处理文件扩展名、MIME 不确定性、zip 结构和 image asset 发现。

**不负责**

- 不验证卡牌语义。
- 不修改 card store。
- 不向 IndexedDB 写入图片。

**目标 Interface**

```ts
type CardImportSource =
  | {
      kind: "legacy-json";
      fileName: string;
      rawText: string;
    }
  | {
      kind: "legacy-dhcb";
      fileName: string;
      cardsJsonText: string;
      manifestJsonText?: string;
      imageAssets: CardImportImageAsset[];
    };
```

**设计约束**

- `.json` 和 `.dhcb` 在 source reading 之后应该进入同一个下游 workflow。
- 图片文件只在这里被发现和命名；orphan image policy 属于后续 workflow diagnostics。
- 这个 Module 不应该假设 localStorage 或 unified card store 存在。

## Module 3: External Format Adapter Module

**当前代码**

- `card/type-validators.ts`
- `app/card-editor/utils/import-export.ts`
- `app/card-editor/utils/zip-import.ts`
- `card/stores/store-actions.ts`

**责任**

这个 Module 接收 Legacy Card Format 和现有 authoring conveniences，然后产出用于 Structural Validation 的英文 authoring shape。

Adapter 需要处理的例子：

- 把 legacy 中文字段名翻译成 internal validation schema 字段。
- 从卡牌内容推导 effective definitions，并与显式 `customFieldDefinitions` 合并。
- 为当前编辑器期望的 ancestry paired cards 补齐成对卡牌。
- 为当前编辑器期望的 subclass foundation、specialization、mastery 三段结构补齐卡牌。
- 规范化当前 import helpers 已接受的 variant authoring shorthand。
- 按现有导入行为 trim 或 default 可选 metadata。

**不负责**

- 不检查已安装包冲突。
- 不向 runtime store 写入卡牌。
- 不决定 storage ID。

**目标 Interface**

```ts
type AdaptedLegacyCardPackInput = {
  metadata: CardPackAuthoringMetadata;
  groups: EnglishCardAuthoringGroups;
  diagnostics: CardImportDiagnostic[];
};
```

**设计约束**

- 这是 legacy 中文字段被翻译或隔离的边界。下游 Structural Validation、Import Model 和 Semantic Validation 应使用英文 domain names。
- Adapter 必须同时处理顶层分组映射和单卡属性映射，例如 `profession` -> `classes`、`名称` -> `name`、`描述` -> `description`。
- Adapter diagnostics 可以包含 warnings；为了兼容而自动修复的内容不应该阻止导入。
- 在移动现有 helper logic 前，必须先用 fixtures 锁住行为。
- Effective definitions 的合并顺序必须明确：先从卡牌内容推导，再用显式 `customFieldDefinitions` 补充；如果两者表达的结构化 metadata 冲突，应产出 diagnostic。

## Module 4: Structural Validation Module

**当前代码**

- `card/type-validators.ts`
- 内部阶段 schema：card import module 或 test fixtures 下的 internal schema path。
- 公开发布阶段 schema：`public/schemas/` 下的英文 card pack schema，具体文件名后续决策。

**责任**

这个 Module 验证 adapted raw input 是否拥有预期 JSON shape。它应该 schema-first，用 TypeScript wrapper 把 schema errors 转换成 application diagnostics。

**不负责**

- 不检查引用的领域、class 或卡牌 ID 是否存在于当前 app state。
- 不检测 pack conflicts。
- 不修改被导入的 payload。

**目标 Interface**

```ts
type StructuralValidationResult =
  | { ok: true; value: CardPackAuthoringInput }
  | { ok: false; diagnostics: CardImportDiagnostic[] };
```

**设计约束**

- Schema validation 必须接受 Legacy Card Adapter 输出的所有已发布示例。
- Error path 应尽量使用稳定的 JSON pointer-like location。
- UI 不应该解析 raw validator strings。
- Structural validation 只检查 `customFieldDefinitions` 的形状；不要求它完整列出所有被引用关键词。
- 对 Card Pack Internal Validation Schema 输入，schema 未声明的字段必须产生 blocking diagnostic。
- 对 Legacy Adapter 输出，未知 legacy 字段已经在 Adapter 边界被 warning 并丢弃，不应再进入 Structural Validation。

## Module 5: Dry-run Validation Model Module

**当前代码**

- `card/stores/store-actions.ts`
- `card/card-types.ts`
- `lib/card/standardize-card-fields.ts`

**责任**

这个 Module 定义只在 dry-run 导入流程中使用的保守内部模型。它不是新的公开契约，也不是 runtime card view、storage draft 或 final commit plan 的替代品。

模型应该表达：

- Pack metadata。
- 按领域分类的 card groups。
- 安装前的 card identity。
- 通过 imported card ID 关联的可选 image references。
- adapter 和 validation 过程中累积的 diagnostics。

**不负责**

- 不暴露 storage-specific `BatchData`。
- 不暴露 UI-specific grouped store state。
- 不成为公开的 `v1` schema。
- 不做 storage/runtime normalization。

**目标 Interface**

```ts
type CardPackDryRunValidationModel = {
  metadata: CardPackImportMetadata;
  cards: CardPackImportCard[];
  imageAssets: CardImportImageAsset[];
  diagnostics: CardImportDiagnostic[];
};
```

**设计约束**

- 模型应尽量贴近英文 authoring shape，以降低 schema、adapter 和 semantic validation 之间的映射风险。
- Runtime-only computed fields 应在 commit 后构建，而不是存进这里。
- 中文 legacy fields 不应越过这个边界，除非它们是领域内容值，而不是变量名或属性名。

## Module 6: Semantic Validation Module

**当前代码**

- `card/type-validators.ts`
- `card/stores/store-actions.ts`
- `card/stores/card-store-utils.ts`

**责任**

这个 Module 在 structural validation 和 dry-run validation model 构建之后验证卡牌语义。

例子：

- 不同 card type 的 required fields。
- 有效的 card type 和 group membership。
- 导入包内部重复 ID。
- 不把 ancestry pair / subclass triple 张数作为 formal import blocking rule。
- image references 是否指向导入包中的卡牌。
- Effective definitions 与卡牌引用的一致性。

**不负责**

- 不与已经安装的 packs 比较。
- 不读取 current imported card storage。
- 不修改持久化 storage。
- 不重建 runtime indexes。

**目标 Interface**

```ts
type SemanticValidationResult =
  | { ok: true; model: CardPackImportModel }
  | { ok: false; diagnostics: CardImportDiagnostic[] };
```

**设计约束**

- 现有成功导入的材料应继续成功，除非它依赖的是团队明确决定不再支持的 bug。
- Diagnostics 应包含 code、severity、location、message。
- Diagnostics severity 应遵循三档边界：blocking error 阻止 dry run 成功；warning 允许继续但报告兼容处理或内容丢弃；info 只记录流程事实。
- Validator 应能在不依赖 React stores 的情况下做 unit test。
- definitions 缺失本身不应成为 semantic error；只有无法从卡牌内容或显式 definitions 建立有效引用关系时才报错。

## Module 7: Conflict And Staging Module

**当前代码**

- `card/stores/store-actions.ts`
- `components/content-pack-manager/import-content-pack.ts`

**责任**

这个 Module 把已验证的 import model 与当前已安装卡牌包上下文比较，并产出 staged import data。

例子：

- Pack ID/name conflict detection。
- Card ID collision detection。
- Batch metadata conflict detection。
- 给 UI 使用的 import preview。

**不负责**

- 不写 storage。
- 不解析文件。
- 不关心 storage 是 localStorage、IndexedDB 还是 backend。

**目标 Interface**

```ts
type CardImportConflictContext = {
  installedPackIds: Set<string>;
  installedCardIds: Set<string>;
};

type StagedCardPackImport = {
  model: CardPackImportModel;
  commitPlan: CardPackCommitPlan;
  diagnostics: CardImportDiagnostic[];
};
```

**设计约束**

- Conflict policy 必须保留当前行为，除非后续 implementation plan 明确决定调整。
- UI conflict messages 应从 diagnostics 生成，而不是依赖 ad hoc thrown strings。

## Module 8: Commit Adapter Module

**当前代码**

- `card/stores/store-actions.ts`
- `card/stores/card-store-initial-state.ts`
- `card/stores/card-store-types.ts`

**责任**

这个 Module 把 staged import data 转换成当前 storage/runtime write shape。它是桥接层，让新 workflow 可以先落地，而不必立刻迁移所有卡牌 storage。

**不负责**

- 不解析导入文件。
- 不做公开契约验证。
- 不拥有长期 storage interface。

**目标 Interface**

```ts
type CardPackCommitPlan = {
  batch: ImportedCardBatchDraft;
  cards: ImportedCardDraft[];
  images: CardImportImageAsset[];
};
```

**设计约束**

- 第一版实现应继续写入现有 custom card structures。
- Adapter 应让 storage coupling 显性化、可移除，而不是继续把它藏在 import validation 内部。
- 当 Repository Port 足够稳定后，这个 Module 可以缩小，甚至最终消失。

## Module 9: Card Pack Application Service Module

**当前代码**

- `card/stores/store-actions.ts`
- 装备参考：`equipment/packs/application-service.ts`

**责任**

这个 Module 负责编排完整的 card pack install、remove、enable、disable workflow。它应该成为 UI 和 editor code 面向的 caller-facing API。

例子：

- 从 prepared source 导入。
- Dry-run validation。
- Commit staged import。
- Remove imported batch。
- Enable 或 disable imported batch。
- Storage transaction 成功后触发 runtime read model rebuild。

**不负责**

- 不渲染 UI。
- 不包含 schema details。
- 不直接调用 browser storage APIs。

**目标 Interface**

```ts
type CardPackApplicationService = {
  importFromSource(source: CardImportSource): Promise<CardImportResult>;
  dryRunImport(source: CardImportSource): Promise<CardImportPreview>;
  removePack(packId: string): Promise<CardPackMutationResult>;
  setPackEnabled(packId: string, enabled: boolean): Promise<CardPackMutationResult>;
};
```

**设计约束**

- UI modules 应调用这个 service，而不是触达 store internals。
- Service 应接收 repository 和 pipeline dependencies，使测试不依赖 localStorage 或 IndexedDB。
- Result mapping 对 content pack manager integration 应保持稳定。

## Module 10: Repository And Persistence Adapter Module

**当前代码**

- `card/stores/store-actions.ts`
- `card/stores/card-store-types.ts`
- 编辑器和 `.dhcb` 导入路径使用的 IndexedDB image helpers。

**责任**

这个 Module 拥有 imported card packs 和 imported card images 的 durable persistence。第一版 Implementation 可以继续使用 localStorage 和 IndexedDB，但调用方应该依赖 Repository Interface，而不是依赖具体 storage。

**不负责**

- 不验证 card pack JSON。
- 不决定 import conflict policy。
- 不自己重建 runtime read models。

**目标 Interface**

```ts
type CardPackRepository = {
  listImportedPacks(): Promise<ImportedCardBatch[]>;
  saveImportedPack(plan: CardPackCommitPlan): Promise<ImportedCardBatch>;
  removeImportedPack(packId: string): Promise<void>;
  setImportedPackEnabled(packId: string, enabled: boolean): Promise<void>;
};
```

**设计约束**

- Repository writes 应在 application service 层体现 transaction-like 语义。
- 图片不应早于 card pack commit point 被写入。
- Interface 应让未来 backend implementation 可以接入，而不需要修改 parser 和 validator modules。

## Module 11: Runtime Read Model Module

**当前代码**

- `card/stores/store-actions.ts`
- `card/stores/card-store-utils.ts`
- `lib/card/card-helpers.ts`

**责任**

这个 Module 构建 selection UI 和 character sheets 消费的 runtime card views。它应该从 built-in cards 加 enabled imported packs 派生 indexes。

**不负责**

- 不解析导入文件。
- 不定义公开 pack JSON。
- 不持久化 imported packs。

**目标 Interface**

```ts
type CardRuntimeReadModelBuilder = {
  rebuild(input: CardRuntimeSourceData): CardRuntimeReadModel;
};
```

**设计约束**

- Runtime read model rebuild 应该 deterministic 且可测试。
- Disable 一个 pack 应影响 runtime availability，但不能破坏 stored imported pack data。
- 在 import modules 抽离期间，read model 可以继续保持当前 UI-facing shape。

## Module 12: Editor Import Recovery Module

**当前代码**

- `app/card-editor/utils/import-export.ts`
- `app/card-editor/utils/zip-import.ts`

**责任**

这个 Module 拥有宽松的 editor draft round-trip 行为。它可以接受 draft-like 或 authoring-friendly inputs，也可以在导出时写出当前 draft 状态；这些动作的目标是继续编辑，不是证明内容可安装。

Editor Draft Validation 必须作为独立动作存在。它将当前 draft 序列化为目标 payload，并调用 formal import workflow 的 dry-run 来判断这个包是否可安装，参考装备包编辑器当前做法。它还可以合并 editor-local authoring diagnostics，用来提示编辑器正规化问题，例如 ancestry 必须两张一组、subclass 必须三张一组。

**不负责**

- 不成为 installed packs 的 canonical validator。
- 不直接写 imported pack runtime storage。
- 不静默偏离公开契约规则。

**目标 Interface**

```ts
type CardEditorImportRecovery = {
  recoverDraft(source: CardImportSource): Promise<CardEditorRecoveredDraft>;
  exportDraft(draft: CardEditorRecoveredDraft): Promise<CardEditorDraftExport>;
  validateDraft(draft: CardEditorRecoveredDraft): Promise<CardImportPreview>;
};
```

**设计约束**

- Editor conveniences 应继续为 authoring round-trip 保留。
- Editor import 和 export 可以比 formal import 更宽松，因为导出的文件可能用于重新导入编辑器，而不是直接安装使用。
- Editor validation 必须与 formal import workflow 共享 dry-run，不再维护第二套 installability validation rules。
- Editor-local authoring diagnostics 可以比 formal import 更严格，但不能改变 formal import 的 blocking rules。
- Export 不隐式执行 validation；validation 是独立用户动作。
- Editor image recovery 不应在 validation 成功前清空或覆盖 installed pack images。
- Editor recovery 不能绕过 formal import workflow 完成安装。

## Module 13: UI Composition Modules

**当前代码**

- `components/content-pack-manager/import-content-pack.ts`
- `components/content-pack-manager/` 下的 card pack management UI。
- `app/card-editor/` 下的 card editor import/export UI。

**责任**

UI modules 只应该围绕 application service 组织用户交互：选择文件、展示 preview、展示 diagnostics、确认导入、展示结果。

**不负责**

- UI 不深度解析 card JSON。
- UI 不知道 storage implementation details。
- UI 不复制 import validation rules。

**目标 Interface**

UI 调用应流向 `CardPackApplicationService`，并渲染结构化 result objects：

```ts
type CardImportResult = {
  ok: boolean;
  importedPackId?: string;
  diagnostics: CardImportDiagnostic[];
  summary: CardImportSummary;
};
```

**设计约束**

- 当前 content pack manager 行为应对用户保持可识别。
- Error mapping 应结构化、稳定。
- UI copy 可以后续改进，但这次重构应先保持行为。

## 依赖方向

目标依赖方向如下：

```text
UI
  -> Application Service
    -> Source Intake
    -> Import Workflow
      -> Legacy Adapter
      -> Structural Validation
      -> Dry-run Validation Model
      -> Semantic Validation
      -> Conflict And Staging
    -> Repository
    -> Runtime Read Model Builder
```

Lower-level modules 不应该 import React stores、UI components 或具体 browser storage implementation，除非它本身就是明确的 persistence adapter。

## 横切约束

这些约束适用于所有 Module：

- 保留现有导入兼容性。
- 公开契约规则与 storage implementation details 分离。
- 优先使用 structured diagnostics，而不是 thrown strings。
- 中文字段名只保留在 Legacy Card Adapter 的输入边界或领域内容值中。
- Storage adapters 必须可替换。
- Runtime read models 是 derived view，不是 authoritative source。
- Validation 和 conflict checks 完成前，不写入图片或卡牌。
- 每个 Module 都应能脱离 browser UI 测试。

## 迁移切片

### Slice 1: Contract Fixtures And Schema

为当前已发布示例和当前 editor export outputs 建立 fixture tests。添加 Card Pack Internal Validation Schema，并验证这些 fixtures 经过 Legacy Card Adapter 后可以通过 schema。

这个 Slice 不改变 runtime behavior，也不对外发布 schema。它建立后续切片必须遵守的兼容性基线。

### Slice 2: Source Intake Extraction

把 JSON 和 `.dhcb` 读取抽到 Source Intake Module。现有 UI caller 可以在 source reading 后继续调用旧的 store import action。

目标是把 zip parsing 和 file routing 从 store mutation 中分离出来。

### Slice 3: Legacy Adapter And Structural Validation

把 legacy authoring normalization 和 schema validation 从 store actions 中迁出。返回 structured diagnostics，同时保留当前成功导入行为。

目标是把 legacy compatibility behavior 隔离到一个 Module 中。

### Slice 4: Dry-run Validation Model And Semantic Validation

引入 dry-run validation model，并把 semantic checks 移到 pure workflow functions。

目标是让 import validation 可以在不依赖 localStorage、IndexedDB 或 React stores 的情况下测试。

### Slice 5: Conflict And Staged Commit Plan

把 installed-pack conflict checks 移到 staging module。该 module 只消费小型 installed-pack context。

目标是在任何 durable writes 发生前产出 commit plan。

### Slice 6: Commit Adapter Over Existing Storage

把 staged imports 转换成当前 custom card batch structures，并通过现有 storage mechanism 写入。

目标是在不做高风险 storage migration 的前提下落地新 workflow。

### Slice 7: Application Service And Repository Port

把 import、remove、enable、disable 编排从 store actions 移到 application service，并通过 repository interface 访问 storage。

目标是把 feature logic 与 localStorage 解耦，为未来 backend adapter 留出空间。

### Slice 8: Runtime Read Model Rebuild Boundary

把 runtime index rebuilding 抽到独立 read model builder。

目标是让 imported pack data 成为 storage authority，让 runtime indexes 成为 derived views。

### Slice 9: Editor Recovery Alignment

让 editor import/export utilities 保留宽松 draft round-trip，同时让 editor validation 复用 formal import dry-run。

目标是让 editor validation 与 formal install validation 对齐，但不移除 authoring conveniences，也不把 validation 隐式塞进 export action。

### Slice 10: UI Rewire And Error Mapping

改造 content pack manager 和 card editor UI，使它们调用 application service，并渲染 structured diagnostics。

目标是移除 UI 对 store internals 和 ad hoc error strings 的直接依赖。

### Slice 11: Public Release Package

在完整导入链路稳定后，一次性发布公开材料。

发布内容包括：

- `public/schemas/` 下的英文 card pack schema，具体文件名和 `format` identifier 在 Public Release Gate 决策。
- 用户指南更新。
- AI 生成提示词更新。
- 示例包更新。
- Changelog 或 release note。
- UI 中对结构化错误和导入能力的用户可见说明。

目标是让公开契约、文档、示例和实际导入行为在同一个 release 中对齐。

## 测试策略

测试应跟随 Module 边界：

- Validation contract tests：验证所有已发布示例经过 Legacy Card Adapter 后符合 Card Pack Internal Validation Schema。
- Source intake tests：覆盖 `.json`、`.dhcb`、缺失 `cards.json`、可选 `manifest.json`、image asset discovery、orphan image reporting inputs。
- Adapter tests：覆盖 legacy authoring conveniences 和旧中文字段。
- Structural validation tests：覆盖 schema errors 和稳定 diagnostic paths。
- Semantic validation tests：覆盖重复 ID、required fields 缺失、card type grouping、effective definitions、image references；确认 formal import 不因 ancestry pair / subclass triple 张数不足失败。
- Editor validation tests：覆盖 formal dry-run diagnostics 与 editor-local authoring diagnostics 的合并，尤其是 ancestry pair rules 和 subclass triple rules。
- Conflict staging tests：后续阶段覆盖 installed pack ID conflicts 和 card ID collisions。
- Commit adapter tests：验证输出仍兼容当前 batch storage。
- Repository tests：验证 localStorage 和 IndexedDB adapter behavior。
- Application service tests：验证 transaction ordering 和 runtime rebuild triggers。
- UI tests：关注 result mapping，而不是 validation internals。

## 初始实施优先级

第一份 implementation plan 建议只覆盖 Slice 1 到 Slice 4。

原因：

- 它们先建立兼容性安全网。
- 它们先抽离最深的导入逻辑，再改变 storage。
- 它们降低后续 repository 和 UI rewiring 的风险。
- 它们能立即让公开契约结构化，同时不改变公开契约。

Slice 5 到 Slice 10 应在 Slice 1 到 Slice 4 通过真实 fixtures 和现有第三方材料验证后再进入规划。Slice 11 只应在完整导入链路稳定后执行。

## 设计风险

1. **Store actions 中可能存在隐藏兼容行为**

   某些导入可能依赖 `store-actions.ts` 中隐式 cleanup、defaults 或 conversion。移动行为前必须先加 fixture coverage。

2. **Editor draft round-trip 与 formal install 的容错等级不同**

   编辑器可能需要继续接受或导出 formal import 会拒绝的 draft-like input。方案保留独立的 editor draft import/export recovery，同时通过 shared dry-run validation 判断 installability。

3. **图片写入当前可能早于完整 workflow 成功**

   重构应把图片纳入 commit plan，避免失败导入留下 partial durable state。

4. **公开 schema 可能暴露未文档化但已被接受的行为**

   如果当前导入接受指南没有写明的行为，团队需要决定：把它记录成 legacy-compatible，还是只作为 adapter-only compatibility 保留。

## 待评审问题

1. 第一份 implementation plan 是否只包含 Slice 1 到 Slice 4，还是加入 Slice 5，让 conflict staging 也先于 commit adapter 被抽离？
2. Editor import recovery 是否进入第一轮 implementation wave，还是等 formal import workflow 稳定后再处理？
3. Public Release Gate 的验收条件是否需要单独写成 checklist，例如 fixture 覆盖率、UI 路径验证、旧 `.dhcb` 验证和文档一致性检查？
