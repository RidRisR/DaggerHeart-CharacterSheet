# 属性升级交互改进方案

## 文档信息
- **创建日期**: 2025-01-13
- **版本**: 1.0
- **状态**: 待实现

---

## 1. 背景和问题

### 当前交互方案的问题
在现有的升级系统中，属性升级功能采用"复选框 + 编辑按钮"的双重操作模式：
- 用户需要点击复选框来标记完成状态
- 同时需要点击小的编辑按钮来打开气泡编辑器选择属性

**存在的问题：**
1. **双重操作不直观**：用户不清楚应该先点击哪个，操作顺序混乱
2. **编辑按钮过小**：难以精确点击，特别是在移动设备上
3. **操作逻辑不统一**：有些选项点击复选框直接生效（如生命槽+1），有些需要额外的编辑步骤
4. **无法撤回**：一旦应用修改，无法方便地撤回到之前的状态

### 改进目标
- 简化交互为**单一操作入口**（复选框）
- 提供**一键回滚**功能
- 智能检测**数据冲突**，防止误操作
- 保持界面简洁，无需额外按钮

---

## 2. 改进方案概述

### 核心理念
**"复选框即操作入口"** - 将所有功能集成到复选框的点击行为中。

### 新的交互逻辑

#### 点击空白复选框
1. 保存当前所有6个属性的完整快照（操作前状态）
2. 打开气泡编辑器
3. 用户在编辑器中选择要升级的属性

#### 在气泡编辑器中操作
- **点击"确认"按钮**：
  - 应用属性修改到 sheet-data
  - 保存操作前后两个快照到内存
  - 复选框变为高亮
  - 关闭气泡

- **点击"关闭"按钮（X）**：
  - 不应用任何修改
  - 不保存快照
  - 复选框保持空白
  - 关闭气泡

#### 点击已高亮的复选框
1. 检查内存中是否有该操作的记录
2. 比较当前属性状态与记录的"操作后状态"是否一致
3. 根据检查结果执行相应操作：
   - **一致** → 回滚到操作前状态，通知"已撤回"
   - **不一致** → 提示"数据已修改，无法自动回滚"
   - **无记录** → 提示"记录已丢失，无法自动回滚"
4. 取消复选框高亮

---

## 3. 核心数据结构

### AttributeUpgradeRecord 接口

```typescript
interface AttributeUpgradeRecord {
  // 升级选项的唯一标识，例如 "tier1-0"
  tierKey: string

  // 操作时间戳（用于调试和日志）
  timestamp: number

  // 操作前的属性状态快照（所有6个属性）
  beforeState: {
    agility: AttributeValue
    strength: AttributeValue
    finesse: AttributeValue
    instinct: AttributeValue
    presence: AttributeValue
    knowledge: AttributeValue
  }

  // 操作后的属性状态快照（所有6个属性）
  afterState: {
    agility: AttributeValue
    strength: AttributeValue
    finesse: AttributeValue
    instinct: AttributeValue
    presence: AttributeValue
    knowledge: AttributeValue
  }
}

// AttributeValue 类型定义（已存在）
interface AttributeValue {
  checked: boolean      // 属性是否已被升级标记
  value: string         // 属性的具体数值
  spellcasting?: boolean // 是否为施法属性（可选）
}
```

### 在 sheet-store 中添加状态

```typescript
interface SheetState {
  // ... 现有字段

  // 新增：属性升级历史记录
  // key 为 tierKey（如 "tier1-0"），value 为操作记录
  attributeUpgradeHistory: Record<string, AttributeUpgradeRecord>

  // 新增：保存属性升级记录的方法
  saveAttributeUpgradeRecord: (
    tierKey: string,
    beforeState: Record<string, AttributeValue>,
    afterState: Record<string, AttributeValue>
  ) => void

  // 新增：回滚属性升级的方法
  rollbackAttributeUpgrade: (tierKey: string) => {
    success: boolean
    reason?: 'no-record' | 'conflict' | 'success'
  }
}
```

