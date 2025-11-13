# Upgrade Section 重构方案

## 文档信息
- **创建日期**: 2025-01-13
- **版本**: 2.0
- **状态**: 待实施
- **相关文档**: `attribute-upgrade-interaction-improvement.md`

---

## 1. 问题分析

### 1.1 当前架构的核心问题

**职责混乱**：`handleUpgradeCheck` 函数承担了双重职责：
1. **业务逻辑处理**：生命槽±1、压力槽±1、熟练度±1、属性升级回滚
2. **状态切换**：切换复选框的勾选状态

**导致的冲突**：
```typescript
// AttributeUpgradeEditor 应用修改后需要勾选复选框
handleUpgradeCheck(checkKey, index)  // 调用这个函数来勾选

// 但 handleUpgradeCheck 内部有回滚逻辑
if (label.includes("角色属性+1") && currentlyChecked) {
  rollbackAttributeUpgrade(tierKey)  // 如果检测到已勾选，会触发回滚！
}
```

**时序问题**：
- 编辑器应用属性修改后，需要勾选复选框
- 但调用 `handleUpgradeCheck` 时，可能触发不期望的业务逻辑
- 状态查询和更新的时机难以控制

### 1.2 CheckedUpgrades 数据结构的复杂性

**存储格式**：
```json
{
  "checkedUpgrades": {
    "tier1": {},
    "tier2": {},
    "tier3": {},
    "tier1-0-2": { "0": true },  // 完整 checkKey 作为外层 key
    "tier1-1-0": { "1": true }   // optionIndex 作为内层 key
  }
}
```

**查询混乱**：
```typescript
// 当前代码中的查询方式不统一
const currentlyChecked = checkedUpgrades?.[tier]?.[index]           // 使用提取的 tier
const isChecked = checkedUpgrades?.[checkKey]?.[index]              // 使用完整 checkKey
```

**更新混乱**：
```typescript
// 有些地方使用 tier，有些使用 checkKey
newCheckedUpgrades[tier][index] = true
newCheckedUpgrades[checkKey][index] = true
```

---

## 2. 解决方案概述

### 2.1 核心理念

**职责分离原则**：
- **纯粹的状态操作函数**：只负责修改数据，无业务逻辑
- **业务逻辑函数**：处理业务规则，调用状态操作函数
- **编辑器组件**：应用修改并调用纯粹的状态操作函数

### 2.2 三层架构设计

```
┌─────────────────────────────────────┐
│   编辑器层 (Editors)                │
│   - AttributeUpgradeEditor           │
│   - HPMaxEditor                      │
│   - 其他编辑器...                    │
│                                      │
│   职责：应用数据修改 + 调用状态函数  │
└──────────────┬──────────────────────┘
               │ 调用
               ↓
┌─────────────────────────────────────┐
│   状态操作层 (State Operations)     │
│   - toggleUpgradeCheckbox()          │  ← 新增：纯粹的状态切换
│                                      │
│   职责：直接操作 checkedUpgrades     │
└──────────────┬──────────────────────┘
               │ 被调用
               ↑
┌─────────────────────────────────────┐
│   业务逻辑层 (Business Logic)       │
│   - handleUpgradeCheck()             │  ← 重构：只处理业务逻辑
│                                      │
│   职责：处理升级规则 + 调用状态函数  │
└─────────────────────────────────────┘
```

---

## 3. 详细设计方案

### 3.1 新增专用状态切换函数

**函数签名**：
```typescript
const toggleUpgradeCheckbox = (
  checkKey: string,    // 完整的 checkKey，如 "tier1-0-2"
  index: number,       // optionIndex
  checked: boolean     // true = 勾选, false = 取消勾选
) => void
```

**职责**：
- ✅ 单纯地设置 `checkedUpgrades[checkKey][index]` 的值
- ❌ 不处理任何业务逻辑
- ❌ 不显示通知
- ❌ 不修改其他数据

**实现位置**：`components/character-sheet-page-two.tsx`

