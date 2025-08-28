'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  BookOpen, 
  Home, 
  Save, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Eye,
  Settings,
  FileText
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'
import type { 
  ImportData, 
  ProfessionCard,
  AncestryCard,
  RawVariantCard
} from '@/card/card-types'
import { 
  ProfessionCardForm, 
  AncestryCardForm, 
  VariantCardForm 
} from '@/components/card-editor/card-form'
import { 
  CardPreview 
} from '@/components/card-editor/card-preview'

// 卡包编辑器的状态接口
interface CardPackageState extends ImportData {
  // 扩展字段用于编辑器状态
  isModified?: boolean
  lastSaved?: Date
}

// 默认卡包数据
const defaultPackage: CardPackageState = {
  name: '新建卡包',
  version: '1.0.0',
  description: '自定义卡包描述',
  author: '',
  customFieldDefinitions: {
    professions: [],
    ancestries: [],
    communities: [],
    domains: [],
    variants: []
  },
  profession: [],
  ancestry: [],
  community: [],
  subclass: [],
  domain: [],
  variant: []
}

export default function CardEditorPage() {
  const router = useRouter()
  const [currentPackage, setCurrentPackage] = useState<CardPackageState>(defaultPackage)
  const [selectedTab, setSelectedTab] = useState('metadata')
  const [isClient, setIsClient] = useState(false)
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; card: unknown; type: string }>({
    open: false,
    card: null,
    type: ''
  })
  // 当前编辑的卡牌索引
  const [currentCardIndex, setCurrentCardIndex] = useState<{ [key: string]: number }>({
    profession: 0,
    ancestry: 0,
    variant: 0,
    community: 0,
    subclass: 0,
    domain: 0
  })
  // 卡牌列表对话框
  const [cardListDialog, setCardListDialog] = useState<{ open: boolean; type: string }>({
    open: false,
    type: ''
  })
  // 预定义字段对话框
  const [definitionsDialog, setDefinitionsDialog] = useState(false)

  // 表单管理
  const form = useForm<CardPackageState>({
    defaultValues: currentPackage
  })

  // 客户端初始化
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 返回主站
  const goBackToMain = () => {
    if (currentPackage.isModified) {
      const confirmed = confirm('您有未保存的更改，确定要离开吗？')
      if (!confirmed) return
    }
    router.push('/')
  }

  // 保存卡包
  const handleSave = () => {
    const data = form.getValues()
    // 这里可以保存到localStorage或其他存储
    setCurrentPackage(prev => ({
      ...data,
      isModified: false,
      lastSaved: new Date()
    }))
    toast.success('卡包已保存')
  }

  // 导出卡包
  const handleExport = () => {
    const data = form.getValues()
    const exportData = { ...data }
    // 移除编辑器状态字段
    delete exportData.isModified
    delete exportData.lastSaved
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.name || '卡包'}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('卡包已导出')
  }

  // 导入卡包
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const importedData = JSON.parse(text) as ImportData
        const newPackage: CardPackageState = {
          ...importedData,
          isModified: false,
          lastSaved: new Date()
        }
        setCurrentPackage(newPackage)
        form.reset(newPackage)
        toast.success('卡包已导入')
      } catch {
        toast.error('导入失败：文件格式不正确')
      }
    }
    input.click()
  }

  // 新建卡包
  const handleNew = () => {
    if (currentPackage.isModified) {
      const confirmed = confirm('您有未保存的更改，确定要创建新卡包吗？')
      if (!confirmed) return
    }
    const newPackage = { ...defaultPackage }
    setCurrentPackage(newPackage)
    form.reset(newPackage)
    toast.success('已创建新卡包')
  }

  // 表单值变化处理
  const handleFormChange = () => {
    setCurrentPackage(prev => ({
      ...prev,
      isModified: true
    }))
  }

  // 卡牌预览处理
  const handlePreviewCard = (card: unknown, type: string) => {
    setPreviewDialog({
      open: true,
      card,
      type
    })
  }

  // 添加卡牌
  const handleAddCard = (type: string) => {
    const newCard = createDefaultCard(type)
    setCurrentPackage(prev => {
      const key = type as keyof typeof prev
      const existingCards = (prev[key] as any[]) || []
      const updatedPackage = {
        ...prev,
        [type]: [...existingCards, newCard],
        isModified: true
      }
      // 自动跳转到新添加的卡牌
      const newIndex = existingCards.length
      setCurrentCardIndex(prevIndex => ({
        ...prevIndex,
        [type]: newIndex
      }))
      return updatedPackage
    })
    toast.success(`已添加新${type === 'profession' ? '职业' : type === 'ancestry' ? '血统' : '变体'}卡牌`)
  }

  // 删除卡牌
  const handleDeleteCard = (type: string, index: number) => {
    setCurrentPackage(prev => {
      const key = type as keyof typeof prev
      const cards = prev[key] as any[]
      return {
        ...prev,
        [type]: cards?.filter((_, i) => i !== index) || [],
        isModified: true
      }
    })
  }

  // 更新卡牌
  const handleUpdateCard = (type: string, index: number, card: unknown) => {
    setCurrentPackage(prev => {
      const key = type as keyof typeof prev
      const cards = prev[key] as any[]
      return {
        ...prev,
        [type]: cards?.map((c, i) => i === index ? card : c) || [],
        isModified: true
      }
    })
  }

  // 创建默认卡牌
  function createDefaultCard(type: string): unknown {
    const baseId = `${currentPackage.name || '新建卡包'}-${currentPackage.author || '作者'}`
    
    switch (type) {
      case 'profession':
        return {
          id: `${baseId}-prof-新职业`,
          名称: '新职业',
          简介: '',
          领域1: '',
          领域2: '',
          起始生命: 10,
          起始闪避: 8,
          起始物品: '',
          希望特性: '',
          职业特性: ''
        } as ProfessionCard
      case 'ancestry':
        return {
          id: `${baseId}-ance-新能力`,
          名称: '新能力',
          种族: '',
          简介: '',
          效果: '',
          类别: 1
        } as AncestryCard
      case 'variant':
        return {
          id: `${baseId}-vari-新物品`,
          名称: '新物品',
          类型: '',
          效果: '',
          子类别: '',
          等级: undefined,
          简略信息: {}
        } as RawVariantCard
      default:
        return {}
    }
  }

  if (!isClient) {
    return <div>加载中...</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              卡包编辑器
              {currentPackage.isModified && (
                <Badge variant="secondary" className="ml-2">未保存</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              可视化编辑DaggerHeart卡包，支持富文本编辑和实时预览
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goBackToMain}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              返回主站
            </Button>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
          <Button
            variant="default"
            size="sm"
            onClick={handleNew}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            新建卡包
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            导入卡包
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            保存
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            导出JSON
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
            {currentPackage.lastSaved && (
              <span>
                最后保存: {currentPackage.lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 主编辑区域 */}
      <Form {...form}>
        <form onChange={handleFormChange} onSubmit={(e) => e.preventDefault()}>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="metadata" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                基础信息
              </TabsTrigger>
              <TabsTrigger value="definitions" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                预定义
              </TabsTrigger>
              <TabsTrigger value="profession">职业</TabsTrigger>
              <TabsTrigger value="ancestry">血统</TabsTrigger>
              <TabsTrigger value="community">社群</TabsTrigger>
              <TabsTrigger value="subclass">子职业</TabsTrigger>
              <TabsTrigger value="domain">领域</TabsTrigger>
              <TabsTrigger value="variant">变体</TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                预览
              </TabsTrigger>
            </TabsList>

            {/* 基础信息选项卡 */}
            <TabsContent value="metadata">
              <Card>
                <CardHeader>
                  <CardTitle>卡包基础信息</CardTitle>
                  <CardDescription>
                    设置卡包的名称、版本、描述等基础信息
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>卡包名称 *</FormLabel>
                          <FormControl>
                            <Input placeholder="请输入卡包名称" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="version"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>版本号 *</FormLabel>
                          <FormControl>
                            <Input placeholder="例如: 1.0.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>作者信息</FormLabel>
                        <FormControl>
                          <Input placeholder="请输入作者信息" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>卡包描述</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="请输入卡包描述"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          简要描述这个卡包的内容和特色
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* 预定义字段选项卡 */}
            <TabsContent value="definitions">
              <Card>
                <CardHeader>
                  <CardTitle>预定义字段管理</CardTitle>
                  <CardDescription>
                    定义卡包中可用的职业、种族、社群、领域和变体类型
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 职业定义 */}
                  <div>
                    <FormLabel className="text-base font-semibold mb-2 block">职业列表</FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                        {currentPackage.customFieldDefinitions?.professions?.map((prof, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1">
                            {prof}
                            <button
                              type="button"
                              onClick={() => {
                                const newDefs = { ...currentPackage.customFieldDefinitions }
                                newDefs.professions = newDefs.professions?.filter((_, i) => i !== index) || []
                                setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                              }}
                              className="ml-2 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        )) || <span className="text-muted-foreground text-sm">暂无定义的职业</span>}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="new-profession"
                          placeholder="输入新职业名称"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget
                              if (input.value.trim()) {
                                const newDefs = { ...currentPackage.customFieldDefinitions }
                                newDefs.professions = [...(newDefs.professions || []), input.value.trim()]
                                setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                                input.value = ''
                              }
                            }
                          }}
                        />
                        <Buttonachel                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById('new-profession') as HTMLInputElement
                            if (input?.value.trim()) {
                              const newDefs = { ...currentPackage.customFieldDefinitions }
                              newDefs.professions = [...(newDefs.professions || []), input.value.trim()]
                              setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                              input.value = ''
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          添加
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 种族定义 */}
                  <div>
                    <FormLabel className="text-base font-semibold mb-2 block">种族列表</FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                        {currentPackage.customFieldDefinitions?.ancestries?.map((ancestry, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1">
                            {ancestry}
                            <button
                              type="button"
                              onClick={() => {
                                const newDefs = { ...currentPackage.customFieldDefinitions }
                                newDefs.ancestries = newDefs.ancestries?.filter((_, i) => i !== index) || []
                                setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                              }}
                              className="ml-2 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        )) || <span className="text-muted-foreground text-sm">暂无定义的种族</span>}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="new-ancestry"
                          placeholder="输入新种族名称"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget
                              if (input.value.trim()) {
                                const newDefs = { ...currentPackage.customFieldDefinitions }
                                newDefs.ancestries = [...(newDefs.ancestries || []), input.value.trim()]
                                setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                                input.value = ''
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById('new-ancestry') as HTMLInputElement
                            if (input?.value.trim()) {
                              const newDefs = { ...currentPackage.customFieldDefinitions }
                              newDefs.ancestries = [...(newDefs.ancestries || []), input.value.trim()]
                              setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                              input.value = ''
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          添加
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 社群定义 */}
                  <div>
                    <FormLabel className="text-base font-semibold mb-2 block">社群列表</FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                        {currentPackage.customFieldDefinitions?.communities?.map((community, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1">
                            {community}
                            <button
                              type="button"
                              onClick={() => {
                                const newDefs = { ...currentPackage.customFieldDefinitions }
                                newDefs.communities = newDefs.communities?.filter((_, i) => i !== index) || []
                                setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                              }}
                              className="ml-2 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        )) || <span className="text-muted-foreground text-sm">暂无定义的社群</span>}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="new-community"
                          placeholder="输入新社群名称"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget
                              if (input.value.trim()) {
                                const newDefs = { ...currentPackage.customFieldDefinitions }
                                newDefs.communities = [...(newDefs.communities || []), input.value.trim()]
                                setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                                input.value = ''
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById('new-community') as HTMLInputElement
                            if (input?.value.trim()) {
                              const newDefs = { ...currentPackage.customFieldDefinitions }
                              newDefs.communities = [...(newDefs.communities || []), input.value.trim()]
                              setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                              input.value = ''
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          添加
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 领域定义 */}
                  <div>
                    <FormLabel className="text-base font-semibold mb-2 block">领域列表</FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                        {currentPackage.customFieldDefinitions?.domains?.map((domain, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1">
                            {domain}
                            <button
                              type="button"
                              onClick={() => {
                                const newDefs = { ...currentPackage.customFieldDefinitions }
                                newDefs.domains = newDefs.domains?.filter((_, i) => i !== index) || []
                                setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                              }}
                              className="ml-2 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        )) || <span className="text-muted-foreground text-sm">暂无定义的领域</span>}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="new-domain"
                          placeholder="输入新领域名称"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget
                              if (input.value.trim()) {
                                const newDefs = { ...currentPackage.customFieldDefinitions }
                                newDefs.domains = [...(newDefs.domains || []), input.value.trim()]
                                setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                                input.value = ''
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById('new-domain') as HTMLInputElement
                            if (input?.value.trim()) {
                              const newDefs = { ...currentPackage.customFieldDefinitions }
                              newDefs.domains = [...(newDefs.domains || []), input.value.trim()]
                              setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                              input.value = ''
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          添加
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 变体类型定义 */}
                  <div>
                    <FormLabel className="text-base font-semibold mb-2 block">变体类型列表</FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                        {currentPackage.customFieldDefinitions?.variants?.map((variant, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1">
                            {variant}
                            <button
                              type="button"
                              onClick={() => {
                                const newDefs = { ...currentPackage.customFieldDefinitions }
                                newDefs.variants = newDefs.variants?.filter((_, i) => i !== index) || []
                                setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                              }}
                              className="ml-2 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        )) || <span className="text-muted-foreground text-sm">暂无定义的变体类型</span>}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="new-variant-type"
                          placeholder="输入新变体类型（如：武器、道具、食物）"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget
                              if (input.value.trim()) {
                                const newDefs = { ...currentPackage.customFieldDefinitions }
                                newDefs.variants = [...(newDefs.variants || []), input.value.trim()]
                                setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                                input.value = ''
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById('new-variant-type') as HTMLInputElement
                            if (input?.value.trim()) {
                              const newDefs = { ...currentPackage.customFieldDefinitions }
                              newDefs.variants = [...(newDefs.variants || []), input.value.trim()]
                              setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                              input.value = ''
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          添加
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 提示信息 */}
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">使用说明</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 预定义字段是卡包的"词典"，定义了所有可用的职业、种族、社群、领域和变体类型</li>
                      <li>• 创建卡牌时，相关字段必须使用这里预定义的值</li>
                      <li>• 例如：职业卡牌的"领域1"和"领域2"必须从已定义的领域列表中选择</li>
                      <li>• 变体类型用于分类变体卡牌（如武器、道具、食物等）</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 职业卡牌选项卡 */}
            <TabsContent value="profession">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">职业卡牌编辑</h3>
                    <p className="text-sm text-muted-foreground">
                      当前: {currentCardIndex.profession + 1} / {currentPackage.profession?.length || 0} 张
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setCardListDialog({ open: true, type: 'profession' })}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      查看所有卡牌
                    </Button>
                    <Button onClick={() => handleAddCard('profession')} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      添加新职业
                    </Button>
                  </div>
                </div>
                
                {currentPackage.profession && currentPackage.profession.length > 0 ? (
                  <>
                    {/* 卡牌导航 */}
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentCardIndex(prev => ({
                            ...prev,
                            profession: Math.max(0, prev.profession - 1)
                          }))}
                          disabled={currentCardIndex.profession === 0}
                        >
                          上一张
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentCardIndex(prev => ({
                            ...prev,
                            profession: Math.min((currentPackage.profession?.length || 1) - 1, prev.profession + 1)
                          }))}
                          disabled={currentCardIndex.profession >= (currentPackage.profession?.length || 1) - 1}
                        >
                          下一张
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span>快速跳转:</span>
                        <select
                          value={currentCardIndex.profession}
                          onChange={(e) => setCurrentCardIndex(prev => ({
                            ...prev,
                            profession: Number(e.target.value)
                          }))}
                          className="border rounded px-2 py-1"
                        >
                          {currentPackage.profession?.map((card, index) => (
                            <option key={index} value={index}>
                              {index + 1}. {card.名称 || '未命名职业'}
                            </option>
                          )) || []}
                        </select>
                      </div>
                    </div>
                    
                    {/* 当前卡牌编辑 */}
                    {currentPackage.profession[currentCardIndex.profession] && (
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-lg">
                              {currentPackage.profession[currentCardIndex.profession].名称 || '未命名职业'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              ID: {currentPackage.profession[currentCardIndex.profession].id}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewCard(
                                currentPackage.profession[currentCardIndex.profession], 
                                'profession'
                              )}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              预览
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                handleDeleteCard('profession', currentCardIndex.profession)
                                setCurrentCardIndex(prev => ({
                                  ...prev,
                                  profession: Math.max(0, prev.profession - 1)
                                }))
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </div>
                        <ProfessionCardForm
                          card={currentPackage.profession[currentCardIndex.profession]}
                          onSave={(updatedCard) => handleUpdateCard('profession', currentCardIndex.profession, updatedCard)}
                          onPreview={(previewCard) => handlePreviewCard(previewCard, 'profession')}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      还没有职业卡牌
                    </p>
                    <Button onClick={() => handleAddCard('profession')} variant="outline">
                      创建第一张职业卡牌
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 血统卡牌选项卡 */}
            <TabsContent value="ancestry">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">血统卡牌编辑</h3>
                    <p className="text-sm text-muted-foreground">
                      当前: {currentCardIndex.ancestry + 1} / {currentPackage.ancestry?.length || 0} 张
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setCardListDialog({ open: true, type: 'ancestry' })}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      查看所有卡牌
                    </Button>
                    <Button onClick={() => handleAddCard('ancestry')} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      添加新血统
                    </Button>
                  </div>
                </div>
                
                {currentPackage.ancestry && currentPackage.ancestry.length > 0 ? (
                  <>
                    {/* 卡牌导航 */}
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentCardIndex(prev => ({
                            ...prev,
                            ancestry: Math.max(0, prev.ancestry - 1)
                          }))}
                          disabled={currentCardIndex.ancestry === 0}
                        >
                          上一张
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentCardIndex(prev => ({
                            ...prev,
                            ancestry: Math.min((currentPackage.ancestry?.length || 1) - 1, prev.ancestry + 1)
                          }))}
                          disabled={currentCardIndex.ancestry >= (currentPackage.ancestry?.length || 1) - 1}
                        >
                          下一张
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span>快速跳转:</span>
                        <select
                          value={currentCardIndex.ancestry}
                          onChange={(e) => setCurrentCardIndex(prev => ({
                            ...prev,
                            ancestry: Number(e.target.value)
                          }))}
                          className="border rounded px-2 py-1"
                        >
                          {currentPackage.ancestry?.map((card, index) => (
                            <option key={index} value={index}>
                              {index + 1}. {card.名称 || '未命名能力'}
                            </option>
                          )) || []}
                        </select>
                      </div>
                    </div>
                    
                    {/* 当前卡牌编辑 */}
                    {currentPackage.ancestry[currentCardIndex.ancestry] && (
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-lg">
                              {currentPackage.ancestry[currentCardIndex.ancestry].名称 || '未命名能力'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              种族: {currentPackage.ancestry[currentCardIndex.ancestry].种族} | 
                              类别: {currentPackage.ancestry[currentCardIndex.ancestry].类别}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewCard(
                                currentPackage.ancestry[currentCardIndex.ancestry], 
                                'ancestry'
                              )}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              预览
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                handleDeleteCard('ancestry', currentCardIndex.ancestry)
                                setCurrentCardIndex(prev => ({
                                  ...prev,
                                  ancestry: Math.max(0, prev.ancestry - 1)
                                }))
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </div>
                        <AncestryCardForm
                          card={currentPackage.ancestry[currentCardIndex.ancestry]}
                          onSave={(updatedCard) => handleUpdateCard('ancestry', currentCardIndex.ancestry, updatedCard)}
                          onPreview={(previewCard) => handlePreviewCard(previewCard, 'ancestry')}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      还没有血统卡牌
                    </p>
                    <Button onClick={() => handleAddCard('ancestry')} variant="outline">
                      创建第一张血统卡牌
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 变体卡牌选项卡 */}
            <TabsContent value="variant">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">变体卡牌编辑</h3>
                    <p className="text-sm text-muted-foreground">
                      当前: {currentCardIndex.variant + 1} / {currentPackage.variant?.length || 0} 张
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setCardListDialog({ open: true, type: 'variant' })}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      查看所有卡牌
                    </Button>
                    <Button onClick={() => handleAddCard('variant')} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      添加新变体
                    </Button>
                  </div>
                </div>
                
                {currentPackage.variant && currentPackage.variant.length > 0 ? (
                  <>
                    {/* 卡牌导航 */}
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentCardIndex(prev => ({
                            ...prev,
                            variant: Math.max(0, prev.variant - 1)
                          }))}
                          disabled={currentCardIndex.variant === 0}
                        >
                          上一张
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentCardIndex(prev => ({
                            ...prev,
                            variant: Math.min((currentPackage.variant?.length || 1) - 1, prev.variant + 1)
                          }))}
                          disabled={currentCardIndex.variant >= (currentPackage.variant?.length || 1) - 1}
                        >
                          下一张
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span>快速跳转:</span>
                        <select
                          value={currentCardIndex.variant}
                          onChange={(e) => setCurrentCardIndex(prev => ({
                            ...prev,
                            variant: Number(e.target.value)
                          }))}
                          className="border rounded px-2 py-1"
                        >
                          {currentPackage.variant?.map((card, index) => (
                            <option key={index} value={index}>
                              {index + 1}. {card.名称 || '未命名物品'}
                            </option>
                          )) || []}
                        </select>
                      </div>
                    </div>
                    
                    {/* 当前卡牌编辑 */}
                    {currentPackage.variant[currentCardIndex.variant] && (
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-lg">
                              {currentPackage.variant[currentCardIndex.variant].名称 || '未命名物品'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              类型: {currentPackage.variant[currentCardIndex.variant].类型}
                              {currentPackage.variant[currentCardIndex.variant].子类别 && 
                                ` | 子类别: ${currentPackage.variant[currentCardIndex.variant].子类别}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewCard(
                                currentPackage.variant[currentCardIndex.variant], 
                                'variant'
                              )}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              预览
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                handleDeleteCard('variant', currentCardIndex.variant)
                                setCurrentCardIndex(prev => ({
                                  ...prev,
                                  variant: Math.max(0, prev.variant - 1)
                                }))
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </div>
                        <VariantCardForm
                          card={currentPackage.variant[currentCardIndex.variant]}
                          onSave={(updatedCard) => handleUpdateCard('variant', currentCardIndex.variant, updatedCard)}
                          onPreview={(previewCard) => handlePreviewCard(previewCard, 'variant')}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      还没有变体卡牌
                    </p>
                    <Button onClick={() => handleAddCard('variant')} variant="outline">
                      创建第一张变体卡牌
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 其他选项卡的占位符 */}
            {['community', 'subclass', 'domain'].map((cardType) => (
              <TabsContent key={cardType} value={cardType}>
                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize">{cardType}卡牌编辑</CardTitle>
                    <CardDescription>
                      管理和编辑{cardType}类型的卡牌
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {cardType}卡牌编辑功能正在开发中...
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}

            {/* 预览选项卡 */}
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle>卡包预览</CardTitle>
                  <CardDescription>
                    预览当前卡包的结构和内容
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      预览功能正在开发中...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>

      {/* 卡牌预览对话框 */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>卡牌预览</DialogTitle>
            <DialogDescription>
              预览卡牌在游戏中的显示效果
            </DialogDescription>
          </DialogHeader>
          {previewDialog.card && (
            <div className="mt-4">
              <CardPreview 
                card={previewDialog.card} 
                cardType={previewDialog.type}
                className="w-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 卡牌列表对话框 */}
      <Dialog open={cardListDialog.open} onOpenChange={(open) => setCardListDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {cardListDialog.type === 'profession' && '所有职业卡牌'}
              {cardListDialog.type === 'ancestry' && '所有血统卡牌'}
              {cardListDialog.type === 'variant' && '所有变体卡牌'}
              {!['profession', 'ancestry', 'variant'].includes(cardListDialog.type) && '所有卡牌'}
            </DialogTitle>
            <DialogDescription>
              共 {(Array.isArray(currentPackage[cardListDialog.type as keyof typeof currentPackage]) ? 
                   (currentPackage[cardListDialog.type as keyof typeof currentPackage] as any[])?.length : 0) || 0} 张卡牌
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {(currentPackage[cardListDialog.type as keyof typeof currentPackage] as any[])?.map((card, index) => (
                <div 
                  key={index} 
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setCurrentCardIndex(prev => ({
                      ...prev,
                      [cardListDialog.type]: index
                    }))
                    setCardListDialog({ open: false, type: '' })
                    setSelectedTab(cardListDialog.type)
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {index + 1}. {card.名称 || '未命名'}
                      </h4>
                      {cardListDialog.type === 'profession' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          领域: {card.领域1} / {card.领域2}
                        </p>
                      )}
                      {cardListDialog.type === 'ancestry' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          种族: {card.种族} | 类别: {card.类别}
                        </p>
                      )}
                      {cardListDialog.type === 'variant' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          类型: {card.类型} {card.子类别 && `| ${card.子类别}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreviewCard(card, cardListDialog.type)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCard(cardListDialog.type, index)
                          if (currentCardIndex[cardListDialog.type] >= index) {
                            setCurrentCardIndex(prev => ({
                              ...prev,
                              [cardListDialog.type]: Math.max(0, prev[cardListDialog.type] - 1)
                            }))
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(!currentPackage[cardListDialog.type as keyof typeof currentPackage] || 
              (currentPackage[cardListDialog.type as keyof typeof currentPackage] as any[])?.length === 0) && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  还没有创建任何卡牌
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 预定义字段管理对话框 */}
      <Dialog open={definitionsDialog} onOpenChange={setDefinitionsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>预定义字段管理</DialogTitle>
            <DialogDescription>
              定义卡包中可用的职业、种族、社群、领域和变体类型。创建卡牌时必须从这些预定义列表中选择。
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 职业定义 */}
            <div>
              <FormLabel className="text-base font-semibold mb-2 block">职业列表</FormLabel>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                  {currentPackage.customFieldDefinitions?.professions?.map((prof, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {prof}
                      <button
                        type="button"
                        onClick={() => {
                          const newDefs = { ...currentPackage.customFieldDefinitions }
                          newDefs.professions = newDefs.professions?.filter((_, i) => i !== index) || []
                          setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                        }}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )) || <span className="text-muted-foreground text-sm">暂无定义的职业</span>}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="modal-new-profession"
                    placeholder="输入新职业名称"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget
                        if (input.value.trim()) {
                          const newDefs = { ...currentPackage.customFieldDefinitions }
                          newDefs.professions = [...(newDefs.professions || []), input.value.trim()]
                          setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                          input.value = ''
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('modal-new-profession') as HTMLInputElement
                      if (input?.value.trim()) {
                        const newDefs = { ...currentPackage.customFieldDefinitions }
                        newDefs.professions = [...(newDefs.professions || []), input.value.trim()]
                        setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                        input.value = ''
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    添加
                  </Button>
                </div>
              </div>
            </div>

            {/* 种族定义 */}
            <div>
              <FormLabel className="text-base font-semibold mb-2 block">种族列表</FormLabel>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                  {currentPackage.customFieldDefinitions?.ancestries?.map((ancestry, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {ancestry}
                      <button
                        type="button"
                        onClick={() => {
                          const newDefs = { ...currentPackage.customFieldDefinitions }
                          newDefs.ancestries = newDefs.ancestries?.filter((_, i) => i !== index) || []
                          setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                        }}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )) || <span className="text-muted-foreground text-sm">暂无定义的种族</span>}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="modal-new-ancestry"
                    placeholder="输入新种族名称"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget
                        if (input.value.trim()) {
                          const newDefs = { ...currentPackage.customFieldDefinitions }
                          newDefs.ancestries = [...(newDefs.ancestries || []), input.value.trim()]
                          setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                          input.value = ''
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('modal-new-ancestry') as HTMLInputElement
                      if (input?.value.trim()) {
                        const newDefs = { ...currentPackage.customFieldDefinitions }
                        newDefs.ancestries = [...(newDefs.ancestries || []), input.value.trim()]
                        setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                        input.value = ''
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    添加
                  </Button>
                </div>
              </div>
            </div>

            {/* 社群定义 */}
            <div>
              <FormLabel className="text-base font-semibold mb-2 block">社群列表</FormLabel>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                  {currentPackage.customFieldDefinitions?.communities?.map((community, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {community}
                      <button
                        type="button"
                        onClick={() => {
                          const newDefs = { ...currentPackage.customFieldDefinitions }
                          newDefs.communities = newDefs.communities?.filter((_, i) => i !== index) || []
                          setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                        }}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )) || <span className="text-muted-foreground text-sm">暂无定义的社群</span>}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="modal-new-community"
                    placeholder="输入新社群名称"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget
                        if (input.value.trim()) {
                          const newDefs = { ...currentPackage.customFieldDefinitions }
                          newDefs.communities = [...(newDefs.communities || []), input.value.trim()]
                          setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                          input.value = ''
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('modal-new-community') as HTMLInputElement
                      if (input?.value.trim()) {
                        const newDefs = { ...currentPackage.customFieldDefinitions }
                        newDefs.communities = [...(newDefs.communities || []), input.value.trim()]
                        setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                        input.value = ''
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    添加
                  </Button>
                </div>
              </div>
            </div>

            {/* 领域定义 */}
            <div>
              <FormLabel className="text-base font-semibold mb-2 block">领域列表</FormLabel>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                  {currentPackage.customFieldDefinitions?.domains?.map((domain, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {domain}
                      <button
                        type="button"
                        onClick={() => {
                          const newDefs = { ...currentPackage.customFieldDefinitions }
                          newDefs.domains = newDefs.domains?.filter((_, i) => i !== index) || []
                          setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                        }}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )) || <span className="text-muted-foreground text-sm">暂无定义的领域</span>}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="modal-new-domain"
                    placeholder="输入新领域名称"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget
                        if (input.value.trim()) {
                          const newDefs = { ...currentPackage.customFieldDefinitions }
                          newDefs.domains = [...(newDefs.domains || []), input.value.trim()]
                          setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                          input.value = ''
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('modal-new-domain') as HTMLInputElement
                      if (input?.value.trim()) {
                        const newDefs = { ...currentPackage.customFieldDefinitions }
                        newDefs.domains = [...(newDefs.domains || []), input.value.trim()]
                        setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                        input.value = ''
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    添加
                  </Button>
                </div>
              </div>
            </div>

            {/* 变体类型定义 */}
            <div>
              <FormLabel className="text-base font-semibold mb-2 block">变体类型列表</FormLabel>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                  {currentPackage.customFieldDefinitions?.variants?.map((variant, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {variant}
                      <button
                        type="button"
                        onClick={() => {
                          const newDefs = { ...currentPackage.customFieldDefinitions }
                          newDefs.variants = newDefs.variants?.filter((_, i) => i !== index) || []
                          setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                        }}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )) || <span className="text-muted-foreground text-sm">暂无定义的变体类型</span>}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="modal-new-variant-type"
                    placeholder="输入新变体类型（如：武器、道具、食物）"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget
                        if (input.value.trim()) {
                          const newDefs = { ...currentPackage.customFieldDefinitions }
                          newDefs.variants = [...(newDefs.variants || []), input.value.trim()]
                          setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                          input.value = ''
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('modal-new-variant-type') as HTMLInputElement
                      if (input?.value.trim()) {
                        const newDefs = { ...currentPackage.customFieldDefinitions }
                        newDefs.variants = [...(newDefs.variants || []), input.value.trim()]
                        setCurrentPackage(prev => ({ ...prev, customFieldDefinitions: newDefs, isModified: true }))
                        input.value = ''
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    添加
                  </Button>
                </div>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">使用说明</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 预定义字段是卡包的"词典"，定义了所有可用的职业、种族、社群、领域和变体类型</li>
                <li>• 创建卡牌时，相关字段必须使用这里预定义的值</li>
                <li>• 例如：职业卡牌的"领域1"和"领域2"必须从已定义的领域列表中选择</li>
                <li>• 变体类型用于分类变体卡牌（如武器、道具、食物等）</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}