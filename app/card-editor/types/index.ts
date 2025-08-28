import type { 
  ImportData, 
  ProfessionCard,
  AncestryCard,
  RawVariantCard
} from '@/card/card-types'

// 卡包编辑器的状态接口
export interface CardPackageState extends ImportData {
  // 扩展字段用于编辑器状态
  isModified?: boolean
  lastSaved?: Date
}

// 当前编辑的卡牌索引
export interface CurrentCardIndex {
  [key: string]: number
  profession: number
  ancestry: number
  variant: number
  community: number
  subclass: number
  domain: number
}

// 预览对话框状态
export interface PreviewDialogState {
  open: boolean
  card: unknown
  type: string
}

// 卡牌列表对话框状态
export interface CardListDialogState {
  open: boolean
  type: string
}

// 卡牌类型
export type CardType = 'profession' | 'ancestry' | 'variant' | 'community' | 'subclass' | 'domain'

// 卡牌数据类型联合
export type CardData = ProfessionCard | AncestryCard | RawVariantCard

// 默认卡包数据类型
export const defaultPackage: CardPackageState = {
  name: '新建卡包',
  version: '1.0.0',
  description: '自定义卡包描述',
  author: '',
  customFieldDefinitions: {
    professions: [],
    ancestries: [],
    communities: [],
    domains: [],
    variants: []
  },
  profession: [],
  ancestry: [],
  community: [],
  subclass: [],
  domain: [],
  variant: []
}