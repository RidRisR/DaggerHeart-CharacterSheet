# Card Import Commit Path Scope

## 背景

第一阶段已经完成 card import dry-run pipeline。下一阶段不继续推进编辑器校验接入，而是设计 formal card import 的真实 commit path。

当前旧流程把多个职责混在一起：

- legacy payload 预处理和校验；
- duplicate id 检查；
- 转换成 `StandardCard` / `ExtendedStandardCard`；
- 写入 custom card store / localStorage；
- DHCB 图片解包、IndexedDB 写入和失败回滚；
- batch indexes、keyword indexes、runtime maps 重建；
- UI 层错误处理。

这导致验证、运行时模型转换、持久化和资源提交难以单独测试，也使 dry-run 难以成为正式导入的唯一前置规则。

## 已确认决策

### 1. Commit Plan 是 dry-run 和真实写入之间的正式边界

Formal card import 不应该从 dry-run result 直接写 localStorage。

目标流程：

```text
Source Intake
  -> External Contract Guard
  -> Adapter
  -> Structural Validation
  -> Semantic Validation
  -> Conflict Check
  -> Stage Import Data
  -> Build Card Import Commit Plan
  -> Storage Format Adapter
  -> Storage Backend Adapter
  -> Storage Transaction
  -> Runtime Refresh Adapter
```

`Card Import Commit Plan` 只能在 conflict check 成功后生成。它表示“在当前系统状态下，这个 pack 已经确认可以提交”，而不是“可能可以提交的草稿”。

### 2. 本阶段选用 legacy storage format，但 Commit Plan 不绑定它

本阶段不引入新的 card storage v2，也不迁移已有 localStorage 数据。Formal card import commit path 的目标产物仍然是当前系统已经使用的老 batch storage shape。

也就是说，经过验证的 **Card Import Commit Plan** 会通过 **Storage Format Adapter** 转换成当前 `BatchData` 风格的写入数据：

```ts
{
  metadata: ...,
  cards: ExtendedStandardCard[],
  customFieldDefinitions: ...,
  variantTypes: ...
}
```

这个选择是阶段性兼容策略，不代表 `ExtendedStandardCard` 是长期 storage authority。

### 3. Storage Format Adapter 和 Storage Backend Adapter 分离

本阶段需要明确两层 adapter：

```text
Card Import Commit Plan
  -> Storage Format Adapter
  -> Storage Backend Adapter
```

**Storage Format Adapter** 决定写什么结构。

当前实现：

```text
Card Import Commit Plan -> Legacy Card Batch Storage Format
```

未来如果决定迁移 storage v2，可以增加或替换为：

```text
Card Import Commit Plan -> Card Pack Storage v2
```

**Storage Backend Adapter** 决定写到哪里、怎么写。

当前实现：

```text
Legacy Card Batch Storage Format -> localStorage + IndexedDB
```

未来可以替换为 IndexedDB-only storage 或 backend API。

Backend keys、IndexedDB table names、localStorage key names、write order、compensation cleanup 细节不应泄漏到 **Card Import Commit Plan**、validation 或 staging 层。

### 4. Runtime Card Projection 和 Storage Commit 解耦

`StandardCard` / `ExtendedStandardCard` 是当前运行时读模型，不是卡包公开契约，也不应继续直接作为导入流程的上游验证模型。

本阶段的 legacy batch storage format 会包含 `ExtendedStandardCard[]`，因为当前 storage/runtime 都需要它；但转换动作应被限制在 **Storage Format Adapter** 内，而不是让 runtime card model 反向定义 import contract。

### 5. 第一版不做存储迁移

下一阶段继续把 installed custom card batch 持久化为当前系统已经使用的 legacy batch storage data，避免扩大风险。

但是新的 commit path 应把这种历史实现包在 storage format adapter / storage backend adapter 后面，不让它反向定义 import contract。

### 6. Formal import 业务逻辑和具体存储解耦

本阶段应把 formal card import 的业务流程从 localStorage / Zustand store 中抽出来，放到 application service + repository port 后面。

目标边界：

```text
Formal Card Import Application Service
  -> dry-run pipeline
  -> build commit plan
  -> card pack repository port
```

当前实现可以提供 legacy localStorage repository adapter，内部组合 **Storage Format Adapter** 和 **Storage Backend Adapter**，继续写现有 localStorage keys 和 legacy batch storage shape。Application service 不应直接知道这些 keys，也不直接依赖 legacy storage projection。

