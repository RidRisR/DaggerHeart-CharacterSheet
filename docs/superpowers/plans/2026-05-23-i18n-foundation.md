# I18n Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin i18n facade, default Chinese / optional English language switching, and migrate first-stage Application UI Copy plus Sheet Field Label text without changing character data or rules content.

**Architecture:** Put all i18n infrastructure in `lib/i18n/` and make components consume only `useTranslation()` or `useLocale()`. Migrate visible text in two implementation batches: first application controls and navigation, then fixed character-sheet labels. Keep rules content, built-in card/equipment data, System-Generated Rules Labels, and HTML exporter internals out of this stage.

**Tech Stack:** Next.js App Router static export, React client components, TypeScript, Zustand stores, Vitest, Testing Library, Happy DOM.

---

## Specs

- `CONTEXT-MAP.md`
- `docs/contexts/i18n/CONTEXT.md`
- `docs/adr/0001-i18n-facade-before-framework.md`
- `docs/superpowers/specs/2026-05-23-i18n-foundation-design.md`

## File Map

- Create `lib/i18n/locales.ts`: supported locale constants, default locale, localStorage key, runtime guard.
- Create `lib/i18n/messages/zh-CN.ts`: canonical Chinese message tree.
- Create `lib/i18n/messages/en-US.ts`: English message tree with the same shape as Chinese.
- Create `lib/i18n/messages/index.ts`: locale-to-message map.
- Create `lib/i18n/translate.ts`: dot-key lookup, simple `{param}` interpolation, fallback behavior, dictionary shape helper.
- Create `lib/i18n/provider.tsx`: client provider, locale state, localStorage restore, `<html lang>` sync.
- Create `lib/i18n/use-translation.ts`: stable hooks for component use.
- Create/modify `lib/i18n/index.ts`: public facade exports.
- Create `tests/unit/i18n/i18n-core.test.ts`: pure i18n helper tests.
- Create `tests/unit/i18n/i18n-provider.test.tsx`: provider, locale restore, locale switching tests.
- Create `tests/unit/i18n/i18n-regression.test.tsx`: no SheetData mutation and JSON data stability regression tests.
- Modify `app/layout.tsx`: wrap app body with `I18nProvider`; keep static metadata behavior.
- Modify `app/page.tsx`: use translations for document title, page registry labels, loading states, shortcut hint, print preview banner, card add notification, and import prompts/alerts.
- Modify `data/list/pages.ts`: replace hard-coded page labels/descriptions with translation keys or a helper that translates page configs.
- Modify `lib/page-registry.ts`: allow registered page labels to be translated at render time through keys.
- Modify `components/layout/page-display.tsx`: translate tab labels and page navigation titles.
- Modify `components/ui/page-visibility-dropdown.tsx`: translate optional page labels/descriptions and menu title.
- Modify `components/layout/bottom-dock.tsx`: translate dock buttons, menus, tooltip content, preview controls, and add a temporary language switcher in Group C.
- Create `components/i18n/language-switcher.tsx`: locale selector UI used by `BottomDock`.
- Modify `components/ui/save-switcher.tsx`: translate loading fallback, prompt, and title.
- Modify `components/modals/card-selection-modal.tsx`, `components/modals/display/ContentStates.tsx`, and `components/modals/base/ModalHeader.tsx`: translate core modal controls and state copy while preserving caller-provided content.
- Modify character-sheet fixed label components:
  - `components/character-sheet-sections/header-section.tsx`
  - `components/character-sheet-sections/attributes-section.tsx`
  - `components/character-sheet-sections/hit-points-section.tsx`
  - `components/character-sheet-sections/hope-section.tsx`
  - `components/character-sheet-sections/gold-section.tsx`
  - `components/character-sheet-sections/experience-section.tsx`
  - `components/character-sheet-sections/weapon-section.tsx`
  - `components/character-sheet-sections/armor-section.tsx`
  - `components/character-sheet-sections/inventory-section.tsx`
  - `components/character-sheet-sections/inventory-weapon-section.tsx`
  - `components/character-sheet.tsx`
  - `components/character-sheet-page-two-sections/character-description-section.tsx`
  - `components/character-sheet-page-two-sections/card-deck-section.tsx`
  - `components/character-sheet-page-two.tsx`

---

### Task 1: Core i18n Helpers

**Files:**
- Create: `tests/unit/i18n/i18n-core.test.ts`
- Create: `lib/i18n/locales.ts`
- Create: `lib/i18n/messages/zh-CN.ts`
- Create: `lib/i18n/messages/en-US.ts`
- Create: `lib/i18n/messages/index.ts`
- Create: `lib/i18n/translate.ts`
- Create: `lib/i18n/index.ts`

- [ ] **Step 1: Write failing pure helper tests**

Create `tests/unit/i18n/i18n-core.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  messages,
  t,
  hasSameMessageShape,
} from "@/lib/i18n"

describe("i18n core", () => {
  it("defaults to zh-CN", () => {
    expect(DEFAULT_LOCALE).toBe("zh-CN")
  })

  it("accepts only supported locales", () => {
    expect(isSupportedLocale("zh-CN")).toBe(true)
    expect(isSupportedLocale("en-US")).toBe(true)
    expect(isSupportedLocale("fr-FR")).toBe(false)
    expect(isSupportedLocale(null)).toBe(false)
  })

  it("looks up nested keys by locale", () => {
    expect(t("common.loading", undefined, "zh-CN")).toBe("加载中...")
    expect(t("common.loading", undefined, "en-US")).toBe("Loading...")
  })

  it("interpolates simple params", () => {
    expect(t("archive.maxCharacters", { count: 10 }, "zh-CN")).toBe("最多只能创建10个角色")
    expect(t("archive.maxCharacters", { count: 10 }, "en-US")).toBe("You can create up to 10 characters")
  })

  it("falls back to the key for missing messages", () => {
    expect(t("missing.key", undefined, "zh-CN")).toBe("missing.key")
  })

  it("keeps zh-CN and en-US message trees structurally aligned", () => {
    expect(hasSameMessageShape(messages["zh-CN"], messages["en-US"])).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/i18n-core.test.ts
```

Expected: FAIL because `@/lib/i18n` does not exist.

- [ ] **Step 3: Create locale constants**

Create `lib/i18n/locales.ts`:

```ts
export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const

export type Locale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: Locale = "zh-CN"

export const LOCALE_STORAGE_KEY = "dh_locale_preference"

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale)
}
```

- [ ] **Step 4: Create the Chinese message tree**

Create `lib/i18n/messages/zh-CN.ts`:

