# CardSelectionModal 重构设计文档

## 一、现有功能清单

### 核心功能

| 功能 | 描述 |
|------|------|
| 卡牌类型切换 | 侧边栏 Tab 切换不同卡牌类型（领域/职业/子职业/种族/社群 + 扩展类型） |
| 多维度筛选 | 卡包、类别、等级三个多选筛选器 |
| 搜索 | 防抖搜索，匹配名称/描述/显示项 |
| 无限滚动 | 分页加载，每页30张 |
| 图片/文字模式 | 根据全局设置切换 ImageCard/SelectableCard |
| 清除选择 | 清空当前槽位的卡牌 |
| ESC 关闭 | 键盘快捷键 |
| 移动端折叠 | 筛选器在移动端可折叠 |

### 筛选逻辑（现状 - 过于复杂）

**现有 4 种索引**：
1. `subclassCardIndex`: type → class → cardIds[]
2. `levelCardIndex`: type → level → cardIds[]
3. `batchKeywordIndex`: batchId → type → keywords[]
4. `batchLevelIndex`: batchId → type → levels[]

**现有问题**：
1. **索引分散**：4 种索引各自独立，增加维护成本
2. **过滤逻辑散乱**：过滤条件分布在 6+ 个 useMemo 中
3. **重复过滤**：卡包过滤在选项计算和卡牌过滤中各做一次
4. **状态依赖复杂**：需要 useRef 追踪上一次状态来判断是否清空

### Props（现状）

```typescript
interface CardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (card: StandardCard) => void
  selectedCardIndex: number
  // 8 个状态提升 props（需要移除）
  activeTab: string
  setActiveTab: ...
  searchTerm: string
  setSearchTerm: ...
  selectedClasses: string[]
  setSelectedClasses: ...
  selectedLevels: string[]
  setSelectedLevels: ...
  selectedBatches: string[]
  setSelectedBatches: ...
}
```

---

## 二、筛选系统简化方案

### 2.1 核心思路：统一索引 + 管道式过滤

**从 4 个索引 → 1 个统一索引**

```typescript
// 新的统一索引结构
interface UnifiedCardIndex {
  // 按类型分组的卡牌 ID 集合
  byType: Map<string, Set<string>>

  // 按类型+类别分组
  byTypeAndClass: Map<string, Map<string, Set<string>>>

  // 按类型+等级分组
  byTypeAndLevel: Map<string, Map<string, Set<string>>>

  // 按卡包分组（包含类别和等级元数据）
  byBatch: Map<string, {
    cardIds: Set<string>
    classesByType: Map<string, Set<string>>
    levelsByType: Map<string, Set<string>>
  }>
}
```

### 2.2 管道式过滤架构

**核心原则**：将过滤逻辑抽象为可组合的管道

```typescript
// 过滤管道 - 每个步骤都是纯函数
type FilterStep<T> = (items: T[], context: FilterContext) => T[]

interface FilterContext {
  activeTab: string
  selectedBatches: string[]
  selectedClasses: string[]
  selectedLevels: string[]
  searchTerm: string
}

// 定义过滤管道
const filterPipeline: FilterStep<StandardCard>[] = [
  filterByType,      // Step 1: 按卡牌类型
  filterByBatch,     // Step 2: 按卡包
  filterByClass,     // Step 3: 按类别
  filterByLevel,     // Step 4: 按等级
  filterBySearch,    // Step 5: 按搜索词
]

// 执行管道
function executeFilterPipeline(
  cards: StandardCard[],
  context: FilterContext
): StandardCard[] {
  return filterPipeline.reduce(
    (result, step) => step(result, context),
    cards
  )
}
```

### 2.3 简化的筛选选项计算

**原有方式**（复杂）：
```typescript
// 需要 3 个 useMemo + 2 个卡包索引交叉计算
const batchClassSet = useMemo(() => { ... }, [selectedBatches, activeTab, batchKeywordIndex])
const classOptions = useMemo(() => { ... }, [activeTab, batchClassSet])
```

