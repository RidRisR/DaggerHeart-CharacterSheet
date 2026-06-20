'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BookOpen, Home, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { ImageCard } from '@/components/ui/image-card'
import { createDefaultEquipmentServices } from '@/equipment/services/default-equipment-services'
import { transformCardToStandard } from './utils/card-transformer'
import { navigateToPage } from '@/lib/utils'

// 导入新的组件和store
import { useCardEditorStore } from './store/card-editor-store'
import { Toolbar, type EditorMode } from './components/toolbar'
import { DefinitionsManager } from './components/definitions-manager'
import { CardTabs } from './components/card-tabs'
import { CardListDialog } from './components/card-list-dialog'
import { ValidationResults } from './components/validation-results'
import { EquipmentTabs } from './equipment/components/equipment-tabs'
import { EquipmentValidationResults } from './equipment/components/equipment-validation-results'
import { useEquipmentEditorStore } from './equipment/equipment-editor-store'
import { importEquipmentDraftFromFile, downloadEquipmentDraftJson } from './equipment/equipment-import-export'
import { validateEquipmentEditorDraft, type EquipmentValidationJumpTarget } from './equipment/equipment-validation'
import { useCardEditorFileActions } from './hooks/use-card-editor-file-actions'
import type { CardType } from './types'

export default function CardEditorPage() {
  const [selectedTab, setSelectedTab] = useState('metadata')
  const [editorMode, setEditorMode] = useState<EditorMode>('cards')
  const [isClient, setIsClient] = useState(false)
  const equipmentServices = useMemo(() => createDefaultEquipmentServices(), [])
  const equipmentStore = useEquipmentEditorStore()

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
    newPackage,
    replacePackageData,
    resetCurrentCardIndex,
    setValidationResult,
    setIsValidating,
    clearValidationResult,
    setPreviewDialog,
    setCardListDialog,
    setDefinitionsDialog,
    setConfirmDialog,
    setCurrentCardIndex,
    addDefinition,
    removeDefinition
  } = useCardEditorStore()

  const cardFileActions = useCardEditorFileActions({
    draft: packageData,
    replaceDraft: replacePackageData,
    resetCurrentCardIndex,
    setValidationResult,
    setIsValidating,
  })

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

  const handleJumpToCardMetadata = () => {
    setSelectedTab('metadata')
    clearValidationResult()
  }

  const chooseEquipmentFile = () =>
    new Promise<File | null>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.onchange = () => resolve(input.files?.[0] ?? null)
      input.click()
    })

  const chooseCardFile = () =>
    new Promise<File | null>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,.dhcb,.zip'
      input.onchange = () => resolve(input.files?.[0] ?? null)
      input.click()
    })

  const handleImportCardPackage = async () => {
    const file = await chooseCardFile()
    if (!file) return

    await cardFileActions.importDraftFromFile(file)
  }

  const handleNewEquipmentPackage = () => {
    const createNewEquipmentPackage = () => {
      equipmentStore.resetDraft()
      setConfirmDialog({ open: false })
      toast.success('已创建新装备包')
    }

    if (!equipmentStore.hasItems()) {
      createNewEquipmentPackage()
      return
    }

    setConfirmDialog({
      open: true,
      title: '创建新装备包',
      message: '创建新装备包将会清空当前装备内容，确定要继续吗？',
      onConfirm: createNewEquipmentPackage
    })
  }

  const handleImportEquipmentPackage = async () => {
    const file = await chooseEquipmentFile()
    if (!file) return

    const result = await importEquipmentDraftFromFile(file)
    if (!result.ok) {
      toast.error(`导入失败：${result.message}`)
      return
    }

    const applyImport = () => {
      const replacement = equipmentStore.replaceDraftFromUnknown(result.draft)
      if (!replacement.ok) {
        toast.error(`导入失败：${replacement.message}`)
        return
      }

      setConfirmDialog({ open: false })
      toast.success('装备包已导入')
    }

    if (!equipmentStore.hasItems()) {
      applyImport()
      return
    }

    setConfirmDialog({
      open: true,
      title: '导入装备包',
      message: '导入装备包将替换当前装备内容，确定要继续吗？',
      onConfirm: applyImport
    })
  }

  const handleExportEquipmentPackage = () => {
    if (!equipmentStore.hasItems()) {
      toast.error('没有可导出的装备')
      return
    }

    downloadEquipmentDraftJson(equipmentStore.draft)
  }

  const handleValidateEquipmentPackage = async () => {
    equipmentStore.setIsValidating(true)
    try {
      const result = await validateEquipmentEditorDraft(
        equipmentStore.draft,
        equipmentServices.applicationService
      )
      equipmentStore.setValidationResult(result)

      if (result.success) {
        toast.success('装备包验证通过！')
      } else {
        toast.error(`验证失败：发现 ${result.summary.errorCount} 个错误`)
      }
    } catch (error) {
      console.error('装备包验证过程中发生错误:', error)
      toast.error('装备包验证过程中发生错误')
    } finally {
      equipmentStore.setIsValidating(false)
    }
  }

  const handleCopyCardMetadataToEquipment = () => {
    setConfirmDialog({
      open: true,
      title: '复制卡牌包基础信息',
      message: '这会覆盖装备包的名称、版本、作者和描述，并同步更新标准装备 ID 前缀，确定要继续吗？',
      onConfirm: () => {
        equipmentStore.updateMetadata('name', packageData.name ?? '')
        equipmentStore.updateMetadata('version', packageData.version ?? '')
        equipmentStore.updateMetadata('author', packageData.author ?? '')
        equipmentStore.updateMetadata('description', packageData.description ?? '')
        setConfirmDialog({ open: false })
        toast.success('已复制卡牌包基础信息')
      }
    })
  }

  const handleCopyEquipmentMetadataToCard = () => {
    setConfirmDialog({
      open: true,
      title: '复制装备包基础信息',
      message: '这会覆盖卡牌包的名称、版本、作者和描述，并同步更新标准卡牌 ID 前缀，确定要继续吗？',
      onConfirm: () => {
        updateMetadata('name', equipmentStore.draft.name ?? '')
        updateMetadata('version', equipmentStore.draft.version ?? '')
        updateMetadata('author', equipmentStore.draft.author ?? '')
        updateMetadata('description', equipmentStore.draft.description ?? '')
        setConfirmDialog({ open: false })
        toast.success('已复制装备包基础信息')
      }
    })
  }

  const handleJumpToEquipmentTarget = (target: EquipmentValidationJumpTarget) => {
    equipmentStore.setSelectedTab(target.tab)

    if (target.tab === 'weapons') {
      equipmentStore.setSelectedWeaponIndex(target.index)
    }

    if (target.tab === 'armor') {
      equipmentStore.setSelectedArmorIndex(target.index)
    }

    equipmentStore.setValidationResult(null)
  }

  if (!isClient) {
    return <div>加载中...</div>
  }

  const toolbarActions = editorMode === 'cards'
    ? {
        onNew: newPackage,
        onImport: handleImportCardPackage,
        onExport: cardFileActions.exportDraftAsDhcb,
        onValidate: cardFileActions.validateDraft,
        isValidating
      }
    : {
        onNew: handleNewEquipmentPackage,
        onImport: handleImportEquipmentPackage,
        onExport: handleExportEquipmentPackage,
        onValidate: handleValidateEquipmentPackage,
        isValidating: equipmentStore.isValidating
      }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              内容包编辑器
            </h1>
            <p className="text-muted-foreground">
              可视化编辑 DaggerHeart 卡牌包和装备包，支持富文本编辑和实时预览
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
              内容包管理
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
          mode={editorMode}
          onModeChange={setEditorMode}
          onNew={toolbarActions.onNew}
          onImport={toolbarActions.onImport}
          onExport={toolbarActions.onExport}
          onShowKeywords={() => setDefinitionsDialog(true)}
          onValidate={toolbarActions.onValidate}
          isValidating={toolbarActions.isValidating}
        />
      </div>

      {/* 主编辑区域 */}
      {editorMode === 'cards' ? (
        <CardTabs
          selectedTab={selectedTab}
          onSelectedTabChange={setSelectedTab}
          onRequestCopyFromEquipment={handleCopyEquipmentMetadataToCard}
        />
      ) : (
        <EquipmentTabs
          cardPackage={packageData}
          onRequestCopyFromCard={handleCopyCardMetadataToEquipment}
        />
      )}

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
        open={editorMode === 'cards' && !!validationResult}
        onClose={clearValidationResult}
        onJumpToCard={handleJumpToCard}
        onJumpToMetadata={handleJumpToCardMetadata}
      />

      {/* 装备验证结果对话框 */}
      <EquipmentValidationResults
        validationResult={equipmentStore.validationResult}
        open={editorMode === 'equipment' && !!equipmentStore.validationResult}
        onClose={() => equipmentStore.setValidationResult(null)}
        onJumpToTarget={handleJumpToEquipmentTarget}
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
