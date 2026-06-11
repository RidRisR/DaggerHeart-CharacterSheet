# Content Bundle Editor and Thin DHCB Design

日期：2026-06-06
状态：未来探索记录，当前分支不实施

## 目的

本文记录未来 `daggerheart.content-bundle.v1` manifest 容器格式的探索结论。它比 card-pack v1 更适合作为长期方向，因为它讨论的是 `.dhcb` 作为多内容容器的文件索引边界，而不是替换已经公开的卡牌包格式。

本文不再作为当前分支实施入口。当前分支进一步收窄为装备编辑器和 equipment JSON 导出：

- 卡牌 JSON / DHCB / ZIP 导入导出继续走现有流程。
- 装备页面导出普通 `daggerheart.equipment-pack.v1` JSON。
- 当前分支不把装备包写入 `.dhcb`。
- 当前分支不新增 mixed DHCB reader / writer。
- 当前分支不引入 `daggerheart.content-bundle.v1` manifest。
- 当前分支不引入 `entries[]`、`assetsPath`、`imagePath`。
- 当前分支不重构 card import diagnostics。

当前实施设计见：

- `docs/superpowers/specs/2026-06-07-equipment-editor-json-export-scope-design.md`

本文取代以下历史探索文档中的未来容器部分：

- `docs/superpowers/specs/2026-06-06-content-bundle-card-pack-import-workflow-design.md`
- `docs/superpowers/specs/2026-06-06-card-pack-public-schema-v1-design.md`

## 当前状态

以下设计只保留为未来方向：

- Content Bundle Manifest。
- Bundle Entry。
- `entries[].kind` / `entries[].path`。
- `entries[].assetsPath`。
- card payload `imagePath`。
- manifest fallback boundary。

这些内容不得阻塞当前分支的最小实现。

## 已放弃或延期

当前分支不做：

- 不实现 `daggerheart.content-bundle.v1` manifest。
- 不实现 `daggerheart.card-pack.v1`。
- 不把 future card pack v1 当作内部模型。
- 不发布 Legacy Published Format JSON Schema。
- 不重构现有卡牌导入 workflow。
- 不迁移卡牌 storage 到 Card Pack Data v2。
- 不实现完整 index-last atomic bundle commit。
- 不改现有 card DHCB / ZIP parser 的诊断模型。

这些方向可以保留为未来路线，但不能阻塞当前分支。

## 领域模型

**Content Bundle Editor**：
产品概念上是内容包编辑器。当前分支可以继续复用 `/card-editor` 路由和现有卡牌编辑器基础设施，但新增装备编辑能力后，不应继续把整个创作入口理解为 card-only editor。

**Content Pack Draft**：
单个 pack payload 的草稿。当前包括 card pack draft 和 equipment pack draft。

**Content Bundle Draft**：
一个将导出为 `.dhcb` 的 bundle 草稿。它可以包含 card pack draft、equipment pack draft，以及 bundle manifest 所需的 entry / asset root。

**Content Bundle Manifest**：
`.dhcb` 中的文件索引。它只描述 bundle 内文件结构、entry、payload path 和 asset root。它不是内容 metadata authority，不覆盖 card pack / equipment pack payload 内部 metadata，也不是 payload format authority。

**Bundle Entry**：
Content Bundle Manifest 中的一条文件目录项。它告诉 reader：某个 payload 文件在哪里、它是哪一种 content pack。Bundle Entry 不是 content pack 本身，也不是 pack id、storage identity 或 runtime source。payload 自己负责声明或暴露自己的 schema / format version。

## Manifest 设计原则

### 1. Manifest 是文件索引，不是内容模型

Content Bundle Manifest 只回答：

- bundle 使用什么容器 format。
- bundle 内有哪些 entries。
- 每个 entry 的 kind 是什么。
- 每个 payload 文件在哪里。
- 每个 entry 的资产根目录在哪里。

Content Bundle Manifest 不回答：

- card pack / equipment pack 的名称、作者、版本或描述。
- payload 内卡牌、装备或规则内容的语义。
- payload 自己的 schema / format version。
- pack 导入后的 storage identity。
- pack 是否启用或禁用。
- entry payload metadata override。
- future card pack v1 或 i18n 内容结构。

因此 manifest 不包含 `name`、`version`、`author`、`description`，也不提供 metadata override。包内每个 payload 继续以自己的公开格式维护自己的 metadata。编辑器可以在导出时把相同 metadata 写入多个 payload，但这只是 authoring UX，不是 manifest 语义。

### 2. Bundle Entry 使用 path 作为局部定位