本阶段只抽 formal import commit path，不重写整个 card store，不重构全部 runtime hooks、stats、editor 或 management actions。

Application service 对外只依赖一个 card pack repository port。该接口应与装备包 repository 保持同构：

```ts
interface CardPackRepository {
  loadSnapshot(): Promise<CardPackStorageSnapshot>
  ensureIntegrity(): Promise<CardPackIntegrityReport>
  commitImport(plan: CardImportFinalCommitPlan): Promise<CardPackStorageTransactionResult>
  removePack(packId: string): Promise<CardPackStorageTransactionResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<CardPackStorageTransactionResult>
}
```

Repository implementation 内部可以组合多个 backend adapter，例如：

```text
LegacyCardBatchFormatAdapter
LegacyCardContentBackend  -> localStorage content/index
PackScopedImageBackend    -> IndexedDB images
```

业务层不需要知道 content、index、images 分别写到哪里，也不需要理解当前是 localStorage + IndexedDB、未来是 IndexedDB-only，还是 backend API。

卡包 repository 和装备包 repository 的差异应留在 implementation 内部：

- `commitImport()` 需要协调 card content、pack-scoped images 和 index；
- `ensureIntegrity()` 需要处理 legacy global image migration；
- `removePack()` 需要删除 pack-scoped images；
- `loadSnapshot()` 需要从 legacy card batch storage format 还原 snapshot；
- `setPackDisabled()` 只更新 lifecycle/index，不改 pack content 或图片。

### 7. Runtime refresh 复用现有 store flow

本阶段不引入新的 Runtime Registry，也不重写 runtime selection hooks。

Storage commit 完成后，通过 **Runtime Refresh Adapter** 复用现有 store helper 刷新 runtime view，例如：

```text
reload custom cards from storage
recompute aggregations
rebuild cardsByType
rebuild subclass / level / batch keyword indexes
compute stats
```

Runtime refresh 是 formal import 成功条件的一部分。如果 storage content、images、index 已写入，但 runtime refresh 失败，则本次导入仍应视为失败。

补偿责任划分：

- repository `commitImport(plan)` 只负责 storage transaction：content、pack-scoped images、index；
- application service 在 repository commit 成功后调用 runtime refresh；
- 如果 runtime refresh 失败，application service 调用 `repository.removePack(packId)` 执行提交后补偿；
- 如果 `removePack(packId)` 也失败，import result 必须返回失败，并暴露 `ROLLBACK_FAILED` / recovery-required diagnostic。

### 8. Legacy repository 写入顺序和恢复语义固定

Legacy localStorage repository commit 必须先写 batch content，再写 pack-scoped images，最后写 / 更新 index：

```text
1. write batch content
2. write pack-scoped images if any
3. update index
4. load post-transaction snapshot
```

理由：
- 如果 content 写入成功但 index 写入失败，只会留下 orphan content。
- Orphan content 不会被系统当成已安装 pack。
- Integrity recovery 可以安全清理 orphan content。
- 这比先写 index 更不容易产生“index 声称 pack 已安装但内容不存在”的半安装状态。

Integrity recovery 规则：

- batch content 存在但 index 不引用：清理 orphan content。
- index 引用 batch content 但 content 不存在：移除 broken index entry。
- index 引用 batch content 但 content 损坏：移除 broken index entry，并清理损坏 content。

Post-transaction snapshot read 是 repository commit 的一部分。如果 index 已写入但 post-transaction snapshot read 失败，本次提交仍视为 storage transaction failure，repository 必须移除本次 index entry，并删除本次 content 和 pack-scoped images。

Conflict context 和 formal import commit 前应基于恢复后的干净 storage snapshot。

### 9. DHCB 图片提交必须强一致

DHCB 图片处理不应埋在 card JSON import 里，但 DHCB card batch 和图片必须作为一个强一致安装单元对外成功。

Formal DHCB import 的成功语义：

- card content 写入成功；
- 所有属于本次 pack 的图片写入成功；
- index 更新成功；
- runtime view 能基于 index 读取到完整 batch。

只有以上全部完成，导入才算成功。

因此 index 是“内容和图片都已安装完成”的提交标记。不能在图片成功前写 index。

Repository storage transaction 顺序：

```text
1. recover storage integrity
2. validate card content and image ownership
3. write batch content
4. write images
5. update index
6. load post-transaction snapshot
```

