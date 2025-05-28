# 项目结构分析

我们已经完成了对您项目主要文件和目录的分析。以下是各部分的总结：

## 1. 根目录文件

*   **`.DS_Store`**: macOS 系统文件。
*   **`.gitignore`**: Git 忽略文件配置。
*   **[`components.json`](./components.json)**: 可能与 UI 组件库（如 Shadcn/UI）相关。
*   **[`modify-card-type.md`](./modify-card-type.md)**: 关于修改卡片类型的文档。
*   **[`next.config.mjs`](./next.config.mjs)**: Next.js 项目配置文件。
*   **[`package.json`](./package.json)**: Node.js 项目核心配置，包含依赖和脚本。
*   **[`pnpm-lock.yaml`](./pnpm-lock.yaml)**: pnpm 锁文件，确保依赖一致性。
*   **[`postcss.config.mjs`](./postcss.config.mjs)**: PostCSS 配置文件。
*   **[`README.md`](./README.md)**: 项目说明文件。
*   **[`tailwind.config.ts`](./tailwind.config.ts)**: Tailwind CSS 配置文件。
*   **[`tsconfig.json`](./tsconfig.json)**: TypeScript 项目配置文件。

## 2. `app/` 目录 (Next.js App Router)

*   **[`app/globals.css`](./app/globals.css)**: 全局 CSS 样式。
*   **[`app/layout.tsx`](./app/layout.tsx)**: 应用根布局组件。
*   **[`app/page.tsx`](./app/page.tsx)**: 应用首页 (`/`) 组件。
*   **[`app/print-helper.tsx`](./app/print-helper.tsx)**: 辅助打印功能的组件或工具。

## 3. `components/` 目录 (UI 组件)

*   **顶层组件**:
    *   [`components/card-display-section.tsx`](./components/card-display-section.tsx): 通用卡片展示。
    *   [`components/character-sheet-page-four.tsx`](./components/character-sheet-page-four.tsx): 角色表第四页。
    *   [`components/character-sheet-page-three.tsx`](./components/character-sheet-page-three.tsx): 角色表第三页。
    *   [`components/character-sheet-page-two.tsx`](./components/character-sheet-page-two.tsx): 角色表第二页。
    *   [`components/character-sheet.tsx`](./components/character-sheet.tsx): 角色表主组件/第一页。
    *   [`components/theme-provider.tsx`](./components/theme-provider.tsx): 应用主题提供者。
*   **`components/character-sheet-page-two-sections/`**: 角色表第二页的特定区域组件 (如卡牌组、描述、升级)。
    *   [`components/character-sheet-page-two-sections/card-deck-section.tsx`](./components/character-sheet-page-two-sections/card-deck-section.tsx)
    *   [`components/character-sheet-page-two-sections/character-description-section.tsx`](./components/character-sheet-page-two-sections/character-description-section.tsx)
    *   [`components/character-sheet-page-two-sections/upgrade-section.tsx`](./components/character-sheet-page-two-sections/upgrade-section.tsx)
*   **`components/character-sheet-sections/`**: 角色表通用区域组件 (如护甲、属性、经验、金币等)。
    *   [`components/character-sheet-sections/armor-section.tsx`](./components/character-sheet-sections/armor-section.tsx)
    *   [`components/character-sheet-sections/attributes-section.tsx`](./components/character-sheet-sections/attributes-section.tsx)
    *   [`components/character-sheet-sections/experience-section.tsx`](./components/character-sheet-sections/experience-section.tsx)
    *   [`components/character-sheet-sections/gold-section.tsx`](./components/character-sheet-sections/gold-section.tsx)
    *   [`components/character-sheet-sections/header-section.tsx`](./components/character-sheet-sections/header-section.tsx)
    *   [`components/character-sheet-sections/hit-points-section.tsx`](./components/character-sheet-sections/hit-points-section.tsx)
    *   [`components/character-sheet-sections/hope-section.tsx`](./components/character-sheet-sections/hope-section.tsx)
    *   [`components/character-sheet-sections/inventory-section.tsx`](./components/character-sheet-sections/inventory-section.tsx)
    *   [`components/character-sheet-sections/inventory-weapon-section.tsx`](./components/character-sheet-sections/inventory-weapon-section.tsx)
    *   [`components/character-sheet-sections/weapon-section.tsx`](./components/character-sheet-sections/weapon-section.tsx)
