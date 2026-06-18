# Card Import Regression Test Architecture

## 背景

Card import commit path 已经把真实安装流程抽到 application service、repository、storage format adapter 和 backend adapter 后面。下一步需要补一层回归测试架构，降低重构后无意破坏旧卡包、浏览器存储和 UI 导入链路的风险。

本文件只定义测试组织方式和验收边界，不新增业务需求。

## 测试目标

1. 已发布 legacy JSON / DHCB 卡包继续可导入。
2. 新 commit path 写入结果仍然兼容现有 legacy storage format。
3. DHCB content、images、index 作为强一致安装单元提交。
4. 失败导入不会留下用户可见的半安装 pack。
5. UI 上传入口、浏览器存储、内容管理器刷新和 runtime refresh 至少有一层真实浏览器测试覆盖。

## 总体分层

测试分五层：

```text
Contract Regression
  -> Commit Path Integration
  -> Installed Legacy Pack Compatibility
  -> UI Component Tests
  -> Playwright E2E
```

每层只验证自己能稳定证明的事情，避免把所有行为都堆到 E2E。

## 1. Contract Regression

**职责**：批量验证卡包输入兼容性，并证明真实卡包可以被写成当前系统预期的 legacy localStorage format。

**建议位置**：

```text
card/import/__tests__/compatibility-fixtures.test.ts
tests/fixtures/card-packs/
  public/
  samples/
.local-fixtures/card-packs/
```

**覆盖内容**：

- 仓库内公开示例卡包；
- 可提交的最小真实 / 脱敏卡包 fixture；
- 本地真实卡包目录中的所有 `.json` / `.dhcb`；
- legacy JSON parse、external contract guard、adapter、structural validation、semantic validation；
- 使用干净的 fixed snapshot 执行 conflict check；
- 为每个可接受卡包生成 `CardImportFinalCommitPlan`；
- 通过 storage format adapter 投影为当前 legacy card batch storage payload；
- 写入 in-memory localStorage backend，并断言写入结果符合当前 legacy storage shape；
- 对有 expected snapshot 的 fixture，比较写入后的 legacy storage payload 是否与已知正确的旧系统输出一致；
- dry-run 失败时输出结构化失败报告，便于定位具体卡包。

**最小 fixture matrix**：

仓库内 fixture 不需要覆盖所有真实卡包，但必须覆盖这些形态，避免回归网完全依赖 ignored 本地数据：

- legacy JSON：无 `definitions`，需要从实际卡牌推导；
- legacy JSON：包含 `customFieldDefinitions` 和 `variantTypes`；
- legacy JSON：卡牌声明 `hasLocalImage`，但输入文件没有实际 asset；
- DHCB：root `cards.json` + root `images/*`；
- DHCB：root manifest 损坏或不可解析时仍走 legacy fallback；
- invalid DHCB：缺少 `cards.json`；
- invalid DHCB：orphan image；
- invalid pack：duplicate template id；
- legacy installed storage：两个 pack 共享同一个 card id，触发 legacy global image ambiguous migration。

**不覆盖**：

- 真实浏览器上传；
- 浏览器 `window.localStorage` / IndexedDB 真实写入；
- UI 展示；
- runtime refresh。
- 已安装旧数据的 legacy global image migration。

**测试 backend**：

Contract Regression 使用 in-memory localStorage backend 和 fake / in-memory image backend。它要证明真实卡包能被写成与当前系统兼容的 legacy storage payload，但不负责证明浏览器 Web Storage API 本身可用。

**Local expected snapshot**：

对代表性卡包，可以先用已知正确的旧导入实现或人工确认过的真实系统导入结果生成 expected snapshot，再由新 commit path 生成结果进行精确比较。

本阶段不单独设计 record / verify 双脚本，只提供一个本地 fixture regression runner：

```text
.local-fixtures/card-packs/
  inputs/
    *.json
    *.dhcb
  expected/
    <pack-file-name>.storage.json
  actual/
    <pack-file-name>.storage.json
```

运行逻辑：

- 如果 `expected/<pack-file-name>.storage.json` 存在，则严格比较当前导入产物和 expected snapshot；
- 如果 expected 不存在，则把当前导入产物写入 `actual/`，供人工确认后复制为 expected，并且默认将该 fixture 判为失败；
- `actual/` 是临时输出目录，不应提交；
- `expected/` 默认也放在 ignored 本地目录，不提交到仓库。
- runner 应跑完整个 `inputs/` 批次，最后统一失败；
- 失败报告按阶段汇总，例如 parse、validation、conflict、projection、storage-diff。

