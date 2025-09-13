import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import type {
  CardPackageState,
  CurrentCardIndex,
  PreviewDialogState,
  CardListDialogState,
  CardType
} from '../types'
import { defaultPackage } from '../types'
import { createDefaultCard, copyCard } from '../utils/card-factory'
import { exportCardPackage, importCardPackage } from '../utils/import-export'
import { validationService, type ValidationResult, type ValidationError } from '../services/validation-service'
import { generateSmartCardId } from '../utils/id-generator'

interface CardEditorStore {
  // 状态
  packageData: CardPackageState
  currentCardIndex: CurrentCardIndex
  previewDialog: PreviewDialogState
  cardListDialog: CardListDialogState
  definitionsDialog: boolean
  confirmDialog: {
    open: boolean
    title: string
    message: string
    onConfirm: () => void
  }
  
  // 验证相关状态
  validationResult: ValidationResult | null
  isValidating: boolean
  
  // 元数据更新
  updateMetadata: (field: keyof CardPackageState, value: any) => void
  
  // 卡牌操作
  addCard: (type: CardType) => void
  copyCard: (type: CardType, index: number) => void
  deleteCard: (type: CardType, index: number) => void
  updateCard: (type: CardType, index: number, card: unknown) => void
  
  // 种族卡配对操作
  updateAncestryPair: (index1: number, card1: unknown, index2: number, card2: unknown) => void
  deleteAncestryPair: (index: number) => void
  
  // 子职业三卡操作
  updateSubclassTriple: (index1: number, card1: unknown, index2: number, card2: unknown, index3: number, card3: unknown) => void
  deleteSubclassTriple: (index: number) => void
  
  // 卡包操作
  exportPackage: () => void
  importPackage: () => Promise<void>
  newPackage: () => void
  
  // 验证操作
  validatePackage: () => Promise<void>
  clearValidationResult: () => void
  validateField: (type: CardType, index: number, fieldName: string) => Promise<ValidationError | null>
  
  // UI状态
  setPreviewDialog: (state: PreviewDialogState | ((prev: PreviewDialogState) => PreviewDialogState)) => void
  setCardListDialog: (state: CardListDialogState | ((prev: CardListDialogState) => CardListDialogState)) => void
  setDefinitionsDialog: (open: boolean) => void
  setConfirmDialog: (state: { open: boolean; title?: string; message?: string; onConfirm?: () => void }) => void
  setCurrentCardIndex: (updater: (prev: CurrentCardIndex) => CurrentCardIndex) => void
  
  // 自定义字段定义
  addDefinition: (category: keyof NonNullable<CardPackageState['customFieldDefinitions']>, value: string) => void
  removeDefinition: (category: keyof NonNullable<CardPackageState['customFieldDefinitions']>, index: number) => void
  updateDefinitions: (definitions: CardPackageState['customFieldDefinitions']) => void
}