```ts
export const zhCNMessages = {
  common: {
    loading: "加载中...",
    close: "关闭",
    cancel: "取消",
    confirm: "确认",
    delete: "删除",
    reset: "重置",
    editName: "编辑名称",
    unknownError: "未知错误",
  },
  app: {
    title: "Character Sheet",
    initializing: "初始化中...",
    startingClient: "正在启动客户端...",
    loadingCharacterData: "正在加载角色数据",
    openSourceNotice: "本作品完全开源且免费",
    author: "作者：RidRisR",
    translators: "翻译及校对：PolearmMaster, 末楔, 里予, 一得, RisRisR",
    repositoryLink: "项目地址 & 下载地址（点我访问 GitHub）",
    printPreviewExit: "按 {key} 键或点击此处退出预览",
    deckFull: "卡组已满，无法添加更多卡牌",
    cardAdded: "卡牌已添加到{deck}卡组",
    focusedDeck: "聚焦",
    inventoryDeck: "库存",
  },
  shortcuts: {
    title: "⌨️ 快捷键提示",
    switchPage: "← → 切换页面",
    jumpPage: "1 2 3 直接跳转",
    switchArchive: "Ctrl+数字 切换存档",
  },
  pages: {
    page1: { label: "第一页", description: "角色基础信息" },
    page2: { label: "第二页", description: "角色详细属性" },
    page3: { label: "游侠伙伴", description: "游侠专用伙伴表" },
    page4: { label: "主板扩展", description: "伊科尼斯武装表" },
    adventureNotes: { label: "冒险笔记", description: "角色背景与冒险记录" },
    focusedCards: { label: "聚焦卡组", description: "聚焦卡组打印页" },
    inventoryCards: { label: "库存卡组", description: "库存卡组打印页" },
    previous: "上一页 (←) - 循环切换",
    next: "下一页 (→) - 循环切换",
    manageVisibility: "管理页面显示",
  },
  bottomDock: {
    cardDrawer: "卡牌抽屉",
    openCardDrawer: "打开卡牌抽屉",
    closeCardDrawer: "点击关闭",
    browseCards: "浏览和选择卡牌",
    guide: "建卡指引",
    guideTooltipTitle: "新手建卡指引",
    guideTooltipDescription: "跟随步骤快速创建你的第一个角色",
    notebook: "笔记",
    notebookTooltipTitle: "笔记本",
    notebookTooltipDescription: "记录游戏中的笔记、计数器和骰子",
    export: "导出",
    exportTooltipTitle: "导出角色卡",
    exportTooltipDescription: "导出为PDF、HTML、JSON等格式",
    openExportPreview: "打开导出预览界面",
    exportToDice: "导出到骰子",
    exportJSON: "导出JSON",
    exportPDF: "导出PDF",
    exportHTML: "导出HTML",
    archive: "存档",
    archiveTooltipTitle: "存档管理",
    archiveTooltipDescription: "管理多个角色存档",
    openArchiveManager: "打开存档管理器",
    newArchive: "新建存档",
    importFromHTML: "从HTML导入",
    cardPackages: "卡包",
    cardPackagesTooltipTitle: "卡包管理",
    cardPackagesTooltipDescription: "管理和导入自定义卡包",
    back: "返回",
  },
  language: {
    trigger: "语言",
    zhCN: "中文",
    enUS: "English",
  },
  archive: {
    loading: "加载中...",
    renamePrompt: "请输入新的存档名称:",
    createPrompt: "请输入新存档的名称:",
    importedSuffix: "HTML导入",
    maxCharacters: "最多只能创建{count}个角色",
    createFailedLimit: "创建新存档失败，可能已达到存档数量上限",
    htmlImportSuccessWithWarnings: "HTML导入成功并创建新存档\"{name}\"，但有以下警告：\n{warnings}",
    htmlImportSuccess: "HTML导入成功并创建新存档\"{name}\"",
    htmlImportFailed: "HTML导入失败：{error}",
    htmlImportFailedWithMessage: "HTML导入失败: {message}",
    clickToRename: "点击修改存档名称",
  },
  cardSelection: {
    title: "选择卡牌 #{index}",
    customCard: "+ 自定义卡牌",
    clearSelection: "清除选择",
    package: "卡包",
    category: "类别",
    level: "等级",
    noPackageSelected: "未选卡包",
    allPackages: "全部卡包",
    packagesSelected: "包已选",
    searchPackages: "搜索卡包...",
    noCategorySelected: "未选类别",
    allCategories: "全部类别",
    categoriesSelected: "类已选",
    noLevelSelected: "未选等级",
    allLevels: "全部等级",
    levelsSelected: "级已选",
    searchCards: "搜索卡牌名称或描述...",
    resetFilters: "重置筛选",
    empty: "未找到符合条件的卡牌",
    loading: "加载卡牌中...",
  },
  contentStates: {
    empty: "没有数据",
    loading: "加载中...",
    failed: "加载失败",
  },
  sheet: {
    profession: "职业",
    name: "名称",
    community: "社群",
    ancestry: "种族",
    subclass: "子职业",
    level: "等级",
    selectProfession: "选择职业",
    selectCommunity: "选择社群",
    selectAncestry: "选择种族",
    selectSubclass: "选择子职业",
    evasion: "闪避",
    hpStress: "生命值与压力",
    minorDamage: "轻度伤害",
    severeDamage: "严重伤害",
    majorDamage: "重度伤害",
    max: "最大值:",
    hope: "希望",
    hopeHelp: "花费一点希望使用经历或帮助队友",
    gold: "金币",
    handfuls: "把",
    bags: "袋",
    chests: "箱",
    experience: "经历",
    equipment: "装备",
    proficiency: "熟练度",
    classFeature: "职业特性",
    inventoryWeapons: "备用武器",
    primaryWeapon: "主武器",
    secondaryWeapon: "副武器",
    weaponName: "名称",
    basicInfo: "基本信息",
    damageDice: "伤害骰",
    selectWeapon: "选择武器",
    armor: "护甲",
    selectArmor: "选择护甲",
    armorValue: "护甲值",
    threshold: "阈值",
    minorThreshold: "重伤阈值",
    majorThreshold: "严重阈值",
    inventory: "库存",
    clearInventory: "清空库存",
    fillStartingItems: "填充起始物品",
    characterSummary: "角色简介",
    characterSummaryPlaceholder: "写下对您的角色的概括性介绍，包括他们的过去、经历和个性特征。请注意，角色真正的性格和背景特质应当在游戏中体现出来，这里只是简短的概括和提示。",
    characterTraits: "角色特质",
    characterTraitsPlaceholder: "写下您的角色的性别、年龄、外貌和服装等外观特征。如果您的角色有什么特征或者与众不同之处，也可以记录在这里。",
    adventureNotes: "冒险笔记",
    adventureNotesPlaceholder: "写下您角色经历的重大事件，值得注意的线索，目前的角色的状态和思考，或者其他值得记录的重要信息。",
    deck: "卡组",
    tier2Title: "T2 等级 2-4",
    tier3Title: "T3 等级 5-7",
    tier4Title: "T4 等级 8-10",
    tier2Description: "当你到达 2 级时：获得一项额外+2经历，熟练度标记+1。",
    tier3Description: "当你到达 5 级时：获得一项额外+2经历，清除所有属性升级标记，熟练度标记+1。",
    tier4Description: "当你到达 8 级时：获得一项额外+2经历，清除所有属性升级标记，熟练度标记+1。",
  },
} as const
```

- [ ] **Step 5: Create the English message tree**

Create `lib/i18n/messages/en-US.ts`:

