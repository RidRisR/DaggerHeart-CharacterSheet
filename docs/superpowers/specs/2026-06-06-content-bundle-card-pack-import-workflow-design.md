# Content Bundle and Card Pack Import Workflow Design

日期：2026-06-06
状态：Obsolete / 历史探索记录

> 本文已过时，不再作为当前分支的实施设计依据。
>
> 当前分支设计已重写到：
>
> `docs/superpowers/specs/2026-06-06-content-bundle-editor-and-thin-dhcb-design.md`
>
> 本文保留为历史讨论记录，包含已经放弃或延期的方向，例如 card pack import workflow modernization、Legacy Published Format JSON Schema、Card Pack Data v2、完整 index-last atomic commit 等。后续不要继续在本文中细化当前分支方案。

## 背景

装备包导入已经形成了较清晰的 workflow：公开契约、结构化 diagnostics、normalize、semantic validation、conflict check、storage transaction 和 runtime cache build。相比之下，卡牌包导入历史更长，牵涉 `.json`、`.dhcb`、`.zip`、图片、编辑器导入、内容包管理页导入、旧 batch store、variant 兼容处理、种族双卡补全、子职业三卡补全等多个路径。

本设计把范围收窄到“内容进入系统之前”的导入 workflow。卡牌包进入现有系统后的 store、runtime read model、localStorage key、disabled batch 语义和选择弹窗暂不重构。

同时，`.dhcb` 不再只被视为“带图片的卡牌包”。新方向是把 `.dhcb` 升级为可同时包含卡牌包和装备包的内容容器。完整实现阶段应支持单个 `.dhcb` 内部原子导入；当前分支的薄版 reader 先保证 manifest 结构不阻碍后续原子提交。

## 当前方向锁定

当前分支工作只推进到阶段二：

1. **卡牌编辑器增加装备编辑能力**：复用已经完成的 equipment pack schema / import workflow / storage 设计，让作者能在现有创作入口同时维护卡牌包和装备包草稿。
2. **薄版 Content Bundle v1 / 新 DHCB 容器**：让 `.dhcb` 可以显式包含 legacy card pack payload、equipment pack payload 和资源映射。混合卡牌与装备本身就是旧版本不支持的新能力，因此这里引入新 manifest 是合理的不兼容点。

当前分支可以继续复用现有 `/card-editor` 路由和大部分编辑器基础设施，但产品概念应升级为 **Content Pack Editor / 内容包编辑器**。它编辑的是 **Content Pack Draft / 内容包草稿**，草稿可以只包含卡牌、只包含装备，或同时包含两者。

当前明确不做：

- 不近期落地 `daggerheart.card-pack.v1`。
- 不把 future v1 当作 internal v1 实现。
- 不迁移卡牌 storage 到 Card Pack Data v2。
- 不在当前分支重构现有卡牌导入 workflow。
- 不在当前分支发布 Legacy Published Format JSON Schema。
- 不让 editor 默认导出旧版本不可读的 card-only pack。
- 不用 card pack v1 解决 `hasLocalImage` / 图片文件名绑定问题。

`daggerheart.card-pack.v1` 只保留为未来国际化或全新生态阶段的 deferred exploration。关于官方术语、字段命名和卡型结构的讨论仍有参考价值，但不能进入近期实现路线。

下一步细化顺序：

1. 定义卡牌编辑器内装备编辑的状态结构、界面入口、导入导出行为。
2. 定义 `daggerheart.content-bundle.v1` manifest 的最小字段、entry 结构和 resource binding。
3. 定义 card image asset mapping，替代 legacy `hasLocalImage` 默认要求图片文件名等于 card id 的行为。
4. 明确薄版 Content Bundle v1 如何复用现有 card JSON / legacy DHCB 导入和 equipment import workflow。

## 目标

