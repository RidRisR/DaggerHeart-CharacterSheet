# 自定义装备卡包系统：运行时缓存视图设计

日期：2026-06-04
状态：设计细化中
相关设计：

- `2026-05-30-custom-equipment-pack-system-phased-design.md`
- `2026-06-04-custom-equipment-pack-stage-3-storage-repository-design.md`

## 设计动机

阶段 3 的 storage/repository 设计可以说明装备包如何持久化、删除、禁用和恢复，但仅完成 storage transaction 仍不足以定义完整的“导入成功并可用”。

完整导入成功语义还需要回答：

- storage snapshot 如何进入内存。
- 内存中稳定缓存视图包含哪些数据。
- 主页面选择流程查询哪个视图。
- disabled pack 在管理视图和选择视图中的边界。
- 导入、删除、启用、禁用后如何让内存视图稳定。

因此本文件单独讨论运行时缓存视图。只有当本文件与阶段 3 storage/repository 设计发生实质冲突时，才回写阶段 3 文档。

## 初始边界

新的合理完成边界不是 localStorage commit，也不是 repository `StorageSnapshot`，而是在内存中建立一个稳定可查询的 `Stable Runtime Cache View`。

关系：

```text
Storage Index + Pack Data
  -> recovered StorageSnapshot
  -> Stable Runtime Cache View
  -> selection/query flows
```

初始原则：

- `StorageSnapshot` 是 repository 输出，不是主页面长期 store 契约。
- `Stable Runtime Cache View` 是内存视图，用于运行时查询和选择流程。
- 导入完成并可用，应以 `Stable Runtime Cache View` 建立完成为准。
- 本文件先讨论缓存视图形状和生命周期，不直接改写 storage/repository 设计。

## 需求汇总

先从使用需求反推缓存结构，而不是先决定索引形状。

### 初始化

- 从 built-in equipment 和 recovered `StorageSnapshot` 构建稳定内存视图。
- 初始化完成后，主页面能够查询装备模板。
- corrupted/orphan storage 已经在 repository 层恢复，不进入缓存视图。

### 管理

- 列出所有 custom packs，包括 disabled pack。
- 查看某个 pack 的 metadata 和全部装备模板。
- 启用、禁用、删除 pack。
- 已知 template id 时，能够判断它属于哪个 pack。
- 已知 pack id 时，能够列出该 pack 下的全部 template ids / templates。

### 选择与查询

- 查询所有可选择装备模板。
- 按 weapon / armor 查询。
- 按 tier、trait、pack/source 查询。
- 支持多条件组合查询。
- 已知 template id 时，快速取得模板。
- 多条件查询不预先为所有条件组合建立组合索引；优先使用单维索引选候选集，再交集或过滤。

### 导入完成语义

- 成功导入后，storage 已提交。
- `Stable Runtime Cache View` 已更新到包含新 pack。
- 如果新 pack 是 enabled，查询接口可以立即查到它的模板。
- 如果缓存视图构建失败，不能宣称导入完成并可用。

### 未来扩展

- built-in equipment 和 custom equipment 应统一进入查询视图。
- disabled pack 保留管理可见，但选择不可见。
- 完整模板数据在内存中只保存一份；外部索引只保存 id。
- 后续可以根据真实性能瓶颈增加更细的查询索引，但第一版不做组合索引爆炸。

## 方案基线：三层缓存结构

`Stable Runtime Cache View` 采用三层结构：

```text
Stable Runtime Cache View
  -> Entity Cache
  -> Relation Indexes
  -> Query Indexes
```

### Entity Cache

Entity cache 保存完整对象。完整装备模板数据只在这里保存一份。

```ts
interface EquipmentRuntimeEntityCache {
  packsById: Map<PackId, RuntimePackRecord>
  templatesById: Map<TemplateId, RuntimeEquipmentTemplate>
}
```

规则：

- `packsById` 用于管理视图，包含所有 custom packs，包括 disabled packs。
- `templatesById` 用于模板详情查询，包含 built-in templates 和 custom templates。
- `RuntimeEquipmentTemplate` 尽量保持为 normalized canonical equipment template，不混入 pack lifecycle 或 UI 状态。
- built-in templates 进入 `templatesById`，但不进入 custom `packsById`。
- built-in 在缓存视图中使用虚拟 source id `"builtin"`。
- disabled custom pack 的 templates 仍进入 `templatesById`。
- `packId`、`source`、`disabled`、`importedAt` 等归属或生命周期信息不写入 template 本体；通过 `packsById` 和 relation indexes 表达。

