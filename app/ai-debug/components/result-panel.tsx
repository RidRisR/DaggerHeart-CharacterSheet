'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check, Download } from 'lucide-react'
import type { CardPackageState } from '@/app/card-editor/store/card-editor-store'

interface ResultPanelProps {
  data: Partial<CardPackageState>
}

export function ResultPanel({ data }: ResultPanelProps) {
  const [copied, setCopied] = useState(false)

  const hasData = Object.keys(data).length > 0

  const cardCounts = {
    profession: data.profession?.length || 0,
    ancestry: data.ancestry?.length || 0,
    community: data.community?.length || 0,
    subclass: data.subclass?.length || 0,
    domain: data.domain?.length || 0,
    variant: data.variant?.length || 0
  }

  const totalCards = Object.values(cardCounts).reduce((sum, count) => sum + count, 0)

  const copyJSON = async () => {
    try {
      const json = JSON.stringify(data, null, 2)
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  const downloadJSON = () => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-generated-package-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!hasData) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>处理完成后，结果将显示在这里</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">生成结果</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyJSON}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                复制 JSON
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={downloadJSON}>
            <Download className="h-4 w-4 mr-2" />
            下载 JSON
          </Button>
        </div>
      </div>

      {/* Card Statistics */}
      <div className="mb-4 p-4 bg-gray-50 rounded">
        <h4 className="font-semibold mb-3">卡牌统计</h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">职业:</span>
            <span className="font-semibold">{cardCounts.profession}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">种族:</span>
            <span className="font-semibold">{cardCounts.ancestry}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">社群:</span>
            <span className="font-semibold">{cardCounts.community}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">子职业:</span>
            <span className="font-semibold">{cardCounts.subclass}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">领域:</span>
            <span className="font-semibold">{cardCounts.domain}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">变体:</span>
            <span className="font-semibold">{cardCounts.variant}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t flex justify-between font-semibold">
          <span>总计:</span>
          <span>{totalCards}</span>
        </div>
      </div>

      {/* JSON Preview */}
      <div>
        <h4 className="font-semibold mb-2">JSON 数据</h4>
        <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  )
}
