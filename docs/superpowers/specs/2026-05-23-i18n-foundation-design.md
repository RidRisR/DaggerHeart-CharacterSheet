# I18n Foundation Design

日期：2026-05-23

状态：待复核

## 目的

本文定义 DaggerHeart 角色卡生成器国际化改造的第 1 阶段设计。

长期目标是让网站完全英文可用，并保留中文使用体验。第 1 阶段建立国际化基础设施，并迁移最基础的界面按钮、标题、提示、导航文案和角色卡固定字段标签。第 1 阶段不翻译内置卡牌正文、武器/护甲正文、骰子导出长文，也不改变角色存档结构。

本文不是完整实现计划。

## 当前现状

项目当前以中文为默认语言，中文文案分布在多个层级：

- `app/layout.tsx` 中固定 `html lang="zh-CN"`，并硬编码 SEO metadata、结构化数据和水印。
- `app/page.tsx` 和 `components/layout/*` 中硬编码页面标签、加载态、快捷键提示、底部工具栏文案。
- `components/` 中大量角色卡表单标签、弹窗标题、按钮、tooltip、placeholder、alert/prompt/confirm 文案为中文。
- `data/cards/builtin-base.json`、`data/list/*` 使用中文字段名和中文内容承载内置卡牌、武器、护甲数据。
- 自动化模块会生成中文业务展示标签，例如升级来源、属性名、装备修正来源。
- 测试中存在大量中文断言。

这些内容不能一次性按同一种方式处理。第 1 阶段必须按 `docs/contexts/i18n/CONTEXT.md` 中的术语，把 **Application UI Copy**、**Sheet Field Label** 和 **Rules Content** 分开。

## 设计原则

### 默认中文

第 1 阶段默认语言为 `zh-CN`。用户可以切换到 `en-US`，语言偏好保存在浏览器本地。

如果没有用户偏好，系统不按浏览器语言自动切英文。这样现有用户看到的默认体验保持稳定。

### 极薄基础设施

第 1 阶段采用极薄的自研 facade，而不是完整国际化框架。

基础设施只提供：

- locale 类型和常量。
- 当前语言状态。
- 默认中文和 localStorage 持久化。
- `useTranslation()` hook。
- `t(key, params?)` 文案查找。
- 缺失 key fallback。
- 中英文消息字典。

第 1 阶段不实现：

- locale 路由，例如 `/en`、`/zh`。
- 服务端 locale negotiation。
- middleware。
- 翻译提取 CLI。
- 外部翻译平台集成。
- 复杂 ICU message。
- 业务数据 schema 本地化。

如果未来需求扩张，可以把 facade 后面的实现替换为 `next-intl`、`i18next` 或其他成熟库。组件层只依赖 facade，避免大面积返工。

### 基础设施集中放置

所有国际化基础设施放在一个目录：

```text
lib/i18n/
  index.ts
  locales.ts
  messages/
    zh-CN.ts
    en-US.ts
  provider.tsx
  use-translation.ts
```

后续可按需要增加同目录内 helper，例如：

```text
lib/i18n/
  format.ts
  keys.ts
```

组件和业务模块不得直接 import 某个语言包。组件只允许通过 `useTranslation()` 或从 `lib/i18n` 导出的稳定 facade 读取文案。

### 调用点可以分散，逻辑不能分散

第 1 阶段不可避免会修改多个组件，将硬编码中文替换为翻译调用。

允许：

```ts
const t = useTranslation()
t("bottomDock.export")
```

不允许：

```ts
locale === "en-US" ? "Export" : "导出"
```

不允许：

```ts
import { zhMessages } from "@/lib/i18n/messages/zh-CN"
```

这样外部文件只承担调用点，不承载国际化逻辑。

### 不让翻译进入持久化业务状态

第 1 阶段不把翻译结果写入 `SheetData`、卡牌 store、装备数据或自动化 source state。

翻译只发生在展示层。业务判断、筛选、计算、迁移仍依赖现有稳定字段和 ID。

这条原则尤其重要，因为当前卡牌与装备数据含有中文字段名和值。完整数据本地化必须另行设计，不能混入第 1 阶段。

## 第 1 阶段范围

### 包含

第 1 阶段迁移以下高价值、低业务风险的 **Application UI Copy** 和 **Sheet Field Label**：

- 应用级加载态，例如初始化、加载角色数据。
- 页面 tabs 和页面可见性入口中的页面名称。
- 底部 dock 的按钮、菜单项、tooltip。
- 语言切换入口本身。
- 快捷键提示。
- 基础导出/导入/存档操作中的短 alert、prompt、confirm 文案。
- 通用按钮文案，例如关闭、取消、确认、删除、导出、导入、重置。
- 根布局中的水印短文案。
- 客户端 `document.title` 和用户可见页面标题。
- 角色卡布局固定字段标签和区块标题，例如名称、职业、种族、社群、子职业、等级、闪避、生命、压力、希望、金币、经历、护甲、武器、库存、角色描述、背景、外貌、动机、卡组和冒险笔记。
- 固定表头和固定短 placeholder，只要它们由应用布局拥有，而不是来自内置卡牌、装备或用户输入。