失败处理：

- batch content 写入失败：不写图片，不写 index。
- 图片写入失败：删除已写入的 batch content，删除本次已写入的图片，不写 index。
- index 写入失败：删除已写入的 batch content，删除本次已写入的图片。
- recovery 看到 content / images 没有 index 引用时，应把它们作为 orphan data 清理。

Rollback 不是跨 localStorage / IndexedDB 的真实事务，而是 compensation cleanup。Storage backend adapter 必须在 transaction executor 内部记录本次 import 的 write set，并用它清理已写入 artifacts。

`CardImportFinalCommitPlan` 不包含 localStorage content key、IndexedDB table name、pack-scoped image storage key 或 generated index entry。这些都属于 storage format adapter / storage backend adapter 的内部责任。

建议提交状态机：

```text
pending
  -> contentWritten
  -> imagesWritten
  -> indexWritten
  -> runtimeReady
```

状态失败处理：

- `pending` / content write failed：防御性删除本次 content artifact，不处理图片或 index。
- `contentWritten` / image write failed：删除本次 pack-scoped images，删除本次 content，不写 index。
- `imagesWritten` / index write failed：删除本次 pack-scoped images，删除本次 content。
- `indexWritten` / post-transaction snapshot read failed：移除本次 index entry，删除本次 pack-scoped images，删除本次 content。
- `runtimeRefreshFailed`：由 application service 调用 `repository.removePack(packId)` 移除 index entry、pack-scoped images 和 content。

删除操作应尽量幂等：删除不存在的 content/image key 不应视为 rollback 失败。

如果 compensation cleanup 自身失败，import result 必须暴露失败状态和 recovery-required 信息，后续 initialization / integrity recovery 继续清理 orphan content、orphan images 和 broken index entry。

Commit path 需要显式描述：

- 哪些图片属于本次 pack；
- 哪些图片是孤儿图片；
- 图片 orphan 检查发生在 batch commit 前还是后；
- localStorage card batch 和 IndexedDB image writes 之间的 rollback / compensation 协议。

### 10. 图片存储升级为 pack-scoped namespace

本阶段不做 card storage v2，但升级 imported card image storage ownership。

当前 IndexedDB `images` 表使用全局 `cardId` 作为 key。新导入应改为 pack-scoped image namespace：

```ts
{
  key: `${packId}/${cardId}`,
  packId,
  cardId,
  blob,
  mimeType,
  size,
  createdAt
}
```

这相当于在 IndexedDB 中模拟“每个包一个图片目录”。

收益：

- rollback 可以按 `packId` 删除本次失败导入的全部图片；
- remove batch 可以按 `packId` 删除整包图片；
- integrity recovery 可以清理 index 不再引用的 pack image namespace；
- 图片 ownership 不再依赖全局 card ID。

Runtime image lookup 顺序：

```text
1. read pack-scoped image by `${packId}/${templateId}`
2. fallback to legacy global image by `templateId`
```

新 DHCB import 必须写 pack-scoped images，不再写 legacy global images。

### 11. 旧 global images 迁移

旧 IndexedDB global images 可以迁移到 pack-scoped namespace。

迁移触发时机：应用 / card system 初始化时执行一次 image ownership recovery。迁移必须幂等，重复执行不应破坏已经迁移成功的图片。

迁移采用 copy-then-clean，不原地替换，不使用 migration marker。

完成状态由 legacy global images 表是否为空判断：

- legacy global images 仍有记录：视为迁移未完成，本次初始化重新迁移。
- legacy global images 为空：视为迁移已完成。
- legacy global images 和 pack-scoped images 同时存在：视为上一次迁移失败或中断，以 legacy global images 作为 source of truth 重新迁移并覆盖写入 pack-scoped images。

迁移流程：

```text
1. recover and read valid storage index
2. read valid batch content for each indexed batch
3. build templateId -> packId ownership mapping from legacy batch cardIds / imageCardIds
4. scan legacy global images
5. if templateId is referenced by one valid pack:
     write `${packId}/${templateId}` pack-scoped image
     keep legacy global image until verification succeeds
6. if templateId is not referenced by any valid pack:
     keep for cleanup after verification
7. verify all expected pack-scoped images exist
8. clear legacy global images
```

系统正常情况下不应出现多个 batch 引用同一个 card ID，因为 formal import 已拒绝重复 card ID。迁移实现可以防御性处理，但不作为主要设计路径。

