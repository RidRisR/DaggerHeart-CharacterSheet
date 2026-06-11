# 自定义装备卡包系统阶段 3：Storage Repository、事务与完整性恢复细化

日期：2026-06-04
状态：设计细化中，待审阅
上游设计：`2026-05-30-custom-equipment-pack-system-phased-design.md`
前置设计：

- `2026-05-31-custom-equipment-pack-stage-1-contract-design.md`
- `2026-05-31-custom-equipment-pack-stage-2-import-pipeline-diagnostics-design.md`
- `2026-06-04-custom-equipment-pack-runtime-cache-view-design.md`

## 阶段目标

阶段 3 负责把自定义装备包从阶段 1+2 的 dry run / fake commit gate 推进到真实可提交、可删除、可禁用、可恢复的持久化系统。

阶段 3 不负责：

- 完整装备选择 UI。
- Zustand store。
- 完整装备选择页面。
- 复杂 runtime cache 优化、组合索引或后续查询 API 扩展。
- 内置装备 legacy adapter；内置源数据应在后续执行中迁移为 canonical 标准格式。
- 卡牌包导入重构。
- 角色表装备槽结构化存档升级。

阶段 3 的 repository port 仍然只负责 storage。由于阶段 3 尚未执行，当前阶段目标需要扩展为一个完整提交闭环：Application Service 在 storage transaction 成功后调用 runtime cache build，使普通 commit 成功结果真正达到 runtime-available。运行时缓存结构、查询索引和 reader 细节见 `2026-06-04-custom-equipment-pack-runtime-cache-view-design.md`。

## 总设计回写偏移

阶段 3 引入了两个需要回写总设计的新决策：

- 装备包 storage core 不绑定 localStorage；localStorage 只是第一版 persistence adapter。
- Storage index 不保存 pack 摘要、template id 列表或内容计数；index 只作为 lifecycle authority，pack data 作为 content authority，conflict context 从 pack data 派生。
- Storage snapshot 不物化 template id 列表、武器数量、护甲数量等查询摘要；这些内容通过 helper 或后续 runtime read model 派生。
- 阶段三执行闭环必须包含 `runtimeCacheBuild`，旧的 `registryRebuild` 术语应废弃。
- 内置装备不设计长期 canonical adapter；内置源数据应直接迁移为 canonical 标准格式，并作为 runtime cache build 的输入。

因此总设计中“独立 localStorage 存储”“index 存 pack 摘要和模板 id 列表”以及“storage snapshot 物化 pack 摘要”的表述需要收紧。

## 已确认分层

第三阶段采用 storage-neutral 分层：

```text
Import Pipeline
  -> Application Service / Use Case
  -> EquipmentPackRepository Port
  -> Persistence Adapter
       - LocalStorageEquipmentPackRepository 第一版实现
       - backend / IndexedDB adapter 未来实现
  -> EquipmentRuntimeCacheService
  -> UI Store / Runtime Reader
```

### Import Pipeline

阶段 1+2 已实现 import pipeline。它负责：

- source read / JSON parse。
- authoring preprocess。
- structural validation。
- canonical normalize。
- semantic validation。
- conflict check。
- stage import data。

Import pipeline 不直接读写 localStorage、后端、Zustand store 或 runtime cache。

### Application Service

阶段 3 新增 application service，编排完整业务用例：

```ts
interface EquipmentPackApplicationService {
  initialize(): Promise<EquipmentPackInitializeResult>
  importFromSource(
    source: EquipmentPackImportSource,
    options?: EquipmentPackImportOptions,
  ): Promise<EquipmentPackImportResult>
  removePack(packId: string): Promise<EquipmentPackLifecycleResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<EquipmentPackLifecycleResult>
  loadSnapshot(): Promise<EquipmentPackStorageSnapshot>
  buildConflictContext(snapshot?: EquipmentPackStorageSnapshot): Promise<EquipmentPackConflictContext>
}

interface EquipmentPackInitializeResult {
  success: boolean
  stage: "runtimeCacheBuild"
  storageCommitted: false
  snapshot: EquipmentPackStorageSnapshot
  diagnostics: EquipmentPackLifecycleDiagnostic[]
}
```

