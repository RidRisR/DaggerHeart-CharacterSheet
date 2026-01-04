'use client'

import { Progress } from '@/components/ui/progress'
import { BarChart3, Clock, DollarSign, Layers, AlertTriangle, XCircle } from 'lucide-react'
import type { DebugState } from '../types'

interface StatusPanelProps {
  state: DebugState
}

export function StatusPanel({ state }: StatusPanelProps) {
  const progress = state.totalChunks > 0
    ? ((state.currentChunkIndex + 1) / state.totalChunks) * 100
    : 0

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="sticky top-0 z-10 bg-white border rounded-lg p-4 shadow-sm">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            处理进度: Chunk {state.currentChunkIndex + 1} / {state.totalChunks}
          </span>
          <span className="text-sm text-muted-foreground">
            {progress.toFixed(0)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" />
          <div>
            <div className="text-muted-foreground">卡牌总数</div>
            <div className="font-semibold text-lg">{state.totalCards}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-green-600" />
          <div>
            <div className="text-muted-foreground">总耗时</div>
            <div className="font-semibold text-lg">{formatDuration(state.totalDuration)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-purple-600" />
          <div>
            <div className="text-muted-foreground">总 Tokens</div>
            <div className="font-semibold text-lg">{state.totalTokens.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-orange-600" />
          <div>
            <div className="text-muted-foreground">预估成本</div>
            <div className="font-semibold text-lg">${state.totalCost.toFixed(4)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <div>
            <div className="text-muted-foreground">警告数</div>
            <div className="font-semibold text-lg">{state.totalWarnings}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <div>
            <div className="text-muted-foreground">错误数</div>
            <div className="font-semibold text-lg">{state.totalErrors}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
