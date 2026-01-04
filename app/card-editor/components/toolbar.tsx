import { Button } from '@/components/ui/button'
import {
  Download,
  Upload,
  Plus,
  FileText,
  CheckCircle,
  Loader2,
  Sparkles
} from 'lucide-react'
import type { CardPackageState } from '../types'

interface ToolbarProps {
  currentPackage: CardPackageState
  onNew: () => void
  onImport: () => void
  onExport: () => void
  onShowKeywords: () => void
  onValidate: () => void
  onAIConverter: () => void
  isValidating: boolean
}

export function Toolbar({
  currentPackage,
  onNew,
  onImport,
  onExport,
  onShowKeywords,
  onValidate,
  onAIConverter,
  isValidating
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
        onClick={onAIConverter}
        className="flex items-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        AI文本转换
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExport}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        导出卡包
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onValidate}
        disabled={isValidating}
        className="flex items-center gap-2"
      >
        {isValidating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
        {isValidating ? '验证中...' : '验证卡包'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onShowKeywords}
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        查看关键字列表
      </Button>
    </div>
  )
}