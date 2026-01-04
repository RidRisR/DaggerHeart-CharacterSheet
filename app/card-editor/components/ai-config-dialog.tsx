'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { APIKeyManager } from '../services/api-key-manager'
import { AIService } from '../services/ai-service'
import { AI_PROVIDERS, type AIServiceConfig } from '../services/ai-types'

interface AIConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIConfigDialog({ open, onOpenChange }: AIConfigDialogProps) {
  const [config, setConfig] = useState<AIServiceConfig>({
    provider: 'volcengine',
    apiKey: '',
    baseURL: AI_PROVIDERS.volcengine.baseURL,
    model: AI_PROVIDERS.volcengine.models[0]
  })

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 加载已保存的配置
  useEffect(() => {
    if (open) {
      const loadSavedConfig = async () => {
        const keyManager = new APIKeyManager()
        const saved = await keyManager.loadConfig()
        if (saved) {
          setConfig(saved)
        }
      }
      loadSavedConfig()
    }
  }, [open])

  // 提供商切换
  const handleProviderChange = (provider: AIServiceConfig['provider']) => {
    const providerConfig = AI_PROVIDERS[provider]
    setConfig({
      provider,
      apiKey: config.apiKey, // 保留API Key
      baseURL: providerConfig.baseURL,
      model: providerConfig.models[0] || ''
    })
    setTestStatus('idle')
  }

  // 测试连接
  const handleTest = async () => {
    if (!config.apiKey) {
      setTestStatus('error')
      setTestMessage('请输入 API Key')
      return
    }

    setTestStatus('testing')
    setTestMessage('正在连接...')

    try {
      const aiService = new AIService(config)
      const result = await aiService.testConnection()

      if (result.success) {
        setTestStatus('success')
        setTestMessage('连接成功！')
      } else {
        setTestStatus('error')
        setTestMessage(result.message || '连接失败')
      }
    } catch (error) {
      setTestStatus('error')
      setTestMessage(error instanceof Error ? error.message : '连接失败')
    }
  }

  // 保存配置
  const handleSave = async () => {
    if (!config.apiKey) {
      setTestStatus('error')
      setTestMessage('请输入 API Key')
      return
    }

    setIsSaving(true)
    try {
      const keyManager = new APIKeyManager()
      await keyManager.saveConfig(config)

      setTestStatus('success')
      setTestMessage('配置已保存')

      // 延迟关闭对话框
      setTimeout(() => {
        onOpenChange(false)
      }, 1000)
    } catch (error) {
      setTestStatus('error')
      setTestMessage(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const currentProvider = AI_PROVIDERS[config.provider]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI 服务配置</DialogTitle>
          <DialogDescription>
            配置 AI 服务用于文本转换功能。支持 OpenAI、Claude、火山引擎等兼容服务。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 提供商选择 */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI 提供商</Label>
            <Select value={config.provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="claude">Claude (OpenAI 兼容)</SelectItem>
                <SelectItem value="volcengine">火山引擎豆包 (Volcengine Ark)</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseURL">Base URL</Label>
            <Input
              id="baseURL"
              type="url"
              value={config.baseURL}
              onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
              placeholder="https://api.openai.com/v1"
              disabled={config.provider !== 'custom'}
            />
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sk-..."
            />
            <p className="text-xs text-muted-foreground">
              API Key 将使用加密方式存储在本地浏览器中
            </p>
          </div>

          {/* 模型选择 */}
          <div className="space-y-2">
            <Label htmlFor="model">模型</Label>
            {currentProvider.models.length > 0 ? (
              <Select
                value={config.model}
                onValueChange={(model) => setConfig({ ...config, model })}
              >
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentProvider.models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="model"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="gpt-4o"
              />
            )}
          </div>

          {/* 测试状态 */}
          {testStatus !== 'idle' && (
            <Alert variant={testStatus === 'error' ? 'destructive' : 'default'}>
              {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
              {testStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {testStatus === 'error' && <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{testMessage}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleTest} disabled={testStatus === 'testing'}>
            {testStatus === 'testing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            测试连接
          </Button>
          <Button onClick={handleSave} disabled={isSaving || testStatus === 'testing'}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存配置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