迁移失败语义：

- 不应让整个应用或卡牌系统初始化不可用；
- runtime image lookup 仍可 fallback 到 legacy global image；
- legacy global images 没有被清空前，下一次初始化应重新迁移；
- migration failure 应进入 recovery report / console diagnostics；
- 后续 formal DHCB import 仍必须满足 pack-scoped image write 的强一致要求。

### 12. 旧导入实现删除，旧入口可暂作 facade

本阶段不应保留旧 card import 真实实现和新 application service 双轨运行。

需要删除或替换的旧真实逻辑包括：

- `store.importCards()` 内部的 validation / duplicate check / conversion / localStorage write 流程；
- `importDhcbCardPackage()` 内部复用 `store.importCards()` 后再写图片的流程。

为了缩小 UI 改动面，旧 public-facing 函数名可以临时保留为 facade：

- `importCustomCards()` 调用新的 formal card import application service；
- `importDhcbCardPackage()` 调用新的 formal card import application service。

这些 facade 不应包含独立业务规则，只负责参数适配和 result shape 兼容。后续 UI 全部改成直接调用 application service 后，可以再删除 facade。

### 13. Application result stage 与装备包对齐

Card import application service 的 stage / result model 应与 equipment pack application service 对齐。

外部阶段不新增 `assetCommit`。Card content、pack-scoped images 和 index 更新都属于 repository `storageTransaction`。

因此图片写入失败应表现为：

```ts
{
  success: false,
  stage: "storageTransaction",
  storageCommitted: false,
  diagnostics: [{ code: "IMAGE_WRITE_FAILED", ... }]
}
```

如果 compensation cleanup 也失败，则仍停在 `storageTransaction`，并额外返回 rollback diagnostic：

```ts
{
  success: false,
  stage: "storageTransaction",
  storageCommitted: false,
  diagnostics: [
    { code: "IMAGE_WRITE_FAILED", ... },
    { code: "ROLLBACK_FAILED", ... }
  ]
}
```

这样 application service 不需要理解 content/image/index 的内部提交顺序，但仍能给 UI 暴露具体 diagnostic code。

### 14. Storage transaction result 与装备包同构

Card pack repository 的 transaction result / integrity issue model 应与装备包保持同构：

```ts
type CardPackStorageTransactionResult =
  | { ok: true; snapshot: CardPackStorageSnapshot; issues: CardPackIntegrityIssue[] }
  | {
      ok: false
      error: CardPackStorageTransactionError
      snapshot?: CardPackStorageSnapshot
      issues: CardPackIntegrityIssue[]
    }
```

`CardPackStorageIssueCode` 应尽量复用装备包命名，例如：

```text
PACK_NOT_FOUND
PACK_ID_CONFLICT
INDEX_READ_FAILED
INDEX_PARSE_FAILED
INDEX_FORMAT_INVALID
PACK_DATA_READ_FAILED
PACK_DATA_PARSE_FAILED
PACK_DATA_FORMAT_INVALID
STORAGE_SERIALIZE_FAILED
STORAGE_QUOTA_EXCEEDED
STORAGE_WRITE_FAILED
ROLLBACK_FAILED
ORPHAN_PACK_DATA
MISSING_PACK_DATA
TEMPLATE_ID_CONFLICT
```

卡包只扩展图片相关 issue code，例如：

```text
IMAGE_DB_UNAVAILABLE
IMAGE_WRITE_FAILED
IMAGE_DELETE_FAILED
IMAGE_MIGRATION_FAILED
ORPHAN_PACK_IMAGE
ORPHAN_LEGACY_IMAGE
```

Repository 层使用 `TEMPLATE_ID_CONFLICT` 表达 card id/template id 冲突；application diagnostic / UI copy 可以映射为卡牌文案。

### 15. Conflict context 由 application service 显式构造

Card import application service 应与装备包一样，先从 repository 读取 storage snapshot，再构造 conflict context 传入 import pipeline。

卡包额外需要把 built-in card ids 纳入 conflict context，但 built-in cards 不属于 imported pack repository。

推荐 dependency：

```ts
interface CardImportApplicationServiceDependencies {
  repository: CardPackRepository
  runtimeRefresh: CardRuntimeRefreshPort
  builtinCards: {
    getTemplateIds(): string[]
  }
}
```

Conflict context 来源：

```text
repository.loadSnapshot() imported card ids
  + builtinCards.getTemplateIds()
  -> CardImportConflictContext
```

