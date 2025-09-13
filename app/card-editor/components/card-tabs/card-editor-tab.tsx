import { Button } from '@/components/ui/button'
import { FileText, Plus, Eye, Trash2, Copy } from 'lucide-react'
import { ProfessionCardForm, CommunityCardForm, VariantCardForm, DomainCardForm } from '@/components/card-editor/card-form'
import { ImageCard } from '@/components/ui/image-card'
import { transformCardToStandard } from '../../utils/card-transformer'
import { useState, useEffect } from 'react'
import { useCardEditorStore } from '../../store/card-editor-store'
import type { CardType } from '../../types'
import type { StandardCard } from '@/card/card-types'

interface CardEditorTabProps {
  cardType: CardType
  title: string
}

export function CardEditorTab({
  cardType,
  title
}: CardEditorTabProps) {
  // 直接从store获取所有数据和方法
  const {
    packageData,
    currentCardIndex,
    setCurrentCardIndex,
    addCard,
    copyCard,
    deleteCard,
    addDefinition,
    setCardListDialog,
    setDefinitionsDialog
  } = useCardEditorStore()

  const cards = packageData[cardType] as any[] || []
  const currentIndex = currentCardIndex[cardType]
  // 确保索引在有效范围内
  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, cards.length - 1))
  const currentCard = cards.length > 0 ? cards[safeIndex] : null

  // 实时预览卡牌状态
  const [previewCard, setPreviewCard] = useState<StandardCard | null>(null)
  // 移动端预览开关
  const [showMobilePreview, setShowMobilePreview] = useState(false)

  // 初始化预览卡牌
  useEffect(() => {
    if (currentCard) {
      const standardCard = transformCardToStandard(currentCard, cardType)
      setPreviewCard(standardCard)
    } else {
      setPreviewCard(null)
    }
  }, [currentCard, cardType])

  const getActionText = () => {
    switch (cardType) {
      case 'profession': return '职业'
      case 'ancestry': return '种族'
      case 'community': return '社群'
      case 'variant': return '变体'
      case 'subclass': return '子职业'
      case 'domain': return '领域'
      default: return cardType
    }
  }

  const handleAddKeyword = (category: string, keyword: string) => {
    // 使用 store 的 addDefinition 方法
    const categoryKey = category as keyof NonNullable<typeof packageData.customFieldDefinitions>
    addDefinition(categoryKey, keyword)
  }

  const handleShowAllCards = () => {
    setCardListDialog({
      open: true,
      type: cardType
    })
  }

  const handleShowKeywords = () => {
    setDefinitionsDialog(true)
  }

  const handleSetCurrentCardIndex = (updater: (prev: typeof currentCardIndex) => typeof currentCardIndex) => {
    setCurrentCardIndex(updater)
  }

  const getCardForm = () => {
    if (!currentCard) return null

    const commonProps = {
      card: currentCard,
      cardIndex: safeIndex,
      cardType: cardType,
      keywordLists: packageData.customFieldDefinitions,
      onAddKeyword: handleAddKeyword
    }

    switch (cardType) {
      case 'profession':
        return <ProfessionCardForm {...commonProps} />
      case 'community':
        return <CommunityCardForm {...commonProps} />
      case 'variant':
        return <VariantCardForm {...commonProps} />
      case 'domain':
        return <DomainCardForm {...commonProps} />
      default:
        return <div>该卡牌类型的编辑功能正在开发中...</div>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{title}编辑</h3>
          <p className="text-sm text-muted-foreground">
            当前: {safeIndex + 1} / {cards.length} 张
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleShowAllCards}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            查看所有卡牌
          </Button>
          <Button
            variant="outline"
            onClick={handleShowKeywords}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            查看关键字列表
          </Button>
          <Button onClick={() => addCard(cardType)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            添加新{getActionText()}
          </Button>
        </div>
      </div>

      {cards.length > 0 ? (
        <>
          {/* 卡牌导航 */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetCurrentCardIndex(prev => ({
                  ...prev,
                  [cardType]: Math.max(0, prev[cardType] - 1)
                }))}
                disabled={safeIndex === 0}
              >
                上一张
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetCurrentCardIndex(prev => ({
                  ...prev,
                  [cardType]: Math.min(cards.length - 1, prev[cardType] + 1)
                }))}
                disabled={safeIndex >= cards.length - 1}
              >
                下一张
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>快速跳转:</span>
              <select
                value={currentIndex}
                onChange={(e) => handleSetCurrentCardIndex(prev => ({
                  ...prev,
                  [cardType]: Number(e.target.value)
                }))}
                className="border rounded px-2 py-1"
              >
                {cards.map((card, index) => (
                  <option key={index} value={index}>
                    {index + 1}. {card.名称 || '未命名'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 当前卡牌编辑 - 左右两栏布局 */}
          {currentCard && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-4">
              {/* 左侧：编辑表单 */}
              <div className="border rounded-lg p-4 relative">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setShowMobilePreview(!showMobilePreview)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {showMobilePreview ? '隐藏' : '显示'}预览
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyCard(cardType, safeIndex)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      deleteCard(cardType, safeIndex)
                      handleSetCurrentCardIndex(prev => ({
                        ...prev,
                        [cardType]: Math.max(0, prev[cardType] - 1)
                      }))
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                  </Button>
                </div>
                {getCardForm()}

                {/* 移动端预览区域 */}
                {showMobilePreview && (
                  <div className="mt-4 lg:hidden">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">实时预览</h4>
                    {previewCard && (
                      <div className="flex justify-center">
                        <ImageCard
                          card={previewCard}
                          onClick={() => {}}
                          isSelected={false}
                          showSource={false}
                          priority={true}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 右侧：实时预览（桌面端） */}
              <div className="hidden lg:block">
                <div className="sticky top-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">实时预览</h4>
                  {previewCard && (
                    <ImageCard
                      card={previewCard}
                      onClick={() => {}}
                      isSelected={false}
                      showSource={false}
                      priority={true}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            还没有{getActionText()}卡牌
          </p>
          <Button onClick={() => addCard(cardType)} variant="outline">
            创建第一张{getActionText()}卡牌
          </Button>
        </div>
      )}
    </div>
  )
}