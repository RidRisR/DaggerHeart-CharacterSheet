# 子职业卡牌系统修改文档

## 概述

本文档详细记录了在Daggerheart角色卡系统中添加子职业卡牌类型的过程和相关逻辑修改。子职业卡牌是角色进阶系统的重要组成部分，允许玩家为其角色选择专精方向。

## 系统架构

在卡牌系统中，卡牌位置分为两类：
1. **特殊卡位**：固定位置，只能放置特定类型的卡牌（如职业卡、血统卡、社区卡）
2. **普通卡位**：可以放置任何类型的卡牌

子职业卡牌在系统中的定位是普通卡位，但通常放置在第二行第一个位置（索引4）。

## 核心逻辑修改

### 1. 卡牌类型定义

在 `lib/card-types.ts` 中，我们确保了特殊卡位的定义仅包含前四个位置：

\`\`\`typescript
// 特殊卡位定义
export const specialCardPositions = {
  0: { name: "职业卡", type: "profession" },
  1: { name: "血统卡 1", type: "ancestry" },
  2: { name: "血统卡 2", type: "ancestry" },
  3: { name: "社区卡", type: "community" },
}

// 特殊卡位判断函数
export function isSpecialCardPosition(index: number): boolean {
  return index >= 0 && index <= 3
}
\`\`\`

这确保了第5个位置（索引4）不被视为特殊卡位，因此可以放置任何类型的卡牌。

### 2. 卡牌选择逻辑

在 `components/modals/card-selection-modal.tsx` 中，我们修改了卡牌类型过滤逻辑：

\`\`\`typescript
// 根据卡牌位置确定可用的卡牌类型
const allowedCardType = getAllowedCardTypeForPosition(selectedCardIndex)
const isSpecialPos = isSpecialCardPosition(selectedCardIndex)

// 无论是什么位置，都显示所有卡牌类型，除非是特殊位置
const availableCardTypes = isSpecialPos
  ? ALL_CARD_TYPES.filter((type) => type.id === allowedCardType)
  : ALL_CARD_TYPES
\`\`\`

这确保了非特殊卡位（包括索引4）可以显示并选择所有类型的卡牌。

### 3. 卡牌点击处理

在 `components/character-sheet-page-two-sections/card-deck-section.tsx` 中，我们保留了对特殊卡位的保护：

\`\`\`typescript
// 处理卡牌点击事件
const handleCardClick = (index: number) => {
  // 特殊卡位不允许修改
  if (isSpecialSlot(index)) return

  // 对于普通卡牌，打开卡牌选择模态框
  setSelectedCardIndex(index)
  setCardSelectionModalOpen(true)
}
\`\`\`

这确保了特殊卡位的卡牌不能被随意更改，而普通卡位（包括子职业卡位置）可以自由选择卡牌。

## 卡牌类型转换与验证

在卡牌数据处理过程中，我们确保了卡牌类型的正确转换和验证：

\`\`\`typescript
// 过滤卡牌
useEffect(() => {
  if (!activeTab) return

  try {
    // 按类型过滤
    let filtered = ALL_STANDARD_CARDS.filter((card) => {
      // 确保卡牌有type字段
      if (!card.type) {
        card.type = "unknown"
      }

      // 如果是特殊位置，只显示允许的卡牌类型
      if (isSpecialPos) {
        return card.type.replace(/卡$/, "") === allowedCardType
      }

      // 否则按当前选中的标签过滤
      return card.type.replace(/卡$/, "") === activeTab
    })
    
    // ... 其他过滤逻辑
  } catch (error) {
    console.error("Error filtering cards:", error)
    setFilteredCards([])
  }
}, [activeTab, searchTerm, classFilter, levelFilter, isSpecialPos, allowedCardType])
\`\`\`

这确保了卡牌类型的一致性和正确性。

## 卡牌选择与保存

当用户选择一张卡牌时，我们确保正确设置其类型：

\`\`\`typescript
// 处理卡牌选择
const handleSelectCard = (card: StandardCard) => {
  try {
    // 确保卡牌有type字段
    if (!card.type) {
      card.type = isSpecialPos ? allowedCardType : activeTab
    }

    onSelect(card)
    onClose()
  } catch (error) {
    console.error("Error selecting card:", error)
  }
}
\`\`\`

这确保了即使卡牌数据中缺少类型信息，我们也能根据当前上下文正确设置其类型。

## 总结

通过以上修改，我们成功实现了子职业卡牌系统的逻辑，确保：

1. 第二行第一个位置（索引4）可以选择任何类型的卡牌，不再限制为特定类型
2. 特殊卡位（索引0-3）仍然保持其特殊性，只能放置指定类型的卡牌
3. 卡牌类型在选择、过滤和保存过程中得到正确处理

这些修改使得卡牌系统更加灵活，能够支持更丰富的角色构建选择。
