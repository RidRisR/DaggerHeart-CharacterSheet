'use client'

import { useEffect, useRef } from 'react'
import { ChunkLogCard } from './chunk-log-card'
import type { ChunkLog } from '../types'

interface LogPanelProps {
  logs: ChunkLog[]
}

export function LogPanel({ logs }: LogPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs.length])

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">暂无日志</p>
          <p className="text-sm mt-2">点击"开始处理"执行转换后，日志将显示在这里</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <ChunkLogCard key={log.id} log={log} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