`entries[].path` 是 entry 的 bundle-local locator。它指向 bundle 内的 payload 文件，可以是 `/` 分隔的多级安全相对文件路径。当前不引入单独的 `entries[].id`，避免 manifest 同时维护两套局部身份。

`entries[].path` 服务于：

- diagnostics 和错误定位。
- reader 内部定位。
- UI 展示 source file。

`entries[].path` 不是：

- pack id。
- template id。
- storage id。
- runtime source。
- 跨 bundle 的稳定身份。

导入后 card pack 和 equipment pack 仍各自按照自己的 payload 和现有规则生成 storage identity。

`entries[].kind` 必须保留且必填。它表示这个 payload 应该交给哪类 importer 处理，例如 `card-pack` 或 `equipment-pack`。`kind` 不是 payload schema / format version，也不覆盖 payload 内部 metadata；payload 仍然自己负责声明或暴露自己的具体格式。reader 不应通过任意解析 payload 内容来猜测 kind，因为这会让 manifest 失去文件索引的价值，也会让 diagnostics 和未来多 payload bundle 变得不稳定。

### 3. Payload 自己负责资产映射

Manifest 不逐卡列出图片。card pack entry 只提供可选 `assetsPath`，表示该 card pack 的资产根目录。

卡牌 payload 使用可选 `imagePath` 声明自己的打包图片文件名：

```json
{
  "id": "warrior-brave-foundation",
  "imagePath": "brave-cover.webp"
}
```

解析规则：

- `assetsPath` 是相对于 bundle root 的安全相对目录，可以包含 `/` 分隔的多级目录。
- `imagePath` 只能是文件名，不能包含目录分隔符。
- 如果 `imagePath` 存在但 `assetsPath` 省略，reader 兼容把 `imagePath` 解析到 bundle root 下的 legacy `images/` 目录。
- 如果 `imagePath` 不存在，但卡牌有 legacy `hasLocalImage: true`，reader 兼容查找 bundle root 下的 legacy `images/<cardId>.<ext>`。
- `imagePath` 不能是绝对路径，不能包含 `..`、`/` 或 `\`。
- `assetsPath` 不能是绝对路径，不能包含 `..`，不能指向文件。
- `imageUrl` 继续表示外部 URL 或可直接展示的地址。
- `hasLocalImage` 继续只属于 legacy DHCB 的 id 文件名兼容语义。
- 未来如需支持卡牌级子目录，可以在兼容评估后放宽 `imagePath` 校验；当前分支不提前公开这项能力。

## 当前实施已迁移

装备编辑能力已经迁移到当前实施文档。root payload mixed DHCB 不再是当前分支实施范围，只保留为未来 bundle 方向的一种历史探索：

- `docs/superpowers/specs/2026-06-07-equipment-editor-json-export-scope-design.md`

本文下面只保留未来 manifest 容器格式探索。

## 未来 Manifest 容器格式

新 `.dhcb` 是 zip 文件，包含 `manifest.json` 和若干 payload / asset 文件。

推荐结构：

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
  "entries": [
    {
      "kind": "card-pack",
      "path": "cards/cards.json",
      "assetsPath": "assets/cards"
    },
    {
      "kind": "equipment-pack",
      "path": "equipment/equipment.json"
    }
  ]
}
```

Manifest 规则：

- 顶层只需要 `format` 和 `entries`。
- `format` 固定为 `daggerheart.content-bundle.v1`。
- manifest 不引入 `meta`、`metadata` 或 bundle-level display fields。
- manifest 不包含 `name`、`version`、`author`、`description`。
- manifest 不覆盖 entry payload metadata。
- reader 可以忽略或 warning 未识别的 manifest 字段，但不能把未知字段解释成内容 metadata override。
- `entries` 至少包含一个 entry。
- `entries[].kind` 必填，表示 entry 类别和 importer 路由，当前允许 `card-pack` 和 `equipment-pack`。
- `entries[].path` 指向 bundle 内 payload 文件，可以是多级安全相对文件路径。
- `entries[].path` 在 bundle 内必须唯一。
- `entries[].assetsPath` 可选，指向该 entry 的资产根目录；它可以是多级安全相对目录。
- `entries[].path` 和 `entries[].assetsPath` 必须是相对路径，不能包含 `..`，不能是绝对路径。
- `entries[].path` 必须指向文件；`entries[].assetsPath` 必须指向目录。

Entry 数量策略：

- 格式层允许未来多个 `card-pack` 和多个 `equipment-pack`，以支持整合包。
- 未来第一版 reader 可以先只支持最多一个 `card-pack` 和最多一个 `equipment-pack`。
- 未来 reader 遇到多个同 kind entry 时，应返回 unsupported diagnostic，而不是把格式设计成永久不允许。

Card packaged asset rules：

