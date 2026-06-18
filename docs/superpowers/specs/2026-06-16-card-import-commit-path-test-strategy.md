# Card Import Commit Path Test Strategy

## 背景

Card import commit path 的下一阶段会重构真实安装路径，但本阶段仍然保持 legacy card batch storage format。测试策略的核心目标不是提高覆盖率数字，而是锁住这些回归红线：

- 已发布 legacy JSON / DHCB 卡包必须继续可导入。
- 新的 dry-run pipeline 必须仍然是真实导入的前置规则来源。
- 新的 application service / repository / adapter 分层不能改变旧入口的行为形状。
- storage format 仍然是现有 legacy batch storage shape。
- DHCB 内容和图片必须作为强一致安装单元提交。
- 失败时不能留下对用户可见的半安装 batch。

本文件只设计测试边界和测试矩阵，不引入新的功能需求。

## 测试原则

1. **按边界测试，不按实现细节堆测试。**
   每个测试文件对应一个架构边界：pipeline、application service、storage format adapter、repository、image backend、runtime refresh、legacy facade。

2. **先锁旧行为，再测新抽象。**
   旧公开入口、旧返回值、旧 storage shape、旧可接受输入必须有回归测试。新抽象只在能保护这些行为时才测试。

3. **真实存储副作用用 adapter fake，不依赖浏览器环境。**
   核心事务测试应使用 in-memory localStorage adapter 和 fake image backend。IndexedDB / Dexie 只需要少量边界测试，避免测试不稳定。

4. **失败路径和成功路径同等重要。**
   本次重构最大的风险在 rollback、partial write、runtime refresh failure，不在 happy path。

5. **测试错误码和阶段，不测试中文文案。**
   UI copy 可以变化；架构测试应断言 structured diagnostics、stage、result shape 和 storage artifacts。

6. **先固定 port contract，再测试 port implementation。**
   pack-scoped image backend、runtime refresh adapter、storage repository 都需要先有明确接口。测试不应隐式依赖当前 Dexie singleton 或 Zustand store 内部方法。

## 测试层级

### 1. Existing Compatibility Fixtures

**目标**：证明已经发布或实际流通的卡包仍然可以通过 dry-run。

**文件**：

- 继续使用 `card/import/__tests__/compatibility-fixtures.test.ts`
- 必要时增加 fixture 到 `card/import/samples/` 或专门的 compatibility fixture 目录

**必须覆盖**：

- `data/cards/builtin-base.json`
- `public/自定义卡包指南和示例/神州战役卡牌包.json`
- 用户提供过的真实卡包样本，如果纳入仓库，应脱敏并固定为 fixture
- 缺少 `customFieldDefinitions` 但可从实际卡牌提取 definitions 的 legacy pack
- legacy DHCB 中 `cards.json` 可读、`manifest.json` 缺失时仍走 legacy fallback
- legacy DHCB 中 `cards.json` 可读、`manifest.json` 不可解析时仍走 legacy fallback
- 包含 `variantTypes`、`hasLocalImage`、未知扩展字段组合的真实或最小 legacy fixture

**不在这里测**：

- storage 写入；
- duplicate id 冲突；
- 图片提交；
- runtime refresh。

### 2. Import Pipeline Contract

**目标**：证明 dry-run pipeline 只负责外部输入、adapter、结构校验和语义校验，不触碰系统状态。

**文件**：

- 继续使用 `card/import/__tests__/pipeline-dry-run.test.ts`

**必须覆盖**：

- legacy object input 成功进入 `semanticValidation`；
- `daggerheart.card-pack.v1` input 成功进入 `semanticValidation`；
- unknown `format` 在 `externalFormatAdapter` 阶段失败；
- invalid JSON 在 `jsonParse` 阶段失败；
- malformed legacy contract 在 `externalContractGuard` 阶段失败；
- DHCB dry-run 只发现 image assets，不写 IndexedDB；
- DHCB orphan image 在 dry-run 中作为 semantic error 阻断；
- DHCB card payload `hasLocalImage: true` 但没有对应 image asset 时不阻断；
- DHCB 中存在 image asset 时，staged model / commit draft 能保留 image ownership。