- 在卡牌编辑器中增加装备包编辑能力。
- 定义薄版 `.dhcb` content bundle 格式，可包含卡牌包、装备包和显式资源映射。
- 复用现有卡牌导入路径和装备导入 workflow，避免当前分支重构卡牌导入。
- 保留现有卡牌包导入后的旧工作流和 storage 形态。
- 明确 Legacy Published Format 继续作为近期公开卡包契约；card-only export 默认继续输出 legacy-compatible JSON / DHCB。
- 新 content bundle 应提供 bundle-level preflight；原子提交能力可以随薄版实现分阶段落地。
- 继续兼容 legacy `.dhcb`：根目录 `cards.json` + `images/*`。
- 为后续装备编辑器和内容包创作工作流提供统一导入前校验能力。

## 非目标

- 不迁移现有卡牌 localStorage keys。
- 不重写 `unified-card-store` 的运行时读模型。
- 不修改卡牌选择弹窗的查询方式。
- 不改变现有 batch disabled 语义。
- 不在本阶段把卡牌包 storage 完整改造成 equipment pack repository。
- 不要求旧 `.dhcb` 文件升级为新 content bundle。
- 不在第一版支持 bundle 内多个卡牌包或多个装备包。
- 不为装备包引入图片资源。
- 不在当前分支落地新的 card-only public schema、internal v1、Card Pack Data v2、storage migration、Legacy Published Format JSON Schema 或卡牌导入 workflow modernization。

## 领域语言

**Content Bundle**：
一个容器文件，通常使用 `.dhcb` 扩展名，内部可包含一个或多个 content pack 及其资源。第一版支持 card pack 和 equipment pack。

**Legacy DHCB**：
旧版 `.dhcb` / `.zip` 卡牌包格式。根目录包含 `cards.json`，可选包含 `manifest.json` 和 `images/*`。

**Content Bundle v1**：
新版 `.dhcb` 容器格式，`manifest.json.format` 固定为 `daggerheart.content-bundle.v1`。

**Bundle Entry**：
Content Bundle manifest 中声明的一项内容。第一版允许 `card-pack` 和 `equipment-pack`。

**Atomic Bundle Import**：
完整 Content Bundle 实现中的全有或全无导入语义。任一 entry preflight、commit、asset write、index update 或 runtime rebuild 失败，整个 bundle 必须回滚为导入前状态。当前分支只要求 manifest / reader 设计不阻碍后续实现该语义。

**Index-last Commit**：
先写入 pack data / batch data / assets，最后写入 index。index 是内容可见性开关，runtime 读取必须从 index 出发。

**Preflight**：
导入前检查阶段。只解析、校验、normalize、做冲突检查和构建 commit plan，不写入持久化数据。

**Content Pack Editor**：
内容创作入口。当前分支复用现有 `/card-editor`，但概念上不再只服务 card pack；它可以编辑 card pack draft、equipment pack draft，并在同时包含两者时导出 content bundle。

**Content Pack Draft**：
编辑器中的未发布草稿状态。它不是已导入的 stored pack，也不是 runtime pack；它可以包含 card pack draft、equipment pack draft 或两者。

**Deferred Card Pack Public Schema**：
暂缓的未来卡牌包 JSON 契约探索。`daggerheart.card-pack.v1` 当前不作为近期实现目标、默认导出格式或 card-only 分发格式。

**Legacy Published Format JSON Schema**：
对已经发布的 legacy card pack JSON / legacy DHCB `cards.json` / current editor export 的公开 JSON Schema 描述。它标准化老格式，不创建新格式。

**Legacy Source Adapter**：
把历史卡牌包 JSON、legacy DHCB `cards.json` 或当前编辑器导出格式转换到 Card Pack Import Model 的 adapter。

**Card Pack Import Model**：
卡牌导入 workflow 内部使用的 staging shape。它只服务 structural validation、normalization、semantic validation、conflict check 和 commit plan，不是 public schema、不是 editor authoring model、不是 storage authority，也不是 future v1 的提前实现。

**Card Pack Data Authority**：
持久化中代表卡牌包内容事实来源的数据。未来应保存 normalized card pack data，而不是只保存 `StandardCard` runtime view。

**Runtime Card View**：
由 Card Pack Data Authority 派生出的运行时读模型。当前主要是 `StandardCard` / `ExtendedStandardCard`，用于选择、筛选和展示，不应作为未来公开契约。

## 新 DHCB 容器格式

新 `.dhcb` 仍然是 zip 文件。推荐结构：