- `card-pack.assetsPath` 可选。
- `card-pack.assetsPath` 可以是多级安全相对目录。
- card payload 可以在单张卡上使用可选 `imagePath`。
- `imagePath` 只能是文件名，相对于 `card-pack.assetsPath` 解析。
- 如果 `imagePath` 存在但 `card-pack.assetsPath` 省略，reader 兼容把 `imagePath` 解析到 bundle root 下的 legacy `images/` 目录。
- 如果 `imagePath` 不存在，但卡牌有 legacy `hasLocalImage: true`，reader 兼容查找 bundle root 下的 legacy `images/<cardId>.<ext>`。
- 图片文件名不要求等于 card id。
- legacy `hasLocalImage` / id 文件名规则只属于 legacy DHCB 兼容路径；如果新 bundle 同时存在 `imagePath` 和 `hasLocalImage`，优先使用 `imagePath`。

## Legacy DHCB 兼容分流

`.dhcb` / `.zip` reader 必须先做容器识别，而不是把所有 zip 都当作新 Content Bundle v1。

分流规则：

- 有可解析的 `manifest.json` 且 `manifest.format === "daggerheart.content-bundle.v1"`：按新 Content Bundle v1 解析。
- 一旦进入 Content Bundle v1 分支，就必须以 manifest 为文件索引；如果 manifest 有效但 entry path、kind、payload 文件或资产结构与包内容不匹配，reader 必须拒绝并返回 diagnostics，不能 fallback 到 Legacy Card DHCB。
- 有根目录 `cards.json`，且没有 `manifest.json`：按 Legacy Card DHCB 解析。
- 有根目录 `cards.json`，且 `manifest.json` 存在但不可解析：按 Legacy Card DHCB 解析。
- 有根目录 `cards.json`，且可解析的 `manifest.json` 不是 Content Bundle v1：按 Legacy Card DHCB 解析；旧导出可能使用 `format: "DaggerHeart Card Batch"`，reader 不应拒绝。
- 有根目录 `cards.json` 和 `images/*`：legacy 图片继续按 bundle root 下的 `images/<cardId>.<ext>` 匹配。
- 没有 `manifest.json` 且没有可识别 legacy payload：返回 unsupported / missing manifest diagnostic。

因此，`missing manifest.json` 不是所有 `.dhcb` 的错误；它只是在文件既不是 Content Bundle v1、也无法被识别为 Legacy Card DHCB 时才是错误。

## Thin Reader 行为

未来 manifest reader 可以先做薄版 reader，不重构现有 card import pipeline。

读取流程：

```text
Read ZIP
  -> Detect container shape
    -> Content Bundle v1:
      -> Validate manifest shape
      -> Resolve entry paths
      -> Read card payload if present
      -> Read equipment payload if present
      -> Resolve payload-owned packaged asset paths
      -> Reject manifest / bundle structure mismatches
      -> Dispatch to existing card import / equipment import paths
    -> Legacy Card DHCB:
      -> Read root cards.json
      -> Resolve legacy bundle-root images/*
      -> Dispatch to existing card import path
```

未来 manifest reader 必须提供 bundle-level preflight 和清晰 diagnostics，但完整 index-last atomic commit 可以作为后续增强。

必须检测：

- missing `manifest.json` when no legacy payload can be recognized
- invalid `manifest.format` for Content Bundle v1, or unsupported manifest format when no legacy payload can be recognized
- missing or empty `entries`
- duplicate `entries[].path`
- unsupported `entries[].kind`
- invalid path / path traversal
- missing payload file
- Content Bundle v1 manifest references missing or mismatched bundle structure
- invalid `assetsPath`
- invalid card `imagePath`
- card `imagePath` asset file missing after resolving against `assetsPath` or fallback bundle-root `images/`

## UI 显示规则

- Content Bundle 本身不是 runtime pack。
- 导入后 card pack 和 equipment pack 仍各自生成自己的 storage identity。
- 列表主名称使用 payload 自己的 pack name。
- 详情中可以展示 source bundle file 和 entry path。
- manifest 不提供 bundle-level display name。

## 后续方向

未来可以单独设计：

- Legacy Published Format JSON Schema。
- Card Pack Import Workflow Modernization。
- Legacy DHCB 收口。
- 完整 index-last atomic bundle commit。
- Card Pack Data v2。
- `daggerheart.card-pack.v1`，仅面向未来国际化或全新生态。

## 未来待继续细化

下一轮从这些问题继续：

- Thin reader 的 diagnostics code 命名。
- Mixed bundle 导出时，card packaged assets 如何从当前 IndexedDB 图片记录生成。
- manifest reader 是否实现 mixed bundle import commit，还是只实现 reader + export。
