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
import { validationService, type ValidationResult } from '../services/validation-service'

interface CardEditorStore {
  // 状态
  packageData: CardPackageState
  currentCardIndex: CurrentCardIndex
  previewDialog: PreviewDialogState
  cardListDialog: CardListDialogState
  definitionsDialog: boolean
  
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
      
      // 验证相关初始状态
      validationResult: null,
      isValidating: false,
      
      // 元数据更新
      updateMetadata: (field, value) => 
        set(state => ({
          packageData: { ...state.packageData, [field]: value }
        })),
        
      // 卡牌操作
      addCard: (type) => 
        set(state => {
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
        
      updateCard: (type, index, card) => 
        set(state => {
          const cards = state.packageData[type] as any[]
          return {
            packageData: {
              ...state.packageData,
              [type]: cards?.map((c, i) => i === index ? card : c) || []
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
        if (state.packageData.isModified) {
          const confirmed = confirm('您有未保存的更改，确定要创建新卡包吗？')
          if (!confirmed) return
        }
        
        set({
          packageData: { ...defaultPackage },
          currentCardIndex: {
            profession: 0,
            ancestry: 0,
            variant: 0,
            community: 0,
            subclass: 0,
            domain: 0
          }
        })
        toast.success('已创建新卡包')
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