```text
manifest.json
cards/
  cards.json
equipment/
  equipment.json
assets/
  cards/
    brave-cover.webp
    wolf-form.png
```

`manifest.json` 示例：

```json
{
  "format": "daggerheart.content-bundle.v1",
  "name": "Example Content Bundle",
  "version": "1.0.0",
  "author": "Author",
  "description": "Cards and equipment for a campaign.",
  "entries": [
    {
      "id": "cards",
      "kind": "card-pack",
      "format": "daggerheart.card-pack.legacy",
      "path": "cards/cards.json",
      "assets": [
        {
          "role": "card-image",
          "cardId": "warrior-brave-foundation",
          "path": "assets/cards/brave-cover.webp"
        },
        {
          "role": "card-image",
          "cardId": "druid-wolf-form",
          "path": "assets/cards/wolf-form.png"
        }
      ]
    },
    {
      "id": "equipment",
      "kind": "equipment-pack",
      "format": "daggerheart.equipment-pack.v1",
      "path": "equipment/equipment.json"
    }
  ]
}
```

第一版限制：

- `entries` 至少包含一个 entry。
- 每个 entry 必须有 `id`，且在 bundle 内唯一。
- 最多一个 `card-pack` entry。
- 最多一个 `equipment-pack` entry。
- `card-pack.path` 必须指向卡牌包 JSON。
- `card-pack.format` 第一版固定为 `daggerheart.card-pack.legacy`。
- `card-pack.assets[]` 可选；存在时只用于显式绑定卡牌本地图片。
- `card-pack.assets[].role` 第一版只定义 `card-image`。
- `card-pack.assets[].cardId` 必须引用卡牌包 payload 中存在的 card id。
- `card-pack.assets[].path` 必须指向 bundle 内存在的文件。
- `card-pack.assets[]` 不要求图片文件名等于 card id。legacy `hasLocalImage` / id 文件名规则只属于 legacy DHCB 兼容路径。
- `equipment-pack.path` 必须指向 `format: "daggerheart.equipment-pack.v1"` 的装备包 JSON。
- `equipment-pack.format` 第一版固定为 `daggerheart.equipment-pack.v1`。
- 所有 path 必须是相对路径，不能包含 `..`，不能是绝对路径。
- 不支持 entry 间显式依赖声明。

## 文件识别

`.json`：

- `format === "daggerheart.equipment-pack.v1"`：走装备包导入 workflow。
- 符合卡牌包结构：走卡牌包导入 workflow。
- 否则返回 unknown content pack diagnostic。

`.dhcb` / `.zip`：

- 有 `manifest.json` 且 `format === "daggerheart.content-bundle.v1"`：走新 content bundle workflow。
- 没有新 manifest，但根目录有 `cards.json`：走 legacy DHCB card-pack workflow。
- 其他情况返回 unknown content bundle diagnostic。

## 已决策方向

- 近期不推出新的 card-only public schema；Legacy Published Format 继续作为公开卡包契约。
- `daggerheart.card-pack.v1` 只保留为 deferred exploration，不作为默认导出格式、card-only 分发格式或第一阶段实现目标。
- 卡牌导入重构的核心目标是规范旧格式导入 workflow：source read、format detection、adapter、diagnostics、validation、normalize、conflict check、atomic commit。
- `version` 是作者自定义内容版本字符串，不要求 semver；装备包后续也应对齐这一规则。
- 第一阶段不实现 card pack storage v2，只要求 prepare / commit 设计不要把 legacy batch data 写死。
- Bundle 不成为 runtime pack id。card pack 和 equipment pack 各自生成自己的 storage identity。
- Bundle metadata 作为 source metadata 保留；列表主名称优先显示 entry pack name，详情中展示 bundle name / source file。
- 新 content bundle 内是否允许 legacy card JSON 属于兼容性矩阵细节，后续与 legacy JSON、legacy DHCB、editor export 一起细化。

## Card Pack Format Strategy

当前不推出新的 card-only public schema。`daggerheart.card-pack.v1` 的字段设计已降级为 deferred exploration：

```text
docs/superpowers/specs/2026-06-06-card-pack-public-schema-v1-design.md
```