**完整实现**：
```typescript
const toggleUpgradeCheckbox = (checkKey: string, index: number, checked: boolean) => {
  setFormData((prev) => {
    const checkedUpgrades = prev.checkedUpgrades ?? {
      tier1: {},
      tier2: {},
      tier3: {},
    }

    const newCheckedUpgrades = {
      ...checkedUpgrades,
      tier1: checkedUpgrades.tier1 ?? {},
      tier2: checkedUpgrades.tier2 ?? {},
      tier3: checkedUpgrades.tier3 ?? {},
    }

    // 确保 checkKey 对应的对象存在
    if (!newCheckedUpgrades[checkKey]) {
      newCheckedUpgrades[checkKey] = {}
    }

    // 设置勾选状态
    newCheckedUpgrades[checkKey] = {
      ...newCheckedUpgrades[checkKey],
      [index]: checked,
    }

    return {
      ...prev,
      checkedUpgrades: newCheckedUpgrades,
    }
  })
}
```

---

### 3.2 重构 handleUpgradeCheck

**新的职责**：
1. 处理各种升级选项的业务逻辑
2. 调用 `toggleUpgradeCheckbox` 来切换状态（不再直接操作状态）

**修改要点**：

#### A. 统一使用完整 checkKey 查询状态

**修改前**：
```typescript
const tierMatch = checkKeyOrTier.match(/^(tier\d+)/)
const tier = tierMatch ? tierMatch[1] : checkKeyOrTier
const currentlyChecked = checkedUpgrades?.[tier]?.[index] ?? false  // 错误：使用 tier
```

**修改后**：
```typescript
const currentlyChecked = checkedUpgrades?.[checkKeyOrTier]?.[index] ?? false  // 正确：使用完整 checkKey
```

#### B. 业务逻辑后调用状态切换函数

**修改前**：
```typescript
// 生命槽逻辑
if (label.includes("生命槽")) {
  if (newCheckedState) {
    updateHPMax(currentHP + 1)
  } else {
    updateHPMax(currentHP - 1)
  }
}

// 最后直接操作状态
setFormData((prev) => ({
  ...prev,
  checkedUpgrades: {
    ...prev.checkedUpgrades,
    [tier]: { ...prev.checkedUpgrades[tier], [index]: newCheckedState }
  }
}))
```

**修改后**：
```typescript
// 生命槽逻辑
if (label.includes("生命槽")) {
  if (newCheckedState) {
    updateHPMax(currentHP + 1)
    showFadeNotification({ message: `生命槽上限 +1，当前为 ${currentHP + 1}`, type: "success" })
  } else {
    updateHPMax(currentHP - 1)
    showFadeNotification({ message: `生命槽上限 -1，当前为 ${currentHP - 1}`, type: "success" })
  }
}

// 最后调用状态切换函数
toggleUpgradeCheckbox(checkKeyOrTier, index, newCheckedState)
```

#### C. 属性升级回滚逻辑优化

**修改后**：
```typescript
// 属性升级的回滚逻辑
if (label.includes("角色属性+1") && currentlyChecked) {
  const result = rollbackAttributeUpgrade(checkKeyOrTier)

  if (result.success) {
    showFadeNotification({
      message: "已撤回属性升级，属性值已恢复",
      type: "success"
    })
  } else {
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

  // 无论成功与否，都取消勾选
  toggleUpgradeCheckbox(checkKeyOrTier, index, false)
  return  // 早返回，不执行后续逻辑
}
```

---

### 3.3 修改 isUpgradeChecked 函数

**当前实现的问题**：
```typescript
const isUpgradeChecked = (checkKey: string, index: number): boolean => {
  return !!safeFormData.checkedUpgrades?.[checkKey]?.[index]
}
```
- 参数名叫 `checkKey`，但有些调用方传的是 `tier`
- 导致查询混乱

**解决方案**：
1. **保持函数实现不变**（已经是正确的）
2. **修改所有调用方**，确保传入的都是完整的 checkKey

**调用示例**：
```typescript
// ✅ 正确：传入完整 checkKey
const checkKey = `${tierKey}-${index}-${i}`
isUpgradeChecked(checkKey, index)

// ❌ 错误：传入 tier
isUpgradeChecked(tierKey, index)  // tierKey = "tier1"
```

---

### 3.4 修改 AttributeUpgradeEditor

**新增参数**：
```typescript
interface AttributeUpgradeEditorProps {
  onClose?: () => void
  checkKey: string                    // 完整的 checkKey，如 "tier1-0-2"
  optionIndex: number                 // 选项索引
  toggleUpgradeCheckbox: (checkKey: string, index: number, checked: boolean) => void  // 状态切换函数
}
```