---

## 4. 操作流程详解

### 流程 1: 点击空白复选框

**触发条件：** 用户点击未勾选的属性升级复选框

**执行步骤：**
1. 检测到复选框未勾选（`isUpgradeChecked(tierKey) === false`）
2. 判断是属性升级选项（`isAttributeUpgradeOption(label)`）
3. **不立即保存快照**（因为用户可能取消）
4. 打开气泡编辑器（`setOpenPopoverIndex(tierKey)`）

**代码位置：** `components/character-sheet-page-two-sections/upgrade-section.tsx`

```typescript
// 在复选框的 onClick 中
const handleCheckboxClick = (checkKey: string, index: number, option: any) => {
  const isChecked = isUpgradeChecked(checkKey, index)

  if (!isChecked) {
    // 空白复选框被点击
    if (isAttributeUpgradeOption(option.label)) {
      // 属性升级：打开气泡编辑器
      setOpenPopoverIndex(`${tierKey}-${index}`)
      // 快照保存将在气泡编辑器组件内部处理
    } else {
      // 其他类型的升级选项（保持原有逻辑）
      handleUpgradeCheck(checkKey, index)
    }
  } else {
    // 已高亮复选框被点击 - 尝试回滚
    handleUpgradeCheck(checkKey, index)
  }
}
```

---

### 流程 2: 应用修改（点击确认）

**触发条件：** 用户在气泡编辑器中点击"确认"按钮

**执行步骤：**
1. 获取操作前的属性快照（在编辑器 mount 时保存）
2. 应用用户选择的属性修改到 sheet-data
3. 获取操作后的属性快照
4. 将 beforeState 和 afterState 保存到 `attributeUpgradeHistory`
5. 勾选复选框（`upgrades[tierKey] = true`）
6. 显示成功通知
7. 关闭气泡

**代码位置：** `components/upgrade-popover/attribute-upgrade-editor.tsx`

```typescript
const AttributeUpgradeEditor = ({ tier, optionIndex, onClose, handleUpgradeCheck }) => {
  // 在组件 mount 时保存 beforeState
  const [beforeState] = useState(() => {
    return {
      agility: { ...sheetData.agility },
      strength: { ...sheetData.strength },
      finesse: { ...sheetData.finesse },
      instinct: { ...sheetData.instinct },
      presence: { ...sheetData.presence },
      knowledge: { ...sheetData.knowledge },
    }
  })

  const handleConfirm = () => {
    // 1. 应用属性修改
    applyAttributeChanges()

    // 2. 获取 afterState
    const afterState = {
      agility: { ...sheetData.agility },
      strength: { ...sheetData.strength },
      finesse: { ...sheetData.finesse },
      instinct: { ...sheetData.instinct },
      presence: { ...sheetData.presence },
      knowledge: { ...sheetData.knowledge },
    }

    // 3. 保存快照到 store
    const tierKey = `${tier}-${optionIndex}`
    saveAttributeUpgradeRecord(tierKey, beforeState, afterState)

    // 4. 勾选复选框
    handleUpgradeCheck(tier, optionIndex)

    // 5. 显示通知（列出升级的属性）
    const upgradedAttrs = getUpgradedAttributeNames()
    showFadeNotification({
      message: `已升级属性：${upgradedAttrs.join('、')}`,
      type: "success"
    })

    // 6. 关闭气泡
    onClose()
  }

  return (
    // ... UI 代码
  )
}
```

---

### 流程 3: 取消修改（点击关闭）

**触发条件：** 用户在气泡编辑器中点击"关闭"按钮（X）

**执行步骤：**
1. 不应用任何修改
2. 不保存快照
3. 复选框保持空白
4. 关闭气泡

**代码位置：** `components/upgrade-popover/attribute-upgrade-editor.tsx`

```typescript
const handleClose = () => {
  // 直接关闭，不做任何数据修改
  onClose()
}
```

---

### 流程 4: 点击已高亮复选框（回滚）