**不在这里测**：

- pack id 生成；
- localStorage key；
- runtime card store；
- rollback。

### 3. Application Service

**目标**：证明 formal import 的业务编排正确，且和具体 storage backend 解耦。

**新文件**：

- `card/packs/__tests__/application-service.test.ts`

**依赖 fake**：

- fake repository：记录 `loadSnapshot()`、`commitImport()`、`removePack()` 调用；
- fake runtime refresh adapter：可配置成功或失败；
- fake built-in template id provider；
- fixed `now()`；
- deterministic pack id generator。

**必须覆盖**：

- pipeline commit mode / staging contract 存在：`stageImportData` 成功后能产生 `CardPackCommitDraft`，但不写 storage；
- dry-run 失败时不调用 repository commit；
- conflict context 来自 recovered `repository.loadSnapshot()`；
- generated pack id collision / generation exhausted 时不生成最终 commit；
- imported template id 与 repository snapshot 冲突时不调用 commit；
- imported template id 与 built-in template id 冲突时不调用 commit；
- 成功时生成 `CardImportFinalCommitPlan`，包含 `packId`、`importedAt`、`disabled: false`、`templateIds`、`assets.cardImages`；
- JSON 和 DHCB 都走同一个 `commitImport(plan)` 路径；
- repository commit 失败时 application result 失败；
- runtime refresh 失败时 application result 失败，并调用 `repository.removePack(packId)` 执行提交后补偿；
- `repository.removePack(packId)` 补偿失败时 application result 失败并暴露 `ROLLBACK_FAILED` / recovery-required diagnostic；
- result summary 保持旧 UI 所需字段：name、cardCount、imageCount、warningCount、errorCount。

**关键断言**：

- application service 不断言 localStorage key；
- application service 不构造 `BatchData`；
- application service 不直接写图片。

### 4. Legacy Storage Format Adapter

**目标**：证明本阶段没有改变 installed card batch 的存储结构。

**新文件**：

- `card/packs/__tests__/legacy-storage-format-adapter.test.ts`

**必须覆盖**：

- `CardImportFinalCommitPlan` 被投影为完整 legacy batch storage payload；
- 输出包含 legacy `metadata`；
- 输出包含 `cards: ExtendedStandardCard[]`；
- 输出保留 `customFieldDefinitions`；
- 源 payload 缺少 `customFieldDefinitions` 时，输出使用 dry-run / adapter 派生出的 definitions，而不是写空；
- 输出保留 `variantTypes`；
- index entry 字段保持旧 UI / store 期待的 shape；
- `disabled` 初始为 `false`；
- image summary 写入 legacy metadata：`imageCardIds`、`imageCount`、`totalImageSize`；
- DHCB 实际包含图片 asset 时，对应 legacy card projection 中 `hasLocalImage` 为 `true`；
- JSON payload 自带 `hasLocalImage: true` 但没有 asset 时，legacy projection 保留旧兼容行为，不阻断；
- final commit plan 持有 `templateIds` 和 `assets.cardImages`，format adapter 不把自己变成冲突检查或 cleanup 的事实来源；
- 不把 import-only 字段泄漏进 legacy storage payload。

**需要显式回归的旧 shape**：

```ts
{
  metadata: {
    id: string,
    name: string,
    fileName: string,
    importTime: string,
    version?: string,
    author?: string,
    imageCardIds?: string[],
    imageCount?: number,
    totalImageSize?: number,
  },
  cards: ExtendedStandardCard[],
  customFieldDefinitions?: CustomFieldsForBatch,
  variantTypes?: VariantTypesForBatch,
}
```

### 5. Local Storage Repository Transaction

**目标**：证明 repository 拥有 storage backend 细节，且强一致提交协议可恢复。

**新文件**：

- `card/packs/__tests__/local-storage-repository.test.ts`

**依赖 fake**：

- in-memory localStorage adapter，记录 read/write/remove log；
- fake image backend，支持写入、删除、列出 pack-scoped images，并可按 step 注入失败；
- fake legacy storage format adapter 或固定 projection。

