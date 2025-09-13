'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BookOpen, Home, FileText } from 'lucide-react'
import { ImageCard } from '@/components/ui/image-card'
import { transformCardToStandard } from './utils/card-transformer'
import { navigateToPage } from '@/lib/utils'

// 导入新的组件和store
import { useCardEditorStore } from './store/card-editor-store'
import { Toolbar } from './components/toolbar'
import { DefinitionsManager } from './components/definitions-manager'
import { CardTabs } from './components/card-tabs'
import { CardListDialog } from './components/card-list-dialog'
import { ValidationResults } from './components/validation-results'
import type { CardType } from './types'

export default function CardEditorPage() {
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
    confirmDialog,
    validationResult,
    isValidating,

    // 方法
    updateMetadata,
    addCard,
    copyCard,
    deleteCard,
    exportPackage,
    importPackage,
    newPackage,
    validatePackage,
    clearValidationResult,
    setPreviewDialog,
    setCardListDialog,
    setDefinitionsDialog,
    setConfirmDialog,
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
    navigateToPage('/')
  }


  // 预览卡牌
  const handlePreviewCard = (card: unknown, type: string) => {
    setPreviewDialog({
      open: true,
      card,
      type
    })
  }

  // 跳转到指定卡片
  const handleJumpToCard = (cardType: CardType, cardIndex: number) => {
    // 设置当前卡片索引
    setCurrentCardIndex(prev => ({
      ...prev,
      [cardType]: cardIndex
    }))

    // 切换到对应的标签页
    setSelectedTab(cardType)

    // 关闭验证对话框
    clearValidationResult()
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
              onClick={() => navigateToPage('/card-manager')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              卡包管理
            </Button>
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
          onValidate={validatePackage}
          isValidating={isValidating}
        />
      </div>

      {/* 主编辑区域 */}
      <CardTabs
        selectedTab={selectedTab}
        onSelectedTabChange={setSelectedTab}
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
            <div className="mt-4 flex justify-center">
              <ImageCard
                card={transformCardToStandard(previewDialog.card, previewDialog.type as any)}
                onClick={() => { }}
                isSelected={false}
                showSource={false}
                priority={true}
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

      {/* 验证结果对话框 */}
      <ValidationResults
        validationResult={validationResult}
        open={!!validationResult}
        onClose={clearValidationResult}
        onJumpToCard={handleJumpToCard}
      />

      {/* 确认对话框 */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false })}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDialog.onConfirm}
            >
              确定
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}