export const useCardEditorStore = create<CardEditorStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      packageData: defaultPackage,
      currentCardIndex: {
        profession: 0,
        ancestry: 0,
        variant: 0,
        community: 0,
        subclass: 0,
        domain: 0
      },
      previewDialog: {
        open: false,
        card: null,
        type: ''
      },
      cardListDialog: {
        open: false,
        type: ''
      },
      definitionsDialog: false,
      confirmDialog: {
        open: false,
        title: '',
        message: '',
        onConfirm: () => {}
      },
      
      // 验证相关初始状态
      validationResult: null,
      isValidating: false,
      
      // 元数据更新
      updateMetadata: (field, value) =>
        set(state => {
          const newPackageData = { ...state.packageData, [field]: value }

          // 如果修改的是包名或作者，重新生成所有卡牌ID
          if (field === 'name' || field === 'author') {
            const cardTypes: CardType[] = ['profession', 'ancestry', 'community', 'subclass', 'domain', 'variant']

            cardTypes.forEach(cardType => {
              if (newPackageData[cardType] && Array.isArray(newPackageData[cardType])) {
                newPackageData[cardType] = (newPackageData[cardType] as any[]).map(card => ({
                  ...card,
                  id: generateSmartCardId(
                    newPackageData.name || '新建卡包',
                    newPackageData.author || '未知作者',
                    cardType,
                    card.名称 || '未命名',
                    newPackageData
                  )
                }))
              }
            })
          }

          return { packageData: newPackageData }
        }),
        
      // 卡牌操作
      addCard: (type) => 
        set(state => {
          // 种族卡特殊处理：创建配对
          if (type === 'ancestry') {
            const baseName = '新种族能力'
            const card1 = createDefaultCard(type, state.packageData) as any
            const card2 = createDefaultCard(type, state.packageData) as any
            
            // 设置配对卡片属性
            card1.名称 = `${baseName}1`
            card1.类别 = 1
            card2.名称 = `${baseName}2`
            card2.类别 = 2
            card2.种族 = card1.种族
            card2.简介 = card1.简介
            
            const existingCards = (state.packageData.ancestry as any[]) || []
            const newIndex = existingCards.length
            
            return {
              packageData: {
                ...state.packageData,
                ancestry: [...existingCards, card1, card2]
              },
              currentCardIndex: {
                ...state.currentCardIndex,
                ancestry: newIndex
              }
            }
          }
          
          // 子职业卡特殊处理：创建三卡组
          if (type === 'subclass') {
            const subclassName = '新子职业'
            const card1 = createDefaultCard(type, state.packageData) as any
            const card2 = createDefaultCard(type, state.packageData) as any
            const card3 = createDefaultCard(type, state.packageData) as any
            
            // 设置三卡组属性
            card1.名称 = `${subclassName}基石`
            card1.子职业 = subclassName
            card1.等级 = '基石'
            card1.描述 = '基石等级能力描述'
            
            card2.名称 = `${subclassName}专精`
            card2.子职业 = subclassName
            card2.主职 = card1.主职
            card2.施法 = card1.施法
            card2.等级 = '专精'
            card2.描述 = '专精等级能力描述'
            
            card3.名称 = `${subclassName}大师`
            card3.子职业 = subclassName
            card3.主职 = card1.主职
            card3.施法 = card1.施法
            card3.等级 = '大师'
            card3.描述 = '大师等级能力描述'
            
            const existingCards = (state.packageData.subclass as any[]) || []
            const newIndex = existingCards.length
            
            return {
              packageData: {
                ...state.packageData,
                subclass: [...existingCards, card1, card2, card3]
              },
              currentCardIndex: {
                ...state.currentCardIndex,
                subclass: newIndex
              }
            }
          }
          
          // 其他类型卡片正常处理
          const newCard = createDefaultCard(type, state.packageData)
          const existingCards = (state.packageData[type] as any[]) || []
          const newIndex = existingCards.length
          
          return {
            packageData: {
              ...state.packageData,
              [type]: [...existingCards, newCard]
            },
            currentCardIndex: {
              ...state.currentCardIndex,
              [type]: newIndex
            }
          }
        }),
        
      copyCard: (type, index) =>
        set(state => {
          const cards = state.packageData[type] as any[]
          const originalCard = cards?.[index]
          
          if (!originalCard) {
            console.warn(`无法复制卡牌: ${type}[${index}] 不存在`)
            return state
          }
          
          const copiedCard = copyCard(originalCard, type, state.packageData)
          const existingCards = cards || []
          const newIndex = existingCards.length
          
          toast.success(`已复制卡牌: ${(copiedCard as any)?.名称 || '未命名'}`)
          
          return {
            packageData: {
              ...state.packageData,
              [type]: [...existingCards, copiedCard]
            },
            currentCardIndex: {
              ...state.currentCardIndex,
              [type]: newIndex
            }
          }
        }),
        
      deleteCard: (type, index) => 
        set(state => {
          const cards = state.packageData[type] as any[]
          const newCards = cards?.filter((_, i) => i !== index) || []
          
          // 调整当前索引
          const currentIndex = state.currentCardIndex[type]
          const newIndex = currentIndex >= newCards.length ? Math.max(0, newCards.length - 1) : currentIndex
          
          return {
            packageData: {
              ...state.packageData,
              [type]: newCards
            },
            currentCardIndex: {
              ...state.currentCardIndex,
              [type]: newIndex
            }
          }
        }),
        
      updateCard: (type, index, updates) =>
        set(state => {
          const cards = state.packageData[type] as any[]
          if (!cards || !cards[index]) return state

          const newCard = { ...cards[index], ...(updates as any) }

          // 自动处理ID生成 - 当名称变化时重新生成ID
          if ((updates as any).名称 && (updates as any).名称 !== cards[index].名称) {
            newCard.id = generateSmartCardId(
              state.packageData.name || '新建卡包',
              state.packageData.author || '未知作者',
              type,
              (updates as any).名称,
              state.packageData
            )
          }

          return {
            packageData: {
              ...state.packageData,
              [type]: cards.map((c, i) => i === index ? newCard : c)
            }
          }
        }),
        
      // 种族卡配对操作
      updateAncestryPair: (index1, card1, index2, card2) =>
        set(state => {
          const cards = [...(state.packageData.ancestry as any[] || [])]
          
          // 更新两张配对的卡片
          if (cards[index1]) cards[index1] = card1
          if (cards[index2]) cards[index2] = card2
          
          return {
            packageData: {
              ...state.packageData,
              ancestry: cards
            }
          }
        }),
      
      deleteAncestryPair: (index) =>
        set(state => {
          const cards = state.packageData.ancestry as any[]
          if (!cards || cards.length === 0) return state
          
          // 找到配对的另一张卡
          const card = cards[index]
          if (!card) return state
          
          const pairedIndex = cards.findIndex((c, i) => 
            i !== index && 
            c.种族 === card.种族 && 
            c.简介 === card.简介 &&
            c.类别 !== card.类别
          )
          
          // 删除两张配对的卡片
          const indicesToDelete = pairedIndex !== -1 ? [index, pairedIndex].sort((a, b) => b - a) : [index]
          let newCards = [...cards]
          indicesToDelete.forEach(i => newCards.splice(i, 1))
          
          // 调整当前索引
          const currentIndex = state.currentCardIndex.ancestry
          const newIndex = currentIndex >= newCards.length ? Math.max(0, newCards.length - 1) : currentIndex
          
          toast.info(`已删除种族配对：${card.种族}`)
          
          return {
            packageData: {
              ...state.packageData,
              ancestry: newCards
            },
            currentCardIndex: {
              ...state.currentCardIndex,
              ancestry: newIndex
            }
          }
        }),
      
      // 子职业三卡操作
      updateSubclassTriple: (index1, card1, index2, card2, index3, card3) =>
        set(state => {
          const cards = [...(state.packageData.subclass as any[] || [])]
          
          // 更新三张配对的卡片
          if (index1 < cards.length) {
            cards[index1] = card1
          } else {
            cards.push(card1)
          }
          
          if (index2 < cards.length) {
            cards[index2] = card2
          } else {
            cards.push(card2)
          }
          
          if (index3 < cards.length) {
            cards[index3] = card3
          } else {
            cards.push(card3)
          }
          
          return {
            packageData: {
              ...state.packageData,
              subclass: cards
            }
          }
        }),
      
      deleteSubclassTriple: (index) =>
        set(state => {
          const cards = state.packageData.subclass as any[]
          if (!cards || cards.length === 0) return state
          
          // 找到同一子职业的其他两张卡
          const card = cards[index]
          if (!card) return state
          
          const relatedIndices = cards
            .map((c, i) => ({ card: c, index: i }))
            .filter(item => 
              item.card.子职业 === card.子职业 && 
              item.card.主职 === card.主职
            )
            .map(item => item.index)
            .sort((a, b) => b - a)
          
          // 删除三张相关的卡片
          let newCards = [...cards]
          relatedIndices.forEach(i => newCards.splice(i, 1))
          
          // 调整当前索引
          const currentIndex = state.currentCardIndex.subclass
          const newIndex = currentIndex >= newCards.length ? Math.max(0, newCards.length - 1) : currentIndex
          
          toast.info(`已删除子职业组：${card.子职业}`)
          
          return {
            packageData: {
              ...state.packageData,
              subclass: newCards
            },
            currentCardIndex: {
              ...state.currentCardIndex,
              subclass: newIndex
            }
          }
        }),
        
      // 卡包操作
      exportPackage: () => {
        const { packageData } = get()
        // 清理导出数据，移除编辑器状态字段
        const exportData = { ...packageData }
        delete exportData.isModified
        delete exportData.lastSaved
        exportCardPackage(exportData)
      },
      
      importPackage: async () => {
        const importedPackage = await importCardPackage()
        if (importedPackage) {
          set({
            packageData: importedPackage,
            currentCardIndex: {
              profession: 0,
              ancestry: 0,
              variant: 0,
              community: 0,
              subclass: 0,
              domain: 0
            }
          })
        }
      },
      
      newPackage: () => {
        const state = get()
        const { setConfirmDialog } = get()
        
        const createNewPackage = () => {
          set({
            packageData: { ...defaultPackage },
            currentCardIndex: {
              profession: 0,
              ancestry: 0,
              variant: 0,
              community: 0,
              subclass: 0,
              domain: 0
            },
            confirmDialog: { ...state.confirmDialog, open: false }
          })
          toast.success('已创建新卡包')
        }
        
        // 总是显示确认对话框，警告会删除现有内容
        setConfirmDialog({
          open: true,
          title: '创建新卡包',
          message: '创建新卡包将会清空当前所有卡片内容，确定要继续吗？',
          onConfirm: createNewPackage
        })
      },
      
      // 验证操作
      validatePackage: async () => {
        set({ isValidating: true })
        try {
          const { packageData } = get()
          const result = await validationService.validatePackage(packageData)
          set({ 
            validationResult: result,
            isValidating: false 
          })
          
          if (result.isValid) {
            toast.success('卡包验证通过！')
          } else {
            toast.error(`验证失败：发现 ${result.summary.totalErrors} 个错误`)
          }
        } catch (error) {
          console.error('验证过程中发生错误:', error)
          set({
            validationResult: {
              isValid: false,
              errors: [{ path: 'system', message: '验证系统错误' }],
              totalCards: 0,
              errorsByType: {} as Record<CardType, ValidationError[]>,
              summary: { totalErrors: 1, errorsByType: {} as Record<CardType, number> }
            },
            isValidating: false
          })
          toast.error('验证过程中发生错误')
        }
      },
      
      clearValidationResult: () => {
        set({ validationResult: null })
      },
      
      validateField: async (type: CardType, index: number, fieldName: string) => {
        const { packageData } = get()
        const cards = packageData[type] as any[]
        
        if (!cards || !cards[index]) {
          return null
        }
        
        try {
          const fieldError = await validationService.validateCardField(type, cards[index], fieldName, packageData)
          return fieldError
        } catch (error) {
          console.error('字段验证错误:', error)
          return {
            path: `${type}[${index}].${fieldName}`,
            message: '验证过程中发生错误'
          }
        }
      },
      
      // UI状态
      setPreviewDialog: (state) => 
        set(prev => ({
          previewDialog: typeof state === 'function' ? state(prev.previewDialog) : state
        })),
        
      setCardListDialog: (state) => 
        set(prev => ({
          cardListDialog: typeof state === 'function' ? state(prev.cardListDialog) : state
        })),
        
      setDefinitionsDialog: (open) => 
        set({ definitionsDialog: open }),
        
      setConfirmDialog: (state) => 
        set(prev => ({
          confirmDialog: {
            ...prev.confirmDialog,
            ...state
          }
        })),
        
      setCurrentCardIndex: (updater) => 
        set(state => ({
          currentCardIndex: updater(state.currentCardIndex)
        })),
        
      // 自定义字段定义
      addDefinition: (category, value) => 
        set(state => {
          const customFieldDefinitions = state.packageData.customFieldDefinitions || {}
          const currentArray = (customFieldDefinitions[category] as string[]) || []
          
          return {
            packageData: {
              ...state.packageData,
              customFieldDefinitions: {
                ...customFieldDefinitions,
                [category]: [...currentArray, value]
              }
            }
          }
        }),
        
      removeDefinition: (category, index) => 
        set(state => {
          const customFieldDefinitions = state.packageData.customFieldDefinitions || {}
          const currentArray = (customFieldDefinitions[category] as string[]) || []
          
          return {
            packageData: {
              ...state.packageData,
              customFieldDefinitions: {
                ...customFieldDefinitions,
                [category]: currentArray.filter((_, i) => i !== index)
              }
            }
          }
        }),
        
      updateDefinitions: (definitions) => 
        set(state => ({
          packageData: {
            ...state.packageData,
            customFieldDefinitions: definitions
          }
        }))
    }),
    {
      name: 'card-editor-storage',
      partialize: (state) => ({
        packageData: state.packageData // 只持久化包数据
      })
    }
  )
)