### Relation Indexes

Relation indexes 表达实体归属关系，是核心数据关系，不只是性能优化。

```ts
interface EquipmentRuntimeRelationIndexes {
  templateToPackId: Map<TemplateId, PackId | "builtin">
  packToTemplateIds: Map<PackId | "builtin", TemplateId[]>
}
```

支持：

- 已知 template id 查询它属于哪个 pack。
- 已知 pack id 查询该 pack 下所有 templates。
- 删除或禁用 pack 时定位受影响 templates。
- built-in templates 在 `templateToPackId` 中映射到 `"builtin"`。
- `packToTemplateIds` 使用 `"builtin"` key 记录全部 built-in template ids。
- disabled custom pack 的 templates 仍进入 `templateToPackId` 和 `packToTemplateIds`，保持管理可见和 template id 占用。

### Query Indexes

Query indexes 服务运行时筛选和选择，只保存 template id，不复制完整模板。

```ts
interface EquipmentRuntimeQueryIndexes {
  selectableTemplateIds: TemplateId[]
  weaponTemplateIds: TemplateId[]
  armorTemplateIds: TemplateId[]
  templateIdsByTier: Map<number, TemplateId[]>
  templateIdsByTrait: Map<string, TemplateId[]>
  templateIdsByWeaponType: Map<"primary" | "secondary", TemplateId[]>
  templateIdsByDamageType: Map<string, TemplateId[]>
  templateIdsByRange: Map<string, TemplateId[]>
  templateIdsByBurden: Map<string, TemplateId[]>
  templateIdsBySource: Map<"builtin" | PackId, TemplateId[]>
}
```

规则：

- query indexes 默认只包含 selectable templates。
- disabled pack 的 templates 进入 `templatesById` 和 relation indexes，但不进入 `selectableTemplateIds`。
- disabled pack 的 templates 不出现在选择流程的默认查询结果中。
- `weaponTemplateIds`、`armorTemplateIds`、`templateIdsByTier`、`templateIdsByTrait`、`templateIdsByWeaponType`、`templateIdsByDamageType`、`templateIdsByRange`、`templateIdsByBurden`、`templateIdsBySource` 默认都只索引 selectable templates。
- built-in templates 进入 `templatesById` 和 query indexes。
- built-in 和 custom templates 在查询路径中统一处理。
- built-in 不进入 custom pack 管理列表。
- 多条件查询不预建组合索引；查询函数从最窄候选集开始做交集或过滤。
- 管理视图如需查看 disabled pack 的 weapon / armor，应通过 `packToTemplateIds` 取得 pack 内 templates，再从 `templatesById` 读取并过滤，而不是使用全局 query indexes。
- 不单独维护 `allTemplateIds`；全量 template ids 从 `templatesById.keys()` 派生，selectable 全量使用 `selectableTemplateIds`。

### 稳定排序

所有 query index 的 template id 列表必须保持稳定顺序：

1. built-in templates 在前。
2. custom packs 按 `importedAt` 升序。
3. 同一 pack 内按 pack 文件中的原始 template 顺序。
4. 单维筛选列表保留全局 selectable 顺序中的相对顺序。

这样查询结果稳定、测试可预测，也避免不同索引之间出现无意义顺序差异。

多条件查询只过滤候选集，不引入额外排序。返回结果必须保留 `selectableTemplateIds` 中的全局相对顺序。

### 总结构

```ts
interface StableEquipmentRuntimeCacheView {
  entities: EquipmentRuntimeEntityCache
  relations: EquipmentRuntimeRelationIndexes
  queries: EquipmentRuntimeQueryIndexes
  integrity: EquipmentRuntimeCacheIntegrity
}
```

## 构建策略

第一版采用全量重建。

生命周期边界：

- 进入主页面后，runtime cache 按只读视图使用；主页面选择流程不修改 cache。
- 管理页面会执行导入、删除、启用、禁用等 storage mutation workflow；这些低频操作成功后需要重建 cache，保证管理结果和后续选择状态一致。
- 因此 cache rebuild 不是高频运行时行为，也不发生在每次查询、每次输入搜索或每次 React render 中。

触发点：

- 初始化，从 built-in equipment 和 recovered `StorageSnapshot` 构建完整缓存视图。
- 导入成功后，从新的 post-transaction snapshot 全量重建。
- 删除成功后，从新的 post-transaction snapshot 全量重建。
- 启用/禁用成功后，从新的 post-transaction snapshot 全量重建。

