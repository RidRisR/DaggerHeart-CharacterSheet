'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Settings, CheckCircle2, XCircle } from 'lucide-react'
import { APIKeyManager } from '@/app/card-editor/services/api-key-manager'
import { AI_PROVIDERS, type AIServiceConfig } from '@/app/card-editor/services/ai-types'

interface ConfigPanelProps {
  onConfigChange: (config: AIServiceConfig) => void
}

export function ConfigPanel({ onConfigChange }: ConfigPanelProps) {
  const [config, setConfig] = useState<AIServiceConfig>({
    provider: 'volcengine',
    apiKey: '',
    baseURL: AI_PROVIDERS.volcengine.baseURL,
    model: AI_PROVIDERS.volcengine.models[0]
  })

  const [isConfigured, setIsConfigured] = useState(false)

  // 加载已保存的配置
  useEffect(() => {
    const loadConfig = async () => {
      const keyManager = new APIKeyManager()
      const saved = await keyManager.loadConfig()
      if (saved) {
        setConfig(saved)
        setIsConfigured(true)
        onConfigChange(saved)
      }
    }
    loadConfig()
  }, [onConfigChange])

  // 提供商切换
  const handleProviderChange = (provider: AIServiceConfig['provider']) => {
    const providerConfig = AI_PROVIDERS[provider]
    const newConfig = {
      provider,
      apiKey: config.apiKey,
      baseURL: providerConfig.baseURL,
      model: providerConfig.models[0] || ''
    }
    setConfig(newConfig)
  }

  // 应用配置
  const handleApply = async () => {
    if (!config.apiKey) {
      alert('请输入 API Key')
      return
    }

    const keyManager = new APIKeyManager()
    await keyManager.saveConfig(config)
    setIsConfigured(true)
    onConfigChange(config)
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-lg font-semibold">API 配置</h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isConfigured ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-green-600">已配置</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-600">未配置</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>提供商</Label>
          <Select value={config.provider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="volcengine">火山引擎豆包</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>模型</Label>
          <Input
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            placeholder="模型名称"
          />
        </div>

        <div className="col-span-2">
          <Label>API Key</Label>
          <Input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder="输入 API Key"
          />
        </div>

        <div className="col-span-2">
          <Label>Base URL</Label>
          <Input
            value={config.baseURL}
            onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="col-span-2">
          <Button onClick={handleApply} className="w-full">
            应用配置
          </Button>
        </div>
      </div>
    </div>
  )
}