**触发条件：** 用户点击已勾选的属性升级复选框

**执行步骤：**
1. 检测到复选框已勾选（`isUpgradeChecked(tierKey) === true`）
2. 调用 `rollbackAttributeUpgrade(tierKey)` 方法
3. 根据返回结果执行相应操作

**代码位置：** `components/character-sheet-page-two.tsx`

```typescript
const handleUpgradeCheck = (tier: string, index: number) => {
  const tierKey = `${tier}-${index}`
  const isChecked = isUpgradeChecked(tierKey, index)

  if (isChecked && isAttributeUpgradeOption(/* ... */)) {
    // 已高亮的属性升级复选框被点击 - 尝试回滚
    const result = rollbackAttributeUpgrade(tierKey)

    if (result.success) {
      // 回滚成功
      showFadeNotification({
        message: "已撤回属性升级，属性值已恢复",
        type: "success"
      })
    } else {
      // 回滚失败
      if (result.reason === 'no-record') {
        showFadeNotification({
          message: "升级记录已丢失，无法自动回滚，请手动调整属性值",
          type: "info"
        })
      } else if (result.reason === 'conflict') {
        showFadeNotification({
          message: "属性已被其他操作修改，无法自动回滚，请手动调整",
          type: "info"
        })
      }
    }

    // 无论成功与否，都取消高亮
    setUpgradeChecked(tierKey, false)
  } else {
    // 其他情况（保持原有逻辑）
    // ...
  }
}
```

---

## 5. 回滚逻辑详解

### rollbackAttributeUpgrade 方法实现

**代码位置：** `lib/sheet-store.ts`

```typescript
rollbackAttributeUpgrade: (tierKey: string) => {
  const record = get().attributeUpgradeHistory[tierKey]

  // 场景 1: 内存中没有记录（可能刷新了页面）
  if (!record) {
    return { success: false, reason: 'no-record' }
  }

  // 场景 2: 检查当前属性状态是否与记录的 afterState 一致
  const attributeKeys = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge']
  const currentState = get().sheetData

  const hasConflict = attributeKeys.some(key => {
    const current = currentState[key]
    const recorded = record.afterState[key]
    return (
      current.value !== recorded.value ||
      current.checked !== recorded.checked
      // 注意：spellcasting 字段也需要比较
      // || current.spellcasting !== recorded.spellcasting
    )
  })

  if (hasConflict) {
    // 有冲突 - 用户在其他地方修改了属性
    // 删除记录，防止下次再尝试
    const newHistory = { ...get().attributeUpgradeHistory }
    delete newHistory[tierKey]
    set({ attributeUpgradeHistory: newHistory })

    return { success: false, reason: 'conflict' }
  }

  // 场景 3: 一致，可以安全回滚
  attributeKeys.forEach(key => {
    set((state) => ({
      sheetData: {
        ...state.sheetData,
        [key]: { ...record.beforeState[key] }
      }
    }))
  })

  // 删除记录
  const newHistory = { ...get().attributeUpgradeHistory }
  delete newHistory[tierKey]
  set({ attributeUpgradeHistory: newHistory })

  return { success: true, reason: 'success' }
}
```

### 冲突检测逻辑

**检测对象：** 所有6个属性的完整状态

**比较字段：**
- `value`: 属性的数值（字符串）
- `checked`: 是否已被标记为升级
- `spellcasting`（可选）: 是否为施法属性

**冲突场景示例：**

```typescript
// 操作记录
record.afterState.agility = { value: "3", checked: true }

// 当前实际状态
sheetData.agility = { value: "4", checked: true }

// 结果：检测到冲突，因为 value 不一致
// 说明用户在其他地方也升级了敏捷属性
```

---

## 6. 需要修改的文件清单

### 1. `lib/sheet-store.ts`
**修改内容：**
- ✅ 添加 `attributeUpgradeHistory: Record<string, AttributeUpgradeRecord>` 状态
- ✅ 添加 `saveAttributeUpgradeRecord()` 方法
- ✅ 添加 `rollbackAttributeUpgrade()` 方法