```ts
import type { zhCNMessages } from "./zh-CN"

export const enUSMessages = {
  common: {
    loading: "Loading...",
    close: "Close",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    reset: "Reset",
    editName: "Edit name",
    unknownError: "Unknown error",
  },
  app: {
    title: "Character Sheet",
    initializing: "Initializing...",
    startingClient: "Starting client...",
    loadingCharacterData: "Loading character data",
    openSourceNotice: "This work is fully open-source and free.",
    author: "Author: RidRisR",
    translators: "Translation and proofreading: PolearmMaster, 末楔, 里予, 一得, RisRisR",
    repositoryLink: "Project and downloads (open GitHub)",
    printPreviewExit: "Press {key} or click here to exit preview",
    deckFull: "The deck is full. No more cards can be added.",
    cardAdded: "Card added to the {deck} deck",
    focusedDeck: "focused",
    inventoryDeck: "inventory",
  },
  shortcuts: {
    title: "⌨️ Shortcuts",
    switchPage: "← → Switch page",
    jumpPage: "1 2 3 Jump directly",
    switchArchive: "Ctrl+number Switch archive",
  },
  pages: {
    page1: { label: "Page One", description: "Character basics" },
    page2: { label: "Page Two", description: "Character details" },
    page3: { label: "Ranger Companion", description: "Ranger companion sheet" },
    page4: { label: "Main Board Extension", description: "Iknis weapon sheet" },
    adventureNotes: { label: "Adventure Notes", description: "Background and adventure log" },
    focusedCards: { label: "Focused Deck", description: "Focused deck print page" },
    inventoryCards: { label: "Inventory Deck", description: "Inventory deck print page" },
    previous: "Previous page (←) - cycle",
    next: "Next page (→) - cycle",
    manageVisibility: "Manage visible pages",
  },
  bottomDock: {
    cardDrawer: "Card Drawer",
    openCardDrawer: "Open card drawer",
    closeCardDrawer: "Click to close",
    browseCards: "Browse and choose cards",
    guide: "Guide",
    guideTooltipTitle: "Character creation guide",
    guideTooltipDescription: "Follow the steps to create your first character",
    notebook: "Notebook",
    notebookTooltipTitle: "Notebook",
    notebookTooltipDescription: "Track notes, counters, and dice during play",
    export: "Export",
    exportTooltipTitle: "Export character sheet",
    exportTooltipDescription: "Export as PDF, HTML, JSON, and more",
    openExportPreview: "Open export preview",
    exportToDice: "Export to Dice",
    exportJSON: "Export JSON",
    exportPDF: "Export PDF",
    exportHTML: "Export HTML",
    archive: "Archive",
    archiveTooltipTitle: "Archive management",
    archiveTooltipDescription: "Manage multiple character archives",
    openArchiveManager: "Open archive manager",
    newArchive: "New archive",
    importFromHTML: "Import from HTML",
    cardPackages: "Card Packs",
    cardPackagesTooltipTitle: "Card pack manager",
    cardPackagesTooltipDescription: "Manage and import custom card packs",
    back: "Back",
  },
  language: {
    trigger: "Language",
    zhCN: "中文",
    enUS: "English",
  },
  archive: {
    loading: "Loading...",
    renamePrompt: "Enter the new archive name:",
    createPrompt: "Enter a name for the new archive:",
    importedSuffix: "HTML import",
    maxCharacters: "You can create up to {count} characters",
    createFailedLimit: "Failed to create archive. The archive limit may have been reached.",
    htmlImportSuccessWithWarnings: "HTML import succeeded and created archive \"{name}\", with warnings:\n{warnings}",
    htmlImportSuccess: "HTML import succeeded and created archive \"{name}\"",
    htmlImportFailed: "HTML import failed: {error}",
    htmlImportFailedWithMessage: "HTML import failed: {message}",
    clickToRename: "Click to rename archive",
  },
  cardSelection: {
    title: "Choose Card #{index}",
    customCard: "+ Custom Card",
    clearSelection: "Clear Selection",
    package: "Card Pack",
    category: "Category",
    level: "Level",
    noPackageSelected: "No card pack selected",
    allPackages: "All card packs",
    packagesSelected: "packs selected",
    searchPackages: "Search card packs...",
    noCategorySelected: "No category selected",
    allCategories: "All categories",
    categoriesSelected: "categories selected",
    noLevelSelected: "No level selected",
    allLevels: "All levels",
    levelsSelected: "levels selected",
    searchCards: "Search card name or description...",
    resetFilters: "Reset Filters",
    empty: "No matching cards found",
    loading: "Loading cards...",
  },
  contentStates: {
    empty: "No data",
    loading: "Loading...",
    failed: "Failed to load",
  },
  sheet: {
    profession: "Class",
    name: "Name",
    community: "Community",
    ancestry: "Ancestry",
    subclass: "Subclass",
    level: "Level",
    selectProfession: "Choose class",
    selectCommunity: "Choose community",
    selectAncestry: "Choose ancestry",
    selectSubclass: "Choose subclass",
    evasion: "Evasion",
    hpStress: "Hit Points & Stress",
    minorDamage: "Minor Damage",
    severeDamage: "Severe Damage",
    majorDamage: "Major Damage",
    max: "Max:",
    hope: "Hope",
    hopeHelp: "Spend 1 Hope to use an Experience or help an ally",
    gold: "Gold",
    handfuls: "Handfuls",
    bags: "Bags",
    chests: "Chests",
    experience: "Experiences",
    equipment: "Equipment",
    proficiency: "Proficiency",
    classFeature: "Class Feature",
    inventoryWeapons: "Backup Weapons",
    primaryWeapon: "Primary Weapon",
    secondaryWeapon: "Secondary Weapon",
    weaponName: "Name",
    basicInfo: "Basic Info",
    damageDice: "Damage Dice",
    selectWeapon: "Choose weapon",
    armor: "Armor",
    selectArmor: "Choose armor",
    armorValue: "Armor Score",
    threshold: "Thresholds",
    minorThreshold: "Major threshold",
    majorThreshold: "Severe threshold",
    inventory: "Inventory",
    clearInventory: "Clear inventory",
    fillStartingItems: "Fill starting items",
    characterSummary: "Character Summary",
    characterSummaryPlaceholder: "Write a short overview of your character, including their past, experiences, and personality. The character's true personality and background should emerge in play; this is a quick reference.",
    characterTraits: "Character Traits",
    characterTraitsPlaceholder: "Write your character's gender, age, appearance, clothing, and any distinctive features.",
    adventureNotes: "Adventure Notes",
    adventureNotesPlaceholder: "Record major events, notable clues, current character status and thoughts, or anything else worth remembering.",
    deck: "Deck",
    tier2Title: "T2 Level 2-4",
    tier3Title: "T3 Level 5-7",
    tier4Title: "T4 Level 8-10",
    tier2Description: "When you reach level 2: gain one additional +2 Experience and mark +1 Proficiency.",
    tier3Description: "When you reach level 5: gain one additional +2 Experience, clear all attribute upgrade marks, and mark +1 Proficiency.",
    tier4Description: "When you reach level 8: gain one additional +2 Experience, clear all attribute upgrade marks, and mark +1 Proficiency.",
  },
} satisfies typeof zhCNMessages
```

- [ ] **Step 6: Create message index and translator helpers**

Create `lib/i18n/messages/index.ts`:

```ts
import { zhCNMessages } from "./zh-CN"
import { enUSMessages } from "./en-US"
import type { Locale } from "../locales"

export type MessageDictionary = typeof zhCNMessages

export const messages: Record<Locale, MessageDictionary> = {
  "zh-CN": zhCNMessages,
  "en-US": enUSMessages,
}
```

Create `lib/i18n/translate.ts`:

```ts
import { DEFAULT_LOCALE, type Locale } from "./locales"
import { messages, type MessageDictionary } from "./messages"

type MessageNode = string | { [key: string]: MessageNode }
type Params = Record<string, string | number | boolean | null | undefined>

function lookupMessage(dictionary: MessageDictionary, key: string): string | undefined {
  const value = key.split(".").reduce<MessageNode | undefined>((current, segment) => {
    if (!current || typeof current === "string") return undefined
    return current[segment]
  }, dictionary as unknown as MessageNode)

  return typeof value === "string" ? value : undefined
}

export function formatMessage(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name]
    return value === undefined || value === null ? match : String(value)
  })
}

export function t(key: string, params?: Params, locale: Locale = DEFAULT_LOCALE): string {
  const template = lookupMessage(messages[locale], key)
  if (!template) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] Missing message key "${key}" for locale "${locale}"`)
    }
    return key
  }
  return formatMessage(template, params)
}

function collectShape(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix]
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.keys(value as Record<string, unknown>).flatMap((key) =>
    collectShape((value as Record<string, unknown>)[key], prefix ? `${prefix}.${key}` : key),
  )
}

