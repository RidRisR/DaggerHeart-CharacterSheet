import { Button } from '@/components/ui/button'
import { FileText, Plus, Eye, Trash2, Users } from 'lucide-react'
import { SubclassTripleCardForm } from '@/components/card-editor/subclass-triple-card-form'
import { ImageCard } from '@/components/ui/image-card'
import { transformCardToStandard } from '../../utils/card-transformer'
import { useState, useEffect, useMemo } from 'react'
import { useCardEditorStore } from '../../store/card-editor-store'
import type { CardPackageState, CurrentCardIndex } from '../../types'
import type { StandardCard } from '@/card/card-types'
import type { SubclassCard } from '@/card/subclass-card/convert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface SubclassEditorTabProps {
  currentPackage: CardPackageState
  currentCardIndex: CurrentCardIndex
  onSetCurrentCardIndex: (updater: (prev: CurrentCardIndex) => CurrentCardIndex) => void
  onShowAllCards: (type: string) => void
  onShowKeywords: () => void
  onAddCard: (type: 'subclass') => void
  onDeleteCard: (type: 'subclass', index: number) => void
}

interface SubclassTriple {
  card1: SubclassCard | null  // 基石
  card2: SubclassCard | null  // 专精
  card3: SubclassCard | null  // 大师
  index1: number
  index2: number
  index3: number
  子职业: string
  主职: string
}