### 2. `components/upgrade-popover/attribute-upgrade-editor.tsx`
**修改内容：**
- ✅ 在组件 mount 时保存 beforeState 快照
- ✅ 修改"确认"按钮的逻辑，调用 `saveAttributeUpgradeRecord()`
- ✅ 确保"关闭"按钮不触发任何数据修改

### 3. `components/character-sheet-page-two-sections/upgrade-section.tsx`
**修改内容：**
- ✅ 移除属性升级选项的编辑按钮（不再需要）
- ✅ 修改 `needsEditButton()` 函数，排除属性升级选项
- ✅ 修改复选框的 onClick 逻辑，区分"空白"和"已高亮"状态

### 4. `components/character-sheet-page-two.tsx`
**修改内容：**
- ✅ 修改 `handleUpgradeCheck()` 函数
- ✅ 增加"点击已高亮复选框"的回滚逻辑
- ✅ 根据 `rollbackAttributeUpgrade()` 的返回结果显示相应通知

---

## 7. 实现细节

### 7.1 快照保存的时机

**时机 1: 组件 mount 时**
```typescript
// 在 AttributeUpgradeEditor 组件内
const [beforeState] = useState(() => {
  // 这个函数只在组件首次渲染时执行一次
  return captureCurrentAttributeState()
})
```

**时机 2: 点击确认按钮时**
```typescript
const handleConfirm = () => {
  const afterState = captureCurrentAttributeState()
  saveAttributeUpgradeRecord(tierKey, beforeState, afterState)
  // ...
}
```

### 7.2 属性快照捕获函数

```typescript
// 工具函数：捕获当前所有属性的状态
function captureCurrentAttributeState() {
  const { sheetData } = useSheetStore.getState()

  return {
    agility: { ...sheetData.agility },
    strength: { ...sheetData.strength },
    finesse: { ...sheetData.finesse },
    instinct: { ...sheetData.instinct },
    presence: { ...sheetData.presence },
    knowledge: { ...sheetData.knowledge },
  }
}
```

### 7.3 复选框点击处理的改造

**原有逻辑（所有选项统一处理）：**
```typescript
<div onClick={() => handleUpgradeCheck(checkKey, index)}>
  {/* 复选框 */}
</div>
```

**新逻辑（区分属性升级和其他选项）：**
```typescript
<div onClick={() => {
  const isChecked = isUpgradeChecked(checkKey, index)

  if (isAttributeUpgradeOption(option.label)) {
    if (!isChecked) {
      // 空白复选框 - 打开编辑器
      setOpenPopoverIndex(`${tierKey}-${index}`)
    } else {
      // 已高亮复选框 - 尝试回滚
      handleUpgradeCheck(checkKey, index)
    }
  } else {
    // 其他选项保持原有逻辑
    handleUpgradeCheck(checkKey, index)
  }
}}>
  {/* 复选框 */}
</div>
```

### 7.4 编辑按钮的移除

**修改前：**
```typescript
{needsEditButton(option.label) && (
  <Popover>
    <PopoverTrigger asChild>
      <button><Edit /></button>
    </PopoverTrigger>
    {/* ... */}
  </Popover>
)}
```

**修改后：**
```typescript
{needsEditButton(option.label) && !isAttributeUpgradeOption(option.label) && (
  <Popover>
    <PopoverTrigger asChild>
      <button><Edit /></button>
    </PopoverTrigger>
    {/* ... */}
  </Popover>
)}
```

---

## 8. 边界情况处理

### 8.1 用户刷新页面

**场景描述：**
1. 用户升级了属性，复选框已高亮
2. 用户刷新浏览器页面
3. `attributeUpgradeHistory` 存储在内存中，刷新后丢失
4. 用户点击已高亮的复选框尝试回滚

**处理方式：**
- 检测到 `attributeUpgradeHistory[tierKey]` 不存在
- 返回 `{ success: false, reason: 'no-record' }`
- 显示通知："升级记录已丢失，无法自动回滚，请手动调整属性值"
- 取消复选框高亮
- **不修改属性值**（因为不知道操作前的状态）

