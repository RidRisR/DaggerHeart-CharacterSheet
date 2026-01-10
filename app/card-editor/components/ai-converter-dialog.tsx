'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Settings, Upload, Zap, FileCheck, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { FileUploadZone } from './file-upload-zone'
import { useCardEditorStore } from '../store/card-editor-store'
import { APIKeyManager } from '../services/api-key-manager'
import { AIService } from '../services/ai-service'
import { StreamingBatchProcessor } from '../services/streaming-batch-processor'
import { ResultParser } from '../services/result-parser'
import type { AIServiceConfig } from '../services/ai-types'
import type { CardPackageState } from '../types'

interface AIConverterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 'upload' | 'processing' | 'preview'

interface ProcessingState {
  currentChunk: number
  totalChunks: number
  currentText: string
  estimatedTokens: number
  estimatedCost: number
}

export function AIConverterDialog({ open, onOpenChange }: AIConverterDialogProps) {
  const { setAIConfigDialog, packageData, importPackage } = useCardEditorStore()

  // 步骤状态
  const [currentStep, setCurrentStep] = useState<Step>('upload')

  // 上传步骤状态
  const [inputText, setInputText] = useState('')

  // 处理步骤状态
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)

  // 预览步骤状态
  const [generatedPackage, setGeneratedPackage] = useState<CardPackageState | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  // 检查是否已配置API
  const checkAPIConfig = useCallback(async (): Promise<AIServiceConfig | null> => {
    try {
      const apiKeyManager = new APIKeyManager()
      const config = await apiKeyManager.loadConfig()

      if (!config) {
        return null
      }

      return config
    } catch (error) {
      console.error('[AIConverterDialog] Failed to check API config:', error)
      return null
    }
  }, [])

  // 开始处理
  const handleStartProcessing = useCallback(async () => {
    if (!inputText.trim()) {
      setProcessingError('请输入要转换的文本')
      return
    }

    // 检查API配置
    const config = await checkAPIConfig()
    if (!config) {
      setProcessingError('请先配置AI服务')
      return
    }

    setCurrentStep('processing')
    setIsProcessing(true)
    setProcessingError(null)

    try {
      const aiService = new AIService(config)
      const processor = new StreamingBatchProcessor()

      // 执行流式批量处理
      const result = await processor.process(
        inputText,
        packageData,
        aiService,
        (state) => {
          // 更新处理进度
          if (state.currentChunk) {
            const currentPos = state.currentPosition ?? 0
            const inputTokens = aiService.estimateTokens(inputText)
            setProcessingState({
              currentChunk: state.currentChunk.index + 1,
              totalChunks: state.currentChunk.total,
              currentText: inputText.substring(currentPos, currentPos + 50),
              estimatedTokens: inputTokens,
              estimatedCost: aiService.estimateCost(inputTokens, inputTokens)
            })
          }
        }
      )

      // 解析结果并提取警告
      const parser = new ResultParser()
      const parseResult = await parser.parse(result)

      setGeneratedPackage(parseResult.data as CardPackageState)
      setWarnings(parseResult.warnings.map(w => w.message))
      setCurrentStep('preview')
    } catch (error) {
      console.error('[AIConverterDialog] Processing failed:', error)
      setProcessingError(error instanceof Error ? error.message : '处理失败')
    } finally {
      setIsProcessing(false)
    }
  }, [inputText, packageData, checkAPIConfig])

  // 应用结果
  const handleApplyResult = useCallback(() => {
    if (!generatedPackage) return

    // 使用store的导入功能合并到当前卡包
    importPackage(generatedPackage)

    // 关闭对话框
    onOpenChange(false)

    // 重置状态
    setCurrentStep('upload')
    setInputText('')
    setGeneratedPackage(null)
    setWarnings([])
  }, [generatedPackage, importPackage, onOpenChange])

  // 重新开始
  const handleRestart = useCallback(() => {
    setCurrentStep('upload')
    setInputText('')
    setGeneratedPackage(null)
    setWarnings([])
    setProcessingState(null)
    setProcessingError(null)
  }, [])

  // 打开配置对话框
  const handleOpenConfig = useCallback(() => {
    setAIConfigDialog(true)
  }, [setAIConfigDialog])

  // 渲染步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { key: 'upload', label: '上传文本', icon: Upload },
      { key: 'processing', label: '处理中', icon: Zap },
      { key: 'preview', label: '预览结果', icon: FileCheck }
    ]

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.key
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm mt-2 font-medium">{step.label}</div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-colors ${
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 渲染上传步骤
  const renderUploadStep = () => (
    <div className="space-y-4">
      <FileUploadZone
        value={inputText}
        onChange={setInputText}
      />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>支持最多 20k 字符的文本文件</span>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenConfig}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          配置 AI 服务
        </Button>

        <Button
          onClick={handleStartProcessing}
          disabled={!inputText.trim()}
          className="flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          开始转换
        </Button>
      </div>
    </div>
  )

  // 渲染处理步骤
  const renderProcessingStep = () => {
    const progress = processingState
      ? (processingState.currentChunk / processingState.totalChunks) * 100
      : 0

    return (
      <div className="space-y-6">
        {processingError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{processingError}</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>处理进度</span>
                <span className="text-muted-foreground">
                  {processingState?.currentChunk || 0} / {processingState?.totalChunks || 0} 块
                </span>
              </div>
              <Progress value={progress} />
            </div>

            {processingState && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">当前处理文本</span>
                  <span>{processingState.currentText.substring(0, 50)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">预计 Token 数</span>
                  <span>{processingState.estimatedTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">预计费用</span>
                  <span>${processingState.estimatedCost.toFixed(4)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Zap className="h-4 w-4 mr-2 animate-pulse" />
              <span>AI 正在分析和转换文本...</span>
            </div>
          </>
        )}

        {processingError && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleRestart}>重新开始</Button>
          </div>
        )}
      </div>
    )
  }

  // 渲染预览步骤
  const renderPreviewStep = () => {
    if (!generatedPackage) return null

    const cardCounts = {
      profession: generatedPackage.profession?.length || 0,
      ancestry: generatedPackage.ancestry?.length || 0,
      community: generatedPackage.community?.length || 0,
      subclass: generatedPackage.subclass?.length || 0,
      domain: generatedPackage.domain?.length || 0,
      variant: generatedPackage.variant?.length || 0
    }

    const totalCards = Object.values(cardCounts).reduce((sum, count) => sum + count, 0)

    return (
      <div className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="font-medium">生成结果摘要</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">职业卡牌</span>
              <span>{cardCounts.profession}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">血统卡牌</span>
              <span>{cardCounts.ancestry}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">社群卡牌</span>
              <span>{cardCounts.community}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">子职业卡牌</span>
              <span>{cardCounts.subclass}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">领域卡牌</span>
              <span>{cardCounts.domain}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">变体卡牌</span>
              <span>{cardCounts.variant}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>总计</span>
              <span>{totalCards}</span>
            </div>
          </div>
        </div>

        {warnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">发现 {warnings.length} 个警告</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {warnings.slice(0, 5).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
                {warnings.length > 5 && (
                  <li className="text-muted-foreground">还有 {warnings.length - 5} 个警告...</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={handleRestart}>
            重新开始
          </Button>
          <Button onClick={handleApplyResult} className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            应用到当前卡包
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI 文本转换器</DialogTitle>
          <DialogDescription>
            使用 AI 将文本描述自动转换为 DaggerHeart 卡牌数据
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {renderStepIndicator()}

          <div className="mt-6">
            {currentStep === 'upload' && renderUploadStep()}
            {currentStep === 'processing' && renderProcessingStep()}
            {currentStep === 'preview' && renderPreviewStep()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