Snapshot 比较应尽量严格，但需要处理非确定字段：

- 比较对象是 card import storage snapshot，而不是完整 localStorage dump；
- snapshot 只包含卡包导入相关 index、batch content 和 pack-scoped image metadata；
- `packId` 应通过 deterministic pack id generator 固定，例如基于 fixture file name 生成 `test-pack-<slug>`；
- `importTime` 应通过 fixed clock 固定；
- 随机 suffix 等剩余非确定字段应通过 deterministic generator 固定，或在比较前做明确 scrub；
- 如果字段本身是兼容性承诺的一部分，应保留比较；
- expected snapshot 默认全部放在 ignored 本地目录，不提交到仓库；
- CI 只跑仓库内最小 fixture 的 shape / transaction regression，不依赖真实卡包 expected snapshot。

建议 snapshot shape：

```ts
{
  index: unknown,
  batches: Record<string, {
    metadata: unknown,
    cards: unknown[],
    customFieldDefinitions?: unknown,
    variantTypes?: unknown
  }>,
  images: Record<string, {
    cardIds: string[],
    items: Array<{
      cardId: string,
      mimeType: string,
      byteLength: number,
      sha256: string
    }>
  }>
}
```

图片 snapshot 默认不保存完整图片二进制或 base64 内容，只比较 ownership、数量、MIME type、byte length 和 SHA-256 hash。

Baseline 建立是一次性手动工作，不需要完整自动化 recorder，也不要求第一阶段提供 browser snapshot extractor。推荐流程：

```text
1. 切到被认为正确的 baseline branch 或发布版本。
2. 使用干净浏览器 profile 导入真实卡包。
3. 用临时脚本、devtools，或 local runner 生成的 actual snapshot 辅助建立 baseline。
4. 人工确认 snapshot 后放入 `.local-fixtures/card-packs/expected/`。
5. 切回重构分支运行本地 fixture regression。
```

实现阶段必须提供 local runner actual output；snapshot extractor 只是可选辅助，不是第一阶段必需基础设施。

**真实卡包目录**：

真实卡包默认放在：

```text
.local-fixtures/card-packs/
```

该目录应加入 `.gitignore`，作为本地全量回归数据源。数据源不是测试架构的核心，后续可以随时增加或替换。

Fixture discovery 统一使用：

```text
.local-fixtures/card-packs/inputs/**/*.json
.local-fixtures/card-packs/inputs/**/*.dhcb
```

Node local fixture regression 和 optional all-real-packs E2E runner 都从这个目录发现真实卡包，避免维护两套 fixture 列表。

## 2. Commit Path Integration

**职责**：验证 formal import 业务流程和 storage transaction 正确。

**位置**：

```text
card/packs/__tests__/
  application-service.test.ts
  local-storage-repository.test.ts
  legacy-storage-format-adapter.test.ts
  pack-scoped-image-backend.test.ts
  runtime-refresh-adapter.test.ts
```

**覆盖内容**：

- dry-run 失败不进入 commit；
- conflict context 只依赖 repository snapshot 和 built-in id provider；
- duplicate pack id / template id 被拒绝；
- `CardImportFinalCommitPlan` 投影为 legacy storage shape；
- 写入顺序固定为 `content -> images -> index`；
- content write、image write、index write、post-transaction snapshot 失败时 rollback；
- runtime refresh 失败时 application service 调用 `repository.removePack(packId)` 做提交后补偿；
- rollback 失败时返回 recovery-required diagnostic；
- repository 和 application service 不泄漏 localStorage key、IndexedDB table name 等 backend 细节。
- compatibility facade regression：旧公开函数 / 旧 UI 调用点必须转发到唯一的 application service，不得维护第二套导入流程；
- lifecycle facade regression：`removeCustomCardBatch`、`toggleBatchDisabled` 或替代公开 facade 必须委托 `CardPackApplicationService.removePack` / `setPackDisabled`，生产 `app/card-manager` 不应绕回旧 store lifecycle；
- deprecated `store.importCards` 当前没有生产调用方，第一批实现时应删除 store type 和 stub 实现，而不是继续保留一个容易误导的旧路径占位。

**不覆盖**：

- React UI；
- 浏览器真实文件选择；
- 视觉展示。

## 3. Installed Legacy Pack Compatibility

**职责**：证明已经导入完成的旧卡包在新代码中仍可读取和管理。

**建议位置**：

```text
card/packs/__tests__/legacy-installed-pack-compatibility.test.ts
```