### 8.2 用户在其他地方修改了属性

**场景描述：**
1. 用户在 Tier1 升级选项中选择 `agility` +1（从 2 → 3）
2. 用户在 Tier2 升级选项中又选择 `agility` +1（从 3 → 4）
3. 用户回到 Tier1，点击已高亮的复选框尝试回滚

**处理方式：**
- 检测到 `sheetData.agility.value = "4"` 与 `record.afterState.agility.value = "3"` 不一致
- 返回 `{ success: false, reason: 'conflict' }`
- 显示通知："属性已被其他操作修改，无法自动回滚，请手动调整"
- 取消复选框高亮，清除记录
- **不修改属性值**（防止误操作）

### 8.3 用户在同一个 Tier 多次升级属性

**场景描述：**
- Tier1 有 3 个"属性+1"选项（boxCount: 3）
- 用户可以勾选多个复选框

**处理方式：**
- 每个复选框独立记录（`tier1-0`、`tier1-1`、`tier1-2`）
- 每个操作的快照互不影响
- 回滚时只影响对应的那次操作

### 8.4 用户切换角色存档

**场景描述：**
1. 用户在角色 A 中升级了属性
2. 用户切换到角色 B
3. 用户再切回角色 A

**处理方式：**
- `attributeUpgradeHistory` 存储在 sheet-store 中
- 每个角色有独立的 store 实例（通过 multi-character-storage）
- 切换角色时，历史记录也随之切换
- **如果不持久化**，切换后记录会丢失，按"刷新页面"场景处理

### 8.5 用户在角色卡输入框直接修改属性

**场景描述：**
1. 用户通过升级选项升级了 `agility` +1
2. 用户在角色卡的 `agility` 输入框中手动修改为其他值
3. 用户点击升级选项的复选框尝试回滚

**处理方式：**
- 检测到属性值不一致
- 按"数据冲突"场景处理
- 提示无法自动回滚

---

## 9. 通知文案规范

### 成功通知（绿色）

**应用属性修改：**
```
"已升级属性：敏捷 +1，力量 +1"
```

**回滚成功：**
```
"已撤回属性升级，属性值已恢复"
```

### 信息通知（蓝色）

**回滚失败 - 内存丢失：**
```
"升级记录已丢失，无法自动回滚，请手动调整属性值"
```

**回滚失败 - 数据冲突：**
```
"属性已被其他操作修改，无法自动回滚，请手动调整"
```

### 通知显示时机

| 操作 | 时机 | 文案 | 类型 |
|------|------|------|------|
| 应用属性修改 | 点击确认按钮 | "已升级属性：X、Y" | success |
| 回滚成功 | 点击已高亮复选框 | "已撤回属性升级，属性值已恢复" | success |
| 回滚失败（无记录） | 点击已高亮复选框 | "升级记录已丢失，无法自动回滚，请手动调整属性值" | info |
| 回滚失败（冲突） | 点击已高亮复选框 | "属性已被其他操作修改，无法自动回滚，请手动调整" | info |

---

## 10. 测试场景清单

### 基础功能测试

- [ ] **测试 1.1**: 点击空白复选框，气泡编辑器正常打开
- [ ] **测试 1.2**: 在编辑器中选择属性后点击确认，复选框变为高亮
- [ ] **测试 1.3**: 在编辑器中点击关闭（X），复选框保持空白
- [ ] **测试 1.4**: 点击已高亮复选框，成功回滚，复选框变为空白
- [ ] **测试 1.5**: 回滚后属性值正确恢复到操作前状态

### 冲突检测测试

- [ ] **测试 2.1**: 刷新页面后点击已高亮复选框，提示"记录已丢失"
- [ ] **测试 2.2**: 在其他升级选项中修改同一属性后回滚，提示"数据已修改"
- [ ] **测试 2.3**: 在角色卡输入框直接修改属性后回滚，提示"数据已修改"
- [ ] **测试 2.4**: 冲突场景下，复选框取消高亮但不修改属性值