**必须覆盖成功路径**：

- 空 storage 下 `loadSnapshot()` 返回空 snapshot；
- `commitImport()` 成功写入顺序为：

```text
ensure/recover index
write content
write images
write index
load post-transaction snapshot
```

- 成功后 snapshot 包含 pack entry；
- 成功后 index 可引用 content；
- 成功后 pack-scoped images 可通过 packId 找到；
- 成功后 legacy content payload shape 没变。

**必须覆盖失败路径**：

- content write failed：不写 images，不写 index；
- image write failed：删除本次 content，删除本次已写 images，不写 index；
- index write failed：删除本次 content，删除本次 images；
- post-commit snapshot read failed：视为 transaction failure，移除本次 index entry，删除本次 content 和 images；
- rollback 删除不存在的 artifact 不报错；
- rollback 自身失败时返回 `ROLLBACK_FAILED` issue；
- duplicate pack id 在写 content 前失败；
- duplicate template id 在写 content 前失败；
- duplicate template id inside plan 在写 content 前失败。

**必须覆盖 recovery**：

- content 存在但 index 不引用：清理 orphan content；
- index 引用 content 但 content 缺失：移除 broken index entry；
- index 引用 content 但 content JSON 损坏：移除 broken index entry 并清理 corrupted content；
- index 引用的 content 缺失或损坏，且该 pack 有 pack-scoped images：同一次 `ensureIntegrity()` 移除 index entry 并删除该 pack images；
- pack-scoped images 存在但 pack 不在 index：清理 orphan pack images；
- recovery 后再执行 conflict check。

### 6. Pack-Scoped Image Backend

**目标**：证明新图片管理不会破坏旧图片读取，并能支持 rollback / recovery。

**新文件**：

- `card/packs/__tests__/pack-scoped-image-backend.test.ts`

**先固定 port contract**：

```ts
interface CardPackImageBackend {
  writePackImages(packId: string, images: CardImportImageAsset[]): Promise<CardPackImageWriteResult>
  deletePackImages(packId: string): Promise<CardPackImageDeleteResult>
  listPackImages(packId: string): Promise<CardPackStoredImageSummary[]>
  getImage(templateId: string, packId?: string): Promise<CardPackStoredImage | null>
  migrateLegacyGlobalImages(ownership: CardImageOwnershipIndex): Promise<CardPackImageMigrationResult>
}
```

**必须覆盖**：

- 新写入 key 使用 `${packId}/${templateId}`；
- `deletePackImages(packId)` 只删除该 pack namespace；
- `listPackImages(packId)` 只返回该 pack 的图片；
- `getImage(templateId, packId)` 优先查 `${packId}/${templateId}`；
- pack-scoped 查不到时 fallback legacy global `templateId`；
- legacy global image migration 使用 copy-verify-clean；
- legacy global 和 pack-scoped 同时存在时，视为上一轮迁移未完成，可以重新迁移；
- migration 失败不阻止 runtime fallback；
- migration 中断后再次启动可以重新 copy 并 verify；
- legacy cleanup 失败时返回 recovery-required issue；
- orphan legacy global image 可在确认无 batch 引用后清理。

**Dexie 边界测试**：

- 默认使用 fake backend 测协议；
- 如果测试真实 Dexie adapter，必须先引入测试用 IndexedDB shim，例如 `fake-indexeddb`；
- Dexie adapter 只需要少量边界测试：schema 可写 pack-scoped record、写入失败会 reject、不会吞掉单张图片失败后返回部分成功。

**不在这里测**：

- card validation；
- zip parsing；
- UI image preview。

### 7. Runtime Refresh Adapter

**目标**：证明 formal import 提交成功后，旧 runtime store 能继续得到一致读模型。

**新文件**：

- `card/packs/__tests__/runtime-refresh-adapter.test.ts`

**必须覆盖**：

- refresh 调用现有 reload / aggregation / cardsByType / subclass index / keyword index / level index rebuild 流程；
- refresh 成功后 custom cards 可通过现有 public selector 读取；
- disabled batch 不进入可选 runtime view；
- image runtime lookup 在 domain / adapter 边界实际传入 `packId`，优先读取 pack-scoped image，再 fallback legacy global image；
- refresh 失败会返回 structured failure，不吞错；
- refresh adapter 不直接参与 storage 写入。

