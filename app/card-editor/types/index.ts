import type { 
  ImportData, 
  ProfessionCard,
  AncestryCard,
  SubClassCard,
  DomainCard,
  RawVariantCard
} from '@/card/card-types'
import type { CardAutomationDefinition } from '@/card/automation/definition-types'
import type { CommunityCard } from '@/card/community-card/convert'

export type CardEditorDraftAutomation = {
  automation?: CardAutomationDefinition
}

export type CardEditorProfessionCard = ProfessionCard & CardEditorDraftAutomation
export type CardEditorAncestryCard = AncestryCard & CardEditorDraftAutomation
export type CardEditorCommunityCard = CommunityCard & CardEditorDraftAutomation
export type CardEditorSubclassCard = SubClassCard & CardEditorDraftAutomation
export type CardEditorDomainCard = DomainCard & CardEditorDraftAutomation
export type CardEditorVariantCard = RawVariantCard & CardEditorDraftAutomation

// 卡牌包编辑器的状态接口
export interface CardPackageState extends Omit<
  ImportData,
  "profession" | "ancestry" | "community" | "subclass" | "domain" | "variant"
> {
  profession?: CardEditorProfessionCard[]
  ancestry?: CardEditorAncestryCard[]
  community?: CardEditorCommunityCard[]
  subclass?: CardEditorSubclassCard[]
  domain?: CardEditorDomainCard[]
  variant?: CardEditorVariantCard[]
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
export type CardData =
  | CardEditorProfessionCard
  | CardEditorAncestryCard
  | CardEditorCommunityCard
  | CardEditorSubclassCard
  | CardEditorDomainCard
  | CardEditorVariantCard

// 默认卡牌包数据类型
export const defaultPackage: CardPackageState = {
  name: '新建卡牌包',
  version: '1.0.0',
  description: '自定义卡牌包描述',
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