**新方式**（简洁）：
```typescript
// 单一 useMemo，直接从过滤后的卡牌中提取
const { classOptions, levelOptions } = useMemo(() => {
  // 1. 获取当前类型的卡牌
  let cards = getCardsByType(activeTab)

  // 2. 如果有卡包筛选，先过滤
  if (selectedBatches.length > 0) {
    const batchSet = new Set(selectedBatches)
    cards = cards.filter(c => batchSet.has(c.batchId))
  }

  // 3. 从过滤后的卡牌中提取唯一值
  const classes = new Set<string>()
  const levels = new Set<string>()

  for (const card of cards) {
    if (card.class) classes.add(card.class)
    if (card.level) levels.add(String(card.level))
  }

  return {
    classOptions: Array.from(classes).sort().map(c => ({ value: c, label: c })),
    levelOptions: Array.from(levels).sort((a, b) => Number(a) - Number(b))
                                    .map(l => ({ value: l, label: `${l}级` }))
  }
}, [activeTab, selectedBatches, cardStore.cards])
```

### 2.4 状态变更简化

**原有方式**（需要 useRef 追踪）：
```typescript
const prevSelectedBatchesRef = useRef<string[]>([])
useEffect(() => {
  if (isOpen && prevSelectedBatchesRef.current.length > 0) {
    const hasChanged = /* 复杂比较逻辑 */
    if (hasChanged) {
      setSelectedClasses([])
      setSelectedLevels([])
    }
  }
  prevSelectedBatchesRef.current = selectedBatches
}, [selectedBatches, ...])
```

**新方式**（事件驱动）：
```typescript
// 直接在卡包变更处理函数中清空
const handleBatchChange = (newBatches: string[]) => {
  setSelectedBatches(newBatches)
  // 卡包变更时，总是清空类别和等级选择
  setSelectedClasses([])
  setSelectedLevels([])
}
```

### 2.5 索引使用策略

**性能优化原则**：
- **小数据集**（< 500 卡）：直接遍历，不用索引
- **大数据集**（≥ 500 卡）：使用索引加速类别/等级筛选

```typescript
const USE_INDEX_THRESHOLD = 500

const filteredCards = useMemo(() => {
  const baseCards = getCardsByType(activeTab)

  // 小数据集：直接过滤
  if (baseCards.length < USE_INDEX_THRESHOLD) {
    return executeFilterPipeline(baseCards, filterContext)
  }

  // 大数据集：使用索引
  return filterWithIndex(baseCards, filterContext, cardIndex)
}, [activeTab, filterContext, cardIndex])
```

---

## 三、重构目标

1. **状态内部化**：移除 16 个状态相关 props，简化父组件接口
2. **使用新底座**：BaseCardModal + ModalHeader + ModalFilterBar
3. **复用筛选器**：使用 MultiSelectFilter 组件
4. **保持性能**：保留索引加速逻辑
5. **代码简化**：从 991 行减少到 ~500 行

---

## 三、新架构设计

### 3.1 Props 接口（简化后）

```typescript
interface CardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (card: StandardCard) => void
  selectedCardIndex: number
  initialTab?: string  // 可选：初始 Tab
}
```

### 3.2 组件结构

```
CardSelectionModal
├── BaseCardModal (size="xl")
│   ├── header: ModalHeader
│   │   └── actions: 清除选择按钮
│   │
│   ├── sidebar: CardTypeSidebar (新组件)
│   │   ├── 标准卡牌分组
│   │   │   └── 领域/职业/子职业/种族/社群
│   │   └── 扩展卡牌分组
│   │       └── variant 类型
│   │
│   └── children:
│       ├── ModalFilterBar (collapsible)
│       │   ├── MultiSelectFilter (卡包)
│       │   ├── MultiSelectFilter (类别)
│       │   ├── MultiSelectFilter (等级)
│       │   ├── SearchFilter (搜索)
│       │   └── 重置按钮
│       │
│       └── 内容区
│           └── ContentStates
│               └── InfiniteCardGrid
```