迁移顺序应优先覆盖用户第一屏和常用导航，而不是追求源码中文全覆盖。

实施计划可以把本阶段拆成两个执行批次：先迁移工具栏、弹窗、按钮、placeholder、toast、prompt 等 **Application UI Copy**，再迁移角色卡版面固定字段标签和区块标题等 **Sheet Field Label**。这只是执行顺序，不改变第 1 阶段验收范围；验收时两类文案一起判断。

### 不包含

第 1 阶段不迁移：

- 内置卡牌正文。
- 内置卡牌名称、职业名、种族名、领域名、社群名和子职业名。
- 内置武器、护甲、升级项正文。
- 内置武器、护甲名称，以及来自内置装备数据的属性、范围、伤害类型等规则选项值。
- 自定义卡包编辑器的深层字段和长说明。
- 骰子导出说明和骰子命令文档长文。
- HTML 导出中为了兼容旧文件而存在的中文正则或导入识别逻辑。
- HTML 导出器自身的自包含交互文案、清理逻辑和兼容脚本。
- 自动化计算来源 label。
- 测试中所有中文断言的全面替换。
- `SheetData` schema。
- 卡牌 JSON schema。
- 装备数据字段名。

这些内容属于后续阶段。

## 架构

### Locale 模型

`lib/i18n/locales.ts` 定义：

```ts
export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const
export type Locale = typeof SUPPORTED_LOCALES[number]
export const DEFAULT_LOCALE: Locale = "zh-CN"
```

还应提供 `isSupportedLocale(value)`，用于从 localStorage 读取时防御非法值。

### 消息字典

消息字典按 namespace 组织。第 1 阶段使用 TypeScript 对象，便于类型推导和本地 refactor。

推荐 key 分区：

- `common.*`
- `actions.*`
- `app.*`
- `layout.*`
- `bottomDock.*`
- `pages.*`
- `archive.*`
- `export.*`
- `notifications.*`

示例：

```ts
export const zhCNMessages = {
  common: {
    loading: "加载中...",
  },
  bottomDock: {
    export: "导出",
  },
} as const
```

英文消息必须与中文消息保持同结构。第 1 阶段可以通过 TypeScript 的 `satisfies` 检查英文包结构。

第 1 阶段不从字典递归推导严格的点分隔 key union。`t()` 可以接收普通字符串 key，并通过运行时 fallback 和字典结构一致性测试兜底。这样基础设施保持轻量，未来迁移到成熟库时不需要拆除自定义类型系统。

### 翻译函数

`t(key, params?)` 支持点分隔 key 和简单插值。

示例：

```ts
t("archive.maxCharacters", { count: 10 })
```

第 1 阶段只需要简单字符串替换，例如把 `{count}` 替换为传入值。复杂复数规则不在本阶段范围。

缺失 key 行为：

- 开发环境可 `console.warn`。
- 返回 key 本身，避免 UI 崩溃。

### Provider 和 Hook

`I18nProvider` 负责：

- 初始化 locale。
- 从 localStorage 读取用户偏好。
- 保存用户切换后的 locale。
- 向 React tree 提供 `locale`、`setLocale` 和 `t`。

第 1 阶段接受客户端恢复语言偏好造成的短暂默认中文首屏。静态 HTML 和首次 React render 可以使用 `zh-CN`，客户端挂载后再读取 localStorage 并切换到保存的 `en-US`。本阶段不通过首屏阻塞、inline script 或 locale 路由消除这类闪烁。

`useTranslation()` 返回翻译函数。需要切换语言的组件可以额外使用 `useLocale()` 或同一个 hook 返回 `{ locale, setLocale, t }`。

为了减少调用点返工，推荐组件使用：

```ts
const t = useTranslation()
```

只有语言切换器使用完整 locale API。

### Root 接入

`app/layout.tsx` 挂载 `I18nProvider`。

由于当前是静态导出，并且默认语言为中文，服务端输出的 `<html lang>` 可以继续保持 `zh-CN`。语言切换后可在客户端同步更新 `document.documentElement.lang`。

第 1 阶段只迁移客户端 `document.title` 和用户可见页面标题。静态 SEO metadata 可以保持现状或只做非行为性整理，不承诺随 locale 切换。完整语言化 SEO 需要 locale 路由或构建多份静态页面，属于后续阶段。

### 语言切换入口

第 1 阶段需要提供一个明确但低干扰的语言切换入口。

第 1 阶段暂放在底部 dock 的辅助功能区域，最终位置可以在实现或视觉调整时改变。入口使用简短标签：

- 中文界面显示 `语言`。
- 英文界面显示 `Language`。
- 菜单项为 `中文` / `English`。

语言切换入口不得影响打印视图。

## 数据边界

### SheetData

第 1 阶段不新增 `SheetData.locale`。

