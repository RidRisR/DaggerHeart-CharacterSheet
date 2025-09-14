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

export function SubclassEditorTab() {
  // 直接从store获取所有数据和方法
  const {
    packageData,
    currentCardIndex,
    setCurrentCardIndex,
    addCard,
    deleteCard,
    updateSubclassTriple,
    deleteSubclassTriple,
    addDefinition,
    setCardListDialog,
    setDefinitionsDialog
  } = useCardEditorStore()

  const cards = (packageData.subclass as SubclassCard[]) || []
  
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
      setCurrentCardIndex(prev => ({
        ...prev,
        subclass: (safeTripleIndex - 1) * 3
      }))
    }
  }
  
  const handleNext = () => {
    if (safeTripleIndex < subclassTriples.length - 1) {
      setCurrentCardIndex(prev => ({
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">子职业编辑</h3>
          <p className="text-sm text-muted-foreground">
            当前: {subclassTriples.length > 0 ? safeTripleIndex + 1 : 0} / {subclassTriples.length} 组
            {currentTriple && !isTripleComplete && (
              <span className="text-yellow-600 ml-2">（不完整）</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCardListDialog({ open: true, type: 'subclass' })}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            查看所有卡牌
          </Button>
          <Button
            variant="outline"
            onClick={() => setDefinitionsDialog(true)}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            查看关键字列表
          </Button>
        </div>
      </div>

      {subclassTriples.length > 0 ? (
        <>
          {/* 卡牌导航 */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={safeTripleIndex === 0}
              >
                上一组
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={safeTripleIndex >= subclassTriples.length - 1}
              >
                下一组
              </Button>

              <div className="h-4 w-px bg-border mx-2"></div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => addCard('subclass')}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                新建
              </Button>
              {currentTriple && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              )}

              <div className="h-4 w-px bg-border mx-2 lg:hidden"></div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobilePreview(!showMobilePreview)}
                className="lg:hidden flex items-center gap-1"
              >
                <Eye className="h-4 w-4" />
                {showMobilePreview ? '隐藏' : '预览'}
              </Button>

            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>快速跳转:</span>
              <select
                value={safeTripleIndex}
                onChange={(e) => setCurrentCardIndex(prev => ({
                  ...prev,
                  subclass: Number(e.target.value) * 3
                }))}
                className="border rounded px-2 py-1"
              >
                {subclassTriples.map((triple, index) => (
                  <option key={index} value={index}>
                    {index + 1}. {triple.子职业 || '未命名'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">还没有子职业卡牌</p>
          <Button onClick={() => addCard('subclass')} className="flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" />
            创建第一个子职业组
          </Button>
        </div>
      )}

      {subclassTriples.length > 0 && currentTriple && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 编辑器区域 */}
          <div className="lg:col-span-8">
            <SubclassTripleCardForm
              card1={currentTriple.card1}
              card2={currentTriple.card2}
              card3={currentTriple.card3}
              cardIndex1={currentTriple.index1}
              cardIndex2={currentTriple.index2}
              cardIndex3={currentTriple.index3}
              keywordLists={packageData.customFieldDefinitions}
              onAddKeyword={handleAddKeyword}
            />
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
      )}
      
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