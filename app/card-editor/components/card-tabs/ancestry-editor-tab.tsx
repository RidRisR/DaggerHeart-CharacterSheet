import { Button } from '@/components/ui/button'
import { FileText, Plus, Eye, Trash2, Copy, Users } from 'lucide-react'
import { AncestryDualCardForm } from '@/components/card-editor/ancestry-dual-card-form'
import { ImageCard } from '@/components/ui/image-card'
import { transformCardToStandard } from '../../utils/card-transformer'
import { useState, useEffect, useMemo } from 'react'
import { useCardEditorStore } from '../../store/card-editor-store'
import type { CardPackageState, CurrentCardIndex } from '../../types'
import type { StandardCard, AncestryCard } from '@/card/card-types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AncestryPair {
  card1: AncestryCard | null
  card2: AncestryCard | null
  index1: number
  index2: number
  种族: string
}

export function AncestryEditorTab() {
  // 直接从store获取所有数据和方法
  const {
    packageData,
    currentCardIndex,
    setCurrentCardIndex,
    addCard,
    deleteCard,
    updateAncestryPair,
    deleteAncestryPair,
    addDefinition,
    setCardListDialog,
    setDefinitionsDialog
  } = useCardEditorStore()

  const cards = (packageData.ancestry as AncestryCard[]) || []
  
  // 将种族卡组织成配对
  const ancestryPairs = useMemo(() => {
    const pairs: AncestryPair[] = []
    const processedIndices = new Set<number>()
    
    cards.forEach((card, index) => {
      if (processedIndices.has(index)) return
      
      // 找配对的卡片
      const pairedIndex = cards.findIndex((c, i) => 
        i !== index && 
        !processedIndices.has(i) &&
        c.种族 === card.种族 && 
        c.简介 === card.简介 &&
        c.类别 !== card.类别
      )
      
      if (pairedIndex !== -1) {
        // 找到配对
        processedIndices.add(index)
        processedIndices.add(pairedIndex)
        
        const card1 = card.类别 === 1 ? card : cards[pairedIndex]
        const card2 = card.类别 === 2 ? card : cards[pairedIndex]
        const index1 = card.类别 === 1 ? index : pairedIndex
        const index2 = card.类别 === 2 ? index : pairedIndex
        
        pairs.push({
          card1,
          card2,
          index1,
          index2,
          种族: card.种族 || '未命名种族'
        })
      } else {
        // 未找到配对，创建不完整配对
        processedIndices.add(index)
        pairs.push({
          card1: card.类别 === 1 ? card : null,
          card2: card.类别 === 2 ? card : null,
          index1: card.类别 === 1 ? index : -1,
          index2: card.类别 === 2 ? index : -1,
          种族: card.种族 || '未命名种族'
        })
      }
    })
    
    return pairs
  }, [cards])
  
  // 当前配对索引（基于配对数组）
  const currentPairIndex = Math.floor(currentCardIndex.ancestry / 2)
  const safePairIndex = Math.min(Math.max(0, currentPairIndex), Math.max(0, ancestryPairs.length - 1))
  const currentPair = ancestryPairs[safePairIndex]
  
  // 预览状态
  const [previewCard1, setPreviewCard1] = useState<StandardCard | null>(null)
  const [previewCard2, setPreviewCard2] = useState<StandardCard | null>(null)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [previewDialogCard, setPreviewDialogCard] = useState<{ card: StandardCard, category: 1 | 2 } | null>(null)
  
  // 初始化预览卡牌
  useEffect(() => {
    if (currentPair?.card1) {
      setPreviewCard1(transformCardToStandard(currentPair.card1, 'ancestry'))
    } else {
      setPreviewCard1(null)
    }
    
    if (currentPair?.card2) {
      setPreviewCard2(transformCardToStandard(currentPair.card2, 'ancestry'))
    } else {
      setPreviewCard2(null)
    }
  }, [currentPair])
  
  const handleAddKeyword = (category: string, keyword: string) => {
    const categoryKey = category as keyof NonNullable<CardPackageState['customFieldDefinitions']>
    addDefinition(categoryKey, keyword)
  }
  
  const handleFormChange = (card1: AncestryCard, card2: AncestryCard) => {
    setPreviewCard1(transformCardToStandard(card1, 'ancestry'))
    setPreviewCard2(transformCardToStandard(card2, 'ancestry'))
  }
  
  const handleSave = (card1: AncestryCard, card2: AncestryCard) => {
    if (currentPair) {
      // 确定实际的索引
      let index1 = currentPair.index1
      let index2 = currentPair.index2
      
      // 如果是新建或不完整的配对，需要添加缺失的卡片
      if (index1 === -1) {
        // 添加类别1卡片
        index1 = cards.length
      }
      if (index2 === -1) {
        // 添加类别2卡片
        index2 = index1 === cards.length ? cards.length + 1 : cards.length
      }
      
      updateAncestryPair(index1, card1, index2, card2)
    }
  }
  
  const handlePreview = (card: AncestryCard, category: 1 | 2) => {
    const standardCard = transformCardToStandard(card, 'ancestry')
    setPreviewDialogCard({ card: standardCard, category })
  }
  
  const handlePrevious = () => {
    if (safePairIndex > 0) {
      setCurrentCardIndex(prev => ({
        ...prev,
        ancestry: (safePairIndex - 1) * 2
      }))
    }
  }
  
  const handleNext = () => {
    if (safePairIndex < ancestryPairs.length - 1) {
      setCurrentCardIndex(prev => ({
        ...prev,
        ancestry: (safePairIndex + 1) * 2
      }))
    }
  }
  
  const handleDelete = () => {
    if (currentPair && currentPair.index1 !== -1) {
      deleteAncestryPair(currentPair.index1)
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={safePairIndex === 0}
          >
            上一对
          </Button>
          <span className="text-sm text-muted-foreground">
            配对 {ancestryPairs.length > 0 ? safePairIndex + 1 : 0} / {ancestryPairs.length}
            {currentPair && (!currentPair.card1 || !currentPair.card2) && (
              <span className="text-yellow-600 ml-2">（不完整）</span>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={safePairIndex >= ancestryPairs.length - 1}
          >
            下一对
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCardListDialog({ open: true, type: 'ancestry' })}
            className="flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            查看所有
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addCard('ancestry')}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            新建配对
          </Button>
          {currentPair && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="flex items-center gap-1 text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              删除配对
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="sm:hidden flex items-center gap-1"
          >
            <Eye className="h-4 w-4" />
            {showMobilePreview ? '隐藏' : '预览'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 编辑器区域 */}
        <div className="lg:col-span-8">
          {currentPair ? (
            <AncestryDualCardForm
              card1={currentPair.card1}
              card2={currentPair.card2}
              cardIndex1={currentPair.index1}
              cardIndex2={currentPair.index2}
              keywordLists={packageData.customFieldDefinitions}
              onAddKeyword={handleAddKeyword}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">暂无种族卡配对</p>
                <p className="text-sm text-muted-foreground mb-4">种族卡需要成对创建，每对包含类别1和类别2两张卡片</p>
              <Button onClick={() => addCard('ancestry')}>
                <Plus className="h-4 w-4 mr-2" />
                  创建第一对种族卡
              </Button>
            </div>
          )}
        </div>
        
        {/* 预览区域 - 桌面端 */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">实时预览</h3>
          <div className="space-y-4">
            {previewCard1 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">类别一</p>
                <ImageCard
                  card={previewCard1}
                  onClick={() => {}}
                  isSelected={false}
                  showSource={false}
                  priority={true}
                />
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                类别一预览
              </div>
            )}
            
            {previewCard2 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">类别二</p>
                <ImageCard
                  card={previewCard2}
                  onClick={() => {}}
                  isSelected={false}
                  showSource={false}
                  priority={true}
                />
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                类别二预览
              </div>
            )}
          </div>
        </div>
        
        {/* 预览区域 - 移动端 */}
        {showMobilePreview && (
          <div className="lg:hidden col-span-1 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">实时预览</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {previewCard1 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">类别一</p>
                  <ImageCard
                    card={previewCard1}
                    onClick={() => {}}
                    isSelected={false}
                    showSource={false}
                    priority={true}
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  类别一预览
                </div>
              )}
              
              {previewCard2 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">类别二</p>
                  <ImageCard
                    card={previewCard2}
                    onClick={() => {}}
                    isSelected={false}
                    showSource={false}
                    priority={true}
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  类别二预览
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 预览对话框 */}
      <Dialog open={!!previewDialogCard} onOpenChange={() => setPreviewDialogCard(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>卡牌预览 - 类别{previewDialogCard?.category}</DialogTitle>
          </DialogHeader>
          {previewDialogCard && (
            <div className="flex justify-center mt-4">
              <ImageCard
                card={previewDialogCard.card}
                onClick={() => {}}
                isSelected={false}
                showSource={false}
                priority={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}