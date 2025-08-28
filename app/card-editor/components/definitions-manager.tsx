import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import type { CardPackageState } from '../types'

interface DefinitionsManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPackage: CardPackageState
  onUpdatePackage: (updater: (prev: CardPackageState) => CardPackageState) => void
}

export function DefinitionsManager({ 
  open, 
  onOpenChange, 
  currentPackage, 
  onUpdatePackage 
}: DefinitionsManagerProps) {
  
  // 通用的添加条目函数
  const addDefinition = (category: keyof typeof currentPackage.customFieldDefinitions, inputId: string) => {
    const input = document.getElementById(inputId) as HTMLInputElement
    if (input?.value.trim()) {
      const newDefs = { ...currentPackage.customFieldDefinitions }
      const currentArray = newDefs[category] as string[] || []
      newDefs[category] = [...currentArray, input.value.trim()] as any
      onUpdatePackage(prev => ({ 
        ...prev, 
        customFieldDefinitions: newDefs, 
        isModified: true 
      }))
      input.value = ''
    }
  }

  // 通用的删除条目函数
  const removeDefinition = (category: keyof typeof currentPackage.customFieldDefinitions, index: number) => {
    const newDefs = { ...currentPackage.customFieldDefinitions }
    const currentArray = newDefs[category] as string[]
    newDefs[category] = currentArray?.filter((_, i) => i !== index) || [] as any
    onUpdatePackage(prev => ({ 
      ...prev, 
      customFieldDefinitions: newDefs, 
      isModified: true 
    }))
  }

  // 通用的键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent, category: keyof typeof currentPackage.customFieldDefinitions, inputId: string) => {
    if (e.key === 'Enter') {
      addDefinition(category, inputId)
    }
  }

  // 渲染定义类别
  const renderCategory = (
    title: string, 
    category: keyof typeof currentPackage.customFieldDefinitions,
    inputId: string,
    placeholder: string
  ) => (
    <div>
      <label className="text-base font-semibold mb-2 block">{title}</label>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
          {((currentPackage.customFieldDefinitions?.[category] as string[]) || []).map((item, index) => (
            <Badge key={index} variant="secondary" className="px-3 py-1">
              {item}
              <button
                type="button"
                onClick={() => removeDefinition(category, index)}
                className="ml-2 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )) || <span className="text-muted-foreground text-sm">暂无定义的{title.replace('列表', '')}</span>}
        </div>
        <div className="flex gap-2">
          <Input
            id={inputId}
            placeholder={placeholder}
            onKeyDown={(e) => handleKeyDown(e, category, inputId)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addDefinition(category, inputId)}
          >
            <Plus className="h-4 w-4" />
            添加
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>预定义字段管理</DialogTitle>
          <DialogDescription>
            定义卡包中可用的职业、种族、社群、领域和变体类型。创建卡牌时必须从这些预定义列表中选择。
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {renderCategory('职业列表', 'professions', 'modal-new-profession', '输入新职业名称')}
          {renderCategory('种族列表', 'ancestries', 'modal-new-ancestry', '输入新种族名称')}
          {renderCategory('社群列表', 'communities', 'modal-new-community', '输入新社群名称')}
          {renderCategory('领域列表', 'domains', 'modal-new-domain', '输入新领域名称')}
          {renderCategory('变体类型列表', 'variants', 'modal-new-variant-type', '输入新变体类型（如：武器、道具、食物）')}

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">使用说明</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 预定义字段是卡包的"词典"，定义了所有可用的职业、种族、社群、领域和变体类型</li>
              <li>• 创建卡牌时，相关字段必须使用这里预定义的值</li>
              <li>• 例如：职业卡牌的"领域1"和"领域2"必须从已定义的领域列表中选择</li>
              <li>• 变体类型用于分类变体卡牌（如武器、道具、食物等）</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}