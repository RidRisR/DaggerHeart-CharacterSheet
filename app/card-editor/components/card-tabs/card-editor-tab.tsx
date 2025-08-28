import { Button } from '@/components/ui/button'
import { FileText, Plus, Eye, Trash2 } from 'lucide-react'
import { ProfessionCardForm, AncestryCardForm, VariantCardForm } from '@/components/card-editor/card-form'
import type { CardPackageState, CurrentCardIndex, CardType } from '../../types'

interface CardEditorTabProps {
  cardType: CardType
  title: string
  currentPackage: CardPackageState
  currentCardIndex: CurrentCardIndex
  onSetCurrentCardIndex: (updater: (prev: CurrentCardIndex) => CurrentCardIndex) => void
  onShowAllCards: (type: string) => void
  onShowKeywords: () => void
  onAddCard: (type: CardType) => void
  onPreviewCard: (card: unknown, type: string) => void
  onDeleteCard: (type: CardType, index: number) => void
  onUpdateCard: (type: CardType, index: number, card: unknown) => void
  onUpdatePackage: (updater: (prev: CardPackageState) => CardPackageState) => void
}

export function CardEditorTab({
  cardType,
  title,
  currentPackage,
  currentCardIndex,
  onSetCurrentCardIndex,
  onShowAllCards,
  onShowKeywords,
  onAddCard,
  onPreviewCard,
  onDeleteCard,
  onUpdateCard,
  onUpdatePackage
}: CardEditorTabProps) {
  const cards = currentPackage[cardType] as any[] || []
  const currentIndex = currentCardIndex[cardType]
  // 确保索引在有效范围内
  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, cards.length - 1))
  const currentCard = cards.length > 0 ? cards[safeIndex] : null

  const getActionText = () => {
    switch (cardType) {
      case 'profession': return '职业'
      case 'ancestry': return '血统'  
      case 'variant': return '变体'
      default: return cardType
    }
  }

  const handleAddKeyword = (category: string, keyword: string) => {
    onUpdatePackage(prev => {
      const newDefs = { ...prev.customFieldDefinitions }
      const currentArray = newDefs[category as keyof typeof newDefs] as string[] || []
      if (!currentArray.includes(keyword)) {
        newDefs[category as keyof typeof newDefs] = [...currentArray, keyword] as any
      }
      return {
        ...prev,
        customFieldDefinitions: newDefs,
        isModified: true
      }
    })
  }

  const getCardForm = () => {
    if (!currentCard) return null

    const commonProps = {
      card: currentCard,
      onSave: (updatedCard: unknown) => onUpdateCard(cardType, safeIndex, updatedCard),
      onPreview: (previewCard: unknown) => onPreviewCard(previewCard, cardType),
      keywordLists: currentPackage.customFieldDefinitions,
      onAddKeyword: handleAddKeyword
    }

    switch (cardType) {
      case 'profession':
        return <ProfessionCardForm {...commonProps} />
      case 'ancestry':
        return <AncestryCardForm {...commonProps} />
      case 'variant':
        return <VariantCardForm {...commonProps} />
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
            onClick={() => onShowAllCards(cardType)}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            查看所有卡牌
          </Button>
          <Button 
            variant="outline" 
            onClick={onShowKeywords}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            查看关键字列表
          </Button>
          <Button onClick={() => onAddCard(cardType)} className="flex items-center gap-2">
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
                onClick={() => onSetCurrentCardIndex(prev => ({
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
                onClick={() => onSetCurrentCardIndex(prev => ({
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
                onChange={(e) => onSetCurrentCardIndex(prev => ({
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
          
          {/* 当前卡牌编辑 */}
          {currentCard && (
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="font-medium text-lg">
                    {currentCard.名称 || '未命名'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {cardType === 'profession' && `ID: ${currentCard.id}`}
                    {cardType === 'ancestry' && `种族: ${currentCard.种族} | 类别: ${currentCard.类别}`}
                    {cardType === 'variant' && `类型: ${currentCard.类型}${currentCard.子类别 ? ` | 子类别: ${currentCard.子类别}` : ''}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPreviewCard(currentCard, cardType)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    预览
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onDeleteCard(cardType, safeIndex)
                      onSetCurrentCardIndex(prev => ({
                        ...prev,
                        [cardType]: Math.max(0, prev[cardType] - 1)
                      }))
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                  </Button>
                </div>
              </div>
              {getCardForm()}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            还没有{getActionText()}卡牌
          </p>
          <Button onClick={() => onAddCard(cardType)} variant="outline">
            创建第一张{getActionText()}卡牌
          </Button>
        </div>
      )}
    </div>
  )
}