'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectableCard } from '@/components/ui/selectable-card'
import { AlertCircle, Upload, FileText, CheckCircle, XCircle, Info, Eye, RefreshCw, Home, Power, PowerOff } from 'lucide-react'
import {
  importCustomCards,
  getCustomCardBatches,
  getCustomCardStats,
  removeCustomCardBatch,
  clearAllCustomCards,
  getCustomCardStorageInfo,
  getCustomCards,
  type ImportData,
  type ImportResult,
  type ExtendedStandardCard
} from '@/card/index'
import { CustomCardManager } from '@/card/custom-card-manager'

interface ImportStatus {
  isImporting: boolean
  result: ImportResult | ImportResultWithFileName[] | null
  error: string | null
}

interface ViewCardModalProps {
  cards: ExtendedStandardCard[]
  isOpen: boolean
  onClose: () => void
}

function ViewCardModal({ cards, isOpen, onClose }: ViewCardModalProps) {
  if (!isOpen) return null
  const gridCards = useMemo(() => cards || [], [cards])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">卡牌详情（{gridCards.length} 张）</h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {gridCards.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-8">没有找到任何卡牌</div>
            ) : (
              gridCards.map((card, index) => (
                <SelectableCard
                  key={`${card.id}-${index}`}
                  card={card}
                  onClick={() => { }}
                  isSelected={false}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 新增：用于UI显示的导入结果类型
interface ImportResultWithFileName extends ImportResult {
  fileName: string
}

export default function CardImportTestPage() {
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    isImporting: false,
    result: null,
    error: null
  })
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stats, setStats] = useState(() => ({
    totalCards: 0,
    totalBatches: 0,
    cardsByType: {} as Record<string, number>
  }))
  const [batches, setBatches] = useState<any[]>([])
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingCards, setViewingCards] = useState<ExtendedStandardCard[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [storageInfo, setStorageInfo] = useState(() => ({
    used: '0 KB',
    available: '0 KB',
    total: '0 KB',
    usagePercent: 0
  }))

  // 客户端初始化
  useEffect(() => {
    const initializeData = async () => {
      setIsClient(true)
      if (typeof window !== 'undefined') {
        // 确保系统初始化后再刷新数据
        const customCardManager = CustomCardManager.getInstance()
        await customCardManager.ensureInitialized()
        refreshData()
      }
    }
    initializeData()
  }, [])

  // 自动刷新数据
  useEffect(() => {
    if (autoRefresh && isClient) {
      const interval = setInterval(() => {
        refreshData()
      }, 5000) // 每5秒刷新一次
      return () => clearInterval(interval)
    }
  }, [autoRefresh, isClient])

  // 刷新统计数据
  const refreshData = () => {
    if (typeof window !== 'undefined') {
      setStats(getCustomCardStats())
      setBatches(getCustomCardBatches())
      setStorageInfo(getCustomCardStorageInfo())
    }
  }

  // 返回主站
  const goBackToMain = () => {
    refreshData()
    window.location.href = `../车卡器入口.html`;
  }

  // 查看卡牌
  const handleViewCards = (batchId?: string) => {
    const customCards = getCustomCards()
    const cardsToView = batchId
      ? customCards.filter(card => card.batchId === batchId)
      : customCards
    setViewingCards(cardsToView)
    setViewModalOpen(true)
  }


  // 切换批次启用/禁用状态
  const handleToggleBatchDisabled = async (batchId: string) => {
    try {
      const customCardManager = CustomCardManager.getInstance()
      const success = await customCardManager.toggleBatchDisabled(batchId)

      if (success) {
        // 刷新数据以反映更改
        refreshData()
      } else {
        alert('切换卡牌包状态失败')
      }
    } catch (error) {
      console.error('切换卡牌包状态时出错:', error)
      alert('切换卡牌包状态时出错')
    }
  }

  // 获取批次禁用状态
  const getBatchDisabledStatus = (batchId: string): boolean => {
    try {
      const customCardManager = CustomCardManager.getInstance()
      return customCardManager.getBatchDisabledStatus(batchId)
    } catch (error) {
      console.error('获取卡牌包状态时出错:', error)
      return false
    }
  }

  // 处理文件选择
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArr = Array.from(files)
    // 检查所有文件类型
    const invalid = fileArr.find(f => !f.name.endsWith('.json'))
    if (invalid) {
      setImportStatus({
        isImporting: false,
        result: null,
        error: '请选择 JSON 文件（可多选）'
      })
      return
    }

    handleMultiFileImport(fileArr)
  }

  // 支持多文件批量导入
  const handleMultiFileImport = async (files: File[]) => {
    setImportStatus({ isImporting: true, result: null, error: null })
    let allResults: ImportResultWithFileName[] = []
    let anyError = false
    for (const file of files) {
      try {
        const text = await file.text()
        const importData: ImportData = JSON.parse(text)
        // 只用文件名作为批次名
        const result = await importCustomCards(importData, file.name)
        allResults.push({ ...result, fileName: file.name })
        if (!result.success) anyError = true
      } catch (error) {
        allResults.push({
          success: false,
          imported: 0,
          errors: [error instanceof Error ? error.message : '文件解析失败'],
          fileName: file.name
        })
        anyError = true
      }
    }
    setImportStatus({
      isImporting: false,
      result: allResults.length === 1 ? allResults[0] : allResults,
      error: anyError ? '部分文件导入失败，请检查下方结果' : null
    })
    refreshData()
  }

  // 处理文件导入
  const handleFileImport = async (file: File) => {
    setImportStatus({ isImporting: true, result: null, error: null })

    try {
      const text = await file.text()
      const importData: ImportData = JSON.parse(text)
      const result = await importCustomCards(importData, file.name)

      setImportStatus({
        isImporting: false,
        result,
        error: null
      })

      if (result.success) {
        refreshData()
      }
    } catch (error) {
      setImportStatus({
        isImporting: false,
        result: null,
        error: error instanceof Error ? error.message : '文件解析失败'
      })
    }
  }

  // 拖拽事件处理
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  // 删除批次
  const handleRemoveBatch = (batchId: string) => {
    if (confirm('确定要删除这个卡牌包吗？这将删除卡牌包中的所有卡牌。')) {
      const success = removeCustomCardBatch(batchId)
      if (success) {
        refreshData()
        alert('卡牌包删除成功')
      } else {
        alert('卡牌包删除失败')
      }
    }
  }

  // 清空所有自定义卡牌
  const handleClearAll = () => {
    if (confirm('确定要清空所有自定义卡牌吗？此操作不可恢复。')) {
      try {
        clearAllCustomCards()
        refreshData()
        alert('所有自定义卡牌已清空')
      } catch (error) {
        alert('清空失败: ' + (error instanceof Error ? error.message : String(error)))
      }
    }
  }

  // 清空所有localStorage数据
  const handleClearAllLocalStorage = async () => {
    if (confirm('⚠️ 危险操作确认 ⚠️\n\n确定要清空所有本地存储数据吗？\n\n这将删除：\n• 所有自定义卡牌\n• 内置卡牌缓存\n• 所有角色数据和角色卡\n• 其他所有本地数据\n\n此操作不可恢复！请确保您已备份重要数据。')) {
      try {
        // 清空所有localStorage数据
        localStorage.clear()

        // 强制重新初始化CustomCardManager
        const customCardManager = CustomCardManager.getInstance()
        await customCardManager.forceReinitialize()

        // 刷新数据显示
        refreshData()

        alert('所有本地存储数据已清空！页面将自动刷新。')

        // 延迟刷新页面以确保用户看到提示
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch (error) {
        alert('清空数据失败: ' + (error instanceof Error ? error.message : String(error)))
        console.error('清空localStorage数据失败:', error)
      }
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">卡牌管理</h1>
            <p className="text-muted-foreground">
              自定义卡牌导入功能，支持卡牌包管理，所有的数据在您的本地保存
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              刷新数据
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goBackToMain}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white border-green-700"
            >
              <Home className="h-4 w-4" />
              返回主站
            </Button>
          </div>
        </div>

        {/* 快速操作栏 */}
        <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewCards()}
            disabled={stats.totalCards === 0}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            查看所有卡牌 ({stats.totalCards})
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAllLocalStorage}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            强制初始化
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-muted-foreground">
              自动刷新数据
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：导入区域 */}
        <div className="space-y-6">
          {/* 文件上传区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                卡牌导入
              </CardTitle>
              <CardDescription>
                拖拽或选择 JSON 文件导入自定义卡牌数据<br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  支持卡牌类型格式：profession (职业), ancestry (血统), community (社群), subclass (子职业), domain (领域)，variant（任意）
                </span>
                <span className="text-xs text-muted-foreground mt-1 block">
                  <a
                    href="https://github.com/RidRisR/DaggerHeart-CharacterSheet/blob/main/自定义卡包示例/用户指南.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    点击这里查看用户指南和示例卡牌包
                  </a>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 拖拽上传区域 */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  } ${importStatus.isImporting ? 'opacity-50 pointer-events-none' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  拖拽 JSON 文件到此处
                </p>
                <p className="text-muted-foreground mb-4">
                  或点击下方按钮选择文件
                </p>
                <Button
                  onClick={() => {
                    // 清空文件输入框的值，确保相同文件也能触发onChange
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={importStatus.isImporting}
                  variant="outline"
                >
                  选择文件
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* 导入状态 */}
              {importStatus.isImporting && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                  <span className="text-blue-700">正在导入...</span>
                </div>
              )}

              {/* 导入结果 */}
              {Array.isArray(importStatus.result) ? (
                <div className="space-y-2">
                  {(importStatus.result as ImportResultWithFileName[]).map((res, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${res.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {res.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`font-medium ${res.success ? 'text-green-700' : 'text-red-700'
                          }`}>
                          {res.success ? '导入成功' : '导入失败'}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">{res.fileName}</span>
                      </div>
                      {res.success && (
                        <p className="text-green-600 text-sm">
                          成功导入 {res.imported} 张卡牌
                          {res.batchId && ` (批次ID: ${res.batchId})`}
                        </p>
                      )}
                      {res.errors && res.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-red-600 text-sm font-medium mb-1">错误信息：</p>
                          <ul className="text-red-600 text-sm list-disc list-inside">
                            {res.errors.map((error: string, i: number) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {res.duplicateIds && res.duplicateIds.length > 0 && (
                        <div className="mt-2">
                          <p className="text-red-600 text-sm font-medium mb-1">重复的ID：</p>
                          <div className="flex flex-wrap gap-1">
                            {res.duplicateIds.map((id: string, i: number) => (
                              <Badge key={i} variant="destructive" className="text-xs">
                                {id}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                importStatus.result && (
                  <div className={`p-3 rounded-lg ${importStatus.result.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {importStatus.result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-medium ${importStatus.result.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                        {importStatus.result.success ? '导入成功' : '导入失败'}
                      </span>
                      {'fileName' in importStatus.result && (
                        <span className="ml-2 text-xs text-muted-foreground">{(importStatus.result as any).fileName}</span>
                      )}
                    </div>
                    {importStatus.result.success && (
                      <p className="text-green-600 text-sm">
                        成功导入 {importStatus.result.imported} 张卡牌
                        {importStatus.result.batchId && ` (批次ID: ${importStatus.result.batchId})`}
                      </p>
                    )}
                    {importStatus.result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-600 text-sm font-medium mb-1">错误信息：</p>
                        <ul className="text-red-600 text-sm list-disc list-inside">
                          {importStatus.result.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {importStatus.result.duplicateIds && importStatus.result.duplicateIds.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-600 text-sm font-medium mb-1">重复的ID：</p>
                        <div className="flex flex-wrap gap-1">
                          {importStatus.result.duplicateIds.map((id, index) => (
                            <Badge key={index} variant="destructive" className="text-xs">
                              {id}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* 导入错误 */}
              {importStatus.error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">{importStatus.error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 存储信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                存储使用情况
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>已使用:</span>
                  <span className="font-mono">{storageInfo.used}</span>
                </div>
                <div className="flex justify-between">
                  <span>总容量:</span>
                  <span className="font-mono">{storageInfo.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>剩余:</span>
                  <span className="font-mono">{storageInfo.available}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${storageInfo.usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {storageInfo.usagePercent.toFixed(1)}% 已使用
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：批次管理 */}
        <div className="space-y-6">
          {/* 批次管理 */}
          <Card>
            <CardHeader>
              <CardTitle>卡牌包管理</CardTitle>
              <CardDescription>管理已导入的卡牌包</CardDescription>
            </CardHeader>
            {/* 修改卡牌包管理部分的布局 */}
            <CardContent>
              {batches.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无导入的批次</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    导入一些卡牌来开始使用卡牌包管理功能
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div key={batch.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      {/* 调整按钮位置，将三个小图标放在名称同一行最右边 */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={getBatchDisabledStatus(batch.id) ? "destructive" : "default"}
                            className="text-xs"
                          >
                            {getBatchDisabledStatus(batch.id) ? "未启用" : "已启用"}
                          </Badge>
                          <h4 className="font-medium text-lg">{batch.name}</h4>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewCards(batch.id)}
                            className="h-8 px-2"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={getBatchDisabledStatus(batch.id) ? "outline" : "secondary"}
                            onClick={() => handleToggleBatchDisabled(batch.id)}
                            className="h-8 px-2"
                            title={getBatchDisabledStatus(batch.id) ? "启用批次" : "禁用批次"}
                          >
                            {getBatchDisabledStatus(batch.id) ? (
                              <PowerOff className="h-3 w-3" />
                            ) : (
                              <Power className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveBatch(batch.id)}
                            className="h-8 px-2"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">卡牌数量:</span> {batch.cardCount}
                        </div>
                        <div>
                          <span className="font-medium">导入时间:</span> {new Date(batch.importTime).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">文件名:</span> {batch.fileName}
                        </div>
                        <div>
                          <span className="font-medium">批次ID:</span>
                          <code className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">{batch.id}</code>
                        </div>
                        {batch.cardTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-sm font-medium text-muted-foreground">类型:</span>
                            {batch.cardTypes.map((type: string) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {batches.length > 0 && (
                <div className="pt-4 border-t mt-4">
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={handleClearAll}
                  >
                    清空所有自定义卡牌
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 卡牌查看模态框 */}
      <ViewCardModal
        cards={viewingCards}
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
      />
    </div>
  )
}