由于旧中文字段 card pack JSON、legacy DHCB `cards.json` 和当前 editor export 已经对外发布，它们应被视为 **Legacy Published Format**，不是可以随意丢弃的内部遗留实现。

卡牌格式长期方向仍然是：

1. **Legacy Published Format import workflow modernization**。
2. **Legacy Published Format JSON Schema**，把老格式从“文档描述”提升为可校验的公开契约。

但这两项已降级为当前分支之后的未来方向。当前分支只要求薄版 Content Bundle v1 继续使用 legacy card pack payload，并复用现有卡牌导入路径。它不是替换公开卡包契约，也不是提前实现未来 v1。

设计原则：

- 未来可以发布一份 **Legacy Published Format JSON Schema**，把现有中文字段卡包格式标准化、文档化、可 lint 化；这不是新格式，而是对已发布格式的更严格说明。
- 新版本编辑器不能默认制造旧版本不可读的 card-only pack。
- Card-only export 默认继续输出 legacy-compatible JSON / DHCB。
- 未来 card import workflow modernization 可以让 legacy card pack JSON、legacy DHCB `cards.json`、当前 editor export 通过 source adapter 进入统一 validation / normalize / semantic validation pipeline。
- 未来内部可以使用 Card Pack Import Model 做导入期 staging 和校验；它应尽量贴近 legacy 输入，只做导入必须的规范化，不承担 future v1、editor authoring model 或 storage authority 职责。
- 不为近期实现新增 card-only public format。
- `StandardCard` / `ExtendedStandardCard` 不作为 Public Schema，也不作为未来 Card Pack Data Authority。
- Content bundle 不应成为绕过 card-only legacy compatibility 的方式；混合包中的 card payload 默认也应保持 legacy-compatible，除非作者显式选择 v1-only 能力。
- 如果未来出现 v1-only card capability，必须先设计 compatibility export / downgrade diagnostics：可降级则提示信息损失，不可降级则阻止 legacy export 并说明原因。
- `version` 是 pack author 维护的内容版本字符串，不要求 semver。Legacy workflow 只限制类型、去除首尾空白后的非空性和最大长度。
- 装备包未来也应对齐这一规则，把 `version` 从 strict semver 调整为作者自定义版本字符串。

`version` 不承担系统迁移或格式选择职责。格式选择由 `format` 完成；`version` 只描述作者自己的内容发布标记，例如 `1.0.0`、`V20251114`、`春季测试版` 或 `2026-06 playtest`。系统不解析其排序语义。

未来 card import workflow modernization 中 source adapter 的位置：

```text
Source Read
  -> Format Detection
  -> Structural Validation against Legacy Published Format JSON Schema
  -> Legacy Source Adapter if needed
  -> Structural Validation against Card Pack Import Model invariants
  -> Normalize
  -> Semantic Validation
  -> Conflict Check
```

这样对外仍有一套可公布、可解释的 legacy schema；对内则用一个保守的 import staging shape 承接后续校验。legacy input 的差异集中在 source adapter 层，但 import model 不应为了未来 i18n 或 future v1 做额外结构重组。

## 卡牌持久化格式策略（未来方向）

当前卡牌 batch 持久化保存的是 `StandardCard` / `ExtendedStandardCard` runtime view。这个格式历史最久，但字段严格、运行路径稳定、风险边界清楚。

即使未来执行卡牌导入 workflow modernization，也应先不迁移持久化格式。导入 workflow 成功后仍写入现有 legacy batch data。Card Pack Import Model 只存在于导入前 workflow，不保存为新的 storage authority。

后续可以单独评估 Card Pack Data v2 / storage migration，但它必须作为独立设计处理，不能和本轮导入 workflow 现代化绑定。评估前置条件：

- 已有真实卡包 fixture 能证明 migration 可无损。
- editor、runtime selection、content pack manager 不需要同步大改。
- loader 可以安全双读 legacy batch data 和 v2 data。
- rollback、disabled batch、image asset 语义有清晰迁移方案。

未来 prepare / commit 设计只需要避免把 legacy writer 分散到多个入口。这样未来如果真的需要 storage v2，可以替换 writer；如果不做 storage v2，卡牌导入 workflow modernization 仍然有独立价值。