**覆盖内容**：

- 给定旧系统写出的 legacy batch content 和 index，repository `loadSnapshot()` 能读取 pack；
- 旧 pack 的 cards、customFieldDefinitions、variantTypes 保持可见；
- enable、disable、remove 对旧 pack 仍可用；
- 本阶段不触发 storage v2 migration；
- legacy global card image 兼容当前实现：
  - 当 template id 只有一个 owning pack 时，repository recovery 会迁移为 pack-scoped image；
  - 当 template id 有多个 possible owning packs 时，不迁移，保留 legacy global image，并报告 ambiguous migration issue；
  - 当 pack-scoped image 不存在时，runtime image lookup 仍 fallback 到 legacy global image；
  - pack-scoped image 优先于 legacy global image。
- runtime image lookup 兼容：
  - 预置旧 legacy batch storage 和 legacy global IndexedDB image；
  - 启动 / refresh 后，通过真实 image lookup 边界验证带 `packId` 查图时优先读 pack-scoped image；
  - pack-scoped image 不存在时仍能 fallback 到 legacy global image；
  - ambiguous legacy global image 不应被错误迁移到任一 pack。

**不覆盖**：

- 新卡包导入；
- editor draft；
- public schema evolution；
- 本地真实卡包批量导入 expected snapshot。

## 4. UI Component Tests

**职责**：验证内容管理器组件是否正确调用 import service 并展示结果。

**位置**：

```text
components/content-pack-manager/__tests__/
  card-pack-tab.test.tsx
  import-content-pack.test.ts
  global-import-panel.test.tsx
```

**覆盖内容**：

- card pack tab 使用新的 import facade / service；
- 导入成功后显示 summary；
- validation error / warning 以现有 UI 能处理的形状传递；
- enable、disable、remove 行为仍调用正确入口；
- 不依赖真实 localStorage / IndexedDB，可以用 mock service。

**不覆盖**：

- 大量真实卡包；
- 浏览器级文件系统交互；
- IndexedDB 真实行为。
- 已安装旧卡包启动兼容。

## 5. Playwright E2E

**职责**：验证用户可见的完整浏览器链路。

**建议位置**：

```text
tests/e2e/
  card-pack-import.spec.ts
  helpers/
    import-ui.ts
    storage.ts
    fixtures.ts
  fixtures/
    legacy-json/
    dhcb/
    invalid/
```

**基础设施**：

- 使用 `@playwright/test`；
- 新增 `playwright.config.ts`；
- 使用 `webServer` 启动 Next dev server；
- 每个测试使用独立 browser context；
- 每个测试开始前清空 localStorage 和 IndexedDB；
- E2E 必须在真实浏览器的 `window.localStorage` 和 IndexedDB 中检查代表性写入结果；
- 测试 artifact 放在 Playwright 默认输出目录或项目既有输出目录，不新增无关顶层目录。

**首批 E2E 场景**：

1. `legacy json import succeeds`
   - 通过 UI 上传一个 legacy JSON；
   - 断言导入成功；
   - 断言内容管理器中出现对应 pack；
   - 断言 localStorage index 中出现 pack entry。

2. `dhcb import commits cards and images together`
   - 通过 UI 上传一个 DHCB；
   - 断言导入成功；
   - 断言 pack 可见；
   - 断言 IndexedDB 中存在 pack-scoped images；
   - 断言最终浏览器 storage 中 content、images、index 和 UI 状态一致。

写入顺序、image / index 写失败、rollback 和 recovery-required diagnostic 不由 E2E 证明，必须下沉到 `card/packs` repository / application service fault-injection tests。

3. `failed import leaves no visible pack`
   - 上传一个坏包，例如 orphan image、损坏 cards.json 或重复 id；
   - 断言 UI 显示失败；
   - 断言内容管理器中没有新 pack；
   - 断言 localStorage index 没有对应 pack entry。

4. `disable enable remove imported pack`
   - 导入一个 pack；
   - 禁用、启用、删除；
   - 断言 UI 状态和 storage 状态一致；
   - 删除后断言 pack-scoped images 被清理。

**不做全量真实卡包 E2E**：

真实卡包全量回归由 Contract Regression 批量跑。Playwright 只用少量代表 fixture 验证浏览器链路，避免测试慢、脆、难定位。

Playwright 是最终浏览器链路证明：它必须验证真实 UI 上传后，代表性卡包确实写入浏览器 localStorage / IndexedDB，并且用户可见状态与 storage 状态一致。

