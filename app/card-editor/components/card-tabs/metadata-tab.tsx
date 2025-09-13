import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCardEditorStore } from '../../store/card-editor-store'
import type { CardPackageState } from '../../types'


export function MetadataTab() {
  // 直接从store获取数据和方法
  const { packageData, updateMetadata } = useCardEditorStore()
  return (
    <Card>
      <CardHeader>
        <CardTitle>卡包基础信息</CardTitle>
        <CardDescription>
          设置卡包的名称、版本、描述等基础信息
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">卡包名称 *</Label>
            <Input 
              id="name"
              placeholder="请输入卡包名称" 
              value={packageData.name || ''}
              onChange={(e) => updateMetadata('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">版本号 *</Label>
            <Input 
              id="version"
              placeholder="例如: 1.0.0" 
              value={packageData.version || ''}
              onChange={(e) => updateMetadata('version', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="author">作者信息</Label>
          <Input 
            id="author"
            placeholder="请输入作者信息" 
            value={packageData.author || ''}
            onChange={(e) => updateMetadata('author', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">卡包描述</Label>
          <Textarea 
            id="description"
            placeholder="请输入卡包描述"
            className="min-h-[100px]"
            value={packageData.description || ''}
            onChange={(e) => updateMetadata('description', e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            简要描述这个卡包的内容和特色
          </p>
        </div>
      </CardContent>
    </Card>
  )
}