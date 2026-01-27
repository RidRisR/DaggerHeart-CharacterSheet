# 卡牌展示 Modal 架构分析报告

## 一、Modal 清单

项目中共有 **5 个卡牌/物品展示相关的 Modal**：

| Modal | 文件路径 | 代码行数 | 用途 |
|-------|---------|---------|------|
| CardSelectionModal | `components/modals/card-selection-modal.tsx` | 991 行 | 主卡牌选择器，支持多维度筛选 |
| GenericCardSelectionModal | `components/modals/generic-card-selection-modal.tsx` | 274 行 | 通用卡牌选择器（职业/种族/社群/子职业） |
| ViewCardsModal | `components/modals/view-cards-modal.tsx` | 167 行 | 卡牌查看器（只读展示） |
| WeaponSelectionModal | `components/modals/weapon-selection-modal.tsx` | 491 行 | 武器选择器 |
| ArmorSelectionModal | `components/modals/armor-selection-modal.tsx` | 362 行 | 护甲选择器 |

**总计：2,285 行代码**

---

## 二、功能清单

### CardSelectionModal（主卡牌选择器）

| 功能 | 描述 |
|------|------|
| 卡牌类型切换 | 左侧栏切换标准/扩展卡牌类型 |
| 卡包筛选 | 多选下拉框，支持全选/反选 |
| 类别筛选 | 多选下拉框，根据卡包动态更新选项 |
| 等级筛选 | 多选下拉框，支持全选/反选 |
| 搜索 | 防抖搜索（300ms），搜索名称/描述/展示项 |
| 无限滚动 | 每页30张，阈值800px |
| 图片/文字模式 | 根据全局设置切换显示模式 |
| 清除选择 | 清空当前选择 |
| ESC关闭 | 键盘快捷键 |
| 移动端适配 | 筛选器可折叠，显示筛选摘要 |
| 状态提升 | 筛选状态由父组件管理，关闭后保持 |

### GenericCardSelectionModal（通用卡牌选择器）

| 功能 | 描述 |
|------|------|
| 类别筛选 | 单选下拉框 |
| 异步加载 | 使用 `getStandardCardsByTypeAsync` |
| 职业联动 | 子职业根据当前职业自动筛选 |
| 等级筛选 | 可选的等级过滤参数 |
| 清除选择 | 清空当前选择 |
| ESC关闭 | 键盘快捷键 |
| 图片/文字模式 | 根据全局设置切换显示模式 |

### ViewCardsModal（卡牌查看器）

| 功能 | 描述 |
|------|------|
| 只读展示 | 无选择功能 |
| 无限滚动 | 每页30张，阈值800px |
| 加载进度 | 显示加载进度（X / Y） |
| 图片/文字模式 | 根据全局设置切换显示模式 |
| ESC关闭 | 键盘快捷键 |

### WeaponSelectionModal（武器选择器）

| 功能 | 描述 |
|------|------|
| 等级筛选 | T1-T4 单选 |
| 类型筛选 | 主武器/副武器（仅背包模式） |
| 属性筛选 | 物理/魔法 |
| 范围筛选 | 近战/邻近/近距离/远距离/极远 |
| 检定筛选 | 敏捷/灵巧/知识/力量/本能/风度 |
| 搜索 | 搜索名称/描述/特性名称 |
| 无限滚动 | 每页30件，阈值800px |
| 自定义武器 | 8个输入字段创建自定义武器 |
| 表格展示 | 固定表头，横向滚动 |
| 清除选择 | 清空当前选择 |
| ESC关闭 | 键盘快捷键 |
| 状态重置 | 关闭时自动清空所有筛选和自定义数据 |

### ArmorSelectionModal（护甲选择器）

| 功能 | 描述 |
|------|------|
| 等级筛选 | T1-T4 单选 |
| 搜索 | 搜索名称/描述/特性名称 |
| 自定义护甲 | 6个输入字段创建自定义护甲 |
| 表格展示 | 固定表头 |
| 清除选择 | 清空当前选择 |
| ESC关闭 | 键盘快捷键 |
| 状态重置 | 关闭时自动清空所有筛选和自定义数据 |

---

## 三、架构问题分析

### 3.1 严重问题