export function hasSameMessageShape(left: MessageDictionary, right: MessageDictionary): boolean {
  const leftShape = collectShape(left).sort()
  const rightShape = collectShape(right).sort()
  return leftShape.length === rightShape.length && leftShape.every((key, index) => key === rightShape[index])
}
```

Create `lib/i18n/index.ts`:

```ts
export {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type Locale,
} from "./locales"
export { messages, type MessageDictionary } from "./messages"
export { formatMessage, hasSameMessageShape, t } from "./translate"
```

- [ ] **Step 7: Run helper tests**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/i18n-core.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit core helpers**

Run:

```bash
git add lib/i18n tests/unit/i18n/i18n-core.test.ts
git commit -m "feat: add i18n core helpers"
```

Expected: one commit containing only core i18n helpers and tests.

---

### Task 2: Provider, Hooks, and Locale Persistence

**Files:**
- Create: `tests/unit/i18n/i18n-provider.test.tsx`
- Create: `lib/i18n/provider.tsx`
- Create: `lib/i18n/use-translation.ts`
- Modify: `lib/i18n/index.ts`

- [ ] **Step 1: Write failing provider tests**

Create `tests/unit/i18n/i18n-provider.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import {
  I18nProvider,
  LOCALE_STORAGE_KEY,
  useLocale,
  useTranslation,
} from "@/lib/i18n"

function LocaleProbe() {
  const t = useTranslation()
  const { locale, setLocale } = useLocale()

  return (
    <div>
      <div data-testid="locale">{locale}</div>
      <div data-testid="loading">{t("common.loading")}</div>
      <button type="button" onClick={() => setLocale("en-US")}>
        switch-en
      </button>
      <button type="button" onClick={() => setLocale("zh-CN")}>
        switch-zh
      </button>
    </div>
  )
}

describe("I18nProvider", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.lang = ""
  })

  it("starts with the default Chinese locale", () => {
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    )

    expect(screen.getByTestId("locale")).toHaveTextContent("zh-CN")
    expect(screen.getByTestId("loading")).toHaveTextContent("加载中...")
  })

  it("restores a supported locale from localStorage after mount", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")

    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en-US")
      expect(screen.getByTestId("loading")).toHaveTextContent("Loading...")
    })
    expect(document.documentElement.lang).toBe("en-US")
  })

  it("ignores unsupported stored locale values", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "fr-FR")

    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("zh-CN")
    })
    expect(document.documentElement.lang).toBe("zh-CN")
  })

  it("persists user locale changes", async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: "switch-en" }))

    expect(screen.getByTestId("locale")).toHaveTextContent("en-US")
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en-US")
    expect(document.documentElement.lang).toBe("en-US")
  })
})
```

- [ ] **Step 2: Run provider tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/i18n-provider.test.tsx
```

Expected: FAIL because `I18nProvider`, `useTranslation`, and `useLocale` are not exported.

- [ ] **Step 3: Implement provider and hooks**

Create `lib/i18n/provider.tsx`:

```tsx
"use client"

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react"
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isSupportedLocale,
  type Locale,
} from "./locales"
import { t as translate } from "./translate"

type TranslationParams = Record<string, string | number | boolean | null | undefined>

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: TranslationParams) => string
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    setLocaleState(isSupportedLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
  }, [])

  const t = useCallback(
    (key: string, params?: TranslationParams) => translate(key, params, locale),
    [locale],
  )

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
```

Create `lib/i18n/use-translation.ts`:

```ts
"use client"

import { useContext } from "react"
import { I18nContext } from "./provider"

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

export function useTranslation() {
  return useI18n().t
}

export function useLocale() {
  const { locale, setLocale } = useI18n()
  return { locale, setLocale }
}
```

Update `lib/i18n/index.ts`:

```ts
export {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type Locale,
} from "./locales"
export { messages, type MessageDictionary } from "./messages"
export { formatMessage, hasSameMessageShape, t } from "./translate"
export { I18nProvider, type I18nContextValue } from "./provider"
export { useI18n, useLocale, useTranslation } from "./use-translation"
```

- [ ] **Step 4: Run provider and core tests**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/i18n-core.test.ts tests/unit/i18n/i18n-provider.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit provider and hooks**

Run:

```bash
git add lib/i18n tests/unit/i18n/i18n-provider.test.tsx
git commit -m "feat: add i18n provider"
```

Expected: one commit containing provider, hooks, and tests.

---

### Task 3: Root Wiring and Locale Regression Tests

**Files:**
- Create: `tests/unit/i18n/i18n-regression.test.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write no-data-mutation regression tests**

Create `tests/unit/i18n/i18n-regression.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { I18nProvider, useLocale } from "@/lib/i18n"
import { useSheetStore } from "@/lib/sheet-store"

function LocaleButtons() {
  const { setLocale } = useLocale()
  return (
    <div>
      <button type="button" onClick={() => setLocale("en-US")}>English</button>
      <button type="button" onClick={() => setLocale("zh-CN")}>Chinese</button>
    </div>
  )
}

describe("i18n regressions", () => {
  beforeEach(() => {
    window.localStorage.clear()
    useSheetStore.getState().replaceSheetData({
      ...useSheetStore.getState().sheetData,
      name: "Locale Regression Character",
      level: "3",
    })
  })

  it("does not mutate SheetData when locale changes", async () => {
    const user = userEvent.setup()
    const before = JSON.stringify(useSheetStore.getState().sheetData)

    render(
      <I18nProvider>
        <LocaleButtons />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: "English" }))
    await user.click(screen.getByRole("button", { name: "Chinese" }))

    expect(JSON.stringify(useSheetStore.getState().sheetData)).toBe(before)
  })

  it("does not write locale preference into exported character data", async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <LocaleButtons />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: "English" }))

    const exportedData = JSON.parse(JSON.stringify(useSheetStore.getState().sheetData))
    expect(exportedData.locale).toBeUndefined()
    expect(exportedData.language).toBeUndefined()
    expect(exportedData.name).toBe("Locale Regression Character")
  })
})
```

- [ ] **Step 2: Run regression tests to verify current provider behavior**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/i18n-regression.test.tsx
```

Expected: PASS. If it fails because `replaceSheetData` applies migrations that alter defaults, update the test setup to capture `before` after the `replaceSheetData` call, not before it.

- [ ] **Step 3: Wrap the app in `I18nProvider`**

Modify `app/layout.tsx` imports:

```ts
import { I18nProvider } from "@/lib/i18n"
```

Wrap the existing provider tree inside `<I18nProvider>`:

```tsx
<body suppressHydrationWarning>
  <ChunkLoadErrorHandler />
  <I18nProvider>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ProgressModalProvider>
        <CardSystemInitializer />
        <PrintHelper />
        {children}
        <Toaster />
        <FadeNotificationContainer />
        {/* existing watermark block remains here for the next step */}
      </ProgressModalProvider>
    </ThemeProvider>
  </I18nProvider>
</body>
```

- [ ] **Step 4: Move translated watermark text into a client component**

Create an inner client component in `app/page.tsx` is not appropriate for layout. Instead create a small local client component inside `app/layout.tsx` only if the file remains a server component conflict. If TypeScript rejects using `useTranslation()` directly in `app/layout.tsx`, create `components/layout/app-watermark.tsx`:

```tsx
"use client"

import { useTranslation } from "@/lib/i18n"

export function AppWatermark() {
  const t = useTranslation()

  return (
    <div className="fixed bottom-2 left-2 text-gray-500 text-xs opacity-75 pointer-events-none">
      {t("app.openSourceNotice")}
      <br />
      {t("app.author")}
      <br />
      {t("app.translators")}
      <br />
      <a
        href="https://github.com/RidRisR/DaggerHeart-CharacterSheet"
        target="_blank"
        rel="noopener noreferrer"
        className="underline pointer-events-auto hover:text-gray-700 transition-colors"
      >
        {t("app.repositoryLink")}
      </a>
    </div>
  )
}
```

Then replace the watermark block in `app/layout.tsx` with:

```tsx
<AppWatermark />
```

and add:

```ts
import { AppWatermark } from "@/components/layout/app-watermark"
```

- [ ] **Step 5: Translate document title in `app/page.tsx`**

Inside `Home`, add:

```ts
import { useTranslation } from "@/lib/i18n"
```

Then add near the start of the component:

```ts
const t = useTranslation()
```

Replace the mount title effect:

