'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BookOpen, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Form } from '@/components/ui/form'
import { CardPreview } from '@/components/card-editor/card-preview'

// 导入新的组件和hooks
import { useCardPackage } from './hooks/use-card-package'
import { Toolbar } from './components/toolbar'
import { DefinitionsManager } from './components/definitions-manager'
import { CardTabs } from './components/card-tabs'
import { CardListDialog } from './components/card-list-dialog'
import type { CardType } from './types'

export default function CardEditorPage() {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState('metadata')
  const [isClient, setIsClient] = useState(false)

  // 使用新的hook管理所有状态和逻辑
  const {
    // 状态
    currentPackage,
    setCurrentPackage,
    currentCardIndex,
    setCurrentCardIndex,
    previewDialog,
    setPreviewDialog,
    cardListDialog,
    setCardListDialog,
    definitionsDialog,
    setDefinitionsDialog,
    form,
    
    // 方法
    handleExport,
    handleImport,
    handleNew,
    handleFormChange,
    handlePreviewCard,
    handleAddCard,
    handleDeleteCard,
    handleUpdateCard
  } = useCardPackage()

  // 客户端初始化
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 返回主站
  const goBackToMain = () => {
    if (currentPackage.isModified) {
      const confirmed = confirm('您有未保存的更改，确定要离开吗？')
      if (!confirmed) return
    }
    router.push('/')
  }

  // 显示卡牌列表
  const handleShowAllCards = (type: string) => {
    setCardListDialog({ open: true, type })
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
              {currentPackage.isModified && (
                <Badge variant="secondary" className="ml-2">未保存</Badge>
              )}
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
          currentPackage={currentPackage}
          onNew={handleNew}
          onImport={handleImport}
          onExport={handleExport}
          onShowKeywords={() => setDefinitionsDialog(true)}
        />
      </div>

      {/* 主编辑区域 */}
      <Form {...form}>
        <form onChange={handleFormChange} onSubmit={(e) => e.preventDefault()}>
          <CardTabs
            selectedTab={selectedTab}
            onSelectedTabChange={setSelectedTab}
            form={form}
            currentPackage={currentPackage}
            currentCardIndex={currentCardIndex}
            onSetCurrentCardIndex={setCurrentCardIndex}
            onShowAllCards={handleShowAllCards}
            onShowKeywords={() => setDefinitionsDialog(true)}
            onAddCard={handleAddCard}
            onPreviewCard={handlePreviewCard}
            onDeleteCard={handleDeleteCard}
            onUpdateCard={handleUpdateCard}
            onUpdatePackage={setCurrentPackage}
          />
        </form>
      </Form>

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
        currentPackage={currentPackage}
        currentCardIndex={currentCardIndex}
        onSetCurrentCardIndex={setCurrentCardIndex}
        onSetSelectedTab={setSelectedTab}
        onPreviewCard={handlePreviewCard}
        onDeleteCard={(type, index) => handleDeleteCard(type as CardType, index)}
      />

      {/* 预定义字段管理对话框 */}
      <DefinitionsManager
        open={definitionsDialog}
        onOpenChange={setDefinitionsDialog}
        currentPackage={currentPackage}
        onUpdatePackage={setCurrentPackage}
      />
    </div>
  )
}