**移除参数**：
```typescript
// 移除这些参数
tier?: string
boxIndex?: number
handleUpgradeCheck?: (tier: string, index: number) => void
```

**handleApply 修改**：
```typescript
const handleApply = () => {
  console.log('[AttributeUpgradeEditor] handleApply called', { checkKey, optionIndex })

  const upgradedAttributes: string[] = []

  // 1. 先构造 afterState（基于 beforeState + 选择的修改）
  const afterState: Record<string, AttributeValue> = {
    agility: { ...beforeState.agility },
    strength: { ...beforeState.strength },
    finesse: { ...beforeState.finesse },
    instinct: { ...beforeState.instinct },
    presence: { ...beforeState.presence },
    knowledge: { ...beforeState.knowledge },
  }

  // 更新 afterState 中被选中的属性
  Object.entries(selected).forEach(([key, isSelected]) => {
    if (isSelected) {
      afterState[key] = {
        ...afterState[key],
        value: editingValues[key as keyof AttributeValues],
        checked: true,
      }

      const attrInfo = ATTRIBUTES.find(a => a.key === key)
      if (attrInfo) upgradedAttributes.push(attrInfo.name)
    }
  })

  // 2. 应用属性修改到 store
  Object.entries(selected).forEach(([key, isSelected]) => {
    if (isSelected) {
      const editedValue = editingValues[key as keyof AttributeValues]
      updateAttribute(key as keyof typeof sheetData, editedValue)
      toggleAttributeChecked(key as keyof typeof sheetData)
    }
  })

  // 3. 保存快照到 store
  saveAttributeUpgradeRecord(checkKey, beforeState, afterState)

  // 4. 勾选复选框（使用新的状态切换函数）
  toggleUpgradeCheckbox(checkKey, optionIndex, true)

  // 5. 显示成功通知
  if (upgradedAttributes.length > 0) {
    showFadeNotification({
      message: `已升级属性：${upgradedAttributes.join('、')}`,
      type: "success"
    })
  }

  // 6. 关闭气泡
  onClose?.()
}
```

**关键变化**：
- 使用 `checkKey` 而非 `tier/optionIndex/boxIndex` 组合
- 调用 `toggleUpgradeCheckbox` 而非 `handleUpgradeCheck`
- 逻辑更清晰，无状态冲突

---

### 3.5 修改 UpgradeSection

**传递新参数给编辑器**：
```typescript
// 在 renderEditor 函数中
if (isAttributeUpgradeOption(option.label)) {
  const checkKey = `${tierKey}-${index}-${boxIndex}`  // 构造完整 checkKey

  return (
    <AttributeUpgradeEditor
      checkKey={checkKey}
      optionIndex={index}
      toggleUpgradeCheckbox={toggleUpgradeCheckbox}
      onClose={() => setOpenPopoverIndex(null)}
    />
  )
}
```

**新增 Props**：
```typescript
interface UpgradeSectionProps {
  // ... 现有 props
  toggleUpgradeCheckbox: (checkKey: string, index: number, checked: boolean) => void  // 新增
}
```

**复选框点击逻辑保持不变**：
```typescript
onClick={() => {
  const isChecked = isUpgradeChecked(checkKey, index)
  if (!isChecked) {
    // 空白复选框 → 打开气泡编辑器
    setClickedBoxIndex(i)
    setOpenPopoverIndex(`${tierKey}-${index}`)
  } else {
    // 高亮复选框 → 交给 handleUpgradeCheck 处理回滚
    handleUpgradeCheck(checkKey, index)
  }
}}
```

---

## 4. 完整的数据流图

### 4.1 属性升级流程（应用修改）

```
用户点击空白复选框
  ↓
upgrade-section.tsx
  └─ onClick 检测到 !isChecked
  └─ 打开 Popover，渲染 AttributeUpgradeEditor
     └─ 传递 checkKey="tier1-0-2", optionIndex=0, toggleUpgradeCheckbox
  ↓
用户在编辑器中选择属性
  ↓
用户点击"应用"
  ↓
AttributeUpgradeEditor.handleApply()
  ├─ 1. 构造 afterState（基于 beforeState + 选择）
  ├─ 2. 应用修改：updateAttribute(), toggleAttributeChecked()
  ├─ 3. 保存快照：saveAttributeUpgradeRecord(checkKey, before, after)
  ├─ 4. 勾选复选框：toggleUpgradeCheckbox(checkKey, optionIndex, true)  ← 调用纯粹的状态函数
  ├─ 5. 显示通知：showFadeNotification()
  └─ 6. 关闭气泡：onClose()
  ↓
toggleUpgradeCheckbox()
  └─ 设置 checkedUpgrades["tier1-0-2"][0] = true
  ↓
✅ 复选框高亮，属性已升级
```

