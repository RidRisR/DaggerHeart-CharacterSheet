'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Bug } from 'lucide-react'
import { ConfigPanel } from './components/config-panel'
import { InputPanel } from './components/input-panel'
import { ControlPanel } from './components/control-panel'
import { StatusPanel } from './components/status-panel'
import { LogPanel } from './components/log-panel'
import { ResultPanel } from './components/result-panel'
import { useAIDebug } from './hooks/use-ai-debug'
import type { AIServiceConfig } from '../card-editor/services/ai-types'

export default function AIDebugPage() {
  const router = useRouter()
  const { state, startProcessing, clearLogs } = useAIDebug()

  const [inputText, setInputText] = useState('')
  const [config, setConfig] = useState<AIServiceConfig | null>(null)

  const handleStart = async () => {
    if (!inputText.trim()) {
      alert('请输入要转换的文本')
      return
    }

    if (!config) {
      alert('请先配置 API')
      return
    }

    await startProcessing(inputText, config)
  }

  const handleClear = () => {
    if (confirm('确定要清空所有日志吗？')) {
      clearLogs()
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bug className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">AI 转换器调试工具</h1>
                <p className="text-sm text-muted-foreground">
                  查看完整的 AI 处理流程、Prompt 和响应
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push('/card-editor')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回编辑器
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        {/* Top Section: Config + Input */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <ConfigPanel onConfigChange={setConfig} />
          <div className="h-[300px]">
            <InputPanel
              value={inputText}
              onChange={setInputText}
              disabled={state.isRunning}
            />
          </div>
        </div>

        {/* Control Panel */}
        <div className="mb-6">
          <ControlPanel
            isRunning={state.isRunning}
            onStart={handleStart}
            onClear={handleClear}
            disabled={!config || !inputText.trim()}
          />
        </div>

        {/* Main Working Area */}
        <div className="grid grid-cols-5 gap-6">
          {/* Left: Status + Logs (3/5) */}
          <div className="col-span-3 space-y-4">
            {state.chunkLogs.length > 0 && <StatusPanel state={state} />}

            <div className="bg-white border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">处理日志</h2>
              <div className="max-h-[600px] overflow-y-auto pr-2">
                <LogPanel logs={state.chunkLogs} />
              </div>
            </div>
          </div>

          {/* Right: Result (2/5) */}
          <div className="col-span-2">
            <div className="sticky top-6">
              <ResultPanel data={state.accumulatedPackage} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