export function SubclassEditorTab({
  currentPackage,
  currentCardIndex,
  onSetCurrentCardIndex,
  onShowAllCards,
  onShowKeywords,
  onAddCard,
  onDeleteCard
}: SubclassEditorTabProps) {
  const cards = (currentPackage.subclass as SubclassCard[]) || []
  const { updateSubclassTriple, deleteSubclassTriple, addDefinition } = useCardEditorStore()
  
  // 将子职业卡组织成三卡组
  const subclassTriples = useMemo(() => {
    const triples: SubclassTriple[] = []
    const processedIndices = new Set<number>()
    
    cards.forEach((card, index) => {
      if (processedIndices.has(index)) return
      
      // 找同一子职业的其他等级卡片
      const relatedCards = cards.map((c, i) => ({ card: c, index: i }))
        .filter((item, i) => 
          !processedIndices.has(i) &&
          item.card.子职业 === card.子职业 &&
          item.card.主职 === card.主职
        )
      
      if (relatedCards.length > 0) {
        // 标记所有相关卡片为已处理
        relatedCards.forEach(item => processedIndices.add(item.index))
        
        // 按等级分类
        const 基石Card = relatedCards.find(item => item.card.等级 === '基石')
        const 专精Card = relatedCards.find(item => item.card.等级 === '专精')
        const 大师Card = relatedCards.find(item => item.card.等级 === '大师')
        
        triples.push({
          card1: 基石Card?.card || null,
          card2: 专精Card?.card || null,
          card3: 大师Card?.card || null,
          index1: 基石Card?.index ?? -1,
          index2: 专精Card?.index ?? -1,
          index3: 大师Card?.index ?? -1,
          子职业: card.子职业 || '未命名子职业',
          主职: card.主职 || '未指定主职'
        })
      }
    })
    
    return triples
  }, [cards])
  
  // 当前三卡组索引
  const currentTripleIndex = Math.floor(currentCardIndex.subclass / 3)
  const safeTripleIndex = Math.min(Math.max(0, currentTripleIndex), Math.max(0, subclassTriples.length - 1))
  const currentTriple = subclassTriples[safeTripleIndex]
  
  // 预览状态
  const [previewCard1, setPreviewCard1] = useState<StandardCard | null>(null)
  const [previewCard2, setPreviewCard2] = useState<StandardCard | null>(null)
  const [previewCard3, setPreviewCard3] = useState<StandardCard | null>(null)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [previewDialogCard, setPreviewDialogCard] = useState<{ card: StandardCard, level: string } | null>(null)
  
  // 初始化预览卡牌
  useEffect(() => {
    if (currentTriple?.card1) {
      setPreviewCard1(transformCardToStandard(currentTriple.card1, 'subclass'))
    } else {
      setPreviewCard1(null)
    }
    
    if (currentTriple?.card2) {
      setPreviewCard2(transformCardToStandard(currentTriple.card2, 'subclass'))
    } else {
      setPreviewCard2(null)
    }
    
    if (currentTriple?.card3) {
      setPreviewCard3(transformCardToStandard(currentTriple.card3, 'subclass'))
    } else {
      setPreviewCard3(null)
    }
  }, [currentTriple])
  
  const handleAddKeyword = (category: string, keyword: string) => {
    const categoryKey = category as keyof NonNullable<CardPackageState['customFieldDefinitions']>
    addDefinition(categoryKey, keyword)
  }
  
  const handleFormChange = (card1: SubclassCard, card2: SubclassCard, card3: SubclassCard) => {
    setPreviewCard1(transformCardToStandard(card1, 'subclass'))
    setPreviewCard2(transformCardToStandard(card2, 'subclass'))
    setPreviewCard3(transformCardToStandard(card3, 'subclass'))
  }
  
  const handleSave = (card1: SubclassCard, card2: SubclassCard, card3: SubclassCard) => {
    if (currentTriple) {
      // 确定实际的索引
      let index1 = currentTriple.index1
      let index2 = currentTriple.index2
      let index3 = currentTriple.index3
      
      // 如果是新建或不完整的三卡组，需要添加缺失的卡片
      if (index1 === -1) index1 = cards.length
      if (index2 === -1) index2 = index1 === cards.length ? cards.length + 1 : cards.length
      if (index3 === -1) {
        if (index1 === cards.length) {
          index3 = index2 === cards.length + 1 ? cards.length + 2 : cards.length + 1
        } else {
          index3 = index2 === cards.length ? cards.length + 1 : cards.length
        }
      }
      
      updateSubclassTriple(index1, card1, index2, card2, index3, card3)
    }
  }
  
  const handlePreview = (card: SubclassCard, level: '基石' | '专精' | '大师') => {
    const standardCard = transformCardToStandard(card, 'subclass')
    setPreviewDialogCard({ card: standardCard, level })
  }
  
  const handlePrevious = () => {
    if (safeTripleIndex > 0) {
      onSetCurrentCardIndex(prev => ({
        ...prev,
        subclass: (safeTripleIndex - 1) * 3
      }))
    }
  }
  
  const handleNext = () => {
    if (safeTripleIndex < subclassTriples.length - 1) {
      onSetCurrentCardIndex(prev => ({
        ...prev,
        subclass: (safeTripleIndex + 1) * 3
      }))
    }
  }
  
  const handleDelete = () => {
    if (currentTriple && currentTriple.index1 !== -1) {
      deleteSubclassTriple(currentTriple.index1)
    }
  }
  
  // 检查三卡组是否完整
  const isTripleComplete = currentTriple && 
    currentTriple.card1 !== null && 
    currentTriple.card2 !== null && 
    currentTriple.card3 !== null

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={safeTripleIndex === 0}
          >
            上一组
          </Button>
          <span className="text-sm text-muted-foreground">
            子职业组 {subclassTriples.length > 0 ? safeTripleIndex + 1 : 0} / {subclassTriples.length}
            {currentTriple && !isTripleComplete && (
              <span className="text-yellow-600 ml-2">（不完整）</span>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={safeTripleIndex >= subclassTriples.length - 1}
          >
            下一组
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowAllCards('subclass')}
            className="flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            查看所有
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddCard('subclass')}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            新建子职业组
          </Button>
          {currentTriple && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="flex items-center gap-1 text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              删除子职业组
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
          {currentTriple ? (
            <SubclassTripleCardForm
              card1={currentTriple.card1}
              card2={currentTriple.card2}
              card3={currentTriple.card3}
              cardIndex1={currentTriple.index1}
              cardIndex2={currentTriple.index2}
              cardIndex3={currentTriple.index3}
              keywordLists={currentPackage.customFieldDefinitions}
              onAddKeyword={handleAddKeyword}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">暂无子职业组</p>
              <p className="text-sm text-muted-foreground mb-4">子职业需要三张卡片（基石、专精、大师）</p>
              <Button onClick={() => onAddCard('subclass')}>
                <Plus className="h-4 w-4 mr-2" />
                创建第一个子职业组
              </Button>
            </div>
          )}
        </div>
        
        {/* 预览区域 - 桌面端 */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">实时预览</h3>
          <div className="space-y-4">
            {/* 基石卡预览 */}
            {previewCard1 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">基石等级</p>
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
                基石等级预览
              </div>
            )}
            
            {/* 专精卡预览 */}
            {previewCard2 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">专精等级</p>
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
                专精等级预览
              </div>
            )}
            
            {/* 大师卡预览 */}
            {previewCard3 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">大师等级</p>
                <ImageCard
                  card={previewCard3}
                  onClick={() => {}}
                  isSelected={false}
                  showSource={false}
                  priority={true}
                />
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                大师等级预览
              </div>
            )}
          </div>
        </div>
        
        {/* 预览区域 - 移动端 */}
        {showMobilePreview && (
          <div className="lg:hidden col-span-1 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">实时预览</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {previewCard1 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">基石</p>
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
                  基石预览
                </div>
              )}
              
              {previewCard2 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">专精</p>
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
                  专精预览
                </div>
              )}
              
              {previewCard3 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">大师</p>
                  <ImageCard
                    card={previewCard3}
                    onClick={() => {}}
                    isSelected={false}
                    showSource={false}
                    priority={true}
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  大师预览
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
            <DialogTitle>卡牌预览 - {previewDialogCard?.level}等级</DialogTitle>
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