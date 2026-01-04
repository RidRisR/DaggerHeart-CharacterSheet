'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, Clock, DollarSign, AlertTriangle, XCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChunkLog } from '../types'

interface ChunkLogCardProps {
  log: ChunkLog
}

export function ChunkLogCard({ log }: ChunkLogCardProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(section)
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getStatusColor = () => {
    switch (log.status) {
      case 'success': return 'border-green-300 bg-green-50'
      case 'error': return 'border-red-300 bg-red-50'
      case 'processing': return 'border-blue-300 bg-blue-50'
      default: return 'border-gray-300'
    }
  }

  const getStatusIcon = () => {
    switch (log.status) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />
      case 'processing': return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      default: return null
    }
  }

  return (
    <div className={`border-2 rounded-lg p-4 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <h3 className="text-lg font-semibold">
            Chunk {log.index + 1}
          </h3>
          <span className="text-sm text-muted-foreground">
            位置 {log.position} - {log.position + log.windowSize}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(log.duration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>${log.estimatedCost.toFixed(4)}</span>
          </div>
          {log.status === 'success' && (
            <div className="flex items-center gap-1 text-green-700">
              <span className="font-semibold">{log.cardsGenerated} 张卡牌</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {log.error && (
        <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="h-4 w-4" />
            <span className="font-semibold">错误:</span>
            <span>{log.error}</span>
          </div>
        </div>
      )}

      {/* Warnings */}
      {log.warnings.length > 0 && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-700" />
            <span className="font-semibold text-yellow-700">{log.warnings.length} 个警告</span>
          </div>
          <ul className="text-sm space-y-1 ml-6 list-disc">
            {log.warnings.slice(0, 3).map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
            {log.warnings.length > 3 && (
              <li className="text-muted-foreground">还有 {log.warnings.length - 3} 个...</li>
            )}
          </ul>
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="space-y-2">
        {/* Text Window */}
        <CollapsibleSection
          title="文本窗口"
          subtitle={`${log.windowSize} 字符`}
          isExpanded={expandedSections['textWindow']}
          onToggle={() => toggleSection('textWindow')}
          onCopy={() => copyToClipboard(log.textWindow, 'textWindow')}
          isCopied={copiedSection === 'textWindow'}
        >
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-40">
            {log.textWindow}
          </pre>
        </CollapsibleSection>

        {/* System Prompt */}
        <CollapsibleSection
          title="系统提示词"
          subtitle={`${log.systemPrompt.length} 字符`}
          isExpanded={expandedSections['systemPrompt']}
          onToggle={() => toggleSection('systemPrompt')}
          onCopy={() => copyToClipboard(log.systemPrompt, 'systemPrompt')}
          isCopied={copiedSection === 'systemPrompt'}
        >
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-60">
            {log.systemPrompt}
          </pre>
        </CollapsibleSection>

        {/* User Prompt */}
        <CollapsibleSection
          title="用户提示词"
          subtitle={`${log.userPrompt.length} 字符`}
          isExpanded={expandedSections['userPrompt']}
          onToggle={() => toggleSection('userPrompt')}
          onCopy={() => copyToClipboard(log.userPrompt, 'userPrompt')}
          isCopied={copiedSection === 'userPrompt'}
        >
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-60">
            {log.userPrompt}
          </pre>
        </CollapsibleSection>

        {/* AI Response */}
        {log.rawResponse && (
          <CollapsibleSection
            title="AI 响应"
            subtitle="JSON 格式"
            isExpanded={expandedSections['response']}
            onToggle={() => toggleSection('response')}
            onCopy={() => copyToClipboard(log.rawResponse, 'response')}
            isCopied={copiedSection === 'response'}
          >
            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto max-h-96">
              {log.rawResponse}
            </pre>
          </CollapsibleSection>
        )}
      </div>
    </div>
  )
}

interface CollapsibleSectionProps {
  title: string
  subtitle: string
  isExpanded: boolean
  onToggle: () => void
  onCopy: () => void
  isCopied: boolean
  children: React.ReactNode
}

function CollapsibleSection({
  title,
  subtitle,
  isExpanded,
  onToggle,
  onCopy,
  isCopied,
  children
}: CollapsibleSectionProps) {
  return (
    <div className="border rounded bg-white">
      <div
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onCopy()
          }}
          className="h-7 px-2"
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      {isExpanded && (
        <div className="p-2 border-t">
          {children}
        </div>
      )}
    </div>
  )
}