### 3.3 内部状态

```typescript
// 筛选状态（内部管理）
const [activeTab, setActiveTab] = useState(initialTab || 'domain')
const [searchTerm, setSearchTerm] = useState('')
const [selectedClasses, setSelectedClasses] = useState<string[]>([])
const [selectedLevels, setSelectedLevels] = useState<string[]>([])
const [selectedBatches, setSelectedBatches] = useState<string[]>([])

// UI 状态
const [refreshTrigger, setRefreshTrigger] = useState(0)

// 无限滚动
const { displayedItems, hasMore, loadMore, reset } = useInfiniteScroll({
  items: filteredCards,
  pageSize: 30,
})
```

### 3.4 关闭时重置

```typescript
useEffect(() => {
  if (!isOpen) {
    // 可选：关闭时重置筛选状态
    setSearchTerm('')
    setSelectedClasses([])
    setSelectedLevels([])
    setSelectedBatches([])
    // 注意：不重置 activeTab，保持用户上次选择
  }
}, [isOpen])
```

---

## 四、子组件拆分

### 4.1 CardTypeSidebar（新组件）

**职责**：侧边栏卡牌类型选择

```typescript
// components/modals/card-selection/CardTypeSidebar.tsx

interface CardTypeSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function CardTypeSidebar({ activeTab, onTabChange }: CardTypeSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState(
    new Set(['standard', 'extended'])
  )

  const { standard, extended } = useMemo(() => ({
    standard: getCardTypesByCategory(CardCategory.Standard),
    extended: getCardTypesByCategory(CardCategory.Extended),
  }), [])

  // ... 渲染分组和 Tab
}
```

**预计行数**：~80行

### 4.2 useCardFiltering（新 Hook - 简化版）

**职责**：封装筛选逻辑，使用管道式过滤

