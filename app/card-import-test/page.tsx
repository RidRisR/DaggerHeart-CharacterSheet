'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectableCard } from '@/components/ui/selectable-card'
import { AlertCircle, Upload, FileText, CheckCircle, XCircle, Info, Download, Eye, RefreshCw, Copy, Home } from 'lucide-react'
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
} from '@/data/card/index'

interface ImportStatus {
  isImporting: boolean
  result: ImportResult | null
  error: string | null
}

interface ViewCardModalProps {
  cards: ExtendedStandardCard[]
  isOpen: boolean
  onClose: () => void
}

function ViewCardModal({ cards, isOpen, onClose }: ViewCardModalProps) {
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-7xl max-h-[90vh] overflow-auto w-full">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h2 className="text-lg font-semibold">卡牌详情 ({cards.length} 张)</h2>
                  <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                          {cards.filter(card => card.source === 'custom').length} 自定义 / {cards.filter(card => card.source !== 'custom').length} 内置
                      </Badge>
                      <Button onClick={onClose} variant="ghost" size="sm">
                          <XCircle className="h-4 w-4" />
                      </Button>
                  </div>
              </div>
              <div className="p-6">
                  {cards.length === 0 ? (
                      <div className="text-center py-12">
                          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground text-lg">没有找到任何卡牌</p>
                      </div>
                  ) : (
                      <div className="flex flex-wrap gap-4 justify-center">
                          {cards.map((card) => (
                              <div key={card.id} className="relative">
                                  <SelectableCard
                                      card={card}
                                      onClick={(cardId) => setSelectedCardId(cardId === selectedCardId ? null : cardId)}
                                      isSelected={selectedCardId === card.id}
                                  />
                                  <div className="absolute top-2 right-2">
                                      <Badge
                                          variant={card.source === 'custom' ? 'secondary' : 'default'}
                                          className="text-xs shadow-sm"
                                      >
                                          {card.source === 'custom' ? '自定义' : '内置'}
                                      </Badge>
                                  </div>
                                  {card.batchId && (
                                      <div className="absolute bottom-2 left-2">
                                          <Badge variant="outline" className="text-xs opacity-75">
                                              {card.batchId.slice(0, 8)}...
                                          </Badge>
                                      </div>
                                  )}
                  </div>
                          ))}
                      </div>
                  )}
        </div>
      </div>
    </div>
  )
}