Import pipeline 只接收 conflict context，不直接读取 Zustand store、localStorage 或 built-in card assets。Repository 也不负责管理 built-in card ids。

未来可以单独讨论 built-in base cards 是否不再写入 localStorage / batch-like runtime state；这不属于本阶段目标。

### 16. `hasLocalImage` 缺少图片不阻断兼容导入

旧 JSON / DHCB import 不会因为卡牌声明 `hasLocalImage: true` 但没有对应图片资产而拒绝导入。为了保持兼容，本阶段也不新增这类 blocking rule。

正式规则：

- JSON import 中 `hasLocalImage: true` 但没有 image asset：允许导入。
- DHCB import 中 card 声明 `hasLocalImage: true` 但 `images/*` 没有对应图片：允许导入。
- DHCB import 中 `images/*` 有图片但没有对应 staged card id：仍然作为 orphan image 阻断导入。

新 commit path 中，真正可提交的本地图片 ownership 由 `assets.cardImages` 决定，而不是只信任 payload 上的 `hasLocalImage` 字段。Storage format adapter 可以根据实际 assets 设置或修正 legacy storage 中的 image metadata；缺失图片最多产生 warning，不应阻断兼容导入。

### 17. Pack ID 生成位置与装备包对齐

Pack ID 由 application service 生成，并进入 `CardImportFinalCommitPlan`。Repository 仍然防御性检查 `PACK_ID_CONFLICT`。

卡包应复用装备包的生成位置和依赖注入模式：

```ts
const packId = createCardPackId({
  now,
  random,
  exists: (candidate) => storageSnapshot.packs.has(candidate),
})
```

短期应尽量保持旧 batch id 风格，降低兼容风险：

```text
batch_${timestamp}_${random}
```

不从 pack name 派生稳定 ID，避免重名包冲突，并保持“导入一次生成一个新 pack/batch id”的旧行为。

### 18. Storage snapshot 只暴露管理和冲突检查摘要

Card pack storage snapshot 不应暴露 legacy `BatchData`、localStorage keys 或完整 `ExtendedStandardCard[]` 作为 application service contract。

Conflict check 本质上只需要已存在 template/card id 集合，因此 snapshot 对 application service 的公开内容应保持为 management + conflict summary：

```ts
interface CardPackStorageSnapshot {
  packs: Map<string, CardPackSnapshotEntry>
  packCount: number
  integrity: CardPackIntegrityReport
}

interface CardPackSnapshotEntry {
  packId: string
  importedAt: string
  disabled: boolean
  source?: CardImportStoredSource
  templateIds: string[]
  imageTemplateIds: string[]
}
```

Repository / backend implementation 可以内部读取 legacy `BatchData` 或 `ExtendedStandardCard[]` 来完成 runtime refresh、storage recovery 或 format conversion，但这些不应进入 application service 的 snapshot contract。

未来如果 storage format 从 legacy batch 切换到 storage v2，conflict context builder 只要继续从 snapshot 收集 `templateIds` 即可，不需要理解底层 content shape。

### 19. Legacy storage format adapter 输出完整 storage projection

当前 `Storage Format Adapter` 应把 `CardImportFinalCommitPlan` 转换成完整 legacy storage projection，而不是让 backend adapter 从 import model 推导业务字段。

建议 shape：

```ts
interface LegacyCardBatchStorageProjection {
  packId: string
  storedData: LegacyCardBatchStoredData
  indexEntry: LegacyCardBatchIndexEntry
  templateIds: string[]
  imageTemplateIds: string[]
}

interface LegacyCardBatchStoredData {
  metadata: {
    id: string
    name: string
    fileName: string
    importTime: string
    version?: string
    description?: string
    author?: string
    imageCardIds?: string[]
    imageCount?: number
    totalImageSize?: number
  }
  cards: ExtendedStandardCard[]
  customFieldDefinitions?: CustomFieldsForBatch
  variantTypes?: VariantTypesForBatch
}

interface LegacyCardBatchIndexEntry {
  id: string
  name: string
  fileName: string
  importTime: string
  version?: string
  author?: string
  cardCount: number
  cardTypes: string[]
  size: number
  isSystemBatch: false
  disabled: boolean
}
```

边界：