*   **`components/guide/`**:
    *   [`components/guide/character-creation-guide.tsx`](./components/guide/character-creation-guide.tsx): 角色创建指南 UI。
    *   [`components/guide/guide-content.ts`](./components/guide/guide-content.ts): 指南内容数据。
*   **`components/modals/`**: 各种选择模态框 (如血统、护甲、卡牌、职业等) 和导入/导出模态框。
    *   [`components/modals/ancestry-selection-modal.tsx`](./components/modals/ancestry-selection-modal.tsx)
    *   [`components/modals/armor-selection-modal.tsx`](./components/modals/armor-selection-modal.tsx)
    *   [`components/modals/card-selection-modal.tsx`](./components/modals/card-selection-modal.tsx)
    *   [`components/modals/community-selection-modal.tsx`](./components/modals/community-selection-modal.tsx)
    *   [`components/modals/import-export-modal.tsx`](./components/modals/import-export-modal.tsx)
    *   [`components/modals/profession-selection-modal.tsx`](./components/modals/profession-selection-modal.tsx)
    *   [`components/modals/weapon-selection-modal.tsx`](./components/modals/weapon-selection-modal.tsx)
*   **`components/ui/`**: 通用基础 UI 组件 (按钮、输入框、对话框等) 和 [`components/ui/use-toast.ts`](./components/ui/use-toast.ts:1) hook。
    *   [`components/ui/.unused-to-delete.txt`](./components/ui/.unused-to-delete.txt)
    *   [`components/ui/badge.tsx`](./components/ui/badge.tsx)
    *   [`components/ui/button.tsx`](./components/ui/button.tsx)
    *   [`components/ui/carousel.tsx`](./components/ui/carousel.tsx)
    *   [`components/ui/checkbox.tsx`](./components/ui/checkbox.tsx)
    *   [`components/ui/collapsible.tsx`](./components/ui/collapsible.tsx)
    *   [`components/ui/context-menu.tsx`](./components/ui/context-menu.tsx)
    *   [`components/ui/dialog.tsx`](./components/ui/dialog.tsx)
    *   [`components/ui/dropdown-menu.tsx`](./components/ui/dropdown-menu.tsx)
    *   [`components/ui/form.tsx`](./components/ui/form.tsx)
    *   [`components/ui/input.tsx`](./components/ui/input.tsx)
    *   [`components/ui/label.tsx`](./components/ui/label.tsx)
    *   [`components/ui/scroll-area.tsx`](./components/ui/scroll-area.tsx)
    *   [`components/ui/select.tsx`](./components/ui/select.tsx)
    *   [`components/ui/selectable-card.tsx`](./components/ui/selectable-card.tsx)
    *   [`components/ui/separator.tsx`](./components/ui/separator.tsx)
    *   [`components/ui/sheet.tsx`](./components/ui/sheet.tsx)
    *   [`components/ui/sidebar.tsx`](./components/ui/sidebar.tsx)
    *   [`components/ui/skeleton.tsx`](./components/ui/skeleton.tsx)
    *   [`components/ui/table.tsx`](./components/ui/table.tsx)
    *   [`components/ui/tabs.tsx`](./components/ui/tabs.tsx)
    *   [`components/ui/textarea.tsx`](./components/ui/textarea.tsx)
    *   [`components/ui/toast.tsx`](./components/ui/toast.tsx)
    *   [`components/ui/toaster.tsx`](./components/ui/toaster.tsx)
    *   [`components/ui/toggle-group.tsx`](./components/ui/toggle-group.tsx)
    *   [`components/ui/toggle.tsx`](./components/ui/toggle.tsx)
    *   [`components/ui/use-toast.ts`](./components/ui/use-toast.ts:1)