Application service 知道“导入、删除、启用、禁用”的业务顺序，但不直接调用 `localStorage.setItem` 或 React/Zustand API。

Application service 是唯一编排 import commit / remove / toggle lifecycle 的用例层。UI store、repository adapter 和 import pipeline 不应重复实现这些流程。

`initialize()` 是 application service 的启动入口：它必须通过 repository 执行恢复式读取，然后尝试重建 runtime cache，并返回包含可信 `EquipmentPackStorageSnapshot` 与 runtime cache diagnostics 的结构化初始化结果。后续 import/remove/toggle 可以基于这个前提，不在每个 lifecycle action 中重复校验 pack data。

Initialize 的推荐流程：

```text
1. repository.loadSnapshot()
2. runtimeCacheService.rebuild({ builtinTemplates, storageSnapshot })
3. return EquipmentPackInitializeResult with snapshot and diagnostics
```

Startup 不设计阻塞式错误页：如果 runtime cache rebuild 失败，`initialize()` 返回 `success: false` 与 diagnostics，由调用方决定如何展示；它不回滚 storage recovery，也不抛弃 recovered snapshot。

Import commit 的推荐流程：

```text
1. repository.loadSnapshot()
2. build conflict context from snapshot
3. run import pipeline through validation / normalize / staging
4. build commit plan: generate packId from current snapshot and attach lifecycle metadata
5. repository.commitImport(plan)
6. runtimeCacheService.rebuild({ builtinTemplates, postTransactionSnapshot })
7. map final import result
```

因此阶段 3 需要把当前阶段 2 的 `EquipmentPackCommitPlan` 进一步拆清楚：

- Import pipeline 产出 staged import draft。
- Application service 在 `Build Commit Plan` 阶段生成最终 `packId` 并组装 final commit plan。
- Repository 只提交已经带 `packId` 的 final commit plan，并防御性拒绝重复 `packId`。
- Runtime cache build 只在 repository transaction 成功后触发；如果 storage 成功但 cache build 失败，返回 `stage: "runtimeCacheBuild"`、`success: false`，storage 不回滚。

### Repository Port

`EquipmentPackRepository` 是持久化能力契约，不绑定具体存储。

```ts
interface EquipmentPackRepository {
  loadSnapshot(): Promise<EquipmentPackStorageSnapshot>
  commitImport(plan: EquipmentPackCommitPlan): Promise<EquipmentPackStorageTransactionResult>
  removePack(packId: string): Promise<EquipmentPackStorageTransactionResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<EquipmentPackStorageTransactionResult>
  ensureIntegrity(): Promise<EquipmentPackIntegrityReport>
}
```

Repository port 的职责：

- 读取当前 storage snapshot，并在读取过程中执行必要的 integrity recovery。
- 执行 import/remove/toggle transaction。
- 提供显式完整性确保入口，可检查并恢复 storage。
- 返回 storage-neutral result 和 issue。

`loadSnapshot()` 是公开的恢复式读取入口：它总是返回已完成 integrity recovery 的 snapshot。底层 adapter 可以有 raw read helper，但 raw storage state 不暴露到 repository port 外部。

`ensureIntegrity()` 是显式自检/修复入口，只返回 `EquipmentPackIntegrityReport`，不返回 snapshot。需要修复后刷新列表时，由 application service 再调用 `loadSnapshot()`；这是低频管理路径，不为它引入第二种 snapshot 返回形状。

Repository transaction 成功必须返回 post-transaction storage snapshot。Application service 使用该 snapshot 做 storage result mapping；除非 adapter 明确处于不确定恢复状态，否则成功 transaction 后不应再额外调用 `loadSnapshot()` 重新读取。

Lifecycle transaction 默认基于初始化或显式 integrity recovery 已建立的 valid storage snapshot。程序初始化完成后，不假设 pack data 会在正常运行期突然损坏；remove 和 toggle 不重复验证 pack data。Pack data 读取、格式检查和损坏恢复属于 `initialize()` / `loadSnapshot()` / `ensureIntegrity()` 触发的恢复式读取职责。

```ts
type EquipmentPackStorageTransactionResult =
  | {
      ok: true
      snapshot: EquipmentPackStorageSnapshot
      issues: EquipmentPackStorageIssue[]
    }
  | {
      ok: false
      snapshot?: EquipmentPackStorageSnapshot
      issues: EquipmentPackStorageIssue[]
    }
```