**注意**：

如果现有 store helper 过于难测，可以先用 thin adapter + mocked store methods 测调用顺序，再在 legacy facade 测端到端结果。

### 8. Legacy Facade Regression

**目标**：证明旧 UI 和旧调用方不需要理解新架构。

**文件**：

- 优先新增 `card/__tests__/legacy-import-facade.test.ts`
- UI 层只保留一个 smoke case；不要用 content-pack-manager 测完整 storage transaction

**必须覆盖**：

- `importCustomCards(importData, batchName)` 成功时仍返回旧 `ImportResult` shape：`{ success: true, imported, errors: [], batchId }`；
- `importCustomCards(importData, batchName)` 失败时仍返回旧 `ImportResult` shape：`{ success: false, imported: 0, errors, batchId: "" }`；
- `importDhcbCardPackage(file)` 成功时仍返回旧 `DhcbImportResult` shape：`{ batchId, totalCards, imageCount, validationErrors: [] }`；
- `importDhcbCardPackage(file)` 失败时仍以旧调用方可处理的 error 形式失败，不返回新 application result object；
- JSON import 成功后旧 batch manager 能列出 batch；
- DHCB import 成功后 batch metadata 有 image summary；
- DHCB import 成功且图片存在时，legacy stored card / runtime card 的 `hasLocalImage` 为 `true`；
- DHCB orphan image 仍拒绝；
- DHCB 图片 blob 读取或写入中途失败时，整个 import 失败，且没有 content、index、pack-scoped images 残留；
- JSON `hasLocalImage: true` 但没有图片 asset 仍允许；
- DHCB card payload `hasLocalImage: true` 但缺少图片 asset 仍允许；
- old UI warning/error display 不需要新 result object 才能工作。

## 回归矩阵

| 风险 | 必测位置 | 失败时说明 |
| --- | --- | --- |
| 已发布卡包无法导入 | compatibility fixtures | 破坏外部兼容 |
| dry-run 和正式导入规则分叉 | application service | 重新出现两套验证 |
| 存储 shape 被意外改变 | legacy storage format adapter | 旧 runtime / UI 可能读不了 |
| duplicate id 被绕过 | application service + repository | 导入后覆盖或污染现有卡 |
| 图片失败后留下 batch | repository transaction | 用户看到半安装内容 |
| index 先于图片写入 | repository transaction | index 声称安装成功但图片缺失 |
| rollback 不完整 | repository transaction + image backend | 孤儿 content / image 积累 |
| 旧图片无法读取 | image backend | 旧 DHCB 用户图片丢失 |
| runtime refresh 失败但返回成功 | application service + runtime adapter | UI 状态和 storage 状态不一致 |
| 旧 facade 返回值变化 | legacy facade regression | UI / 外部调用方破坏 |

## 不建议在本阶段做的测试

- 不做完整浏览器 IndexedDB E2E，除非发现 fake backend 无法覆盖真实 Dexie 行为。
- 不测试中文错误文案。
- 不测试 editor validation UI，本阶段已推迟。
- 不测试 card storage v2，因为本阶段不引入。
- 不把 built-in base 不写 localStorage 的未来设计塞进当前测试。
- 不做 snapshot 巨型 JSON 断言；storage shape 应用局部关键字段断言。

## 执行顺序建议

1. 先补 compatibility fixture 和 pipeline regression，确认现有 dry-run 干净。
2. 写 application service tests，先用 fake repository 锁业务编排。
3. 写 legacy storage format adapter tests，锁旧 storage projection。
4. 写 repository transaction tests，覆盖 write order 和 rollback。
5. 写 pack-scoped image backend tests，覆盖 key namespace、fallback、migration。
6. 写 runtime refresh adapter tests。
7. 最后写 legacy facade regression，确认旧 UI / 旧入口能套新路径。

测试设计可以先于实现提交。实现阶段每个 slice 应先写失败测试，再写最小实现。