### 4.2 属性升级流程（回滚）

```
用户点击已高亮的复选框
  ↓
upgrade-section.tsx
  └─ onClick 检测到 isChecked
  └─ 调用 handleUpgradeCheck(checkKey="tier1-0-2", index=0)
  ↓
handleUpgradeCheck()
  ├─ 查询状态：currentlyChecked = checkedUpgrades["tier1-0-2"][0]  ← 使用完整 checkKey
  ├─ currentlyChecked = true
  ├─ 检测到是属性升级选项
  ├─ 调用 rollbackAttributeUpgrade(checkKey)
  │   ├─ 检查内存中的记录
  │   ├─ 对比当前状态和记录的 afterState
  │   └─ 如果一致 → 恢复到 beforeState，返回 success
  │       如果不一致 → 返回 conflict
  │       如果无记录 → 返回 no-record
  ├─ 根据结果显示通知
  └─ 调用 toggleUpgradeCheckbox(checkKey, index, false)  ← 取消勾选
  ↓
toggleUpgradeCheckbox()
  └─ 设置 checkedUpgrades["tier1-0-2"][0] = false
  ↓
✅ 复选框取消高亮，属性已恢复（如果成功）
```

### 4.3 其他升级选项流程（生命槽、压力槽等）

```
用户点击复选框
  ↓
upgrade-section.tsx
  └─ onClick 直接调用 handleUpgradeCheck(checkKey, index)
  ↓
handleUpgradeCheck()
  ├─ 查询状态：currentlyChecked = checkedUpgrades[checkKey][index]
  ├─ 计算新状态：newCheckedState = !currentlyChecked
  ├─ 检测选项类型（生命槽/压力槽/熟练度...）
  ├─ 执行相应业务逻辑：
  │   ├─ 生命槽 → updateHPMax(value ± 1)
  │   ├─ 压力槽 → updateStressMax(value ± 1)
  │   └─ 熟练度 → setFormData({ proficiency: [...] })
  ├─ 显示通知
  └─ 调用 toggleUpgradeCheckbox(checkKey, index, newCheckedState)
  ↓
toggleUpgradeCheckbox()
  └─ 设置 checkedUpgrades[checkKey][index] = newCheckedState
  ↓
✅ 复选框状态切换，数据已修改
```

---

## 5. 实施步骤

### Stage 1: 添加 toggleUpgradeCheckbox 函数
**文件**: `components/character-sheet-page-two.tsx`

**任务**:
- [ ] 在 `handleUpgradeCheck` 之前定义 `toggleUpgradeCheckbox` 函数
- [ ] 实现纯粹的状态切换逻辑
- [ ] 不包含任何业务逻辑

**验证**: 函数能正确设置 `checkedUpgrades[checkKey][index]` 的值

---

### Stage 2: 重构 handleUpgradeCheck
**文件**: `components/character-sheet-page-two.tsx`

**任务**:
- [ ] 修改状态查询：使用完整 `checkKeyOrTier` 而非提取的 `tier`
- [ ] 移除最后的直接状态操作代码
- [ ] 在所有业务逻辑后调用 `toggleUpgradeCheckbox`
- [ ] 属性升级回滚逻辑中也调用 `toggleUpgradeCheckbox`

**验证**: 生命槽、压力槽、熟练度等原有功能正常工作

---

### Stage 3: 修改 AttributeUpgradeEditor
**文件**: `components/upgrade-popover/attribute-upgrade-editor.tsx`

**任务**:
- [ ] 修改 Props 接口：
  - 新增 `checkKey: string`
  - 新增 `toggleUpgradeCheckbox: (checkKey, index, checked) => void`
  - 移除 `tier`, `boxIndex`, `handleUpgradeCheck`