```typescript
// hooks/use-card-filtering.ts

interface FilterState {
  activeTab: string
  selectedBatches: string[]
  selectedClasses: string[]
  selectedLevels: string[]
  searchTerm: string
}

interface FilterActions {
  setActiveTab: (tab: string) => void
  setBatches: (batches: string[]) => void
  setClasses: (classes: string[]) => void
  setLevels: (levels: string[]) => void
  setSearchTerm: (term: string) => void
  resetAll: () => void
}

interface UseCardFilteringReturn {
  // 筛选结果
  filteredCards: StandardCard[]
  totalCount: number

  // 动态选项（基于当前筛选条件）
  classOptions: Array<{ value: string; label: string }>
  levelOptions: Array<{ value: string; label: string }>
  batchOptions: Array<{ id: string; name: string; cardCount: number }>

  // 状态
  state: FilterState
  actions: FilterActions

  // 加载状态
  loading: boolean
  error: string | null
}

export function useCardFiltering(initialTab?: string): UseCardFilteringReturn {
  const cardStore = useUnifiedCardStore()

  // === 筛选状态（统一管理） ===
  const [state, setState] = useState<FilterState>({
    activeTab: initialTab || 'domain',
    selectedBatches: [],
    selectedClasses: [],
    selectedLevels: [],
    searchTerm: '',
  })

  // === 操作函数（带智能联动） ===
  const actions: FilterActions = useMemo(() => ({
    setActiveTab: (tab) => setState(prev => ({
      ...prev,
      activeTab: tab,
      // Tab 切换时重置所有筛选
      selectedBatches: [],
      selectedClasses: [],
      selectedLevels: [],
      searchTerm: '',
    })),

    setBatches: (batches) => setState(prev => ({
      ...prev,
      selectedBatches: batches,
      // 卡包变更时重置类别和等级
      selectedClasses: [],
      selectedLevels: [],
    })),

    setClasses: (classes) => setState(prev => ({
      ...prev,
      selectedClasses: classes,
    })),

    setLevels: (levels) => setState(prev => ({
      ...prev,
      selectedLevels: levels,
    })),

    setSearchTerm: (term) => setState(prev => ({
      ...prev,
      searchTerm: term,
    })),

    resetAll: () => setState(prev => ({
      ...prev,
      selectedBatches: [],
      selectedClasses: [],
      selectedLevels: [],
      searchTerm: '',
    })),
  }), [])

  // === 基础卡牌（按类型） ===
  const baseCards = useMemo(() => {
    if (!cardStore.initialized) return []
    return cardStore.loadCardsByType(state.activeTab)
  }, [state.activeTab, cardStore.initialized])

  // === 卡包过滤后的卡牌（用于计算选项） ===
  const batchFilteredCards = useMemo(() => {
    if (state.selectedBatches.length === 0) return baseCards
    const batchSet = new Set(state.selectedBatches)
    return baseCards.filter(c => c.batchId && batchSet.has(c.batchId))
  }, [baseCards, state.selectedBatches])

  // === 动态选项（从卡包过滤后的卡牌中提取） ===
  const { classOptions, levelOptions } = useMemo(() => {
    const classes = new Set<string>()
    const levels = new Set<string>()

    for (const card of batchFilteredCards) {
      if (card.class) classes.add(card.class)
      if (card.level != null) levels.add(String(card.level))
    }

    return {
      classOptions: Array.from(classes)
        .sort()
        .map(c => ({ value: c, label: c })),
      levelOptions: Array.from(levels)
        .sort((a, b) => Number(a) - Number(b))
        .map(l => ({ value: l, label: `${l}级` })),
    }
  }, [batchFilteredCards])

  // === 完整筛选（管道式） ===
  const filteredCards = useMemo(() => {
    let result = batchFilteredCards

    // Step 1: 类别筛选
    if (state.selectedClasses.length > 0) {
      const classSet = new Set(state.selectedClasses)
      result = result.filter(c => c.class && classSet.has(c.class))
    }

    // Step 2: 等级筛选
    if (state.selectedLevels.length > 0) {
      const levelSet = new Set(state.selectedLevels)
      result = result.filter(c => c.level != null && levelSet.has(String(c.level)))
    }

    // Step 3: 搜索筛选
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase()
      result = result.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.cardSelectDisplay?.item1?.toLowerCase().includes(term) ||
        c.cardSelectDisplay?.item2?.toLowerCase().includes(term) ||
        c.cardSelectDisplay?.item3?.toLowerCase().includes(term)
      )
    }

    return result
  }, [batchFilteredCards, state.selectedClasses, state.selectedLevels, state.searchTerm])

  // === 卡包选项（静态，不依赖筛选） ===
  const batchOptions = useMemo(() => {
    return cardStore.getAllBatches().map(b => ({
      id: b.id,
      name: b.name,
      cardCount: b.cardCount,
    }))
  }, [cardStore.batches])

  return {
    filteredCards,
    totalCount: filteredCards.length,
    classOptions,
    levelOptions,
    batchOptions,
    state,
    actions,
    loading: cardStore.loading,
    error: cardStore.error,
  }
}
```

**预计行数**：~150行

**相比原设计的改进**：
1. **状态统一管理**：所有筛选状态在一个对象中，易于追踪
2. **智能联动内置**：Tab/卡包变更时自动重置相关筛选
3. **选项计算简化**：从过滤后的卡牌中直接提取，无需额外索引
4. **管道式过滤**：每一步清晰可读，易于调试

---

## 五、重构后的 CardSelectionModal（使用简化 Hook）