可以额外提供 optional all-real-packs E2E runner，用于发布前或专项验收时把 `.local-fixtures/card-packs/inputs/` 下的真实卡包逐个通过 UI 导入。该命令不作为默认 E2E，不进入普通 CI。

E2E 默认不注入 deterministic pack id，保持接近生产入口。测试应通过导入前后的 storage diff 或 UI pack name 动态发现本次新增 pack entry，再验证它关联的 content 和 pack-scoped images。精确 snapshot diff 由 Node local fixture regression 承担。

E2E 默认不覆盖已安装旧卡包启动兼容；该行为由 `legacy-installed-pack-compatibility.test.ts` 使用构造出的旧 storage 状态验证。

## 建议脚本

```json
{
  "test:card-import": "npx vitest run card/import card/packs components/content-pack-manager",
  "test:card-import:fixtures": "npx vitest run card/import/__tests__/compatibility-fixtures.test.ts",
  "test:card-import:local-fixtures": "RUN_LOCAL_CARD_PACK_FIXTURES=1 npx vitest run tests/local-fixtures/card-import-local-fixtures.test.ts",
  "test:e2e": "playwright test",
  "test:e2e:card-import": "playwright test tests/e2e/card-pack-import.spec.ts",
  "test:e2e:card-import:local-fixtures": "RUN_LOCAL_CARD_PACK_FIXTURES_E2E=1 playwright test tests/e2e/card-pack-import-local-fixtures.spec.ts"
}
```

CI 默认应跑：

```text
npm run test:card-import
npx tsc --noEmit --pretty false
```

`test:card-import:local-fixtures` 不进入普通 `test:card-import`，也不进入默认 CI。它依赖 ignored 本地 fixtures 和 expected snapshots，只用于专项回归或发布前验收。

本地 fixture 测试文件可以保持 `.test.ts` 后缀，但必须用环境变量保护：没有 `RUN_LOCAL_CARD_PACK_FIXTURES=1` 时跳过，避免被 `vitest run` 全仓库扫描时误执行。

Optional all-real-packs E2E spec 也必须用环境变量保护：没有 `RUN_LOCAL_CARD_PACK_FIXTURES_E2E=1` 时跳过，避免被 `playwright test` 全量扫描时误执行。

Playwright 第一阶段不进入默认 CI，只作为本地和发布前验收命令。等浏览器安装、dev server 启动、测试耗时和失败稳定性被验证后，再单独决策是否加入必跑 CI。

## 与装备包测试对齐

Card import tests 应参考 equipment pack import 的边界组织，但不要求完全同构。

应对齐：

- application service / repository port 的测试方式；
- import diagnostics 的结构化断言方式；
- content pack manager UI 的导入结果展示行为；
- compatibility fixtures 的组织方式；
- 本地真实 fixtures 不进入默认 CI 的策略。

不强行对齐：

- DHCB 图片强一致提交；
- pack-scoped card image backend；
- legacy global card image migration / fallback；
- card runtime refresh 和 card selection read model。

如果未来 equipment pack 也引入 assets 或 bundle images，再考虑抽取共享测试 helper。

## 实现顺序

第一批先搭非浏览器回归网：

1. 补 `.gitignore` 和 `.local-fixtures/` 目录约定。
2. 实现 Card Import Storage Snapshot helper，只服务测试。
3. 实现 local fixture regression runner，扫描 `.local-fixtures/card-packs/inputs/**/*.{json,dhcb}`，生成 `actual/`，有 `expected/` 时严格比对。
4. 补 Installed Legacy Pack Compatibility 测试，覆盖旧 legacy storage、legacy global image migration / fallback、pack-scoped 优先级。

第二批再引入浏览器基础设施：

5. 补 Playwright 最小 E2E 基础设施，覆盖 minimal JSON、minimal DHCB、invalid pack、disable / enable / remove。
6. 补 optional all-real-packs E2E runner。该步骤可以延后，不阻塞第一批回归网落地。

## 验收边界

本测试架构完成后，应能回答三类问题：

1. **所有已知卡包能不能写成预期的 localStorage 格式？**
   - 由 Contract Regression 回答。

2. **新的 commit path 有没有破坏 storage transaction 和 rollback？**
   - 由 Commit Path Integration 回答。

3. **用户从 UI 导入时是否真的能完成浏览器级安装？**
   - 由 Playwright E2E 回答。

如果某个失败只能在 Playwright 里发现，说明单元 / 集成层缺了一个更小的回归测试。Playwright 应作为最终链路证明，而不是主要定位工具。
