import { Button } from '@/components/ui/button'
import {
  Download,
  Upload,
  Plus,
  FileText,
  CheckCircle,
  Loader2
} from 'lucide-react'

export type EditorMode = 'cards' | 'equipment'

interface ToolbarProps {
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  onNew: () => void
  onImport: () => void
  onExport: () => void
  onShowKeywords: () => void
  onValidate: () => void
  isValidating: boolean
}

export function Toolbar({
  mode,
  onModeChange,
  onNew,
  onImport,
  onExport,
  onShowKeywords,
  onValidate,
  isValidating
}: ToolbarProps) {
  const noun = mode === 'cards' ? '卡牌包' : '装备包'
  const nextMode = mode === 'cards' ? 'equipment' : 'cards'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onNew}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          新建{noun}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          导入{noun}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          导出{noun}
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
          {isValidating ? '验证中...' : `验证${noun}`}
        </Button>
        {mode === 'cards' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onShowKeywords}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            查看关键字列表
          </Button>
        ) : null}
      </div>

      <button
        type="button"
        aria-label={mode === 'cards' ? '装备' : '卡牌'}
        aria-pressed={mode === 'equipment'}
        onClick={() => onModeChange(nextMode)}
        className="flex rounded-md border bg-background p-1 text-sm font-medium ring-offset-background transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span
          aria-hidden="true"
          className={`rounded px-3 py-1.5 transition-colors ${
            mode === 'cards'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground'
          }`}
        >
          卡牌
        </span>
        <span
          aria-hidden="true"
          className={`rounded px-3 py-1.5 transition-colors ${
            mode === 'equipment'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground'
          }`}
        >
          装备
        </span>
      </button>
    </div>
  )
}