理由：

- 装备包总大小上限为 500 KiB，包数量上限为 50，全量重建成本可控。
- 全量重建避免增量更新遗漏 relation indexes 或 query indexes。
- 全量重建测试更直接：输入 snapshot + built-ins，断言完整 cache view。
- 后续如果出现真实性能瓶颈，再基于相同 cache 结构增加增量更新。

规则：

- 不在第一版维护局部 dirty state。
- 不在第一版做 per-pack 增量 splice。
- 不在第一版做组合查询索引。
- 构建过程先生成 next cache view，成功后再替换 current cache view。
- 不允许边构建边修改 current cache view。

### Cache Owner

`Stable Runtime Cache View` 由 `EquipmentRuntimeCacheService` 持有，不由 Zustand store 直接持有和构建。

```ts
interface EquipmentRuntimeCacheService {
  rebuild(input: EquipmentRuntimeCacheBuildInput): EquipmentRuntimeCacheBuildResult
  getRuntimeReader(): EquipmentRuntimeReader
  getManagementReader(): EquipmentPackManagementReader
}
```

职责：

- 从 built-in equipment 和 recovered `StorageSnapshot` 构建 next cache view。
- 构建成功后替换 current cache view。
- 暴露 runtime reader 和 management reader。
- 保持 cache build 与 React / Zustand 解耦，便于测试和未来存储抽象。
- `rebuild` 是同步函数；输入已经在内存中，不执行 IO。
- 外层 application service 可以是 async，因为 storage/repository 操作是 async。
- `rebuild` 内部负责先构建 next cache view，成功后替换 current cache view。
- 外部调用方不直接接触 next cache view，也不负责替换 current cache view。

Zustand store 可以存在，但只作为 UI projection / adapter：

- 保存 loading / error / selected UI state。
- 调用 application service 和 cache service。
- 触发 React 更新。
- 不直接实现 cache build 逻辑。
- 不作为装备模板或装备包的领域真源。

### Orchestration

`Application Service` 负责在 use case 中调用 cache rebuild。

```text
import / remove / toggle
  -> repository transaction
  -> post-transaction StorageSnapshot
  -> cacheService.rebuild(snapshot + built-ins)
  -> map final result
```

职责边界：

- repository 只负责 storage transaction，不知道 runtime cache。
- cache service 只负责构建、替换和读取 cache view，不知道导入流程。
- Zustand store 只负责 UI projection，不编排 storage transaction 和 cache rebuild。
- application service 作为 use case 编排层，负责串起 import pipeline、repository transaction 和 cache rebuild。

### 构建失败

缓存构建应视为纯构建过程：

```text
built-in equipment + recovered StorageSnapshot
  -> Stable Runtime Cache View | build errors
```

失败规则：

- 构建失败时，不替换当前稳定缓存视图。
- 初始化时不做阻塞式错误页；已完成 recovery 且可读的数据进入 runtime / management reader，不可读的数据不展示。
- 初始化后如果没有任何可读数据，reader 返回空列表，管理页显示空表。
- 导入、删除、启用、禁用后构建失败，storage 可能已经变更，但 runtime cache 不可用。
- 如果缓存构建失败，不能宣称“导入完成并可用”。
- 构建失败需要返回结构化 build errors，后续用于 result stage / diagnostics 映射。
- 如果 storage transaction 已成功但 cache build 失败，不回滚 storage。
- 这类结果应表达为 storage committed, runtime cache failed。
- 用户或系统可以通过重新初始化 / 重建缓存恢复运行时视图。

初始化呈现策略：

- 读到的 pack/template 正常展示。
- 读不到、损坏或被 recovery 移除的数据不展示。
- 全部都读不到时不展示阻塞错误页，管理页显示空表，runtime query 返回空数组。
- 结构化 recovery/build issue 可以留给日志、开发诊断或后续高级详情，不强迫普通用户处理。

导入结果映射：

```ts
interface EquipmentPackImportResult {
  success: boolean
  stage: EquipmentPackImportPipelineStage
  storageCommitted?: boolean
  summary: EquipmentPackImportSummary
  diagnostics: EquipmentPackImportDiagnostic[]
}
```

当 storage transaction 成功但 cache build 失败时：