- Format adapter 负责“storage payload 长什么样”，包括生成 `ExtendedStandardCard[]`、legacy batch metadata、index entry 和 image summary。
- Backend adapter 负责“写到哪里、按什么顺序写”，包括 localStorage key、serialization、pack-scoped image writes、index update、compensation cleanup 和 recovery。
- Backend adapter 不应从 card import model 重新推导业务字段。

### 20. JSON 和 DHCB 统一 application service 路径

Formal JSON card import 和 legacy DHCB card import 只在 source intake 阶段不同，后续必须走同一个 application service / commit path。

Source 差异：

```text
JSON file/object
  -> parsed card payload
  -> assets.cardImages = []

DHCB file
  -> cards.json payload
  -> images/* assets
```

Source intake 后统一进入：

```text
External Contract Guard
  -> External Format Adapter
  -> Structural Validation
  -> Semantic Validation
  -> Conflict Check
  -> Stage Import Data
  -> CardPackCommitDraft
```

Application service 再执行：

```text
CardPackCommitDraft
  -> Build CardImportFinalCommitPlan
  -> CardPackRepository.commitImport(plan)
  -> Runtime Refresh Adapter
```

Repository implementation 内部执行：

```text
CardImportFinalCommitPlan
  -> Storage Format Adapter
  -> Storage Backend Adapter
  -> Storage Transaction
```

这应与 equipment pack 的 `importFromSource()` 模式对齐：UI / facade 把文件转换成 import source，application service 负责 dry-run、commit plan、repository commit 和 runtime refresh。

旧 JSON import 不再走独立 `store.importCards()` 真实逻辑。旧 DHCB import 不再走独立 `importDhcbCardPackage()` 真实逻辑。

### 21. Source 和 CommitDraft 与装备包同构

卡包应沿用当前 `CardImportSource` 抽象，并与装备包的 source contract 对齐。Application service 不直接接收 `File`。

调用边界：

```text
UI / facade
  -> File 转 CardImportSource
  -> cardImportApplicationService.importFromSource(source, { mode: "commit" })
```

卡包 pipeline 应在 `stageImportData` 产出与装备包同构的 commit draft：

```ts
interface CardPackCommitDraft {
  packData: CardPackImportModel
  templateIds: string[]
  source: {
    originKind: CardImportOriginKind
    label?: string
    fileName?: string
    sizeBytes?: number
  }
  assets: {
    cardImages: CardImportImageAsset[]
  }
}
```

Application service 再把 draft 加上 `packId`、`importedAt` 和 `disabled: false`，生成 `CardImportFinalCommitPlan`。

```text
pipeline -> CardPackCommitDraft
application service -> CardImportFinalCommitPlan
repository -> commitImport
```

卡包相对装备包的主要差异是 draft / final plan 包含 `assets.cardImages`，用于 DHCB 强一致图片提交。

### 22. Import mode 与装备包同构

卡包 import mode 应从当前 dry-run-only 扩展为：

```ts
type CardImportMode = "commit" | "dryRun"
```

语义与装备包一致：pipeline 即使收到 `mode: "commit"`，也不执行 storage commit。它只运行到 `stageImportData` 并返回 `CardPackCommitDraft`。

Application service 负责在调用 pipeline 前从 repository snapshot 和 built-in templates 构造 conflict context。Pipeline 只消费传入的 conflict context，不直接读取 storage、Zustand store 或 built-in assets。

```text
importCardPackFromSource(source, { mode: "dryRun" })
  -> validate
  -> conflict check if conflict context is provided
  -> stageImportData
  -> return diagnostics / summary / CardPackCommitDraft
  -> no storage writes

importCardPackFromSource(source, { mode: "commit" })
  -> validate
  -> conflict check
  -> stageImportData
  -> return CardPackCommitDraft
  -> no storage writes
```

Application service 负责把 commit draft 变成 final commit plan 并调用 repository commit。

### 23. Application import result 与装备包同构

Card import application service 的 result shape 应与 equipment pack application service 对齐，只调整卡包特有的 summary 字段。

建议 shape：

```ts
interface CardPackApplicationImportResult {
  success: boolean
  stage: CardImportPipelineStage
  mode: CardImportMode
  storageCommitted?: boolean
  snapshot?: CardPackStorageSnapshot
  diagnostics: CardPackApplicationDiagnostic[]
  summary: {
    packId?: string
    name?: string
    version?: string
    author?: string
    cardCount: number
    imageCount: number
    warningCount: number
    errorCount: number
  }
}
```

Diagnostics 来源：