```ts
useEffect(() => {
  setIsClient(true)
  document.title = t("app.title")

  const timer = setTimeout(() => {
    setShowShortcutHint(true)
    setTimeout(() => setShowShortcutHint(false), 3000)
  }, 1000)

  return () => clearTimeout(timer)
}, [t])
```

- [ ] **Step 6: Run focused tests and type check through Vitest**

Run:

```bash
pnpm exec vitest run tests/unit/i18n
```

Expected: PASS.

- [ ] **Step 7: Commit root wiring**

Run:

```bash
git add app/layout.tsx app/page.tsx components/layout/app-watermark.tsx tests/unit/i18n
git commit -m "feat: wire i18n provider"
```

Expected: one commit containing provider wiring, watermark extraction if needed, and regression tests.

---

### Task 4: Page Labels, Page Visibility, and App Loading Copy

**Files:**
- Create: `tests/unit/i18n/page-labels.test.tsx`
- Modify: `data/list/pages.ts`
- Modify: `lib/page-registry.ts`
- Modify: `components/layout/page-display.tsx`
- Modify: `components/ui/page-visibility-dropdown.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write failing page label smoke tests**

Create `tests/unit/i18n/page-labels.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n"
import { PageDisplay } from "@/components/layout/page-display"
import { defaultSheetData } from "@/lib/default-sheet-data"

const EmptyPage = () => <div>page content</div>

vi.mock("@/lib/page-registry", async () => {
  const actual = await vi.importActual<typeof import("@/lib/page-registry")>("@/lib/page-registry")
  return {
    ...actual,
    getTabPages: () => [
      {
        id: "page1",
        label: "第一页",
        labelKey: "pages.page1.label",
        component: EmptyPage,
        printClass: "page-one",
        visibility: { type: "always" },
        printOrder: 1,
        showInTabs: true,
      },
    ],
  }
})

function renderPageDisplay() {
  return render(
    <I18nProvider>
      <PageDisplay
        isDualPageMode={false}
        isMobile={false}
        leftPageId="page1"
        rightPageId="page2"
        leftTabValue="page1"
        rightTabValue="page2"
        currentTabValue="page1"
        formData={defaultSheetData}
        onSetLeftTab={vi.fn()}
        onSetRightTab={vi.fn()}
        onSetCurrentTab={vi.fn()}
        onSwitchToPrevPage={vi.fn()}
        onSwitchToNextPage={vi.fn()}
      />
    </I18nProvider>,
  )
}