- `stage: "runtimeCacheBuild"`。
- `success: false`。
- `storageCommitted: true`。
- `summary.packId` 可以包含已提交的 pack id。
- diagnostics 使用 `RUNTIME_CACHE_BUILD_FAILED` 或 `RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID`。

当 cache build 成功时：

- `stage: "runtimeCacheBuild"`。
- `success: true`。
- `storageCommitted: true`。
- 查询接口应能立即查到 enabled pack 的 selectable templates。

### 阶段命名

后续 pipeline stage 使用 `runtimeCacheBuild` 表达缓存视图构建阶段。

理由：

- `registryRebuild` 暗示只重建 registry，范围过窄。
- 当前边界是建立完整 `Stable Runtime Cache View`，包含 entity cache、relation indexes 和 query indexes。
- `runtimeCacheBuild` 更准确表达导入完成前的运行时可用边界。

该决策需要同步回写总设计、阶段 1、阶段 2 和阶段 3，避免后续执行计划继续使用旧的 registry rebuild 边界。

### 构建错误

缓存构建错误保持轻量，不为理论异常设计过多错误码。

前提：

- custom pack 在进入 storage 前已经通过 public schema、semantic validation 和 conflict check。
- repository 公开读取返回的 `StorageSnapshot` 已经完成 integrity recovery。
- 因此 runtime cache build 不重复完整 import validation，只做必要防御。

第一版错误码：

```ts
type EquipmentRuntimeCacheBuildErrorCode =
  | "RUNTIME_CACHE_BUILD_FAILED"
  | "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID"
```

语义：

- `RUNTIME_CACHE_BUILD_FAILED` 用于无法归类的构建失败，例如内置数据 adapter 失败、索引构建异常或输入状态不满足构建前提。
- `RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID` 用于 built-in 与 custom、custom 与 custom 在缓存合并时仍出现 template id 冲突的防御性检查。

不在第一版单独拆分：

- unknown template kind。
- missing relation index entry。
- per-index build failed。
- built-in invalid 的细分类。

如果后续测试或真实故障显示某类错误需要单独处理，再从 `RUNTIME_CACHE_BUILD_FAILED` 中拆出更细错误码。

## 读取 API

外部调用方不直接读取或组合 query indexes，也不直接暴露 relation indexes。读取 API 收敛成两个面向工作流的 facade：

- runtime reader：只服务运行时选择流程。
- management reader：只服务装备包管理页。

内部 `entities`、`relations`、`queries` 只是实现细节。

```ts
interface EquipmentTemplateQueryCriteria {
  searchText?: string
  kind?: "weapon" | "armor"
  tiers?: number[]
  traits?: string[]
  weaponTypes?: Array<"primary" | "secondary">
  damageTypes?: string[]
  ranges?: string[]
  burdens?: string[]
  sourceIds?: Array<"builtin" | PackId>
}

interface EquipmentRuntimeReader {
  querySelectableTemplates(criteria?: EquipmentTemplateQueryCriteria): RuntimeEquipmentTemplate[]
  getSelectableTemplateById(templateId: TemplateId): RuntimeEquipmentTemplate | undefined
}

interface EquipmentPackManagementReader {
  listPacks(): RuntimePackSummary[]
  getPackDetail(packId: PackId): RuntimePackDetail | undefined
}

interface RuntimePackSummary {
  packId: PackId
  name: string
  author: string
  version?: string
  importedAt: string
  disabled: boolean
  weaponCount: number
  armorCount: number
}

interface RuntimePackDetail {
  pack: RuntimePackSummary & {
    description?: string
    source?: EquipmentPackStoredSource
  }
  templates: RuntimeEquipmentTemplate[]
}
```

规则：

- `querySelectableTemplates(criteria)` 只查询 selectable templates。
- `kind` 是选择器边界，保持单值；武器选择和护甲选择分别查询。
- `tiers`、`traits`、`weaponTypes`、`damageTypes`、`ranges`、`burdens`、`sourceIds` 是集合条件组。
- 单字段内多个值表示 OR；不同字段之间表示 AND。
- 空数组或未传的集合条件组表示不限制该字段，等价于选择全部当前可用值，不能独立产生空结果。
- `sourceIds` 筛选 Runtime Source：`builtin` 表示内置装备，Pack ID 表示 enabled equipment pack。它不是导入文件来源。
- 多条件查询由 `querySelectableTemplates` 内部选择候选集、交集或过滤。
- 返回顺序保留 `selectableTemplateIds` 的全局稳定顺序。
- `getSelectableTemplateById` 只返回 selectable template；disabled pack 的 template 返回 `undefined`。
- `listPacks` 包含 disabled packs，不包含 built-in。
- `getPackDetail` 返回 pack metadata 和该 pack 下全部 templates，包括 disabled pack 的 templates。
- 管理页不做复杂查询；它只需要列出 packs、展示必要 metadata，并在详情中展示该 pack 的 templates。
- `RuntimePackSummary` 只包含列表展示必要字段，不包含完整 templates。
- `RuntimePackDetail` 用于详情展示，包含 description、source 和 templates。
- 选择流程只能依赖 `EquipmentRuntimeReader`。
- 管理流程只能依赖 `EquipmentPackManagementReader`。
- query indexes 和 relation indexes 都是 cache view 内部实现细节，外部不直接依赖它们的形状。