```typescript
// components/modals/card-selection-modal.tsx

"use client"

import { useEffect, useCallback } from "react"
import { StandardCard, createEmptyCard } from "@/card/card-types"
import { BaseCardModal, ModalHeader, ModalFilterBar } from "./base"
import { ContentStates, InfiniteCardGrid } from "./display"
import { MultiSelectFilter, SearchFilter } from "./filters"
import { CardTypeSidebar } from "./card-selection/CardTypeSidebar"
import { useCardFiltering } from "@/hooks/use-card-filtering"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"

interface CardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (card: StandardCard) => void
  selectedCardIndex: number
  initialTab?: string
}

export function CardSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedCardIndex,
  initialTab,
}: CardSelectionModalProps) {
  // === 使用简化的筛选 Hook ===
  const {
    filteredCards,
    totalCount,
    classOptions,
    levelOptions,
    batchOptions,
    state,
    actions,
    loading,
    error,
  } = useCardFiltering(initialTab)

  // 防抖搜索
  const debouncedSearchTerm = useDebounce(state.searchTerm, 300)

  // === 无限滚动 ===
  const { displayedItems, hasMore, loadMore, reset } = useInfiniteScroll({
    items: filteredCards,
    pageSize: 30,
  })

  // === 副作用 ===

  // 筛选结果变化时重置滚动
  useEffect(() => {
    reset()
  }, [filteredCards, reset])

  // === 事件处理 ===

  const handleCardClick = useCallback((card: StandardCard) => {
    if (!card.type) {
      card.type = state.activeTab
    }
    onSelect(card)
    onClose()
  }, [state.activeTab, onSelect, onClose])

  const handleClearSelection = useCallback(() => {
    onSelect(createEmptyCard())
    onClose()
  }, [onSelect, onClose])

  // 计算激活的筛选器数量
  const activeFilterCount =
    (state.selectedBatches.length > 0 ? 1 : 0) +
    (state.selectedClasses.length > 0 ? 1 : 0) +
    (state.selectedLevels.length > 0 ? 1 : 0) +
    (state.searchTerm ? 1 : 0)

  // === 渲染 ===

  return (
    <BaseCardModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      sidebar={
        <CardTypeSidebar
          activeTab={state.activeTab}
          onTabChange={actions.setActiveTab}
        />
      }
      header={
        <ModalHeader
          title={`选择卡牌 #${selectedCardIndex + 1}`}
          onClose={onClose}
          actions={
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearSelection}
            >
              清除选择
            </Button>
          }
        />
      }
    >
      <ModalFilterBar collapsible activeFilterCount={activeFilterCount}>
        <MultiSelectFilter
          label="卡包"
          options={batchOptions.map(b => ({ value: b.id, label: `${b.name} (${b.cardCount})` }))}
          selected={state.selectedBatches}
          onChange={actions.setBatches}
          placeholder="未选卡包"
          allSelectedText="全部卡包"
          countSuffix="包已选"
        />
        <MultiSelectFilter
          label="类别"
          options={classOptions}
          selected={state.selectedClasses}
          onChange={actions.setClasses}
          placeholder="未选类别"
          allSelectedText="全部类别"
          countSuffix="类已选"
          disabled={classOptions.length === 0}
        />
        <MultiSelectFilter
          label="等级"
          options={levelOptions}
          selected={state.selectedLevels}
          onChange={actions.setLevels}
          placeholder="未选等级"
          allSelectedText="全部等级"
          countSuffix="级已选"
          disabled={levelOptions.length === 0}
        />
        <SearchFilter
          value={state.searchTerm}
          onChange={actions.setSearchTerm}
          placeholder="搜索卡牌名称或描述..."
          className="flex-1 min-w-[200px]"
        />
        <Button variant="secondary" onClick={actions.resetAll}>
          重置筛选
        </Button>
      </ModalFilterBar>

      <div id="cardSelectionScrollable" className="flex-1 overflow-y-auto p-4">
        <ContentStates
          loading={loading}
          error={error}
          empty={totalCount === 0}
          emptyMessage="未找到符合条件的卡牌"
          loadingMessage="加载卡牌中..."
        >
          <InfiniteCardGrid
            cards={displayedItems}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onCardClick={handleCardClick}
            totalCount={totalCount}
            scrollableTarget="cardSelectionScrollable"
            className="gap-6"
          />
        </ContentStates>
      </div>
    </BaseCardModal>
  )
}
```

**预计行数**：~140行

**相比原代码的改进**：

| 方面 | 原代码 (991行) | 新代码 (~140行) |
|------|----------------|-----------------|
| 状态管理 | 5个独立 useState + useRef | Hook 内部统一管理 |
| 副作用 | 4+ 个 useEffect | 1 个 useEffect |
| 筛选逻辑 | 内联在组件中 | 抽取到 Hook |
| 联动逻辑 | useRef + 复杂比较 | 事件处理函数内置 |
| 可测试性 | 低（UI 耦合） | 高（Hook 可独立测试） |

---

## 六、需要新建的文件

| 文件 | 职责 | 行数 |
|------|------|------|
| `components/modals/card-selection/CardTypeSidebar.tsx` | 侧边栏组件 | ~80 |
| `hooks/use-card-filtering.ts` | 简化筛选 Hook（含状态+操作+过滤） | ~150 |

---

## 七、需要修改的文件

| 文件 | 修改内容 |
|------|---------|
| `components/modals/card-selection-modal.tsx` | 完全重写，使用新架构 |
| `components/character-sheet-sections/card-deck-section.tsx` | 移除状态提升代码 |

### card-deck-section.tsx 修改

```typescript
// 删除这些代码
- const [activeTab, setActiveTab] = useState("")
- const [searchTerm, setSearchTerm] = useState("")
- const [selectedClasses, setSelectedClasses] = useState<string[]>([])
- const [selectedLevels, setSelectedLevels] = useState<string[]>([])
- const [selectedBatches, setSelectedBatches] = useState<string[]>([])