- import pipeline diagnostics；
- storage issues mapped diagnostics；
- image write / image migration diagnostics；
- runtime refresh diagnostics。

这样 content-pack manager 后续可以更容易统一展示 card / equipment import result。

## 执行前必须固定的 Contracts

进入 implementation plan 前，需要先固定以下 TypeScript contracts。否则测试和实现会在第一批 application service / repository slice 中各自猜接口。

### 24. Import staging 与 commit plan contracts

至少需要新增或等价定义：

```ts
interface CardPackCommitDraft {
  packData: CardPackImportModel
  templateIds: string[]
  source: CardImportStoredSource
  assets: {
    cardImages: CardImportImageAsset[]
  }
}

interface CardImportFinalCommitPlan {
  packId: string
  packData: CardPackImportModel
  templateIds: string[]
  source?: CardImportStoredSource
  importedAt: string
  disabled: false
  assets: {
    cardImages: CardImportImageAsset[]
  }
}
```

`templateIds` 是业务层冲突检查和 repository 防御检查的事实来源。Storage format adapter 不应重新推导 template identity 作为冲突依据。

### 25. Image asset contract

DHCB commit 需要真实提交图片，因此 `CardImportImageAsset` 不能只有 path metadata。它必须能被 image backend 读取为 Blob。

推荐形态：

```ts
interface CardImportImageAsset {
  templateId: string
  path: string
  mimeType?: string
  sizeBytes?: number
  readBlob(): Promise<Blob>
}
```

Blob 读取失败属于 storage transaction 的 image write failure：本次 content / images / index 都不能对用户可见。Source intake 可以提前发现可列出的 image asset，但不需要在 dry-run 时强制读取全部 Blob。

### 26. Repository storage contracts

Repository 层需要固定这些 contracts：

```ts
interface CardPackStorageSnapshot {
  packs: Map<string, CardPackSnapshotEntry>
  packCount: number
  integrity: CardPackIntegrityReport
}

interface CardPackSnapshotEntry {
  packId: string
  importedAt: string
  disabled: boolean
  source?: CardImportStoredSource
  templateIds: string[]
  imageTemplateIds: string[]
}

type CardPackStorageTransactionResult =
  | { ok: true; snapshot: CardPackStorageSnapshot; issues: CardPackIntegrityIssue[] }
  | { ok: false; error: CardPackStorageTransactionError; snapshot?: CardPackStorageSnapshot; issues: CardPackIntegrityIssue[] }
```

Repository implementation 还需要可注入 backend ports，至少包括：

- `LocalStorageLike` / content-index backend；
- `LegacyCardBatchFormatAdapter`；
- `CardPackImageBackend`；
- runtime refresh adapter 外部依赖。

### 27. ID terminology mapping

Domain / port 层统一使用：

```text
packId      = installed content pack identity
templateId  = card template identity inside a card pack
```

Legacy compatibility 层允许继续暴露：

```text
batchId = packId compatibility alias
cardId  = templateId compatibility alias
```

Legacy storage 写入规则：

- `metadata.id` 写 `packId`；
- legacy index entry `id` 写 `packId`；
- legacy batch `cardIds` 等价于 `templateIds`；
- `imageTemplateIds` 是实际拥有 image asset 的 template ids；
- pack-scoped image key 使用 `${packId}/${templateId}`。

### 28. Facade migration contract

旧入口必须变成 thin facade：

- `importCustomCards(importData, batchName)`：构造 card import source，调用 application service，再映射回旧 `ImportResult`。
- `importDhcbCardPackage(file)`：构造 DHCB source，调用同一个 application service，再映射回旧 `DhcbImportResult` 或旧调用方可处理的 throw。

Facade 不保留第二套真实导入逻辑，不直接写 localStorage、IndexedDB 或 Zustand store。

### 29. Runtime refresh contract

Runtime Refresh Adapter 必须提供一个明确的“从已恢复 storage snapshot 重建 custom runtime view”的入口，避免旧 custom cards / batches 残留。

推荐语义：

```text
refreshCustomCardRuntime()
  -> reload custom packs from storage
  -> replace custom runtime cards and batches
  -> rebuild indexes and aggregations
```

它不是 storage writer。失败时 application service 负责调用 `repository.removePack(packId)` 做提交后补偿。

### 30. Image ownership migration contract

Legacy global image migration 需要明确 ownership index：

```ts
interface CardImageOwnershipIndex {
  ownersByTemplateId: Map<string, string[]>
}
```