export default function CardImportTestPage() {
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    isImporting: false,
    result: null,
    error: null
  })
  const [batchName, setBatchName] = useState('')
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
    setIsClient(true)
    if (typeof window !== 'undefined') {
      refreshData()
    }
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

  // 查看卡牌
  const handleViewCards = (batchId?: string) => {
    const customCards = getCustomCards()
    const cardsToView = batchId 
      ? customCards.filter(card => card.batchId === batchId)
      : customCards
    setViewingCards(cardsToView)
    setViewModalOpen(true)
  }

  // 导出批次为JSON
  const handleExportBatch = (batchId: string) => {
    const customCards = getCustomCards()
    const batchCards = customCards.filter(card => card.batchId === batchId)
    const batch = batches.find(b => b.id === batchId)
    
    if (batchCards.length === 0) {
      alert('该批次没有卡牌可导出')
      return
    }

    const exportData = {
      name: batch?.name || batchId,
      version: "1.0.0",
      description: `导出自批次: ${batch?.name || batchId}`,
      author: "DaggerHeart Character Sheet",
      exportTime: new Date().toISOString(),
      cards: batchCards.map(card => {
        // 移除内部字段
        const { source, batchId: _, standarized, ...exportCard } = card
        return exportCard
      })
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${batch?.name || batchId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 复制批次ID
  const handleCopyBatchId = (batchId: string) => {
    navigator.clipboard.writeText(batchId).then(() => {
      alert('批次ID已复制到剪贴板')
    }).catch(() => {
      alert('复制失败')
    })
  }

  // 生成示例JSON文件
  const handleDownloadSample = () => {
    const sampleData = {
      name: "示例卡牌包",
      version: "1.0.0",
      description: "这是一个示例卡牌包，展示了自定义卡牌的数据格式",
      author: "示例作者",
      cards: [
        {
              id: "sample_profession_1",
          type: "profession",
              name: "示例战士",
          class: "战士",
          level: 1,
              description: "强壮的近战战士，擅长使用各种武器和盔甲",
              hint: "战士是前线的守护者，具有强大的生存能力",
          cardSelectDisplay: {
            item1: "起始生命: 25",
              item2: "起始闪避: 12", 
                  item3: "起始物品: 长剑与盾牌",
                  item4: "希望特性: 战斗意志"
              },
              professionSpecial: {
                  "起始生命": 25,
                  "起始闪避": 12,
                  "起始物品": "长剑与盾牌",
                  "希望特性": "战斗意志"
          }
        },
        {
            id: "sample_ancestry_1", 
          type: "ancestry",
            name: "示例精灵",
          class: "精灵",
            description: "优雅敏捷的森林居民，天生具有魔法天赋",
            hint: "精灵拥有敏锐的感知和自然魔法能力",
          cardSelectDisplay: {
            item1: "种族特性: 敏锐感知",
                  item2: "天赋能力: 自然魔法",
                  item3: "文化背景: 森林守护者",
                  item4: "额外语言: 精灵语"
              }
          },
          {
              id: "sample_community_1",
              type: "community",
              name: "示例学者议会",
              class: "学者",
              description: "致力于知识传承的学者组织",
              hint: "学者议会的成员擅长研究和魔法理论",
              cardSelectDisplay: {
                  item1: "社群特性: 博学多识",
                  item2: "资源获取: 图书馆通行证",
                  item3: "社交网络: 学者联盟",
                  item4: "特殊技能: 古文献解读"
              }
          },
          {
              id: "sample_subclass_1",
              type: "subclass",
              name: "示例圣骑士",
              class: "圣骑士",
              level: 2,
              description: "信仰坚定的神圣战士",
              hint: "圣骑士结合了战士的力量和神术的神圣",
              cardSelectDisplay: {
                  item1: "子职业特性: 神圣打击",
                  item2: "法术能力: 治疗术",
                  item3: "特殊装备: 圣徽",
                  item4: "誓言能力: 保护无辜"
              }
          },
          {
              id: "sample_domain_1",
              type: "domain",
              name: "示例火焰领域",
              class: "元素",
              level: 1,
              description: "掌控火焰力量的魔法领域",
              hint: "火焰领域提供强大的攻击性法术",
              cardSelectDisplay: {
                  item1: "领域法术: 火球术",
                  item2: "元素抗性: 火焰免疫",
                  item3: "特殊能力: 火焰护盾",
                  item4: "进阶法术: 火焰风暴"
          }
        }
      ]
    }

    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-cards.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 处理文件选择
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.name.endsWith('.json')) {
      setImportStatus({
        isImporting: false,
        result: null,
        error: '请选择一个 JSON 文件'
      })
      return
    }

    handleFileImport(file)
  }

  // 处理文件导入
  const handleFileImport = async (file: File) => {
    setImportStatus({ isImporting: true, result: null, error: null })

    try {
      const text = await file.text()
      const importData: ImportData = JSON.parse(text)
      
      const result = await importCustomCards(importData, batchName || file.name)
      
      setImportStatus({
        isImporting: false,
        result,
        error: null
      })

      if (result.success) {
        setBatchName('')
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  // 删除批次
  const handleRemoveBatch = (batchId: string) => {
    if (confirm('确定要删除这个批次吗？这将删除批次中的所有卡牌。')) {
      const success = removeCustomCardBatch(batchId)
      if (success) {
        refreshData()
        alert('批次删除成功')
      } else {
        alert('批次删除失败')
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">自定义卡牌导入测试</h1>
            <p className="text-muted-foreground">
              测试自定义卡牌导入功能，支持批次管理和数据统计
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              返回主页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              刷新数据
            </Button>
          </div>
        </div>
        
        {/* 快速操作栏 */}
        <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            下载示例JSON
          </Button>
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
                                  支持的卡牌类型: profession (职业), ancestry (血统), community (社群), subclass (子职业), domain (领域)
                              </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 批次名称输入 */}
              <div>
                <Label htmlFor="batchName">批次名称（可选）</Label>
                <Input
                  id="batchName"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="输入批次名称或留空使用文件名"
                  disabled={importStatus.isImporting}
                />
              </div>

              {/* 拖拽上传区域 */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
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
                  onClick={() => fileInputRef.current?.click()}
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
              {importStatus.result && (
                <div className={`p-3 rounded-lg ${
                  importStatus.result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {importStatus.result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      importStatus.result.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {importStatus.result.success ? '导入成功' : '导入失败'}
                    </span>
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

        {/* 右侧：统计和管理 */}
        <div className="space-y-6">
          {/* 统计信息 */}
          <Card>
            <CardHeader>
              <CardTitle>统计信息</CardTitle>
              <CardDescription>自定义卡牌的统计数据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalCards}</div>
                  <div className="text-sm text-blue-600">总卡牌数</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.totalBatches}</div>
                  <div className="text-sm text-green-600">批次数量</div>
                </div>
              </div>

              {/* 按类型统计 */}
              {Object.keys(stats.cardsByType).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">按类型分布</h4>
                  <div className="space-y-1">
                    {Object.entries(stats.cardsByType).map(([type, count]: [string, number]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="capitalize">{type}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 批次管理 */}
          <Card>
            <CardHeader>
              <CardTitle>批次管理</CardTitle>
              <CardDescription>管理已导入的卡牌批次</CardDescription>
            </CardHeader>
            <CardContent>
              {batches.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无导入的卡牌批次</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    导入一些卡牌来开始使用批次管理功能
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div key={batch.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-lg">{batch.name}</h4>
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
                            variant="outline"
                            onClick={() => handleExportBatch(batch.id)}
                            className="h-8 px-2"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyBatchId(batch.id)}
                            className="h-8 px-2"
                          >
                            <Copy className="h-3 w-3" />
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
                      <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">卡牌数量:</span> {batch.cardCount}
                        </div>
                        <div>
                          <span className="font-medium">导入时间:</span> {new Date(batch.importTime).toLocaleString()}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">文件名:</span> {batch.fileName}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">批次ID:</span> 
                          <code className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">{batch.id}</code>
                        </div>
                      </div>
                      {batch.cardTypes.length > 0 && (
                        <div className="flex gap-1 mt-3">
                          <span className="text-sm font-medium text-muted-foreground">类型:</span>
                          <div className="flex flex-wrap gap-1">
                            {batch.cardTypes.map((type: string) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
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
                    <XCircle className="h-4 w-4 mr-2" />
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
