import { Button } from '@/components/ui/button'
import { 
  Save, 
  Download, 
  Upload, 
  Plus, 
  FileText 
} from 'lucide-react'
import type { CardPackageState } from '../types'

interface ToolbarProps {
  currentPackage: CardPackageState
  onNew: () => void
  onImport: () => void
  onSave: () => void
  onExport: () => void
  onShowKeywords: () => void
}

export function Toolbar({ 
  currentPackage, 
  onNew, 
  onImport, 
  onSave, 
  onExport, 
  onShowKeywords 
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
      <Button
        variant="default"
        size="sm"
        onClick={onNew}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        新建卡包
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onImport}
        className="flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        导入卡包
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onSave}
        className="flex items-center gap-2"
      >
        <Save className="h-4 w-4" />
        保存
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExport}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        导出JSON
      </Button>
      <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
        {currentPackage.lastSaved && (
          <span>
            最后保存: {currentPackage.lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}