## 卡牌包导入 Workflow

卡牌包导入 workflow 只负责导入前规范化和提交旧系统的适配，不改变旧系统内部。

```text
Source Read
  -> Format Detection
  -> Payload Decode
  -> JSON Parse
  -> Authoring Preprocess
  -> Structural Validation
  -> Canonical Normalize
  -> Semantic Validation
  -> Conflict Check
  -> Prepare Legacy Commit
  -> Commit Through Legacy Adapter
  -> Result Mapping
```

### Authoring Preprocess

集中承接历史兼容行为：

- `preprocessVariantFormat`。
- 可保留现有种族双卡补全逻辑。
- 可保留现有子职业三卡补全逻辑。
- legacy DHCB 兼容路径可继续把 id 文件名图片映射为 `hasLocalImage`；Content Bundle v1 不使用该规则，改由 manifest `assets[]` 显式绑定。

兼容处理应该产生 warning diagnostic，而不是静默散落在不同 importer 中。

### Validation

第一版至少覆盖：

- JSON parse 失败。
- 未识别卡牌包结构。
- 空卡牌包。
- 重复 card id。
- card id 与当前系统已有 card id 冲突。
- 卡牌数组字段类型错误。
- legacy DHCB 图片没有对应 card id。
- Content Bundle v1 `card-image` asset 引用不存在的 card id。
- Content Bundle v1 asset path 不存在或非法。
- 种族双卡不完整或被自动补全。
- 子职业三卡不完整或被自动补全。

### Legacy Commit Adapter

旧系统提交暂时保留。新 workflow 的最后一步调用现有卡牌系统能力完成写入。

未来为了支持完整原子 bundle 导入，卡牌导入需要拆出 prepare / commit 两个阶段：

```text
prepareCardPackImport(importData, source)
  -> processed import data
  -> converted standard cards
  -> generated batch id
  -> batch data write
  -> next card index
  -> optional image writes

commitPreparedCardPackImport(plan)
  -> write batch data
  -> write images
  -> write index last
  -> refresh in-memory store
```

第一期可以先只在新 bundle workflow 使用 prepare / commit；legacy UI 导入仍可短期走旧 importer，但最终应收敛到同一 workflow。

## 完整 Content Bundle Workflow（未来方向）

完整 content bundle workflow 负责容器解析、entry 分派、全量 preflight、原子提交和结果映射。当前分支的薄版 reader 只要求完成 manifest 解析、entry 分派、bundle-level preflight 和对现有导入路径的调用。

```text
Read ZIP
  -> Read Manifest
  -> Validate Manifest
  -> Resolve Entries
  -> Preflight Card Entry
  -> Preflight Equipment Entry
  -> Build Bundle Commit Plan
  -> Stage Data Writes
  -> Stage Asset Writes
  -> Commit Index Updates
  -> Rebuild Runtime Views
  -> Result Mapping
```

如果任一步失败：

```text
Failure
  -> Restore Previous Index Values if needed
  -> Delete Staged Data and Assets
  -> Rebuild Previous Runtime Views if needed
  -> Return Failed Result with Diagnostics
```

## 原子导入策略（未来方向）

当前系统已有 index，因此未来完整原子导入应以 index 作为可见性边界。

提交顺序：

1. 所有 entry preflight 必须成功。
2. 构建 card batch data 和 equipment pack data。
3. 写入新 batch data / pack data。
4. 写入卡牌图片等附属资源。
5. 基于旧 index 构建 next card index 和 next equipment index。
6. 最后写入 index。
7. rebuild runtime cache / refresh in-memory store。

失败规则：

- index 写入前失败：删除 staged data / assets；用户侧不可见。
- index 写入后失败：恢复旧 index，删除 staged data / assets。
- runtime cache build 失败：恢复旧 index，删除 staged data / assets，并尝试 rebuild 旧 runtime view。
- rollback 失败：返回 fatal diagnostic，提示可能需要高级维护。

硬约束：