多条件查询执行语义：

```text
1. 对每个非空集合条件组，从对应单维 index 取得每个选中值的 id 集合。
2. 同一条件组内做 union，但 union 结果必须按 selectableTemplateIds 的全局顺序稳定化。
3. 从所有非空条件组候选集中选择最窄候选 ID 列表。
4. 对候选 ID 读取 templatesById。
5. 使用完整 template 检查所有 criteria。
6. 返回结果保持 selectableTemplateIds 的全局稳定顺序。
```

外部只表达查询条件，不指定索引策略。后续可以调整内部索引结构而不影响调用方。

集合条件组的 union 不按用户勾选顺序或 index 拼接顺序排序。推荐实现是先把选中值对应的 id 放入 `Set`，再用 `selectableTemplateIds.filter((id) => allowed.has(id))` 生成稳定候选列表。

上线前必需筛选范围：

- `searchText`：文本搜索。
- `kind`：区分 weapon / armor。
- `tiers`：按一个或多个装备 tier 筛选。
- `traits`：按一个或多个 weapon trait / 属性筛选。
- `weaponTypes`：按 primary / secondary 筛选。
- `damageTypes`：按一个或多个伤害类型筛选。
- `ranges`：按一个或多个武器范围筛选。
- `burdens`：按一个或多个负荷筛选。
- `sourceIds`：按一个或多个 Runtime Source 筛选。

这些字段是第一版可用选择流程的必要能力，不作为后续可选增强处理。

武器专属条件传入护甲查询时不做宽容忽略：

- `kind: "armor"` 且 `traits`、`weaponTypes`、`damageTypes`、`ranges` 或 `burdens` 中任一条件组非空时，返回空结果。
- 未指定 `kind` 且存在武器专属条件时，护甲模板自然不匹配，结果只可能包含武器。
- 这保持调用方错误可见，避免用户明明设置了武器字段筛选却看到无关护甲结果。

文本搜索语义：

- weapon 搜索范围：名称、描述、特性名称。
- armor 搜索范围：名称、描述、特性名称。
- 第一版不建立全文搜索索引，也不维护 `searchTextByTemplateId` 投影。
- `searchText` 在候选集上按字段逐项做大小写不敏感包含匹配。
- 不把多个字段拼接成一个字符串，避免跨字段意外命中，也避免重复保存文本内容。
- 如果未来需要中文分词、权重排序或高亮，再单独设计搜索索引。

## 模板选择与角色表实例化

`Stable Runtime Cache View` 只负责模板查询和选择，不作为角色表已装备项的长期真源。

规则：

- 选择装备模板后，角色表必须保存实例化后的装备数据或必要快照。
- 角色表已装备项不能只保存 template id。
- 禁用或删除 custom pack 不应影响已经实例化到角色表里的装备。
- runtime cache 可以用于选择新装备，或在有 template id 时辅助查找当前 selectable template，但不能作为已装备实例回显的唯一来源。

这条规则保持和 storage lifecycle 一致：pack 的 enabled / disabled / deleted 只影响未来选择，不 retroactively 修改已经实例化的角色表装备。

## 已决策摘要