### 多次操作测试

- [ ] **测试 3.1**: 同一个 Tier 多次勾选属性升级，各自独立记录
- [ ] **测试 3.2**: 回滚其中一个操作，不影响其他操作
- [ ] **测试 3.3**: 连续升级和回滚多次，状态正确

### 边界情况测试

- [ ] **测试 4.1**: 切换角色存档后，历史记录正确隔离
- [ ] **测试 4.2**: 升级6个属性后回滚，所有属性正确恢复
- [ ] **测试 4.3**: 升级包含 `spellcasting` 标记的属性后回滚，标记正确恢复

---

## 11. 后续扩展可能性

### 扩展 1: 持久化历史记录（可选）

如果未来需要支持"刷新页面后仍可回滚"，可以考虑：

```typescript
// 在 saveAttributeUpgradeRecord 中
localStorage.setItem(
  `attribute-upgrade-history-${characterId}`,
  JSON.stringify(attributeUpgradeHistory)
)

// 在加载角色时
const history = localStorage.getItem(`attribute-upgrade-history-${characterId}`)
if (history) {
  set({ attributeUpgradeHistory: JSON.parse(history) })
}
```

**优点：** 更好的用户体验，刷新后仍可回滚
**缺点：** 增加复杂度，localStorage 管理成本

### 扩展 2: 应用于其他升级选项

该方案可以扩展到其他需要回滚功能的升级选项：
- 经历值升级
- 闪避值升级
- 生命槽/压力槽升级（虽然当前是简单的 ±1）

### 扩展 3: 批量回滚

未来可以考虑增加"撤回所有升级"功能，一键清空某个 Tier 的所有升级。

---

## 12. 实现优先级

### P0 - 核心功能（第一阶段）
1. ✅ `sheet-store` 中添加 `attributeUpgradeHistory` 状态
2. ✅ 实现 `saveAttributeUpgradeRecord()` 方法
3. ✅ 实现 `rollbackAttributeUpgrade()` 方法
4. ✅ 修改 `AttributeUpgradeEditor` 保存快照
5. ✅ 修改复选框点击逻辑
6. ✅ 移除属性升级的编辑按钮

### P1 - 交互优化（第二阶段）
1. ✅ 完善通知文案
2. ✅ 添加错误处理和边界情况检查
3. ✅ 测试所有场景

### P2 - 未来优化（可选）
1. ⚪ 持久化历史记录到 localStorage
2. ⚪ 扩展到其他升级选项
3. ⚪ 批量回滚功能

---

## 13. 相关文件索引

### 核心文件
- **状态管理**: `lib/sheet-store.ts`
- **类型定义**: `lib/sheet-data.ts`

### 组件文件
- **升级区块**: `components/character-sheet-page-two-sections/upgrade-section.tsx`
- **属性编辑器**: `components/upgrade-popover/attribute-upgrade-editor.tsx`
- **页面逻辑**: `components/character-sheet-page-two.tsx`

### 数据文件
- **升级选项**: `data/list/upgrade.ts`

---

## 14. 更新日志

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2025-01-13 | 1.0 | 初始文档创建 |

---

## 附录 A: 完整代码示例

### A.1 sheet-store.ts 新增代码