describe("localized page labels", () => {
  it("keeps Chinese labels by default", () => {
    renderPageDisplay()
    expect(screen.getByRole("tab", { name: "第一页" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run page label test to verify current Chinese behavior**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/page-labels.test.tsx
```

Expected: PASS before implementation. This is a regression test for default Chinese behavior.

- [ ] **Step 3: Add translation keys to page definitions**

Modify `lib/page-registry.ts`:

```ts
export interface PageDefinition {
  id: string
  label: string
  labelKey?: string
  descriptionKey?: string
  component: ComponentType
  printClass: string
  tabValue?: string
  visibility:
    | { type: 'always' }
    | { type: 'config'; configKey: 'rangerCompanion' | 'armorTemplate' | 'adventureNotes' }
    | { type: 'data'; dataCheck: (data: SheetData) => boolean }
  printOrder: number
  showInTabs?: boolean
}
```

Keep `label` as fallback so existing tests and un-migrated callers remain compatible.

- [ ] **Step 4: Add page keys in `app/page.tsx` registration**

Update each `registerPages` entry in `app/page.tsx`:

```ts
{
  id: 'page1',
  label: '第一页',
  labelKey: 'pages.page1.label',
  component: CharacterSheet,
  printClass: 'page-one',
  visibility: { type: 'always' },
  printOrder: 1,
  showInTabs: true
}
```

Use these mappings:

```ts
page1 -> pages.page1.label
page2 -> pages.page2.label
page3 -> pages.page3.label
page4 -> pages.page4.label
adventure-notes -> pages.adventureNotes.label
focused-cards -> pages.focusedCards.label
inventory-cards -> pages.inventoryCards.label
```

- [ ] **Step 5: Translate tabs and page navigation in `PageDisplay`**

In `components/layout/page-display.tsx`, import:

```ts
import { useTranslation } from "@/lib/i18n"
```

Inside `PageDisplay`, add:

```ts
const t = useTranslation()
const pageLabel = (tab: { label: string; labelKey?: string }) => tab.labelKey ? t(tab.labelKey) : tab.label
```

Replace every tab label render:

```tsx
{pageLabel(tab)}
```

Replace page nav titles:

```tsx
title={t("pages.previous")}
title={t("pages.next")}
```

- [ ] **Step 6: Translate optional page dropdown labels**

Modify `data/list/pages.ts` `PageConfig`:

```ts
export interface PageConfig {
  id: 'page1' | 'page2' | 'page3' | 'adventure-notes' | 'page4'
  label: string
  description: string
  labelKey?: string
  descriptionKey?: string
  alwaysVisible: boolean
  visibilityKey?: 'rangerCompanion' | 'armorTemplate' | 'adventureNotes'
}
```

Add keys to optional configs:

```ts
{
  id: 'page3',
  label: '游侠伙伴',
  labelKey: 'pages.page3.label',
  description: '游侠专用伙伴表',
  descriptionKey: 'pages.page3.description',
  alwaysVisible: false,
  visibilityKey: 'rangerCompanion'
}
```

Use equivalent keys for `page4` and `adventure-notes`.

In `components/ui/page-visibility-dropdown.tsx`, import `useTranslation`, add `const t = useTranslation()`, and build options as:

```ts
const pageOptions = getOptionalPageConfigs().map(config => ({
  id: config.visibilityKey!,
  label: config.labelKey ? t(config.labelKey) : config.label,
  description: config.descriptionKey ? t(config.descriptionKey) : config.description,
  visible: sheetData.pageVisibility?.[config.visibilityKey!] || false
}))
```

Translate button titles:

```tsx
title={t("common.loading")}
title={t("pages.manageVisibility")}
```

- [ ] **Step 7: Translate app loading states and shortcut hint**

In `app/page.tsx`, replace loading text:

```tsx
<div className="text-lg">{t("app.initializing")}</div>
<div className="text-sm text-gray-500 mt-2">{t("app.startingClient")}</div>
```

and:

```tsx
<div className="text-lg">{t("common.loading")}</div>
<div className="text-sm text-gray-500 mt-2">{t("app.loadingCharacterData")}</div>
```

Replace shortcut hint body:

```tsx
<div className="font-medium mb-2">{t("shortcuts.title")}</div>
<div className="space-y-1 text-xs">
  <div>{t("shortcuts.switchPage")}</div>
  <div>{t("shortcuts.jumpPage")}</div>
  <div>{t("shortcuts.switchArchive")}</div>
</div>
```

Replace print preview exit copy:

```tsx
{t("app.printPreviewExit", { key: "ESC" })}
```

- [ ] **Step 8: Run page and i18n tests**

Run:

```bash
pnpm exec vitest run tests/unit/i18n
```

Expected: PASS.

- [ ] **Step 9: Commit page labels and loading copy**

Run:

```bash
git add app/page.tsx data/list/pages.ts lib/page-registry.ts components/layout/page-display.tsx components/ui/page-visibility-dropdown.tsx tests/unit/i18n
git commit -m "feat: localize page shell copy"
```

Expected: one commit containing page shell localization.

---

### Task 5: Bottom Dock and Language Switcher

**Files:**
- Create: `components/i18n/language-switcher.tsx`
- Create: `tests/unit/i18n/bottom-dock-i18n.test.tsx`
- Modify: `components/layout/bottom-dock.tsx`

- [ ] **Step 1: Write failing BottomDock tests**

Create `tests/unit/i18n/bottom-dock-i18n.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BottomDock } from "@/components/layout/bottom-dock"
import { I18nProvider } from "@/lib/i18n"

function renderDock() {
  return render(
    <I18nProvider>
      <BottomDock
        mode="main"
        isMobile={false}
        isCardDrawerOpen={false}
        characterCount={1}
        onToggleCardDrawer={vi.fn()}
        onToggleGuide={vi.fn()}
        onToggleNotebook={vi.fn()}
        onPrintAll={vi.fn()}
        onOpenSealDiceExport={vi.fn()}
        onQuickExportJSON={vi.fn()}
        onQuickExportPDF={vi.fn()}
        onQuickExportHTML={vi.fn()}
        onOpenCharacterManagement={vi.fn()}
        onQuickCreateArchive={vi.fn()}
        onQuickImportFromHTML={vi.fn()}
      />
    </I18nProvider>,
  )
}

describe("BottomDock i18n", () => {
  it("shows Chinese labels by default", () => {
    renderDock()
    expect(screen.getByRole("button", { name: /导出/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /存档/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /语言/ })).toBeInTheDocument()
  })

  it("switches dock labels to English", async () => {
    const user = userEvent.setup()
    renderDock()

    await user.click(screen.getByRole("button", { name: /语言/ }))
    await user.click(await screen.findByRole("menuitem", { name: "English" }))

    expect(screen.getByRole("button", { name: /Export/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Archive/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Language/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run BottomDock tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/bottom-dock-i18n.test.tsx
```

Expected: FAIL because labels are hard-coded and the language switcher does not exist.

- [ ] **Step 3: Create language switcher component**

Create `components/i18n/language-switcher.tsx`:

```tsx
"use client"

import { Languages } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLocale, useTranslation } from "@/lib/i18n"

interface LanguageSwitcherProps {
  isMobile: boolean
}

export function LanguageSwitcher({ isMobile }: LanguageSwitcherProps) {
  const t = useTranslation()
  const { locale, setLocale } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            "bg-gray-800 hover:bg-gray-700 text-white gap-1.5 text-sm",
            isMobile ? "px-4 py-2.5" : "px-3 py-1.5",
          )}
        >
          <Languages className="h-3.5 w-3.5" />
          {t("language.trigger")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className={cn("w-36", isMobile && "text-base")}>
        <DropdownMenuItem
          onClick={() => setLocale("zh-CN")}
          className={cn(locale === "zh-CN" && "font-semibold")}
        >
          {t("language.zhCN")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale("en-US")}
          className={cn(locale === "en-US" && "font-semibold")}
        >
          {t("language.enUS")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 4: Translate BottomDock labels**

In `components/layout/bottom-dock.tsx`, add imports:

```ts
import { useTranslation } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
```

Inside `MainModeContent` and `PreviewModeContent`, add:

```ts
const t = useTranslation()
```

Replace hard-coded labels with the matching message keys from `bottomDock.*`. For example:

```tsx
aria-label={t("bottomDock.openCardDrawer")}
```

```tsx
<p>{t("bottomDock.cardDrawer")}</p>
<p className="text-xs text-muted-foreground mt-1">
  {props.isCardDrawerOpen ? t("bottomDock.closeCardDrawer") : t("bottomDock.browseCards")}
</p>
```

```tsx
<Sparkles className="h-3.5 w-3.5" />
{t("bottomDock.guide")}
```

```tsx
<DropdownMenuItem onClick={props.onPrintAll} className={cn(isMobile && "py-3 px-4")}>
  <FileText className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
  {t("bottomDock.openExportPreview")}
</DropdownMenuItem>
```

Add the switcher in Group C before `DualPageToggle`:

```tsx
<LanguageSwitcher isMobile={isMobile} />
```

In `PreviewModeContent`, translate button labels:

```tsx
{t("bottomDock.exportPDF")}
{t("bottomDock.exportHTML")}
{t("bottomDock.exportJSON")}
{t("bottomDock.exportToDice")}
{t("bottomDock.back")}
```

- [ ] **Step 5: Run BottomDock and i18n tests**

Run:

```bash
pnpm exec vitest run tests/unit/i18n
```

Expected: PASS.

- [ ] **Step 6: Commit BottomDock localization**

Run:

```bash
git add components/layout/bottom-dock.tsx components/i18n/language-switcher.tsx tests/unit/i18n/bottom-dock-i18n.test.tsx
git commit -m "feat: localize bottom dock"
```

Expected: one commit containing the dock translation and language switcher.

---

### Task 6: Application Control Copy in App and Core Modals

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/ui/save-switcher.tsx`
- Modify: `components/modals/card-selection-modal.tsx`
- Modify: `components/modals/display/ContentStates.tsx`
- Modify: `components/modals/base/ModalHeader.tsx`
- Modify: `tests/unit/i18n/bottom-dock-i18n.test.tsx` or add `tests/unit/i18n/application-copy.test.tsx`

- [ ] **Step 1: Write failing application copy smoke test**

Create `tests/unit/i18n/application-copy.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { I18nProvider, LOCALE_STORAGE_KEY } from "@/lib/i18n"
import { ContentStates } from "@/components/modals/display/ContentStates"

describe("Application UI Copy", () => {
  it("uses English default content-state copy after locale restore", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")

    render(
      <I18nProvider>
        <ContentStates loading>{null}</ContentStates>
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run application copy test to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/application-copy.test.tsx
```

Expected: FAIL because `ContentStates` still uses hard-coded default Chinese copy.

- [ ] **Step 3: Translate `ContentStates` defaults**

Modify `components/modals/display/ContentStates.tsx`:

```tsx
import { useTranslation } from "@/lib/i18n"
```

Then inside `ContentStates`:

```tsx
const t = useTranslation()
const resolvedEmptyMessage = emptyMessage ?? t("contentStates.empty")
const resolvedLoadingMessage = loadingMessage ?? t("contentStates.loading")
```

Change prop defaults from string values to undefined:

```ts
emptyMessage,
loadingMessage,
```

and render:

```tsx
<span className="ml-3 text-gray-600">{resolvedLoadingMessage}</span>
```

```tsx
<p className="text-red-500 mb-2">{t("contentStates.failed")}</p>
```

```tsx
<p className="text-gray-500">{resolvedEmptyMessage}</p>
```

- [ ] **Step 4: Translate SaveSwitcher**

Modify `components/ui/save-switcher.tsx`:

```tsx
import { useTranslation } from "@/lib/i18n"
```

Inside `SaveSwitcher`:

```ts
const t = useTranslation()
const currentSave = characterList.find(char => char.id === currentCharacterId)
const displayName = currentSave?.saveName || t("archive.loading")
```

Replace prompt and title:

```ts
const newSaveName = prompt(t("archive.renamePrompt"), currentSave.saveName)
```

```tsx
title={t("archive.clickToRename")}
```

- [ ] **Step 5: Translate App import prompts and notifications**

In `app/page.tsx`, replace HTML import strings:

```ts
const characterName = result.data.name || t("sheet.name")
const defaultSaveName = `${characterName} (${t("archive.importedSuffix")})`
const saveName = prompt(t("archive.createPrompt"), defaultSaveName)
```

Replace alerts:

```ts
alert(t("archive.htmlImportSuccessWithWarnings", {
  name: saveName,
  warnings: result.warnings.join('\n'),
}))
```

```ts
alert(t("archive.htmlImportSuccess", { name: saveName }))
alert(t("archive.createFailedLimit"))
alert(t("archive.htmlImportFailed", { error: result.error ?? t("common.unknownError") }))
alert(t("archive.htmlImportFailedWithMessage", { message: error instanceof Error ? error.message : t("common.unknownError") }))
```

Replace card add notifications:

```ts
showFadeNotification({
  message: t("app.deckFull"),
  type: "error"
})
```

```ts
showFadeNotification({
  message: t("app.cardAdded", {
    deck: pendingCardIsInventory ? t("app.inventoryDeck") : t("app.focusedDeck"),
  }),
  type: "success"
})
```

- [ ] **Step 6: Translate CardSelectionModal controls**

In `components/modals/card-selection-modal.tsx`, import and use:

```ts
import { useTranslation } from "@/lib/i18n"
```

Inside component:

```ts
const t = useTranslation()
```

Replace hard-coded modal and filter strings:

```tsx
title={t("cardSelection.title", { index: selectedCardIndex + 1 })}
```

```tsx
{t("cardSelection.customCard")}
{t("cardSelection.clearSelection")}
```

For `MultiSelectFilter` props:

```tsx
label={t("cardSelection.package")}
placeholder={t("cardSelection.noPackageSelected")}
allSelectedText={t("cardSelection.allPackages")}
countSuffix={t("cardSelection.packagesSelected")}
searchPlaceholder={t("cardSelection.searchPackages")}
```

Use the equivalent `cardSelection.category` and `cardSelection.level` keys for the other filters. Replace search input placeholder and reset button:

```tsx
placeholder={t("cardSelection.searchCards")}
{t("cardSelection.resetFilters")}
```

Update `ContentStates` props:

```tsx
emptyMessage={t("cardSelection.empty")}
loadingMessage={t("cardSelection.loading")}
```

- [ ] **Step 7: Add accessible close label to ModalHeader**

Modify `components/modals/base/ModalHeader.tsx`:

```tsx
import { useTranslation } from "@/lib/i18n"
```

Inside component:

```ts
const t = useTranslation()
```

Add aria-label:

```tsx
<button
  onClick={onClose}
  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
  aria-label={t("common.close")}
>
  ✕
</button>
```

- [ ] **Step 8: Run application copy and i18n tests**

Run:

```bash
pnpm exec vitest run tests/unit/i18n
```

Expected: PASS.

- [ ] **Step 9: Commit application control copy**

Run:

```bash
git add app/page.tsx components/ui/save-switcher.tsx components/modals/card-selection-modal.tsx components/modals/display/ContentStates.tsx components/modals/base/ModalHeader.tsx tests/unit/i18n/application-copy.test.tsx
git commit -m "feat: localize application control copy"
```

Expected: one commit containing Application UI Copy migration for core controls.

---

### Task 7: Character Sheet Fixed Labels, Page One

**Files:**
- Create: `tests/unit/i18n/sheet-labels.test.tsx`
- Modify: `components/character-sheet-sections/header-section.tsx`
- Modify: `components/character-sheet-sections/attributes-section.tsx`
- Modify: `components/character-sheet-sections/hit-points-section.tsx`
- Modify: `components/character-sheet-sections/hope-section.tsx`
- Modify: `components/character-sheet-sections/gold-section.tsx`
- Modify: `components/character-sheet-sections/experience-section.tsx`
- Modify: `components/character-sheet-sections/weapon-section.tsx`
- Modify: `components/character-sheet-sections/armor-section.tsx`
- Modify: `components/character-sheet-sections/inventory-section.tsx`
- Modify: `components/character-sheet-sections/inventory-weapon-section.tsx`
- Modify: `components/character-sheet.tsx`

- [ ] **Step 1: Write failing sheet label tests**

Create `tests/unit/i18n/sheet-labels.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { I18nProvider, LOCALE_STORAGE_KEY } from "@/lib/i18n"
import { HeaderSection } from "@/components/character-sheet-sections/header-section"

function renderHeader() {
  return render(
    <I18nProvider>
      <HeaderSection
        onOpenProfessionModal={() => {}}
        onOpenAncestryModal={() => {}}
        onOpenCommunityModal={() => {}}
        onOpenSubclassModal={() => {}}
      />
    </I18nProvider>,
  )
}

describe("Sheet Field Label i18n", () => {
  it("keeps default Chinese header labels", () => {
    renderHeader()
    expect(screen.getByText("职业")).toBeInTheDocument()
    expect(screen.getByText("名称")).toBeInTheDocument()
    expect(screen.getByText("社群")).toBeInTheDocument()
  })

  it("shows English header labels after locale restore", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")
    renderHeader()

    await waitFor(() => {
      expect(screen.getByText("Class")).toBeInTheDocument()
      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Community")).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run sheet label test to verify English failure**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/sheet-labels.test.tsx
```

Expected: FAIL on the English test because header labels are hard-coded.

- [ ] **Step 3: Translate HeaderSection labels and placeholders**

In `components/character-sheet-sections/header-section.tsx`, import:

```ts
import { useTranslation } from "@/lib/i18n"
```

Inside `HeaderSection`, add:

```ts
const t = useTranslation()
```

Replace fixed labels and placeholders:

```tsx
<label className="text-[9px] text-gray-300">{t("sheet.profession")}</label>
{formData.professionRef?.name || <span className="print:hidden">{t("sheet.selectProfession")}</span>}
title={t("common.editName")}
```

Use these key replacements:

```text
职业 -> sheet.profession
名称 -> sheet.name
社群 -> sheet.community
种族 -> sheet.ancestry
子职业 -> sheet.subclass
等级 -> sheet.level
选择职业 -> sheet.selectProfession
选择社群 -> sheet.selectCommunity
选择种族 -> sheet.selectAncestry
选择子职业 -> sheet.selectSubclass
编辑名称 -> common.editName
```

- [ ] **Step 4: Translate attribute labels without changing target IDs**

In `components/character-sheet-sections/attributes-section.tsx`, import and use `useTranslation`.

Replace the `attr` array with translation keys while preserving `key`:

```ts
const attributes = [
  { nameKey: "sheetAttribute.agility", fallbackName: "敏捷", key: "agility", skills: ["冲刺", "跳跃", "机动"] },
  { nameKey: "sheetAttribute.strength", fallbackName: "力量", key: "strength", skills: ["举起", "猛击", "擒抱"] },
  { nameKey: "sheetAttribute.finesse", fallbackName: "灵巧", key: "finesse", skills: ["控制", "隐藏", "巧手"] },
  { nameKey: "sheetAttribute.instinct", fallbackName: "本能", key: "instinct", skills: ["感知", "察觉", "导航"] },
  { nameKey: "sheetAttribute.presence", fallbackName: "风度", key: "presence", skills: ["魅力", "表演", "欺骗"] },
  { nameKey: "sheetAttribute.knowledge", fallbackName: "知识", key: "knowledge", skills: ["回忆", "分析", "理解"] },
] as const
```

Add these message keys to both message files before using them:

```ts
sheetAttribute: {
  agility: "敏捷",
  strength: "力量",
  finesse: "灵巧",
  instinct: "本能",
  presence: "风度",
  knowledge: "知识",
}
```

English:

```ts
sheetAttribute: {
  agility: "Agility",
  strength: "Strength",
  finesse: "Finesse",
  instinct: "Instinct",
  presence: "Presence",
  knowledge: "Knowledge",
}
```

Render:

```tsx
const attrName = t(attr.nameKey)
<div className="text-[12px] font-bold">{attrName}</div>
<ModifierFieldAnchor target={`${attr.key}.value` as ModifierTargetId} label={attrName} />
```

Keep `skills` in Chinese for this stage because skill prompts are Rules Content-adjacent.

- [ ] **Step 5: Translate page-one section labels**

Apply these replacements with `const t = useTranslation()` in each file:

`components/character-sheet-sections/hit-points-section.tsx`:

```text
生命值与压力 -> sheet.hpStress
轻度伤害 -> sheet.minorDamage
最大值: -> sheet.max
减少HP上限 -> keep unchanged if it is tested as modifier control copy outside this task
增加HP上限 -> keep unchanged if it is tested as modifier control copy outside this task
减少压力上限 -> keep unchanged if it is tested as modifier control copy outside this task
增加压力上限 -> keep unchanged if it is tested as modifier control copy outside this task
```

`components/character-sheet-sections/hope-section.tsx`:

```text
希望 -> sheet.hope
花费一点希望使用经历或帮助队友 -> sheet.hopeHelp
```

`components/character-sheet-sections/gold-section.tsx`:

```text
金币 -> sheet.gold
把 -> sheet.handfuls
袋 -> sheet.bags
箱 -> sheet.chests
```

`components/character-sheet-sections/experience-section.tsx`:

```text
经历 -> sheet.experience
```

`components/character-sheet-sections/weapon-section.tsx` and `inventory-weapon-section.tsx`:

```text
名称 -> sheet.weaponName
基本信息 -> sheet.basicInfo
伤害骰 -> sheet.damageDice
选择武器 -> sheet.selectWeapon
编辑名称 -> common.editName
```

`components/character-sheet-sections/armor-section.tsx`:

```text
护甲 -> sheet.armor
名称 -> sheet.weaponName
选择护甲 -> sheet.selectArmor
护甲值 -> sheet.armorValue
阈值 -> sheet.threshold
重伤阈值 -> sheet.minorThreshold
严重阈值 -> sheet.majorThreshold
编辑名称 -> common.editName
```

`components/character-sheet-sections/inventory-section.tsx`:

```text
库存 -> sheet.inventory
清空库存 -> sheet.clearInventory
填充起始物品 -> sheet.fillStartingItems
```

`components/character-sheet.tsx`:

```text
护甲槽 -> sheet.armor
装备 -> sheet.equipment
熟练度 -> sheet.proficiency
职业特性 -> sheet.classFeature
备用武器 -> sheet.inventoryWeapons
选择武器 -> sheet.selectWeapon
选择护甲 -> sheet.selectArmor
```

Do not translate selected card names, weapon names, armor names, modifier labels, or equipment template values.

- [ ] **Step 6: Run sheet label and i18n tests**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/sheet-labels.test.tsx tests/unit/i18n/i18n-core.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run existing equipment tests affected by labels**

Run:

```bash
pnpm exec vitest run tests/unit/character-sheet-equipment.test.tsx tests/unit/modifiers/equipment-provider-popover.test.tsx
```

Expected: PASS. If tests fail because default Chinese labels are no longer found, fix the component so default `zh-CN` still renders the original Chinese string; do not rewrite those tests to English.

- [ ] **Step 8: Commit page-one sheet labels**

Run:

```bash
git add lib/i18n/messages components/character-sheet.tsx components/character-sheet-sections tests/unit/i18n/sheet-labels.test.tsx
git commit -m "feat: localize primary sheet labels"
```

Expected: one commit containing Sheet Field Label migration for page one.

---

### Task 8: Character Sheet Fixed Labels, Page Two

**Files:**
- Modify: `components/character-sheet-page-two-sections/character-description-section.tsx`
- Modify: `components/character-sheet-page-two-sections/card-deck-section.tsx`
- Modify: `components/character-sheet-page-two.tsx`
- Modify: `tests/unit/i18n/sheet-labels.test.tsx`

- [ ] **Step 1: Extend sheet label smoke test for page two labels**

Append to `tests/unit/i18n/sheet-labels.test.tsx`:

```tsx
import { CharacterDescriptionSection } from "@/components/character-sheet-page-two-sections/character-description-section"
import { defaultSheetData } from "@/lib/default-sheet-data"

describe("Page two Sheet Field Label i18n", () => {
  it("shows English page-two labels after locale restore", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")

    render(
      <I18nProvider>
        <CharacterDescriptionSection formData={defaultSheetData} handleInputChange={() => {}} />
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("Character Summary")).toBeInTheDocument()
      expect(screen.getByText("Character Traits")).toBeInTheDocument()
      expect(screen.getByText("Adventure Notes")).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run sheet labels test to verify page two failure**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/sheet-labels.test.tsx
```

Expected: FAIL on the page-two English labels.

- [ ] **Step 3: Translate character description section**

In `components/character-sheet-page-two-sections/character-description-section.tsx`, import and use `useTranslation`.

Replace:

```text
角色简介 -> sheet.characterSummary
角色特质 -> sheet.characterTraits
冒险笔记 -> sheet.adventureNotes
```

Replace placeholders:

```tsx
placeholder={t("sheet.characterSummaryPlaceholder")}
placeholder={t("sheet.characterTraitsPlaceholder")}
placeholder={t("sheet.adventureNotesPlaceholder")}
```

- [ ] **Step 4: Translate card deck heading**

In `components/character-sheet-page-two-sections/card-deck-section.tsx`, import `useTranslation`, add `const t = useTranslation()`, and replace:

```tsx
<h3 className="!text-sm font-bold text-center mx-2 print:mb-4">{t("sheet.deck")}</h3>
```

Keep card names and card descriptions unchanged.

- [ ] **Step 5: Translate page-two tier titles and descriptions**

In `components/character-sheet-page-two.tsx`, import `useTranslation`, add `const t = useTranslation()`, and replace:

```tsx
title={t("sheet.tier2Title")}
description={t("sheet.tier2Description")}
```

Use `tier3Title`, `tier3Description`, `tier4Title`, and `tier4Description` for the other two sections.

- [ ] **Step 6: Run page-two sheet label tests**

Run:

```bash
pnpm exec vitest run tests/unit/i18n/sheet-labels.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Run upgrade smoke tests for regressions**

Run:

```bash
pnpm exec vitest run tests/integration/upgrade-cancel-flow.test.tsx tests/unit/automation/component-smoke.test.tsx
```

Expected: PASS. If a test fails because an English locale leaked from localStorage, clear `localStorage` in that test setup; default app behavior must remain Chinese.

- [ ] **Step 8: Commit page-two sheet labels**

Run:

```bash
git add components/character-sheet-page-two.tsx components/character-sheet-page-two-sections tests/unit/i18n/sheet-labels.test.tsx
git commit -m "feat: localize secondary sheet labels"
```

Expected: one commit containing page-two Sheet Field Label migration.

---

### Task 9: Final Verification

**Files:**
- No planned source changes unless verification exposes a defect.

- [ ] **Step 1: Run all i18n tests**

Run:

```bash
pnpm exec vitest run tests/unit/i18n
```

Expected: PASS.

- [ ] **Step 2: Run targeted regression suites**

Run:

```bash
pnpm exec vitest run tests/unit/character-sheet-equipment.test.tsx tests/unit/modifiers/equipment-provider-popover.test.tsx tests/integration/upgrade-cancel-flow.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run full unit test suite**

Run:

```bash
pnpm test:unit
```

Expected: PASS.

- [ ] **Step 4: Build check**

Run:

```bash
pnpm build
```

Expected: Next static export build completes. The build may run image optimization first because `package.json` defines it in the build script.

- [ ] **Step 5: Inspect remaining Chinese strings only for scope**

Run:

```bash
rg -n "[\\p{Han}]" app components lib data card automation hooks --glob '*.{ts,tsx,json}'
```

Expected: Many matches remain. Confirm remaining matches are Rules Content, System-Generated Rules Labels, card/editor deep copy, HTML exporter internals, dice guide text, comments, tests, or later-stage scope. Do not attempt full cleanup in this task.

- [ ] **Step 6: Commit verification fixes if needed**

If verification required small fixes, commit them:

```bash
git add <fixed-files>
git commit -m "fix: stabilize i18n foundation"
```

Expected: only verification-driven fixes are committed. If no fixes were needed, skip this commit.

---

## Self-Review

- Spec coverage: The plan covers the thin facade, default Chinese behavior, client localStorage restore, BottomDock language switcher, Application UI Copy, Sheet Field Label execution batches, no SheetData locale, JSON data regression, and exclusion of Rules Content / System-Generated Rules Label / HTML exporter internals.
- Scope check: Built-in card/equipment data, dice guide long text, card editor deep copy, and automatic modifier source labels are deliberately excluded.
- Type consistency: The plan uses `Locale = "zh-CN" | "en-US"`, `useTranslation()`, `useLocale()`, `I18nProvider`, `LOCALE_STORAGE_KEY`, and `t(key, params, locale)` consistently across tasks.