构建规则：

- 优先使用 indexed pack content 的 `imageCardIds` / `imageTemplateIds`；
- 如果旧 metadata 缺失，可从 legacy stored cards 的 `hasLocalImage` 防御性推断；
- 无 owner 的 legacy global image 是 orphan，可在 verification 后清理；
- 多 owner 的 legacy global image 不清理，保留 fallback，并报告 `IMAGE_MIGRATION_AMBIGUOUS`，避免每次初始化重复失败。

## 下一步要细化的问题

### A. Card Import Commit Plan 的最小结构

卡牌 commit plan 应参考装备包的 `EquipmentPackFinalCommitPlan`：由 Application Service 在 dry-run / stage import data 成功后生成，加入最终 `packId`、`importedAt` 和 lifecycle 默认值，再交给 repository commit。

需要确定 plan 里保存的是：

- pack identity；
- imported timestamp；
- lifecycle default, currently `disabled: false`；
- import source summary；
- pack metadata；
- staged import content；
- image asset contents；
- summary。

推荐方向：plan 保留足够让 **Storage Format Adapter** 生成 selected storage format 的业务数据，但不要直接包含 legacy `BatchData`、localStorage key、IndexedDB table name 或 UI message。

第一版 card plan 可类比：

```ts
interface CardImportFinalCommitPlan {
  packId: string
  packData: CardPackImportModel
  templateIds: string[]
  source?: CardImportStoredSource
  importedAt: string
  disabled: false
  assets: {
    cardImages: CardImportImageAsset[]
  }
}
```

Plan 不应包含：

- localStorage content key；
- IndexedDB table name；
- legacy `BatchData`；
- generated index entry；
- pack-scoped image storage key。

这些属于 **Storage Format Adapter** 或 **Storage Backend Adapter**。

### B. Storage Transaction 的顺序

Formal DHCB import 必须强一致。Index 只能在 card content 和图片都成功后写入。

已确认 storage transaction 内部顺序为：

```text
write content -> write pack-scoped images -> write index -> load post-transaction snapshot
```

图片不是单独的公开 `assetCommit` 阶段。Card content、pack-scoped images 和 index update 都属于 repository `storageTransaction`。

### C. Conflict Check 的状态输入

当前 duplicate id 检查依赖现有 store state。新流程应改为从 repository/application service 构造 conflict context。

推荐方向：commit path 不直接读 UI store，而是接收一个由 repository 生成的 conflict context。

Conflict check 是 `Card Import Commit Plan` 的前置条件，而不是 plan 或 repository commit 的业务职责。

Conflict check 负责：

- imported card id 和 builtin card id 冲突；
- imported card id 和已安装 custom card id 冲突；
- 同一个 pack 内部重复 id；
- 未来如有 pack id 冲突，也应在这里处理。

DHCB image card id 必须能对应 staged card id 这个规则已经属于 dry-run semantic validation；formal import 不应另起一套 orphan image 规则。

Storage backend adapter 仍可做最后防御，例如 packId 已存在时拒绝写入，但不应承载业务层 ID 规则判断。

### D. Runtime Refresh 的责任

已确认：本阶段不设计新的 runtime registry。Storage commit 完成后，通过 **Runtime Refresh Adapter** 复用现有 card store reload / rebuild helpers。

Runtime refresh 失败时，本次 formal import 仍视为失败。Application service 调用 `repository.removePack(packId)` 做提交后补偿；如果补偿也失败，则返回失败并暴露 recovery-required 信息。

## 非目标

- 不改变 legacy card format 是否可导入。
- 不改变 formal import 对 ancestry pair / subclass triple 的宽松行为。
- 不把 editor validation 接入作为本阶段目标。
- 不重做 editor UI。
- 不迁移已安装 card batch 的存储格式。
- 不在本阶段引入 storage v2。
- 不重构 builtin card source 和 runtime registry。
- 不改变 built-in base cards 当前初始化方式；未来可单独讨论是否不再把 built-in base 写入 localStorage / batch-like state。
- 不发布新的默认 editor export 格式。
- 不发布 `daggerheart.card-pack.v1` 作为默认 public schema。
- 不在本阶段发布 `card-pack.legacy.schema.json`；Legacy Published Format Schema 是否作为 Public Release Package 的交付物，留到公开发布门禁再决定。
- 不在正式导入路径保留旧实现和新实现两套真实业务逻辑。