失败时 `snapshot` 可选：

- 写入前失败可以返回原 snapshot。
- 写入后 rollback 成功可以返回恢复后的 snapshot。
- rollback 失败或状态不确定时不返回 snapshot，只返回 issues。

Repository port 不负责：

- UI toast。
- React state。
- 完整 template query/filter。
- 从 raw import source 做 schema validation。

### Persistence Adapter

第一版 persistence adapter 是 localStorage：

```ts
createLocalStorageEquipmentPackRepository(storage: Storage)
```

后续可以新增：

```ts
createIndexedDbEquipmentPackRepository(db)
createBackendEquipmentPackRepository(client)
```

核心 import pipeline、application service 和 lifecycle 语义不应因为 adapter 改变而重写。

### UI Store

第三阶段不实现 Zustand store。

Store 是客户端投影，不是持久化真源。后续 store 应从 application service / repository snapshot hydrate。

原则：

- commit 成功前，store 不得接收新的 pack 业务数据。
- commit 成功后，store 可以重新 load snapshot，或应用 transaction 返回的 snapshot。
- store 可以管理 loading/error/result 展示状态，但不定义 storage transaction 语义。

## Storage Model

Storage model 是 storage-neutral 的持久化模型。localStorage key 是 localStorage adapter 的内部细节，不进入 repository port 契约。

### Storage Index

Index 是 lifecycle authority，只保存 pack 的生命周期、导入来源和定位状态。

```ts
interface EquipmentPackStorageIndex {
  format: "daggerheart.equipment-pack-index.v1"
  packs: Record<string, EquipmentPackIndexEntry>
  updatedAt: string
}

interface EquipmentPackIndexEntry {
  importedAt: string
  disabled: boolean
  source?: EquipmentPackStoredSource
}

interface EquipmentPackStoredSource {
  originKind: EquipmentPackImportOriginKind
  label?: string
  fileName?: string
  sizeBytes?: number
}
```

Index 不保存：

- pack name。
- author。
- content version。
- description。
- weapon count。
- armor count。
- template id 列表。

这些都从 pack data 派生。

### Pack Data

Pack data 是 content authority，只保存 canonical pack 内容。

```ts
interface EquipmentPackStoredData {
  format: "daggerheart.equipment-pack-data.v1"
  pack: NormalizedEquipmentPackData
}
```

Pack data 不保存：

- `packId`。
- `disabled`。
- localStorage key。
- source metadata。

`packId` 来自 index entry key 或 adapter 的外部定位，不属于 pack content。

### Snapshot

Snapshot 是 repository 读取 index + pack data 后派生出的当前系统状态。它不是持久化格式，也不直接暴露持久化 `EquipmentPackStorageIndex`。它是 repository 输出，不是主页面长期 store 契约。

```ts
interface EquipmentPackStorageSnapshot {
  packs: Map<string, EquipmentPackSnapshotEntry>
  packCount: number
  integrity: EquipmentPackIntegrityReport
}

interface EquipmentPackSnapshotEntry {
  packId: string
  importedAt: string
  disabled: boolean
  source?: EquipmentPackStoredSource
  pack: NormalizedEquipmentPackData
}
```

规则：

- snapshot 不物化 `templateIds`、`weaponCount`、`armorCount`；这些查询摘要通过 helper 或后续 runtime read model 从 `pack` 派生。
- `disabled` 只存在 index，不存在 pack data。
- `packCount` 从 snapshot `packs.size` 派生，用于 pack 数量限制和测试断言。
- snapshot 不暴露 `index`，避免上层 Application Service 或未来 UI/cache store 依赖持久化格式。
- snapshot 是否长期保留、释放或转换为更轻的 runtime read model，属于后续 cache/store policy，不属于阶段 3 storage repository 的职责。
- index 中不存在的 pack 不存在；孤立 pack data 是 orphan data。
- pack data 缺失的 index entry 不可用，应由 integrity recovery 删除。
- disabled pack 仍以完整 pack data 存在于 Storage Snapshot / management state 中；它只从 selectable runtime read model 中排除。

推荐 helper：