```typescript
// 接口定义
interface AttributeUpgradeRecord {
  tierKey: string
  timestamp: number
  beforeState: {
    agility: AttributeValue
    strength: AttributeValue
    finesse: AttributeValue
    instinct: AttributeValue
    presence: AttributeValue
    knowledge: AttributeValue
  }
  afterState: {
    agility: AttributeValue
    strength: AttributeValue
    finesse: AttributeValue
    instinct: AttributeValue
    presence: AttributeValue
    knowledge: AttributeValue
  }
}

// 在 SheetState 接口中添加
interface SheetState {
  // ... 现有字段
  attributeUpgradeHistory: Record<string, AttributeUpgradeRecord>
  saveAttributeUpgradeRecord: (
    tierKey: string,
    beforeState: Record<string, AttributeValue>,
    afterState: Record<string, AttributeValue>
  ) => void
  rollbackAttributeUpgrade: (tierKey: string) => {
    success: boolean
    reason?: 'no-record' | 'conflict' | 'success'
  }
}

// 在 create() 中添加实现
export const useSheetStore = create<SheetState>((set, get) => ({
  // ... 现有状态
  attributeUpgradeHistory: {},

  saveAttributeUpgradeRecord: (tierKey, beforeState, afterState) => {
    set((state) => ({
      attributeUpgradeHistory: {
        ...state.attributeUpgradeHistory,
        [tierKey]: {
          tierKey,
          timestamp: Date.now(),
          beforeState,
          afterState,
        },
      },
    }))
  },

  rollbackAttributeUpgrade: (tierKey) => {
    const record = get().attributeUpgradeHistory[tierKey]

    if (!record) {
      return { success: false, reason: 'no-record' }
    }

    const attributeKeys = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge']
    const currentState = get().sheetData

    const hasConflict = attributeKeys.some(key => {
      const current = currentState[key]
      const recorded = record.afterState[key]
      return (
        current.value !== recorded.value ||
        current.checked !== recorded.checked ||
        current.spellcasting !== recorded.spellcasting
      )
    })

    if (hasConflict) {
      const newHistory = { ...get().attributeUpgradeHistory }
      delete newHistory[tierKey]
      set({ attributeUpgradeHistory: newHistory })
      return { success: false, reason: 'conflict' }
    }

    const updates: any = {}
    attributeKeys.forEach(key => {
      updates[key] = { ...record.beforeState[key] }
    })

    set((state) => ({
      sheetData: {
        ...state.sheetData,
        ...updates,
      },
    }))

    const newHistory = { ...get().attributeUpgradeHistory }
    delete newHistory[tierKey]
    set({ attributeUpgradeHistory: newHistory })

    return { success: true, reason: 'success' }
  },
}))
```

### A.2 attribute-upgrade-editor.tsx 修改

```typescript
export function AttributeUpgradeEditor({
  tier,
  optionIndex,
  handleUpgradeCheck,
  onClose
}: AttributeUpgradeEditorProps) {
  const { sheetData, setSheetData, saveAttributeUpgradeRecord } = useSheetStore()

  // 组件 mount 时保存 beforeState
  const [beforeState] = useState(() => ({
    agility: { ...sheetData.agility },
    strength: { ...sheetData.strength },
    finesse: { ...sheetData.finesse },
    instinct: { ...sheetData.instinct },
    presence: { ...sheetData.presence },
    knowledge: { ...sheetData.knowledge },
  }))

  // ... 其他状态和逻辑

  const handleConfirm = () => {
    // 1. 应用属性修改
    const updates = calculateAttributeUpdates()
    setSheetData(updates)

    // 2. 获取 afterState
    const afterState = {
      agility: { ...updates.agility || sheetData.agility },
      strength: { ...updates.strength || sheetData.strength },
      finesse: { ...updates.finesse || sheetData.finesse },
      instinct: { ...updates.instinct || sheetData.instinct },
      presence: { ...updates.presence || sheetData.presence },
      knowledge: { ...updates.knowledge || sheetData.knowledge },
    }

    // 3. 保存快照
    const tierKey = `${tier}-${optionIndex}`
    saveAttributeUpgradeRecord(tierKey, beforeState, afterState)

    // 4. 勾选复选框
    handleUpgradeCheck(tier, optionIndex)

    // 5. 显示通知
    const upgradedAttrs = getUpgradedAttributeNames(updates)
    showFadeNotification({
      message: `已升级属性：${upgradedAttrs.join('、')}`,
      type: "success"
    })

    // 6. 关闭气泡
    onClose()
  }

  return (
    // ... UI
  )
}
```

---

**文档结束**