#### 问题 1：大量重复的 ESC 键处理逻辑

**影响范围**：5个 Modal
**重复代码量**：约 75 行（每个 Modal 15行 × 5）

```typescript
// 每个 Modal 都有几乎相同的代码
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };
  if (isOpen) {
    document.addEventListener('keydown', handleKeyDown);
  }
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onClose]);
```

**问题**：
- 维护成本高，修改需要同步5处
- 容易遗漏某个 Modal
- 无法统一添加新的键盘快捷键

**注意**：虽然 5 个 Modal 都实现了 ESC 键处理，但存在两种略有不同的模式：

- **模式 A（CardSelectionModal）**：在 handler 内部双重检查 `event.key === 'Escape' && isOpen`
- **模式 B（其他 4 个 Modal）**：仅检查 `event.key === "Escape"`，依赖 addEventListener/removeEventListener 的添加/移除来控制

重构时应统一为一种模式。

---

#### 问题 2：重复的无限滚动实现

**影响范围**：CardSelectionModal、ViewCardsModal、WeaponSelectionModal
**重复代码量**：约 150 行

```typescript
// 3个 Modal 都有相同的模式
const [displayedItems, setDisplayedItems] = useState<T[]>([]);
const [hasMore, setHasMore] = useState(true);
const scrollableContainerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  // 重置滚动位置
  if (scrollableContainerRef.current) {
    scrollableContainerRef.current.scrollTop = 0;
  }
  setDisplayedItems(items.slice(0, ITEMS_PER_PAGE));
  setHasMore(items.length > ITEMS_PER_PAGE);
}, [items]);

const fetchMoreData = () => {
  // 加载更多逻辑
};
```

**问题**：
- 相同逻辑重复3次
- 页面大小(30)、阈值(800px)硬编码分散各处
- 无法统一优化性能

---

#### 问题 3：重复的 Modal 容器结构

**影响范围**：5个 Modal
**重复代码量**：约 100 行

```typescript
// 每个 Modal 都有相同的外层结构
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
  <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
    {/* Header */}
    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <button onClick={onClose}>✕</button>
    </div>
    {/* Content */}
  </div>
</div>
```

**问题**：
- 样式不一致（max-w-6xl vs max-w-7xl，max-h-[90vh] vs max-h-[95vh]）
- 无法统一添加动画效果
- 无法统一处理 body 滚动锁定
- Accessibility 属性（role, aria-modal）缺失

---

#### 问题 4：重复的加载/错误/空状态处理

**影响范围**：5个 Modal
**重复代码量**：约 120 行

```typescript
// 每个 Modal 都有类似的状态处理
{isLoading ? (
  <div className="flex items-center justify-center h-32">
    <p className="text-gray-500">加载卡牌中...</p>
  </div>
) : hasError ? (
  <div className="flex items-center justify-center h-32">
    <div className="text-center">
      <p className="text-red-500 mb-2">加载失败</p>
      <p className="text-sm text-gray-500">{error}</p>
    </div>
  </div>
) : isEmpty ? (
  <div className="flex items-center justify-center h-32">
    <p className="text-gray-500">没有找到符合条件的内容</p>
  </div>
) : (
  // 实际内容
)}
```

**问题**：
- 样式和消息不一致
- 无法统一添加重试按钮
- 加载动画不统一

---

### 3.2 中等问题

#### 问题 5：状态管理模式不一致

| Modal | 状态管理方式 |
|-------|-------------|
| CardSelectionModal | 状态提升（父组件管理筛选状态） |
| GenericCardSelectionModal | 本地状态 |
| ViewCardsModal | 本地状态 |
| WeaponSelectionModal | 本地状态 + 关闭时重置 |
| ArmorSelectionModal | 本地状态 + 关闭时重置 |

**问题**：
- 开发者难以选择正确的模式
- CardSelectionModal 要求父组件传递10个状态相关的 props
- 增加使用复杂度

---

#### 问题 6：筛选器 UI 不一致

| Modal | 筛选器样式 |
|-------|-----------|
| CardSelectionModal | DropdownMenu + Checkbox 多选 |
| GenericCardSelectionModal | Select 单选 |
| WeaponSelectionModal | 原生 select 元素 |
| ArmorSelectionModal | 原生 select 元素 |