```ts
function getEquipmentPackTemplateIds(entry: EquipmentPackSnapshotEntry): string[]
function getEquipmentPackWeaponCount(entry: EquipmentPackSnapshotEntry): number
function getEquipmentPackArmorCount(entry: EquipmentPackSnapshotEntry): number
```

性能边界：

- 阶段 3 不为 snapshot 设计 per-pack 摘要缓存。
- 当前包大小上限 500 KiB，包数量上限 50；从单个 pack data 派生 template IDs 和数量的成本可接受。
- 如果主页面选择流后续需要更强性能，应在阶段 5 的 selectable runtime read model / query index 中缓存，而不是回写 storage snapshot 或 storage index。

## LocalStorage Adapter

LocalStorage adapter 第一版使用短 key：

```ts
const LOCAL_STORAGE_KEYS = {
  INDEX: "dh_equipment_index",
  PACK_PREFIX: "dh_equipment_pack:",
} as const
```

单包 key：

```text
dh_equipment_pack:<packId>
```

原则：

- localStorage key 只属于 localStorage adapter。
- 其他模块不能手写或拼接这些 key。
- `PACK_PREFIX` 带冒号，方便扫描 orphan pack key，降低误匹配。

## Pack ID

`packId` 是系统生成的 storage / management identity，不是 template id。

规则：

- 只用于 pack storage 和 pack management。
- 不进入 template id。
- 不进入角色表装备槽。
- 不参与内容覆盖策略。
- 重复导入同一内容包仍由 template id conflict 拒绝。
- 生成后必须检查当前 index 是否已存在。

第一版算法沿用现有 card batch id 的 timestamp + random 结构，但使用 equipment pack 术语：

```text
pack_<Date.now()>_<random6>
```

示例：

```text
pack_1780257600000_k8x4p2
```

生成规则：

- random 使用 `Math.random().toString(36).substring(2, 8)`。
- 最多重试 10 次。
- 10 次仍冲突，产生 `PACK_ID_GENERATION_FAILED`。

阶段 3 需要新增 import error code：

```ts
type EquipmentPackImportErrorCode =
  | ...
  | "PACK_ID_GENERATION_FAILED"
```

结果语义：

- `stage: "buildCommitPlan"`。
- `success: false`。
- `path: ""`。
- message 表达无法生成唯一 equipment pack id。

## Conflict Context

Conflict context 是 import pipeline 在 `Conflict Check` 阶段需要的当前系统占用快照。它不是持久化格式。

阶段 3 中，conflict context 必须从 repository snapshot 派生，而不是从 index 中重复存储的 template id 列表读取。

规则：

- enabled custom pack template id 占用。
- disabled custom pack template id 也占用。
- deleted pack template id 不占用。
- corrupted pack data 在 integrity recovery 后应移除，不占用。
- 如果 stored pack 之间已经存在 template id 冲突，不自动删除任何 pack；conflict context 应保守地视这些 id 为占用，避免新导入加剧冲突。
- pack 数量限制从 snapshot `packCount` 计算；repository adapter 内部仍可从 index entry 数量派生它。

## Transaction Semantics

### Import Commit

导入 commit 顺序：

```text
1. load snapshot
2. build next index and next pack data in memory
3. serialize next pack data
4. serialize next index
5. write pack data
6. write index
7. return post-transaction snapshot
```

原则：

- index 是生命周期权威和可发现入口，不能先写。
- pack data 先写，index 后写。
- index 写成功前，业务上不得认为 pack 已导入。
- repository commit 成功前，application service 不更新 UI store；runtime read model 不属于阶段 3。

失败处理：

- pack data serialize 失败：不写任何内容，返回 `STORAGE_SERIALIZE_FAILED`。
- index serialize 失败：不写任何内容，返回 `STORAGE_SERIALIZE_FAILED`。
- pack data 写失败：不写 index，返回 `STORAGE_WRITE_FAILED` 或 `STORAGE_QUOTA_EXCEEDED`。
- pack data 写成功但 index 写失败：删除刚写入的 pack data key，并返回 storage failure。
- 回滚删除也失败：返回 storage failure，并附带 `ROLLBACK_FAILED` storage issue。

### Remove Pack

删除顺序：