- [ ] 修改 `handleApply` 中的步骤4：调用 `toggleUpgradeCheckbox` 而非 `handleUpgradeCheck`
- [ ] 更新所有引用 `tier` 的地方改用 `checkKey`

**验证**: 编辑器应用修改后复选框正确高亮

---

### Stage 4: 修改 UpgradeSection
**文件**: `components/character-sheet-page-two-sections/upgrade-section.tsx`

**任务**:
- [ ] 在 Props 接口中新增 `toggleUpgradeCheckbox` 参数
- [ ] 修改 `renderEditor` 函数：
  - 构造完整的 `checkKey`
  - 传递 `checkKey` 和 `toggleUpgradeCheckbox` 给 `AttributeUpgradeEditor`
  - 移除 `tier`, `boxIndex`, `handleUpgradeCheck` 的传递

**验证**: 编辑器正确接收参数

---

### Stage 5: 修改 CharacterSheetPageTwo 传递参数
**文件**: `components/character-sheet-page-two.tsx`

**任务**:
- [ ] 在渲染 `<UpgradeSection>` 时，传递 `toggleUpgradeCheckbox` prop

**验证**: Props 正确传递到 `UpgradeSection`

---

### Stage 6: 全面测试
**测试场景**:

**基础功能测试**:
- [ ] 点击空白属性升级复选框 → 打开编辑器
- [ ] 选择属性并应用 → 复选框高亮
- [ ] 点击已高亮复选框 → 成功回滚
- [ ] 生命槽 +1/-1 功能正常
- [ ] 压力槽 +1/-1 功能正常
- [ ] 熟练度 +1/-1 功能正常

**边界情况测试**:
- [ ] 刷新页面后回滚 → 提示"记录已丢失"
- [ ] 修改属性后回滚 → 提示"数据已修改"
- [ ] 同一 Tier 多个属性升级复选框独立工作
- [ ] 切换角色后功能正常

---

## 6. CheckKey 格式统一规范

### 6.1 命名规范

**完整 checkKey 格式**（用于多 checkbox 选项）:
```typescript
const checkKey = `${tierKey}-${optionIndex}-${boxIndex}`
// 示例: "tier1-0-2"
```

**简化 checkKey 格式**（用于单 checkbox 选项）:
```typescript
const checkKey = `${tierKey}-${optionIndex}`
// 示例: "tier1-5"
```

### 6.2 使用场景

| 场景 | 使用的 Key | 示例 |
|------|-----------|------|
| 属性升级复选框 | 完整 checkKey | `"tier1-0-2"` |
| 生命槽复选框 | 完整 checkKey | `"tier1-1-0"` |
| 闪避值复选框 | 完整 checkKey | `"tier1-5-0"` |
| 熟练度 doubleBox | 简化 checkKey | `"tier2-1"` |
| 查询状态 | 与创建时相同 | `checkedUpgrades[checkKey][index]` |
| 更新状态 | 与创建时相同 | `checkedUpgrades[checkKey][index] = true` |

### 6.3 代码规范

**✅ 正确示例**:
```typescript
// 构造 checkKey
const checkKey = `${tierKey}-${index}-${i}`

// 查询状态
const isChecked = isUpgradeChecked(checkKey, index)

// 更新状态
toggleUpgradeCheckbox(checkKey, index, true)
```

**❌ 错误示例**:
```typescript
// 不要提取 tier 再查询
const tier = checkKey.match(/^(tier\d+)/)[1]
const isChecked = checkedUpgrades[tier][index]  // 错误！

// 不要混用 tier 和 checkKey
isUpgradeChecked(tierKey, index)  // tierKey = "tier1"，应该传完整 checkKey
```

---

## 7. 优势总结

### 7.1 架构优势

✅ **单一职责原则**: 每个函数只做一件事
- `toggleUpgradeCheckbox`: 只管状态切换
- `handleUpgradeCheck`: 只管业务逻辑
- `AttributeUpgradeEditor`: 只管属性选择和应用

✅ **低耦合**: 编辑器不依赖复杂的业务逻辑函数

✅ **高内聚**: 相关功能集中在合适的层级

### 7.2 维护优势

✅ **易于测试**: 纯函数易于单元测试

✅ **易于调试**: 职责清晰，问题定位快速

✅ **易于扩展**: 未来新增编辑器只需调用 `toggleUpgradeCheckbox`