// 简化 Modal 调用
<CardSelectionModal
  isOpen={isCardModalOpen}
  onClose={() => setIsCardModalOpen(false)}
  onSelect={handleCardSelect}
  selectedCardIndex={selectedCardIndex}
/>
```

---

## 八、代码行数对比

| 组件 | 重构前 | 重构后 |
|------|--------|--------|
| CardSelectionModal | 991 | ~140 |
| CardTypeSidebar | (内嵌) | ~80 |
| useCardFiltering | (内嵌) | ~150 |
| **总计** | **991** | **~370** |

**减少：~63%**

### 复杂度对比

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| 独立索引数量 | 4 个 | 0 个（使用卡包过滤替代） |
| useMemo 数量 | 8+ 个 | 3 个（在 Hook 内） |
| useEffect 数量 | 4+ 个 | 1 个 |
| useRef 数量 | 2 个 | 0 个 |
| 状态变量 | 10+ 个 | 1 个（统一状态对象） |

---

## 九、验证清单

- [ ] 卡牌类型切换正常
- [ ] 卡包筛选正常
- [ ] 类别筛选正常（包含卡包联动）
- [ ] 等级筛选正常（包含卡包联动）
- [ ] 搜索防抖正常
- [ ] 无限滚动正常
- [ ] 清除选择正常
- [ ] ESC 关闭正常
- [ ] 移动端筛选折叠正常
- [ ] Framer Motion 动画正常
- [ ] 图片/文字模式切换正常
- [ ] 性能无明显下降（索引加速）

---

## 十、实施步骤

1. 创建 `hooks/use-card-filtering.ts`
2. 创建 `components/modals/card-selection/CardTypeSidebar.tsx`
3. 重写 `components/modals/card-selection-modal.tsx`
4. 修改 `card-deck-section.tsx` 移除状态提升
5. 运行 `pnpm build` 验证
6. 功能测试