```text
1. load snapshot
2. confirm packId exists in index
3. build next index without pack entry
4. serialize next index
5. write index
6. remove pack data
7. return post-transaction snapshot
```

原则：

- 删除先写 index，再删 pack data。
- index 删除成功后，业务上 pack 已不存在。
- pack data 删除失败只会留下 orphan data，后续 integrity recovery 可以清理。

失败处理：

- pack 不存在：返回 `PACK_NOT_FOUND` lifecycle result，不当作 storage corruption。
- index serialize 失败：不写任何内容。
- index 写失败：不删除 pack data。
- index 写成功但 pack data 删除失败：transaction `ok: true`，返回不含该 pack 的 post-transaction snapshot，并附带 recoverable issue `ORPHAN_PACK_DATA_CLEANUP_PENDING`。

理由：

- index 是 lifecycle authority，index entry 删除后 pack 在业务上已经不存在。
- 残留 pack data 是 orphan data，不应让用户误以为 pack 仍存在。
- 后续 integrity recovery 会清理 orphan pack data。
- recoverable issue 保留给管理 UI、日志或自检报告展示。

### Disable / Enable Pack

启用/禁用只修改 index：

```text
1. use current valid snapshot
2. confirm packId exists in index
3. build next index with disabled changed
4. serialize next index
5. write index
6. return post-transaction snapshot
```

规则：

- pack data 不写入 disabled。
- toggle 不重新读取或校验 pack data；它信任初始化阶段已经建立的 valid snapshot。
- disabled pack 仍以完整 pack data 保留在 snapshot。
- disabled pack 不进入后续 selectable runtime read model，但仍存在于 management state。
- disabled pack 仍参与 conflict context。

## Storage Issues

Storage / lifecycle 层使用自己的 issue code，不把所有问题硬塞进 import diagnostic。

```ts
type EquipmentPackStorageIssueCode =
  | "PACK_NOT_FOUND"
  | "INDEX_READ_FAILED"
  | "INDEX_PARSE_FAILED"
  | "INDEX_FORMAT_INVALID"
  | "PACK_DATA_READ_FAILED"
  | "PACK_DATA_PARSE_FAILED"
  | "PACK_DATA_FORMAT_INVALID"
  | "PACK_ID_GENERATION_FAILED"
  | "STORAGE_SERIALIZE_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_WRITE_FAILED"
  | "ROLLBACK_FAILED"
  | "ORPHAN_PACK_DATA"
  | "MISSING_PACK_DATA"
  | "TEMPLATE_ID_CONFLICT"
  | "ORPHAN_PACK_DATA_CLEANUP_PENDING"
```

Import application service 负责把 commit 相关 storage issue 映射为阶段 2 的 import result diagnostics。阶段 3 新增 `PACK_ID_GENERATION_FAILED` 后，pack id 生成失败不再伪装成 storage write failure。

## Integrity Recovery

启动自检原则：

```text
只自动修复生命周期上不可见或不可用的数据。
不自动改写仍可解析的业务内容。
```

### Integrity Report

```ts
interface EquipmentPackIntegrityReport {
  ok: boolean
  repaired: boolean
  issues: EquipmentPackStorageIssue[]
  removedIndexEntries: string[]
  removedOrphanPackKeys: string[]
  removedCorruptedPackKeys: string[]
}
```

### Recovery Rules

Index 不存在：

- 创建空 index。
- 扫描并删除所有 `dh_equipment_pack:` orphan pack data。
- 首次启动没有 orphan data 时不算错误。

Index JSON 损坏或格式不合法：

- 创建空 index。
- 删除所有 `dh_equipment_pack:` pack data。
- 记录 `INDEX_PARSE_FAILED` 或 `INDEX_FORMAT_INVALID`。

Index entry 指向缺失 pack data：

- 删除该 index entry。
- 重写 index。
- 记录 `MISSING_PACK_DATA`。

Pack data key 没有 index entry：

- 删除 orphan pack data key。
- 记录 `ORPHAN_PACK_DATA`。

Pack data JSON 损坏或格式不合法：

- 删除 pack data key。
- 删除对应 index entry。
- 重写 index。
- 记录 `PACK_DATA_PARSE_FAILED` 或 `PACK_DATA_FORMAT_INVALID`。

