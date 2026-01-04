'use client'

import { Button } from '@/components/ui/button'
import { Play, Trash2, Loader2 } from 'lucide-react'

interface ControlPanelProps {
  isRunning: boolean
  onStart: () => void
  onClear: () => void
  disabled?: boolean
}

export function ControlPanel({ isRunning, onStart, onClear, disabled }: ControlPanelProps) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-white">
      <Button
        onClick={onStart}
        disabled={disabled || isRunning}
        size="lg"
        className="flex items-center gap-2"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            处理中...
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            开始处理
          </>
        )}
      </Button>

      <Button
        onClick={onClear}
        disabled={isRunning}
        variant="outline"
        size="lg"
        className="flex items-center gap-2"
      >
        <Trash2 className="h-5 w-5" />
        清空日志
      </Button>

      <div className="flex-1" />

      <div className="text-sm text-muted-foreground">
        {isRunning ? '正在处理，请稍候...' : '点击"开始处理"执行转换'}
      </div>
    </div>
  )
}
