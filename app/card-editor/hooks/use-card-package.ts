import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { 
  CardPackageState, 
  CurrentCardIndex, 
  PreviewDialogState, 
  CardListDialogState, 
  CardType
} from '../types'
import { defaultPackage } from '../types'
import { createDefaultCard } from '../utils/card-factory'
import { exportCardPackage, importCardPackage } from '../utils/import-export'

export function useCardPackage() {
  const [currentPackage, setCurrentPackage] = useState<CardPackageState>(defaultPackage)
  const [currentCardIndex, setCurrentCardIndex] = useState<CurrentCardIndex>({
    profession: 0,
    ancestry: 0,
    variant: 0,
    community: 0,
    subclass: 0,
    domain: 0
  })
  const [previewDialog, setPreviewDialog] = useState<PreviewDialogState>({
    open: false,
    card: null,
    type: ''
  })
  const [cardListDialog, setCardListDialog] = useState<CardListDialogState>({
    open: false,
    type: ''
  })
  const [definitionsDialog, setDefinitionsDialog] = useState(false)

  const form = useForm<CardPackageState>({
    defaultValues: currentPackage
  })

  // 标记为已修改
  const markAsModified = () => {
    setCurrentPackage(prev => ({
      ...prev,
      isModified: true
    }))
  }

  // 保存卡包
  const handleSave = () => {
    const data = form.getValues()
    setCurrentPackage(prev => ({
      ...data,
      isModified: false,
      lastSaved: new Date()
    }))
    toast.success('卡包已保存')
  }

  // 导出卡包
  const handleExport = () => {
    const data = form.getValues()
    exportCardPackage(data)
  }

  // 导入卡包
  const handleImport = async () => {
    const importedPackage = await importCardPackage()
    if (importedPackage) {
      setCurrentPackage(importedPackage)
      form.reset(importedPackage)
      
      // 重置卡牌索引为0，避免索引超出新卡包范围
      setCurrentCardIndex({
        profession: 0,
        ancestry: 0,
        variant: 0,
        community: 0,
        subclass: 0,
        domain: 0
      })
    }
  }

  // 新建卡包
  const handleNew = () => {
    if (currentPackage.isModified) {
      const confirmed = confirm('您有未保存的更改，确定要创建新卡包吗？')
      if (!confirmed) return
    }
    const newPackage = { ...defaultPackage }
    setCurrentPackage(newPackage)
    form.reset(newPackage)
    
    // 重置卡牌索引为0
    setCurrentCardIndex({
      profession: 0,
      ancestry: 0,
      variant: 0,
      community: 0,
      subclass: 0,
      domain: 0
    })
    toast.success('已创建新卡包')
  }

  // 表单值变化处理
  const handleFormChange = () => {
    markAsModified()
  }

  // 卡牌预览处理
  const handlePreviewCard = (card: unknown, type: string) => {
    setPreviewDialog({
      open: true,
      card,
      type
    })
  }

  // 添加卡牌
  const handleAddCard = (type: CardType) => {
    const newCard = createDefaultCard(type, currentPackage)
    setCurrentPackage(prev => {
      const key = type as keyof typeof prev
      const existingCards = (prev[key] as any[]) || []
      const updatedPackage = {
        ...prev,
        [type]: [...existingCards, newCard],
        isModified: true
      }
      // 自动跳转到新添加的卡牌
      const newIndex = existingCards.length
      setCurrentCardIndex(prevIndex => ({
        ...prevIndex,
        [type]: newIndex
      }))
      return updatedPackage
    })
    toast.success(`已添加新${type === 'profession' ? '职业' : type === 'ancestry' ? '血统' : '变体'}卡牌`)
  }

  // 删除卡牌
  const handleDeleteCard = (type: CardType, index: number) => {
    setCurrentPackage(prev => {
      const key = type as keyof typeof prev
      const cards = prev[key] as any[]
      return {
        ...prev,
        [type]: cards?.filter((_, i) => i !== index) || [],
        isModified: true
      }
    })
  }

  // 更新卡牌
  const handleUpdateCard = (type: CardType, index: number, card: unknown) => {
    setCurrentPackage(prev => {
      const key = type as keyof typeof prev
      const cards = prev[key] as any[]
      return {
        ...prev,
        [type]: cards?.map((c, i) => i === index ? card : c) || [],
        isModified: true
      }
    })
  }

  return {
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
    markAsModified,
    handleSave,
    handleExport,
    handleImport,
    handleNew,
    handleFormChange,
    handlePreviewCard,
    handleAddCard,
    handleDeleteCard,
    handleUpdateCard
  }
}