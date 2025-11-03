'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageCard } from '@/components/ui/image-card'
import { transformCardToStandard } from '../../utils/card-transformer'
import { useCardEditorStore } from '../../store/card-editor-store'
import { FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PreviewTabProps {
  onTabChange: (tab: string) => void
}

export function PreviewTab({ onTabChange }: PreviewTabProps) {
  const { packageData, setCurrentCardIndex } = useCardEditorStore()

  // 折叠状态 - 默认全部展开
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // 切换分组折叠状态
  const toggleGroup = (type: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

  // 按类型组织卡牌数据
  const cardsByType = [
    {
      type: 'profession' as const,
      typeName: '职业',
      cards: (packageData.profession || []).map((card, index) => ({
        standardCard: transformCardToStandard(card, 'profession'),
        index
      }))
    },
    {
      type: 'ancestry' as const,
      typeName: '种族',
      cards: (packageData.ancestry || []).map((card, index) => ({
        standardCard: transformCardToStandard(card, 'ancestry'),
        index
      }))
    },
    {
      type: 'community' as const,
      typeName: '社群',
      cards: (packageData.community || []).map((card, index) => ({
        standardCard: transformCardToStandard(card, 'community'),
        index
      }))
    },
    {
      type: 'subclass' as const,
      typeName: '子职业',
      cards: (packageData.subclass || []).map((card, index) => ({
        standardCard: transformCardToStandard(card, 'subclass'),
        index
      }))
    },
    {
      type: 'domain' as const,
      typeName: '领域',
      cards: (packageData.domain || []).map((card, index) => ({
        standardCard: transformCardToStandard(card, 'domain'),
        index
      }))
    },
    {
      type: 'variant' as const,
      typeName: '变体',
      cards: (packageData.variant || []).map((card, index) => ({
        standardCard: transformCardToStandard(card, 'variant'),
        index
      }))
    }
  ]

  // 计算总卡牌数
  const cardCount = cardsByType.reduce((sum, group) => sum + group.cards.length, 0)

  // 跳转到指定卡片的编辑页面
  const handleJumpToCard = (cardType: string, cardIndex: number) => {
    // cardIndex 是在 packageData[cardType] 数组中的索引
    // 直接使用这个索引即可，编辑器会自动处理分组逻辑

    // 设置当前卡片索引
    setCurrentCardIndex(prev => ({
      ...prev,
      [cardType]: cardIndex
    }))

    // 切换到对应的标签页
    onTabChange(cardType)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>卡包预览</CardTitle>
        <CardDescription>
          预览当前卡包的所有卡牌 (共 {cardCount} 张) · 点击卡牌可跳转到编辑页面
        </CardDescription>
      </CardHeader>
      <CardContent>
        {cardCount === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              当前卡包中还没有任何卡牌
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              请在各个卡牌类型标签页中创建卡牌
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 按类型分组显示 */}
            {cardsByType.map(({ type, typeName, cards }) => {
              if (cards.length === 0) return null
              const isCollapsed = collapsedGroups.has(type)

              return (
                <div key={type} className="space-y-3">
                  {/* 分组标题 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-lg font-semibold"
                      onClick={() => toggleGroup(type)}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                      {typeName}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        ({cards.length} 张)
                      </span>
                    </Button>
                  </div>

                  {/* 卡牌网格 */}
                  {!isCollapsed && (
                    <div className="grid gap-4 justify-items-center grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {cards.map(({ standardCard, index: cardIndex }) => (
                        <ImageCard
                          key={`${type}-${cardIndex}`}
                          card={standardCard}
                          onClick={() => handleJumpToCard(type, cardIndex)}
                          isSelected={false}
                          priority={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