- `Stable Runtime Cache View` 采用 Entity Cache + Relation Indexes + Query Indexes 三层结构。
- built-in equipment 源数据应迁移为 canonical 标准格式，不设计长期 built-in adapter。
- 完整装备模板数据只保存在 `templatesById` 一份。
- `RuntimeEquipmentTemplate` 不混入 pack lifecycle、source、UI state。
- built-in templates 使用虚拟 source id `"builtin"`，进入 `templatesById`、relation indexes 和 query indexes，但不进入 custom `packsById`。
- disabled custom pack 进入 `packsById`、`templatesById` 和 relation indexes，但不进入 selectable query indexes。
- query indexes 默认只服务 selectable templates。
- 外部调用方不直接读取 indexes，只通过 `EquipmentRuntimeReader` 和 `EquipmentPackManagementReader`。
- runtime reader 只返回 selectable templates；management reader 可以查看 disabled pack 的详情。
- 第一版全量重建 cache，不做增量更新、dirty state 或组合查询索引。
- cache rebuild 由 `EquipmentRuntimeCacheService` 持有并执行，Zustand 只作为 UI projection / adapter。
- application service 负责在 import / remove / toggle 成功后调用 cache rebuild。
- cache build 失败不回滚已成功的 storage transaction。
- 后续 pipeline stage 使用 `runtimeCacheBuild`。
- 角色表已装备项必须保存实例化数据或必要快照，不能只保存 template id。

## 验收条件

- 初始化后能从 built-in equipment 和 recovered `StorageSnapshot` 构建 `Stable Runtime Cache View`。
- cache view 构建成功后，runtime reader 能查询 built-in 和 enabled custom templates。
- disabled custom pack 不出现在 runtime reader 结果中。
- management reader 能列出所有 custom packs，包括 disabled pack。
- management reader 能返回指定 pack 的 metadata 和全部 templates。
- 同一个 template id 能通过 relation indexes 定位到 `"builtin"` 或 custom `packId`。
- 同一个 pack id 能通过 relation indexes 定位到该 pack 的全部 template ids。
- query result 顺序稳定：built-in 在前，custom packs 按 `importedAt` 升序，同 pack 内按文件顺序。
- 多条件查询不改变全局相对顺序。
- 搜索文本按字段逐项匹配，不跨字段拼接。
- cache build 失败时不替换 current cache view。
- storage transaction 成功但 cache build 失败时，结果为 `stage: "runtimeCacheBuild"`、`success: false`、`storageCommitted: true`。
- 初始化部分数据不可读时，可读数据仍能展示，不可读数据不展示。
- 初始化完全无可读数据时，management reader 返回空 pack 列表，runtime reader 返回空 template 列表。

## 测试清单

### Cache Build

- 从空 custom snapshot + built-ins 构建 cache。
- built-in equipment 输入必须已经是 canonical 标准格式。
- 从包含多个 enabled custom packs 的 snapshot 构建 cache。
- 从包含 disabled custom pack 的 snapshot 构建 cache。
- built-in 和 custom template id 冲突时报 `RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID`。
- custom 与 custom template id 冲突时报 `RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID`。
- 构建失败时 current cache view 不被替换。

### Runtime Reader

- `querySelectableTemplates()` 返回 built-in + enabled custom templates。
- `querySelectableTemplates()` 不返回 disabled pack templates。
- `getSelectableTemplateById()` 对 enabled template 返回模板。
- `getSelectableTemplateById()` 对 disabled template 返回 `undefined`。
- `querySelectableTemplates(criteria)` 支持 `searchText`、`kind`、`tiers`、`traits`、`weaponTypes`、`damageTypes`、`ranges`、`burdens`、`sourceIds`。
- 集合条件组内多个值按 OR 匹配；不同条件组按 AND 匹配。
- 空数组或未传集合条件组等价于不限制该字段。
- 多条件查询只返回同时满足所有条件的 templates。
- 多条件查询结果保留全局稳定顺序。

### Management Reader

- `listPacks()` 返回所有 custom packs，包括 disabled pack，不包含 built-in。
- `listPacks()` 返回 `RuntimePackSummary`，不包含完整 templates。
- `getPackDetail(packId)` 返回 pack metadata、source 和该 pack 全部 templates。
- `getPackDetail(packId)` 对 disabled pack 仍返回 templates。

### Workflow

- 初始化成功后 cache 可用。
- 初始化部分数据不可读时，reader 只返回可读数据。
- 初始化完全无可读数据时，reader 返回空列表，管理页可显示空表。
- import 成功后 application service 调用 cache rebuild。
- remove 成功后 application service 调用 cache rebuild。
- enable / disable 成功后 application service 调用 cache rebuild。
- storage transaction 成功但 cache build 失败时不回滚 storage。
- 已实例化装备不依赖 runtime cache 做唯一回显来源。

## 暂不决定

- 不在本文件中决定具体 UI 组件结构。
- 不在本文件中决定 Zustand store 具体 shape。