## 4. `data/` 目录 (应用数据和逻辑)

*   **`data/card/`**: 管理游戏中各种类型的“卡片”数据。
    *   [`data/card/card-converter.ts`](./data/card/card-converter.ts): 卡片数据转换工具。
    *   [`data/card/card-manager.ts`](./data/card/card-manager.ts): 卡片管理逻辑。
    *   [`data/card/card-types.ts`](./data/card/card-types.ts): 卡片相关的 TypeScript 类型定义。
    *   [`data/card/card-ui-config.ts`](./data/card/card-ui-config.ts): 卡片 UI 显示配置。
    *   [`data/card/index.ts`](./data/card/index.ts): `data/card/` 模块入口。
    *   **子目录 (`ancestry-card/`, `community-card/`, `domain-card/`, `profession-card/`, `subclass-card/`)**: 分别存放特定类型卡片的数据 (`cards.ts`) 和转换逻辑 (`convert.ts`)。
        *   [`data/card/ancestry-card/cards.ts`](./data/card/ancestry-card/cards.ts)
        *   [`data/card/ancestry-card/convert.ts`](./data/card/ancestry-card/convert.ts)
        *   [`data/card/community-card/cards.ts`](./data/card/community-card/cards.ts)
        *   [`data/card/community-card/convert.ts`](./data/card/community-card/convert.ts)
        *   [`data/card/domain-card/cards.ts`](./data/card/domain-card/cards.ts)
        *   [`data/card/domain-card/convert.ts`](./data/card/domain-card/convert.ts)
        *   [`data/card/profession-card/cards.ts`](./data/card/profession-card/cards.ts)
        *   [`data/card/profession-card/convert.ts`](./data/card/profession-card/convert.ts)
        *   [`data/card/subclass-card/cards.ts`](./data/card/subclass-card/cards.ts)
        *   [`data/card/subclass-card/convert.ts`](./data/card/subclass-card/convert.ts)
*   **`data/list/`**: 包含游戏中各种物品或选项的列表数据。
    *   [`data/list/armor.ts`](./data/list/armor.ts): 护甲列表。
    *   [`data/list/primary-weapon.ts`](./data/list/primary-weapon.ts): 主武器列表。
    *   [`data/list/secondary-weapon.ts`](./data/list/secondary-weapon.ts): 副武器列表。
    *   [`data/list/upgrade.ts`](./data/list/upgrade.ts): 升级选项列表。

## 5. `hooks/` 目录 (自定义 React Hooks)

*   **[`hooks/use-mobile.tsx`](./hooks/use-mobile.tsx)**: 检测是否为移动设备的 Hook。
*   **[`hooks/use-toast.ts`](./hooks/use-toast.ts)**: 管理和显示 Toast 通知的 Hook (注意: [`components/ui/use-toast.ts`](./components/ui/use-toast.ts:1) 也有一个同名文件，可能需要确认具体使用哪一个或它们之间的关系)。

## 6. `lib/` 目录 (辅助函数和库)

*   **[`lib/form-data.ts`](./lib/form-data.ts)**: 处理表单数据的工具函数。
*   **[`lib/storage.ts`](./lib/storage.ts)**: 与浏览器存储交互的逻辑封装。
*   **[`lib/utils.ts`](./lib/utils.ts)**: 通用实用工具函数集合。

## 7. `memory-bank/` 目录

*   存放项目上下文、决策日志、产品需求、进度跟踪等关键文档。
    *   [`memory-bank/activeContext.md`](./memory-bank/activeContext.md)
    *   [`memory-bank/decisionLog.md`](./memory-bank/decisionLog.md)
    *   [`memory-bank/productContext.md`](./memory-bank/productContext.md)
    *   [`memory-bank/progress.md`](./memory-bank/progress.md)
    *   [`memory-bank/systemPatterns.md`](./memory-bank/systemPatterns.md)