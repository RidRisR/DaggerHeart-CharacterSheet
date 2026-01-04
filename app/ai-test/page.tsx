'use client'

/**
 * AI文本转换工具 - 底层服务测试页面
 *
 * 测试页面,用于验证底层服务功能
 * 访问: http://localhost:3000/ai-test
 */

import { useState } from 'react'
import { APIKeyManager } from '@/app/card-editor/services/api-key-manager'
import { FileProcessor } from '@/app/card-editor/services/file-processor'
import { AIService } from '@/app/card-editor/services/ai-service'
import { AIPromptBuilder } from '@/app/card-editor/services/ai-prompt-builder'
import { mergeCardData, countCards, countCardsByType } from '@/app/card-editor/services/json-merger'
import { resultParser } from '@/app/card-editor/services/result-parser'
import { StreamingBatchProcessor } from '@/app/card-editor/services/streaming-batch-processor'
import type { AIServiceConfig, ProcessState } from '@/app/card-editor/services/ai-types'

export default function AITestPage() {
  // API配置状态
  const [config, setConfig] = useState<AIServiceConfig>({
    provider: 'openai',
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  })
  const [testResult, setTestResult] = useState<string>('')

  // 文件处理状态
  const [fileText, setFileText] = useState<string>('')
  const [fileInfo, setFileInfo] = useState<string>('')

  // JSON合并测试
  const [mergeResult, setMergeResult] = useState<string>('')

  // AI服务测试
  const [aiInput, setAiInput] = useState<string>('')
  const [aiOutput, setAiOutput] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)

  // 提示词测试
  const [promptOutput, setPromptOutput] = useState<string>('')

  // 结果解析测试
  const [parseOutput, setParseOutput] = useState<string>('')

  // 流式处理测试
  const [streamText, setStreamText] = useState<string>('')
  const [streamProgress, setStreamProgress] = useState<ProcessState | null>(null)
  const [streamResult, setStreamResult] = useState<string>('')
  const [streamLoading, setStreamLoading] = useState(false)

  const apiKeyManager = new APIKeyManager()
  const fileProcessor = new FileProcessor()

  // ==================== API配置测试 ====================

  const handleSaveConfig = async () => {
    try {
      await apiKeyManager.saveConfig(config)
      setTestResult('✅ 配置保存成功!')
      console.log('[Test] Config saved:', { ...config, apiKey: 'sk-***' })
    } catch (error) {
      setTestResult(`❌ 保存失败: ${error}`)
      console.error('[Test] Save config failed:', error)
    }
  }

  const handleLoadConfig = async () => {
    try {
      const loaded = await apiKeyManager.loadConfig()
      if (loaded) {
        setConfig(loaded)
        setTestResult('✅ 配置读取成功!')
        console.log('[Test] Config loaded:', { ...loaded, apiKey: 'sk-***' })
      } else {
        setTestResult('⚠️ 未找到已保存的配置')
      }
    } catch (error) {
      setTestResult(`❌ 读取失败: ${error}`)
      console.error('[Test] Load config failed:', error)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTestResult('🔄 测试连接中...')
      const aiService = new AIService(config)
      const result = await aiService.testConnection()
      setTestResult(result.success ? `✅ ${result.message}` : `❌ ${result.message}`)
      console.log('[Test] Connection test:', result)
    } catch (error) {
      setTestResult(`❌ 测试失败: ${error}`)
      console.error('[Test] Connection test failed:', error)
    }
  }

  // ==================== 文件处理测试 ====================

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setFileInfo(`📄 文件名: ${file.name}\n📦 大小: ${fileProcessor.formatFileSize(file.size)}\n🏷️ 类型: ${file.type}`)

      const text = await fileProcessor.extractText(file)
      setFileText(text)
      setFileInfo(prev => `${prev}\n✅ 文件读取成功!\n📊 字符数: ${text.length}`)
      console.log('[Test] File processed:', { name: file.name, size: file.size, length: text.length })
    } catch (error) {
      setFileInfo(`❌ 文件读取失败: ${error}`)
      console.error('[Test] File processing failed:', error)
    }
  }

  // ==================== JSON合并测试 ====================

  const testMerge1 = () => {
    const existing = {}
    const incoming = {}
    const result = mergeCardData(existing, incoming)
    setMergeResult(`测试场景1: 合并空数据\n${JSON.stringify(result, null, 2)}`)
    console.log('[Test] Merge empty:', result)
  }

  const testMerge2 = () => {
    const existing = {
      profession: [{ id: '1', 名称: '战士', 简介: '' }]
    }
    const incoming = {
      profession: [{ id: '1', 名称: '战士', 简介: '近战专家' }]
    }
    const result = mergeCardData(existing, incoming, { conflictStrategy: 'merge' })
    setMergeResult(`测试场景2: 合并相同ID (merge策略)\n${JSON.stringify(result, null, 2)}`)
    console.log('[Test] Merge with same ID:', result)
  }

  const testMerge3 = () => {
    const existing = {
      customFieldDefinitions: { professions: ['战士', '法师'] }
    }
    const incoming = {
      customFieldDefinitions: { professions: ['法师', '游侠'] }
    }
    const result = mergeCardData(existing, incoming)
    setMergeResult(`测试场景3: customFieldDefinitions去重\n${JSON.stringify(result, null, 2)}`)
    console.log('[Test] Merge customFieldDefinitions:', result)
  }

  // ==================== AI服务测试 ====================

  const handleAIGenerate = async () => {
    if (!config.apiKey) {
      setAiOutput('❌ 请先配置API Key')
      return
    }

    try {
      setAiLoading(true)
      setAiOutput('🔄 AI生成中...')

      const aiService = new AIService(config)
      const promptBuilder = new AIPromptBuilder()

      const systemPrompt = await promptBuilder.buildSystemPrompt()
      const userPrompt = await promptBuilder.buildUserPrompt(aiInput, {}, true, 0, aiInput.length)

      const response = await aiService.generate(systemPrompt, userPrompt)

      setAiOutput(`✅ AI生成成功!\n\n识别卡牌数: ${response.cards.length}\n处理到: ${response.metadata.processedUpTo}\n置信度: ${response.metadata.confidence}\n\n完整响应:\n${JSON.stringify(response, null, 2)}`)
      console.log('[Test] AI generate:', response)
    } catch (error) {
      setAiOutput(`❌ AI生成失败: ${error}`)
      console.error('[Test] AI generate failed:', error)
    } finally {
      setAiLoading(false)
    }
  }

  // ==================== 提示词测试 ====================

  const testSystemPrompt = async () => {
    try {
      const promptBuilder = new AIPromptBuilder()
      const prompt = await promptBuilder.buildSystemPrompt()
      setPromptOutput(`系统提示词 (${prompt.length}字符):\n\n${prompt}`)
      console.log('[Test] System prompt length:', prompt.length)
    } catch (error) {
      setPromptOutput(`❌ 生成失败: ${error}`)
      console.error('[Test] System prompt failed:', error)
    }
  }

  const testFirstPrompt = async () => {
    try {
      const promptBuilder = new AIPromptBuilder()
      const prompt = await promptBuilder.buildUserPrompt(
        aiInput || '测试文本',
        {},
        true,
        0,
        (aiInput || '测试文本').length
      )
      setPromptOutput(`首次提示词 (${prompt.length}字符):\n\n${prompt}`)
      console.log('[Test] First prompt length:', prompt.length)
    } catch (error) {
      setPromptOutput(`❌ 生成失败: ${error}`)
      console.error('[Test] First prompt failed:', error)
    }
  }

  const testSubsequentPrompt = async () => {
    try {
      const promptBuilder = new AIPromptBuilder()
      const mockContext = {
        profession: [{ 名称: '战士' }],
        customFieldDefinitions: { professions: ['战士'] }
      }
      const prompt = await promptBuilder.buildUserPrompt(
        aiInput || '测试文本',
        mockContext,
        false,
        1000,
        2000
      )
      setPromptOutput(`后续提示词 (${prompt.length}字符):\n\n${prompt}`)
      console.log('[Test] Subsequent prompt length:', prompt.length)
    } catch (error) {
      setPromptOutput(`❌ 生成失败: ${error}`)
      console.error('[Test] Subsequent prompt failed:', error)
    }
  }

  // ==================== 结果解析测试 ====================

  const testParse1 = async () => {
    const mockData = {
      name: '测试卡包',
      profession: [{ 名称: '战士', 简介: '近战专家' }]
    }
    const result = await resultParser.parse(mockData)
    setParseOutput(`解析正常数据:\n${JSON.stringify(result, null, 2)}`)
    console.log('[Test] Parse normal data:', result)
  }

  const testParse2 = async () => {
    const mockData = {
      profession: [{ 名称: '战士' }],
      _warnings: [{ severity: 'warning', path: 'profession[0]', message: '测试警告' }]
    }
    const result = await resultParser.parse(mockData)
    setParseOutput(`提取警告:\n${JSON.stringify(result, null, 2)}`)
    console.log('[Test] Parse with warnings:', result)
  }

  // ==================== 流式处理测试 ====================

  const handleStreamProcess = async () => {
    if (!config.apiKey) {
      setStreamResult('❌ 请先配置API Key')
      return
    }

    if (!streamText.trim()) {
      setStreamResult('❌ 请输入测试文本')
      return
    }

    try {
      setStreamLoading(true)
      setStreamResult('')
      setStreamProgress(null)

      const aiService = new AIService(config)
      const processor = new StreamingBatchProcessor()

      console.log('[Test] Stream processing started')

      const result = await processor.process(
        streamText,
        {},
        aiService,
        (state) => {
          setStreamProgress(state)
          console.log('[Test] Progress:', state)
        }
      )

      const totalCards = countCards(result)
      const cardsByType = countCardsByType(result)

      setStreamResult(`✅ 处理完成!\n\n总卡牌数: ${totalCards}\n按类型统计: ${JSON.stringify(cardsByType, null, 2)}\n\n完整结果:\n${JSON.stringify(result, null, 2)}`)
      console.log('[Test] Stream processing completed:', result)
    } catch (error) {
      setStreamResult(`❌ 处理失败: ${error}`)
      console.error('[Test] Stream processing failed:', error)
    } finally {
      setStreamLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold mb-4">🧪 AI文本转换工具 - 底层服务测试</h1>
          <p className="text-gray-600 mb-2">测试阶段0-3的8个服务文件</p>
          <p className="text-sm text-gray-500">
            测试文档: <code className="bg-gray-100 px-2 py-1 rounded">docs/ai-text-converter-test-plan.md</code>
          </p>
        </div>

        {/* 测试区域1: API配置 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">1️⃣ API配置测试</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">提供商</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
              >
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">模型</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">API Key</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              placeholder="sk-..."
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Base URL</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={config.baseURL}
              onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
            />
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={handleSaveConfig} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              保存配置
            </button>
            <button onClick={handleLoadConfig} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              读取配置
            </button>
            <button onClick={handleTestConnection} className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
              测试连接
            </button>
          </div>

          {testResult && (
            <div className="bg-gray-100 p-4 rounded">
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </div>
          )}
        </div>

        {/* 测试区域2: 文件处理 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">2️⃣ 文件处理测试</h2>

          <input
            type="file"
            accept=".txt,.md"
            onChange={handleFileUpload}
            className="mb-4"
          />

          {fileInfo && (
            <div className="bg-gray-100 p-4 rounded mb-4">
              <pre className="whitespace-pre-wrap text-sm">{fileInfo}</pre>
            </div>
          )}

          {fileText && (
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-bold mb-2">文件内容:</h3>
              <pre className="whitespace-pre-wrap text-sm">{fileText}</pre>
            </div>
          )}
        </div>

        {/* 测试区域3: JSON合并 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">3️⃣ JSON合并测试</h2>

          <div className="flex gap-2 mb-4">
            <button onClick={testMerge1} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              场景1: 空数据
            </button>
            <button onClick={testMerge2} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              场景2: 相同ID (merge)
            </button>
            <button onClick={testMerge3} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              场景3: 字段去重
            </button>
          </div>

          {mergeResult && (
            <div className="bg-gray-50 p-4 rounded border">
              <pre className="whitespace-pre-wrap text-sm">{mergeResult}</pre>
            </div>
          )}
        </div>

        {/* 测试区域4: AI服务 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">4️⃣ AI服务测试</h2>

          <textarea
            className="w-full border rounded px-3 py-2 mb-4"
            rows={6}
            placeholder="输入测试文本..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
          />

          <button
            onClick={handleAIGenerate}
            disabled={aiLoading}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
          >
            {aiLoading ? '生成中...' : '调用AI生成'}
          </button>

          {aiOutput && (
            <div className="bg-gray-50 p-4 rounded border mt-4">
              <pre className="whitespace-pre-wrap text-sm">{aiOutput}</pre>
            </div>
          )}
        </div>

        {/* 测试区域5: 提示词构建 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">5️⃣ 提示词构建测试</h2>

          <div className="flex gap-2 mb-4">
            <button onClick={testSystemPrompt} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              生成系统提示词
            </button>
            <button onClick={testFirstPrompt} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              生成首次提示词
            </button>
            <button onClick={testSubsequentPrompt} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              生成后续提示词
            </button>
          </div>

          {promptOutput && (
            <div className="bg-gray-50 p-4 rounded border max-h-96 overflow-auto">
              <pre className="whitespace-pre-wrap text-sm">{promptOutput}</pre>
            </div>
          )}
        </div>

        {/* 测试区域6: 结果解析 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">6️⃣ 结果解析测试</h2>

          <div className="flex gap-2 mb-4">
            <button onClick={testParse1} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
              场景1: 正常数据
            </button>
            <button onClick={testParse2} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
              场景2: 提取警告
            </button>
          </div>

          {parseOutput && (
            <div className="bg-gray-50 p-4 rounded border">
              <pre className="whitespace-pre-wrap text-sm">{parseOutput}</pre>
            </div>
          )}
        </div>

        {/* 测试区域7: 流式处理 (核心) */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-4 border-blue-500">
          <h2 className="text-2xl font-bold mb-4">7️⃣ 流式批量处理测试 ⭐核心</h2>

          <textarea
            className="w-full border rounded px-3 py-2 mb-4"
            rows={10}
            placeholder="输入测试文本 (建议800-5000字符)..."
            value={streamText}
            onChange={(e) => setStreamText(e.target.value)}
          />

          <button
            onClick={handleStreamProcess}
            disabled={streamLoading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400 mb-4"
          >
            {streamLoading ? '处理中...' : '开始处理'}
          </button>

          {streamProgress && (
            <div className="bg-blue-50 p-4 rounded border border-blue-300 mb-4">
              <h3 className="font-bold mb-2">处理进度:</h3>
              <p>阶段: {streamProgress.phase}</p>
              <p>进度: {streamProgress.progress.toFixed(1)}%</p>
              {streamProgress.currentPosition !== undefined && (
                <p>位置: {streamProgress.currentPosition} / {streamProgress.totalLength}</p>
              )}
              {streamProgress.currentChunk && (
                <p>块: {streamProgress.currentChunk.index + 1} / {streamProgress.currentChunk.total}</p>
              )}
              {streamProgress.stats && (
                <p>已识别卡牌: {streamProgress.stats.processedCards}</p>
              )}
            </div>
          )}

          {streamResult && (
            <div className="bg-gray-50 p-4 rounded border max-h-96 overflow-auto">
              <pre className="whitespace-pre-wrap text-sm">{streamResult}</pre>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="font-bold mb-2">💡 测试提示</p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>请按顺序从上到下测试各个功能</li>
            <li>打开浏览器控制台 (F12) 查看详细日志</li>
            <li>测试前请先配置有效的API Key</li>
            <li>核心测试是 <strong>7️⃣ 流式批量处理</strong>,必须通过</li>
            <li>完成后请填写测试报告: <code>docs/ai-text-converter-test-plan.md</code></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
