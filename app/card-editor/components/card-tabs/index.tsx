import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Settings } from 'lucide-react'
import { MetadataTab } from './metadata-tab'
import { CardEditorTab } from './card-editor-tab'
import { AncestryEditorTab } from './ancestry-editor-tab'
import { SubclassEditorTab } from './subclass-editor-tab'
import { PreviewTab } from './preview-tab'

interface CardTabsProps {
  selectedTab: string
  onSelectedTabChange: (tab: string) => void
}

export function CardTabs({
  selectedTab,
  onSelectedTabChange
}: CardTabsProps) {

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
        <MetadataTab />
      </TabsContent>

      {/* 职业卡牌选项卡 */}
      <TabsContent value="profession">
        <CardEditorTab
          cardType="profession"
          title="职业卡牌"
        />
      </TabsContent>

      {/* 种族卡牌选项卡 - 使用专门的双卡编辑器 */}
      <TabsContent value="ancestry">
        <AncestryEditorTab />
      </TabsContent>

      {/* 社群卡牌选项卡 */}
      <TabsContent value="community">
        <CardEditorTab
          cardType="community"
          title="社群卡牌"
        />
      </TabsContent>

      {/* 变体卡牌选项卡 */}
      <TabsContent value="variant">
        <CardEditorTab
          cardType="variant"
          title="变体卡牌"
        />
      </TabsContent>

      {/* 子职业卡牌选项卡 - 使用专门的三卡编辑器 */}
      <TabsContent value="subclass">
        <SubclassEditorTab />
      </TabsContent>

      {/* 领域卡牌选项卡 */}
      <TabsContent value="domain">
        <CardEditorTab
          cardType="domain"
          title="领域卡牌"
        />
      </TabsContent>

      {/* 预览选项卡 */}
      <TabsContent value="preview">
        <PreviewTab onTabChange={onSelectedTabChange} />
      </TabsContent>
    </Tabs>
  )
}