语言偏好是应用 UI 偏好，不是角色存档属性。把 locale 写进角色存档会造成多角色切换时语言状态含义不清，也会增加导入导出兼容负担。

### 卡牌和装备数据

第 1 阶段不修改内置卡牌 JSON、武器列表、护甲列表的字段名和值。

后续完整英文可用需要单独设计：

- 内置内容的本地化资源如何组织。
- 旧中文字段和新稳定字段如何兼容。
- 自定义卡包是否允许多语言。
- 搜索和筛选使用业务 ID 还是展示文本。
- 旧存档中的 `name` / `class` 展示如何处理。

这些问题不进入第 1 阶段。

### System-Generated Rules Label

第 1 阶段不改 **System-Generated Rules Label**，例如升级、装备、Other Adjustments 的展示文案。

这些 label 当前有些来自系统生成，有些来自用户或装备数据。贸然翻译可能混淆“用户自定义文本”和“系统生成文本”。后续应先标记 source label 的来源类型，再决定哪些可翻译。

## 导出边界

第 1 阶段中，打印预览和浏览器 PDF 导出可以自然跟随当前 React 页面已迁移的 **Application UI Copy**。没有迁移的 **Rules Content** 和 **System-Generated Rules Label** 可以继续显示中文。

HTML 导出器自身生成的自包含按钮、脚本提示、清理/转换逻辑和旧文件兼容识别不属于第 1 阶段范围。JSON 导出继续导出角色数据，不根据 locale 改写持久化字段。

## 测试策略

第 1 阶段应新增或更新以下测试：

- `lib/i18n` 的 key 查找、fallback、简单插值。
- 中英文消息字典结构一致。
- 默认 locale 为 `zh-CN`。
- localStorage 中合法 locale 会被恢复。
- localStorage 中非法 locale 会回退中文。
- 一个核心 UI 组件在 `en-US` 下显示英文按钮。
- 回归测试：切换 locale 不修改 `SheetData`。
- 回归测试：JSON 导出数据不因 locale 改写持久化字段。
- 回归测试：已迁移的页面 tabs 或 bottom dock 在 `zh-CN` 默认下仍显示原中文文案。

不要求本阶段更新所有中文断言。

组件测试如果迁移了文案，应显式包裹 `I18nProvider` 或使用测试 helper 提供 locale。测试重点应放在 i18n 基础设施和少量关键组件 smoke 上，不应为第 1 阶段把所有组件改成英文文案断言。

## 验收标准

第 1 阶段完成后：

- 默认进入网站仍显示中文 UI。
- 用户可以切换到英文，并在刷新后保持英文偏好。
- 第一屏常用 **Application UI Copy** 至少包括页面 tabs、底部 dock、加载态、快捷键提示和基础操作文案，能够显示英文。
- 第 1 阶段纳入范围的 **Sheet Field Label** 能够显示英文，并且中文默认显示保持原行为。
- 内置卡牌和装备内容仍可保持中文，不视为第 1 阶段缺陷。
- 现有角色存档、导入导出、自动化计算不因语言切换改变数据。
- i18n 基础设施集中在 `lib/i18n/`。
- 组件内不存在散落的 `locale === "en-US"` 条件文案。

## 后续阶段路线图

### 第 2 阶段：角色卡表单短文案

迁移角色卡页面内的标签、placeholder、短提示、页面管理菜单。

重点覆盖 `components/character-sheet-sections/`、`components/character-sheet-page-*` 中的展示文案。

### 第 3 阶段：业务展示 label

迁移属性名、target 名称、修正来源、升级来源、装备来源等系统生成展示 label。

此阶段需要明确哪些 label 是系统生成、哪些是用户输入。

### 第 4 阶段：内置内容本地化

设计并实现内置卡牌、武器、护甲、升级项的多语言内容组织方式。

此阶段可能需要引入稳定数据字段、内容翻译文件、搜索策略和兼容转换层。

### 第 5 阶段：SEO、导出和文档

如果需要英文 SEO 和可分享语言 URL，引入 locale routing 或构建多语言静态页面。

同时处理 HTML 导出、README、用户指南、骰子导出说明和更完整测试覆盖。

## 成熟库迁移策略

第 1 阶段不直接接入成熟库，但 facade 设计必须支持未来迁移。

未来如果出现以下需求，应重新评估 `next-intl`、`i18next` 或 `FormatJS`：

- 需要 `/en`、`/zh` 可分享 URL。
- 需要按语言生成 metadata、sitemap 或 Open Graph。
- 需要复杂复数、日期、时间、数字和货币格式。
- 翻译内容需要交给非开发者维护。
- 需要和翻译平台集成。
- 需要系统化缺失 key 检查和翻译提取流程。

迁移时应优先替换 `lib/i18n` 内部实现，而不是重写业务组件。

组件层保持：

```ts
const t = useTranslation()
t("common.loading")
```

这样迁移成熟库的主要成本集中在 adapter、provider、message loader 和 app/layout 层。