- 新 content bundle 没有 partial success 状态。
- 多文件导入可以继续逐文件 best effort，但单个 `.dhcb` 内部必须 all-or-nothing。
- runtime 读取必须从 index 出发。若现有卡牌 store 存在扫描 `daggerheart_custom_cards_batch_*` 自动补 index 的行为，必须先修正或在 bundle import 中规避，否则 index-last commit 不成立。

## Commit Plan

第一版不需要抽象成过度通用的 transaction framework。可以先使用面向 bundle import 的 commit plan。

```ts
type BundleCommitPlan = {
  card?: {
    batchId: string
    batchDataKey: string
    batchDataValue: string
    previousIndex: string | null
    nextIndex: string
    imageWrites: Array<{
      cardId: string
      blob: Blob
    }>
  }
  equipment?: {
    packId: string
    packDataKey: string
    packDataValue: string
    previousIndex: string | null
    nextIndex: string
  }
}
```

后续如果 card pack、equipment pack、future content pack 都稳定采用同一事务语义，再抽象更通用的 content pack transaction module。

## Diagnostics

所有导入 workflow 返回结构化 diagnostics。

```ts
type ContentImportDiagnostic = {
  severity: "error" | "warning" | "fatal"
  code: string
  path: string
  message: string
  value?: unknown
  relatedPaths?: string[]
  entry?: {
    kind: "card-pack" | "equipment-pack"
    path: string
  }
}
```

示例 code：

- `UNKNOWN_CONTENT_PACK`
- `UNKNOWN_CONTENT_BUNDLE`
- `INVALID_BUNDLE_MANIFEST`
- `MISSING_BUNDLE_ENTRY`
- `UNSUPPORTED_BUNDLE_ENTRY_KIND`
- `BUNDLE_ENTRY_READ_FAILED`
- `LEGACY_CARD_PACK_ADAPTED`
- `CARD_PACK_PUBLIC_SCHEMA_INVALID`
- `CARD_PACK_FORMAT_UNSUPPORTED`
- `CARD_PACK_INVALID_JSON`
- `CARD_PACK_DUPLICATE_CARD_ID`
- `CARD_PACK_ID_CONFLICT`
- `CARD_PACK_ORPHAN_IMAGE`
- `CARD_PACK_ANCESTRY_PAIR_AUTOFILLED`
- `CARD_PACK_SUBCLASS_TRIPLE_AUTOFILLED`
- `EQUIPMENT_PACK_IMPORT_FAILED`
- `BUNDLE_COMMIT_FAILED`
- `BUNDLE_ROLLBACK_FAILED`
- `RUNTIME_REBUILD_FAILED`

## Legacy DHCB 兼容

Legacy DHCB 格式继续支持：

```text
manifest.json   optional, old format may be "DaggerHeart Card Batch"
cards.json
images/*
```

兼容策略：

- 根目录 `cards.json` 仍被识别为 card pack。
- 根目录 `images/*` 仍作为卡牌本地图片。
- 旧 importer 中“孤儿图片拒绝导入并回滚”的行为保留。
- 旧 DHCB 不要求 content bundle manifest。
- 旧 DHCB 可以逐步改为调用新的 card pack workflow，但外部行为不应破坏。

## 与装备包 Workflow 的关系

装备包 workflow 保持当前设计。Content bundle workflow 只把 `equipment/equipment.json` 提取为 equipment import source，并调用现有 equipment application service 的 dry run / commit 能力。

未来为了完整 bundle 原子导入，装备包 application service 需要暴露或适配 prepare / commit 能力，或者由 bundle transaction 直接构建 repository commit plan。当前分支薄版 reader 应优先复用现有 equipment import workflow，避免复制 equipment validation 逻辑。

## 与卡牌编辑器的关系

卡牌编辑器导入 JSON / DHCB 的用户行为应保持不变，但内部可以逐步收敛到新 workflow。

后续当编辑器支持装备创作时：

- 卡牌包草稿仍导出 card pack JSON 或 legacy-compatible DHCB。
- 装备包草稿导出 equipment pack JSON。
- 同时包含卡牌和装备时，可显式导出 content bundle v1 DHCB；其中 card payload 默认仍应保持 legacy-compatible，避免把装备不兼容伪装成卡牌格式不兼容。
- 导出前应通过对应 workflow dry run。