**问题**：
- 视觉风格不统一
- 交互体验不一致
- 无法复用筛选器组件

---

#### 问题 7：展示模式不统一

| Modal | 展示方式 |
|-------|---------|
| CardSelectionModal | 网格（ImageCard/SelectableCard） |
| GenericCardSelectionModal | 网格（ImageCard/SelectableCard） |
| ViewCardsModal | 网格（ImageCard/SelectableCard） |
| WeaponSelectionModal | 表格 |
| ArmorSelectionModal | 表格 |

**问题**：
- 网格布局代码重复3次
- 表格布局代码重复2次
- 无法灵活切换展示模式

---

### 3.3 轻微问题

#### 问题 8：响应式断点不一致

```typescript
// CardSelectionModal
"grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// ViewCardsModal
"grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// GenericCardSelectionModal
"grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// 但文字模式下：
// CardSelectionModal
"grid-cols-2 md:grid-cols-2 xl:grid-cols-3"
```

---

#### 问题 9：调试代码残留

```typescript
// GenericCardSelectionModal 中有调试代码
console.log("GenericCardSelectionModal Debug:", {
  cardType,
  isLoading,
  hasError,
  baseCardsCount: baseCards?.length || 0,
  // ...
});
```

---

#### 问题 10：TypeScript 类型不严格

```typescript
// CardSelectionModal 中使用 any
classOptions.map((opt: any) => opt.value)
```

---

## 四、功能对比矩阵

| 功能 | CardSelection | GenericCard | ViewCards | Weapon | Armor |
|------|:-------------:|:-----------:|:---------:|:------:|:-----:|
| **筛选功能** |
| 搜索 | ✅ (防抖) | ❌ | ❌ | ✅ | ✅ |
| 多选筛选 | ✅ (4种) | ❌ | ❌ | ❌ | ❌ |
| 单选筛选 | ❌ | ✅ (1种) | ❌ | ✅ (5种) | ✅ (1种) |
| 筛选联动 | ✅ | ✅ (职业) | ❌ | ❌ | ❌ |
| 重置筛选 | ✅ | ❌ | ❌ | ✅ | ✅ |
| **展示功能** |
| 无限滚动 | ✅ | ❌ | ✅ | ✅ | ❌ |
| 网格展示 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 表格展示 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 图片/文字切换 | ✅ | ✅ | ✅ | ❌ | ❌ |
| **选择功能** |
| 单选 | ✅ | ✅ | ❌ | ✅ | ✅ |
| 多选 | ❌ | ❌ | ❌ | ❌ | ❌ |
| 清除选择 | ✅ | ✅ | ❌ | ✅ | ✅ |
| **自定义功能** |
| 自定义创建 | ❌ | ❌ | ❌ | ✅ | ✅ |
| **交互功能** |
| ESC关闭 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 移动端适配 | ✅ | ❌ | ❌ | ✅ | ✅ |
| 状态保持 | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 五、代码复用分析

### 可抽取为公共组件的代码

| 组件/Hook | 来源 | 预计行数 | 复用次数 |
|-----------|------|---------|---------|
| BaseModal | 所有 Modal | 80 行 | 5+ |
| useModalKeyboard | 所有 Modal | 25 行 | 5+ |
| useInfiniteScroll | 3个 Modal | 50 行 | 3+ |
| ContentStates | 所有 Modal | 40 行 | 5+ |
| MultiSelectFilter | CardSelection, Weapon | 80 行 | 2+ |
| SingleSelectFilter | Generic, Armor | 40 行 | 2+ |
| SearchFilter | CardSelection, Weapon, Armor | 30 行 | 3+ |
| FilterBar | CardSelection, Weapon, Armor | 50 行 | 3+ |
| CardGrid | CardSelection, Generic, View | 40 行 | 3+ |
| DataTable | Weapon, Armor | 60 行 | 2+ |

**预计可减少代码量**：约 1,200 行（52%）

---

## 六、性能问题

### 6.1 已有的优化

CardSelectionModal 已实现的优化：
- ✅ 预计算索引（subclassCardIndex, levelCardIndex, batchKeywordIndex, batchLevelIndex）
- ✅ 搜索防抖（300ms）
- ✅ useMemo 缓存计算
- ✅ 无限滚动分页
- ✅ 图片优先级加载（前6张）