### 7.3 用户体验优势

✅ **无状态冲突**: 应用修改后复选框立即高亮

✅ **回滚功能稳定**: 不受其他逻辑干扰

✅ **交互一致**: 所有升级选项行为统一

---

## 8. 风险评估

### 8.1 潜在风险

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 重构引入新 Bug | 中 | 全面测试，分阶段实施 |
| 现有功能受影响 | 低 | 保持向后兼容，只修改属性升级部分 |
| CheckKey 格式混乱 | 低 | 统一规范，代码审查 |

### 8.2 回滚计划

如果重构后出现问题，可以快速回滚：
1. 恢复 `handleUpgradeCheck` 为原始版本
2. 恢复 `AttributeUpgradeEditor` 为原始版本
3. 移除 `toggleUpgradeCheckbox` 函数

---

## 9. 未来扩展

### 9.1 持久化回滚记录（可选）

当前 `attributeUpgradeHistory` 存储在内存中，刷新页面后丢失。

**扩展方案**:
```typescript
// 在 saveAttributeUpgradeRecord 中
localStorage.setItem(
  `upgrade-history-${characterId}`,
  JSON.stringify(attributeUpgradeHistory)
)

// 在加载角色时
const history = localStorage.getItem(`upgrade-history-${characterId}`)
if (history) {
  set({ attributeUpgradeHistory: JSON.parse(history) })
}
```

### 9.2 其他编辑器采用相同模式

未来可以将其他需要"应用后自动勾选"的编辑器改造为相同模式：
- 经历值编辑器
- 闪避值编辑器
- 等等

### 9.3 统一的 Undo/Redo 系统

基于回滚系统，可以扩展为通用的 Undo/Redo 功能。

---

## 10. 相关文件清单

### 10.1 需要修改的文件

| 文件 | 修改内容 | 优先级 |
|------|----------|--------|
| `components/character-sheet-page-two.tsx` | 新增 `toggleUpgradeCheckbox`，重构 `handleUpgradeCheck` | P0 |
| `components/upgrade-popover/attribute-upgrade-editor.tsx` | 修改 Props，修改 `handleApply` | P0 |
| `components/character-sheet-page-two-sections/upgrade-section.tsx` | 传递新参数给编辑器 | P0 |

### 10.2 依赖的文件（无需修改）

| 文件 | 用途 |
|------|------|
| `lib/sheet-store.ts` | 提供 `attributeUpgradeHistory` 和相关方法 |
| `lib/sheet-data.ts` | 定义 `CheckedUpgrades` 接口 |
| `data/list/upgrade.ts` | 提供升级选项数据 |

---

## 11. 实施时间表

| 阶段 | 预计时间 | 完成标志 |
|------|----------|----------|
| Stage 1: 添加 toggleUpgradeCheckbox | 15 分钟 | 函数定义并能正确设置状态 |
| Stage 2: 重构 handleUpgradeCheck | 30 分钟 | 现有功能全部正常 |
| Stage 3: 修改 AttributeUpgradeEditor | 20 分钟 | 编辑器能正确应用修改 |
| Stage 4: 修改 UpgradeSection | 15 分钟 | 参数正确传递 |
| Stage 5: 修改 CharacterSheetPageTwo | 10 分钟 | Props 正确传递 |
| Stage 6: 全面测试 | 30 分钟 | 所有测试场景通过 |
| **总计** | **约 2 小时** | 功能完整可用 |

---

## 12. 成功标准

### 12.1 功能性标准

- [ ] 点击空白属性升级复选框打开编辑器
- [ ] 应用修改后复选框立即高亮
- [ ] 点击已高亮复选框成功回滚
- [ ] 生命槽、压力槽、熟练度等原有功能不受影响
- [ ] 冲突检测正确工作（刷新页面、修改属性等场景）

### 12.2 代码质量标准

- [ ] 所有函数职责单一，无副作用（除状态修改）
- [ ] CheckKey 格式统一，无混乱使用
- [ ] 代码可读性高，易于理解
- [ ] 无 TypeScript 类型错误
- [ ] 无 console 警告或错误

### 12.3 用户体验标准

- [ ] 操作流畅，无卡顿
- [ ] 通知信息清晰准确
- [ ] 无意外的状态变化
- [ ] 交互逻辑符合预期

---

**文档结束**
