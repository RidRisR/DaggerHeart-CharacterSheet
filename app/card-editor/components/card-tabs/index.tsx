import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Settings, FileText } from 'lucide-react'
import type { CardPackageState, CurrentCardIndex, CardType } from '../../types'
import { MetadataTab } from './metadata-tab'
import { CardEditorTab } from './card-editor-tab'
import { AncestryEditorTab } from './ancestry-editor-tab'
import { SubclassEditorTab } from './subclass-editor-tab'

interface CardTabsProps {
  selectedTab: string
  onSelectedTabChange: (tab: string) => void
  currentPackage: CardPackageState
  currentCardIndex: CurrentCardIndex
  onSetCurrentCardIndex: (updater: (prev: CurrentCardIndex) => CurrentCardIndex) => void
  onShowAllCards: (type: string) => void
  onShowKeywords: () => void
  onAddCard: (type: CardType) => void
  onCopyCard: (type: CardType, index: number) => void
  onDeleteCard: (type: CardType, index: number) => void
  onUpdateCard: (type: CardType, index: number, card: unknown) => void
  onUpdateMetadata: (field: keyof CardPackageState, value: any) => void
}

export function CardTabs({
  selectedTab,
  onSelectedTabChange,
  currentPackage,
  currentCardIndex,
  onSetCurrentCardIndex,
  onShowAllCards,
  onShowKeywords,
  onAddCard,
  onCopyCard,
  onDeleteCard,
  onUpdateCard,
  onUpdateMetadata
}: CardTabsProps) {
  
  const cardEditorProps = {
    currentPackage,
    currentCardIndex,
    onSetCurrentCardIndex,
    onShowAllCards,
    onShowKeywords,
    onAddCard,
    onCopyCard,
    onDeleteCard,
    onUpdateCard
  }

  return (
    <Tabs value={selectedTab} onValueChange={onSelectedTabChange}>
      <TabsList className="grid w-full grid-cols-8">
        <TabsTrigger value="metadata" className="flex items-center gap-1">
          <Settings className="h-4 w-4" />
          基础信息
        </TabsTrigger>
        <TabsTrigger value="profession">职业</TabsTrigger>
        <TabsTrigger value="ancestry">种族</TabsTrigger>
        <TabsTrigger value="community">社群</TabsTrigger>
        <TabsTrigger value="subclass">子职业</TabsTrigger>
        <TabsTrigger value="domain">领域</TabsTrigger>
        <TabsTrigger value="variant">变体</TabsTrigger>
        <TabsTrigger value="preview" className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          预览
        </TabsTrigger>
      </TabsList>

      {/* 基础信息选项卡 */}
      <TabsContent value="metadata">
        <MetadataTab 
          packageData={currentPackage} 
          onUpdateMetadata={onUpdateMetadata} 
        />
      </TabsContent>

      {/* 职业卡牌选项卡 */}
      <TabsContent value="profession">
        <CardEditorTab
          {...cardEditorProps}
          cardType="profession"
          title="职业卡牌"
        />
      </TabsContent>

      {/* 种族卡牌选项卡 - 使用专门的双卡编辑器 */}
      <TabsContent value="ancestry">
        <AncestryEditorTab
          currentPackage={currentPackage}
          currentCardIndex={currentCardIndex}
          onSetCurrentCardIndex={onSetCurrentCardIndex}
          onShowAllCards={onShowAllCards}
          onShowKeywords={onShowKeywords}
          onAddCard={onAddCard}
          onDeleteCard={onDeleteCard}
        />
      </TabsContent>

      {/* 社群卡牌选项卡 */}
      <TabsContent value="community">
        <CardEditorTab
          {...cardEditorProps}
          cardType="community"
          title="社群卡牌"
        />
      </TabsContent>

      {/* 变体卡牌选项卡 */}
      <TabsContent value="variant">
        <CardEditorTab
          {...cardEditorProps}
          cardType="variant"
          title="变体卡牌"
        />
      </TabsContent>

      {/* 子职业卡牌选项卡 - 使用专门的三卡编辑器 */}
      <TabsContent value="subclass">
        <SubclassEditorTab
          currentPackage={currentPackage}
          currentCardIndex={currentCardIndex}
          onSetCurrentCardIndex={onSetCurrentCardIndex}
          onShowAllCards={onShowAllCards}
          onShowKeywords={onShowKeywords}
          onAddCard={onAddCard}
          onDeleteCard={onDeleteCard}
        />
      </TabsContent>

      {/* 领域卡牌选项卡 */}
      <TabsContent value="domain">
        <CardEditorTab
          {...cardEditorProps}
          cardType="domain"
          title="领域卡牌"
        />
      </TabsContent>

      {/* 预览选项卡 */}
      <TabsContent value="preview">
        <Card>
          <CardHeader>
            <CardTitle>卡包预览</CardTitle>
            <CardDescription>
              预览当前卡包的结构和内容
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                预览功能正在开发中...
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}