## 实施路线

### 当前分支阶段 1：卡牌编辑器增加装备编辑能力

- 复用现有 `/card-editor` 路由，但产品概念升级为 Content Pack Editor。
- 引入 Content Pack Draft：包含现有 card package draft 和新增 equipment pack draft。
- 支持编辑 weapon / armor entries，字段复用 equipment pack public schema 和已完成的 import normalize 规则。
- 支持导入 / 导出 equipment pack JSON。
- 保持现有 card-only editor 行为和 card-only export 不变。
- 编辑器内校验装备草稿时复用 equipment import dry run 或等价 validator，不复制一套装备校验逻辑。

### 当前分支阶段 2：薄版 Content Bundle v1

- 定义并实现 `daggerheart.content-bundle.v1` manifest 的薄版 reader。
- 支持一个 `card-pack` entry 和一个 `equipment-pack` entry。
- `card-pack` entry payload 使用现有 legacy card pack JSON。
- `equipment-pack` entry payload 使用 `daggerheart.equipment-pack.v1` JSON。
- `card-pack.assets[]` 支持显式 card image mapping，不要求图片文件名等于 card id。
- 第一版优先复用现有 card JSON / legacy DHCB 导入路径和 equipment import workflow；不在这里重构卡牌导入 pipeline。
- 完成 bundle-level preflight 和清晰 diagnostics；原子 commit 如需拆分，可以作为薄版 reader 后续增强，但 manifest 设计必须不阻碍原子导入。

### 未来方向 1：Legacy Published Format JSON Schema

- 根据当前 editor export、卡包编辑指南、真实导入样例和现有 validate 代码整理 legacy schema。
- Schema 使用现有公开字段名，不引入 `daggerheart.card-pack.v1` 字段。
- Schema 覆盖 card pack JSON 和 legacy DHCB `cards.json` 的共同结构。
- Schema 错误必须能映射到用户输入路径。
- 创作指南改为引用 schema，而不是只用 prose 描述格式。

### 未来方向 2：卡牌包导入前 Workflow Modernization

- 新增 card import diagnostics/types。
- 明确 `daggerheart.card-pack.v1` deferred，不作为 schema 或默认导出目标。
- 把卡牌 JSON 文件识别、parse、schema validation、source adapter、Card Pack Import Model、semantic validation、result mapping 集中。
- 内容包管理页导入 JSON 卡牌包改走新 workflow。
- 编辑器 JSON 导入可复用同一 preprocess / validation。
- 导入成功后继续写入现有 legacy batch data。

### 未来方向 3：Legacy DHCB 收口

- 把 legacy DHCB 解析收进 card import workflow。
- 继续支持 `cards.json + images/*`。
- 把孤儿图片、图片读取失败、图片导入失败映射成 diagnostics。

### 未来方向 4：Index-last Atomic Commit

- 验证卡牌 runtime 是否严格从 index 出发。
- 为卡牌导入拆出 prepare / commit。
- 复用装备 index/data 分离能力。
- 实现 bundle 原子提交和 rollback。

### 未来方向 5：Card Pack Data v2 / Public v1

- `daggerheart.card-pack.v1` 只在未来国际化或全新生态阶段重新评估。
- Card Pack Data v2 / storage migration 单独设计，不作为本轮实施路线的一部分。
- 任何 future v1 或 storage v2 都不能改变 card-only 默认 legacy-compatible export 的近期承诺。

## 测试策略

当前分支阶段 1：装备编辑能力

- card editor 保持现有 card-only 草稿、导入、导出行为。
- equipment draft 可以创建、编辑、删除 weapon / armor entry。
- equipment draft 导出为 `daggerheart.equipment-pack.v1` JSON。
- equipment draft 导入后能恢复编辑状态。
- equipment draft 校验复用 equipment pack validation 规则。

当前分支阶段 2：薄版 Content Bundle v1

