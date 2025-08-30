'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BookOpen, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CardPreview } from '@/components/card-editor/card-preview'

// 导入新的组件和store
import { useCardEditorStore } from './store/card-editor-store'
import { Toolbar } from './components/toolbar'
import { DefinitionsManager } from './components/definitions-manager'
import { CardTabs } from './components/card-tabs'
import { CardListDialog } from './components/card-list-dialog'
import type { CardType } from './types'

export default function CardEditorPage() {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState('metadata')
  const [isClient, setIsClient] = useState(false)

  // 使用新的Zustand store管理所有状态和逻辑
  const {
    // 状态
    packageData,
    currentCardIndex,
    previewDialog,
    cardListDialog,
    definitionsDialog,
    
    // 方法
    updateMetadata,
    addCard,
    deleteCard,
    updateCard,
    exportPackage,
    importPackage,
    newPackage,
    setPreviewDialog,
    setCardListDialog,
    setDefinitionsDialog,
    setCurrentCardIndex,
    addDefinition,
    removeDefinition
  } = useCardEditorStore()

  // 客户端初始化
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 返回主站
  const goBackToMain = () => {
    router.push('/')
  }

  // 显示卡牌列表
  const handleShowAllCards = (type: string) => {
    setCardListDialog({ open: true, type })
  }

  // 预览卡牌
  const handlePreviewCard = (card: unknown, type: string) => {
    setPreviewDialog({
      open: true,
      card,
      type
    })
  }

  if (!isClient) {
    return <div>加载中...</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              卡包编辑器
            </h1>
            <p className="text-muted-foreground">
              可视化编辑DaggerHeart卡包，支持富文本编辑和实时预览
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goBackToMain}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              返回主站
            </Button>
          </div>
        </div>

        {/* 工具栏 */}
        <Toolbar
          currentPackage={packageData}
          onNew={newPackage}
          onImport={importPackage}
          onExport={exportPackage}
          onShowKeywords={() => setDefinitionsDialog(true)}
        />
      </div>

      {/* 主编辑区域 */}
      <CardTabs
        selectedTab={selectedTab}
        onSelectedTabChange={setSelectedTab}
        currentPackage={packageData}
        currentCardIndex={currentCardIndex}
        onSetCurrentCardIndex={setCurrentCardIndex}
        onShowAllCards={handleShowAllCards}
        onShowKeywords={() => setDefinitionsDialog(true)}
        onAddCard={addCard}
        onPreviewCard={handlePreviewCard}
        onDeleteCard={deleteCard}
        onUpdateCard={updateCard}
        onUpdateMetadata={updateMetadata}
      />

      {/* 卡牌预览对话框 */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>卡牌预览</DialogTitle>
            <DialogDescription>
              预览卡牌在游戏中的显示效果
            </DialogDescription>
          </DialogHeader>
          {previewDialog.card && previewDialog.type ? (
            <div className="mt-4">
              <CardPreview 
                card={previewDialog.card} 
                cardType={previewDialog.type}
                className="w-full"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 卡牌列表对话框 */}
      <CardListDialog
        dialog={cardListDialog}
        onDialogChange={setCardListDialog}
        currentPackage={packageData}
        currentCardIndex={currentCardIndex}
        onSetCurrentCardIndex={setCurrentCardIndex}
        onSetSelectedTab={setSelectedTab}
        onPreviewCard={handlePreviewCard}
        onDeleteCard={(type, index) => deleteCard(type as CardType, index)}
      />

      {/* 预定义字段管理对话框 */}
      <DefinitionsManager
        open={definitionsDialog}
        onOpenChange={setDefinitionsDialog}
        packageData={packageData}
        onAddDefinition={addDefinition}
        onRemoveDefinition={removeDefinition}
      />
    </div>
  )
}