Stored pack 之间出现 template id 冲突：

- 不自动删除任何 pack。
- 记录 `TEMPLATE_ID_CONFLICT`。
- 该状态需要后续 management UI 或开发诊断处理。
- Runtime read model 不应让冲突模板以不确定方式覆盖彼此。

Disabled pack：

- disabled pack 仍必须读取和校验。
- disabled pack 仍占用 template id。
- disabled pack 不进入 selectable runtime read model。

不再设计 `SUMMARY_MISMATCH`，因为 index 不保存内容摘要。

## 验收条件

阶段 3 设计完成的验收条件：

- 已固定 storage-neutral repository port。
- 已固定 localStorage adapter key：`dh_equipment_index`、`dh_equipment_pack:`。
- 已固定 index 只存 lifecycle，不存内容摘要。
- 已固定 pack data 只存 canonical pack 内容。
- 已固定 conflict context 从 snapshot / pack data 派生。
- 已固定 `pack_<timestamp>_<random6>` packId 生成规则。
- 已固定 `PACK_ID_GENERATION_FAILED` import error code。
- 已固定 import/remove/toggle transaction 顺序。
- 已固定 integrity recovery 自动删除与不自动修复边界。
- 已固定第三阶段不做 Zustand store。
- 已固定第三阶段不做完整装备选择 UI。
- 已固定 repository 不设计 runtime cache/read model 接口。
- 已固定 Application Service 在 import/remove/toggle/initialize 的成功 storage transaction 后触发 runtime cache build。

## 测试清单

### Repository Port

- `loadSnapshot()` 在空 storage 下创建空 index，并返回空 `packs`、`packCount: 0`。
- `loadSnapshot()` 遇到 orphan/corrupted storage 时先执行 recovery，再返回恢复后的 snapshot。
- `commitImport(plan)` 后 snapshot 能读出 pack。
- `removePack(packId)` 后 pack 从 snapshot 消失，`packCount` 更新。
- `setPackDisabled(packId, true)` 只改变 index lifecycle 状态。
- `setPackDisabled(packId, true)` 不重新读取或校验 pack data。
- disabled pack 仍以完整 pack data 保留在 snapshot 中。

### LocalStorage Adapter Transaction

- import 写入顺序：pack data 先于 index。
- pack data 写失败时 index 不写。
- index 写失败时刚写入的 pack data 被回滚删除。
- rollback 删除失败时返回 `ROLLBACK_FAILED` issue。
- remove 写入顺序：index 先移除 entry，再 remove pack data。
- remove pack data 失败时 transaction 仍为 `ok: true`，snapshot 不包含该 pack，并返回 recoverable issue。
- disabled 只写 index，不写 pack data。

### Integrity Recovery

- index 不存在时创建空 index。
- index 损坏时创建空 index，并删除所有 `dh_equipment_pack:` 数据。
- index entry 缺 pack data 时删除 index entry。
- orphan pack data 被删除。
- pack data JSON 损坏时删除 pack data 和 index entry。
- disabled pack 的 pack data 也会被校验。
- stored pack template id 冲突时不自动删除，并报告 issue。

### Application Service

- commit import 使用 repository snapshot 构造 conflict context。
- `PACK_ID_GENERATION_FAILED` 停在 `stage: "buildCommitPlan"`，不调用 repository commit。
- repository transaction 成功返回 post-transaction snapshot。
- commit 成功后触发 runtime cache build；build 成功才返回 `stage: "runtimeCacheBuild"`、`success: true`。
- storage transaction 成功但 runtime cache build 失败时，返回 `stage: "runtimeCacheBuild"`、`success: false`，不 rollback storage。
- repository commit 失败时不产生 post-commit storage result。
- dry run 不写 repository。
- deleted pack 释放 template id，后续同 id 可导入。
- disabled pack 仍占用 template id。

### Pack ID

- 生成格式为 `pack_<timestamp>_<random6>`。
- 与现有 index 冲突时重试。
- 10 次都冲突时报 `PACK_ID_GENERATION_FAILED`。
- 不使用 `batch`。

### Verification

实现阶段最终至少通过：

```bash
pnpm vitest run equipment/import equipment/packs
pnpm tsc --noEmit --pretty false
```