- 只有 card-pack entry 的 bundle 可导入，内部复用现有 card import。
- 只有 equipment-pack entry 的 bundle 可导入，内部复用 equipment import workflow。
- card-pack + equipment-pack bundle 可导入，两个 pack 都可见。
- `entries[].id` 重复失败。
- unsupported `entries[].kind` 失败。
- `card-pack.assets[]` 可用自定义图片文件名绑定到 card id。
- `card-pack.assets[].cardId` 引用不存在 card id 时失败。
- `card-pack.assets[].path` 不存在或非法时失败。
- card-only JSON / legacy DHCB 仍走原有路径，不被误判为 new content bundle。

未来方向：Legacy Published Format JSON Schema

- 当前 editor export fixture 通过 schema。
- legacy DHCB `cards.json` fixture 通过 schema。
- 缺少必需顶层字段失败，并返回 legacy 输入路径。
- 各卡型缺少必需字段失败，并返回 legacy 输入路径。
- `version` 接受非 semver 字符串，只限制字符串类型、trim 后非空和最大长度。
- schema 不要求 future v1 字段，例如 `format: "daggerheart.card-pack.v1"`、`class` 或 future grouping。

未来方向：卡牌 workflow modernization

- JSON parse 失败返回 diagnostic。
- 未识别 JSON 返回 unknown。
- 空卡牌包失败。
- 重复 card id 失败。
- existing card id conflict 失败。
- variant 新旧格式 preprocess 后可导入。
- 种族双卡补全产生 warning。
- 子职业三卡补全产生 warning。

未来方向：Legacy DHCB 收口

- `cards.json + images/*` 成功导入。
- 缺少 `cards.json` 失败。
- 孤儿图片失败，且不留下 batch。
- 图片写入失败时回滚 batch。

未来方向：完整原子 Content Bundle commit

- card-pack preflight 失败时 equipment 不写入。
- equipment preflight 失败时 card 不写入。
- card commit 后 equipment commit 失败时 card index 恢复，图片清理。
- runtime rebuild 失败时恢复旧 index。
- rollback 失败返回 fatal diagnostic。

Regression：

- 现有内容包管理页仍可导入 JSON 卡牌包。
- 现有内容包管理页仍可导入 legacy DHCB。
- 现有装备包 JSON 导入行为不变。
- 现有卡牌选择弹窗行为不变。

## 开放问题

- 新 content bundle manifest 是否需要声明 bundle-level content id，还是只使用 name/version/author。
- 是否允许 `.zip` 使用新 content bundle manifest，还是仅 `.dhcb` 推荐。
- 卡牌编辑器导出 legacy DHCB 的同时，是否提供 content bundle v1 导出选项。
- Content Bundle v1 内允许哪些 legacy card input 形态，应在兼容性矩阵中统一定义，而不是作为单独方向性问题处理。
- Legacy Published Format JSON Schema 是否覆盖所有历史宽松别名，还是只覆盖当前编辑器导出和已文档化字段；未覆盖别名可继续由 source adapter 兼容。
- 若未来重新启用 `daggerheart.card-pack.v1`，需要先定义 v1-only 能力、compatibility export 和 downgrade diagnostics。

## 验收标准

- 当前分支范围明确只包含装备编辑能力和薄版 Content Bundle v1。
- 新文档明确 `.dhcb` 的 legacy card batch 与新 content bundle v1 的区别。
- 薄版 content bundle 设计支持同时包含一个卡牌包和一个装备包。
- 薄版 content bundle 明确复用现有 card import 和 equipment import workflow，不要求当前分支重构卡牌导入。
- card image asset mapping 明确支持自定义文件名，不依赖 legacy `hasLocalImage` 的 id 文件名规则。
- 卡牌包导入现代化明确是未来方向，不是当前分支交付。
- 现有卡牌系统进入系统之后的 workflow 明确暂不修改。
- 文档明确 `daggerheart.card-pack.v1` deferred，不作为近期公开契约、默认导出格式或 card-only 分发格式。
- Legacy Published Format JSON Schema 明确是未来方向，不是当前分支交付。
- Legacy Published Format 明确继续作为近期公开卡包契约。
- Card Pack Import Model 明确只是导入 staging shape，不是 public schema、editor authoring model 或 storage authority。
- `StandardCard` 明确只是 Runtime Card View，不作为未来公开契约或 Card Pack Data Authority。