### 6.2 潜在性能问题

1. **ArmorSelectionModal 无分页**
   - 一次性渲染所有护甲项
   - 数据量增大时可能卡顿

2. **GenericCardSelectionModal 无分页**
   - 一次性渲染所有筛选后的卡牌
   - 卡牌数量多时可能影响性能

3. **WeaponSelectionModal 表格渲染**
   - 使用无限滚动但表格行较多时 DOM 节点多
   - 可考虑虚拟滚动

---

## 七、建议的重构方向

### 方向一：渐进式优化（低风险）

针对现有 Modal 的问题点逐个修复：
1. 抽取 `useModalKeyboard` hook
2. 抽取 `useInfiniteScroll` hook
3. 创建 `ContentStates` 组件
4. 统一筛选器样式

**优点**：风险低，可逐步实施
**缺点**：代码结构改善有限

### 方向二：组件化重构（中等风险）

创建可复用的 Modal 基础组件体系：
1. `BaseModal` - 统一容器、键盘处理、动画
2. 筛选器组件库 - MultiSelect、SingleSelect、Search
3. 展示组件库 - CardGrid、DataTable
4. 状态 Hooks - useInfiniteScroll、useFilters

**优点**：大幅减少代码，提高一致性
**缺点**：需要较多开发时间

### 方向三：完全重写（高风险）

基于 Radix Dialog 等成熟组件完全重写：
1. 使用 Radix Dialog 作为 Modal 基础
2. 使用 TanStack Table 处理表格
3. 使用 TanStack Virtual 处理虚拟滚动

**优点**：最佳实践，性能最优
**缺点**：风险高，可能引入 breaking changes

---

## 八、推荐方案

基于项目现状，推荐 **方向二：组件化重构**，分阶段实施：

### 阶段 1：基础设施（1周）
- 创建 `BaseModal` 组件
- 创建 `useModalKeyboard` hook
- 创建 `useInfiniteScroll` hook
- 创建 `ContentStates` 组件

### 阶段 2：筛选器组件（1周）
- 创建 `MultiSelectDropdownFilter`
- 创建 `SingleSelectFilter`
- 创建 `SearchFilter`
- 创建 `FilterBar`

### 阶段 3：展示组件（0.5周）
- 创建 `CardGrid`
- 创建 `DataTable`

### 阶段 4：Modal 迁移（1.5周）
- 迁移 ViewCardsModal（最简单）
- 迁移 GenericCardSelectionModal
- 迁移 ArmorSelectionModal
- 迁移 WeaponSelectionModal
- 迁移 CardSelectionModal（最复杂）

### 预期收益

| 指标 | 重构前 | 重构后 | 改善 |
|------|--------|--------|------|
| 总代码行数 | ~2,285 | ~1,100 | -52% |
| ESC处理实现 | 5处 | 1处 | -80% |
| 无限滚动实现 | 3处 | 1处 | -67% |
| 筛选器实现 | 8+处 | 2处 | -75% |
| 加载状态实现 | 5处 | 1处 | -80% |

---

## 九、现有可复用资源

在设计重构方案时，应考虑复用以下现有资源：

| 资源 | 路径 | 说明 |
|------|------|------|
| use-debounce.ts | `hooks/use-debounce.ts` | 通用防抖 hook，CardSelectionModal 已使用 |
| use-mobile.tsx | `hooks/use-mobile.tsx` | 移动端检测 hook |
| Dialog 组件 | `components/ui/dialog.tsx` | Radix Dialog 封装，可作为 BaseModal 基础 |
| ScrollArea | `components/ui/scroll-area.tsx` | 可滚动区域组件 |
| DropdownMenu | `components/ui/dropdown-menu.tsx` | 下拉菜单组件 |
| Select | `components/ui/select.tsx` | 单选下拉组件 |
| Checkbox | `components/ui/checkbox.tsx` | 复选框组件 |

**建议**：
1. 新建的 hooks 应放在项目级 `hooks/` 目录，而非 `components/modals/hooks/`
2. `BaseModal` 应考虑基于现有 `ui/dialog.tsx` 扩展，而非从零创建
