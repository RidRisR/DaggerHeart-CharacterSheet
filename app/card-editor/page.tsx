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
    setCurrentPackage(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), newCard],
      isModified: true
    }))
  }

  // 删除卡牌
  const handleDeleteCard = (type: string, index: number) => {
    setCurrentPackage(prev => ({
      ...prev,
      [type]: prev[type]?.filter((_, i) => i !== index) || [],
      isModified: true
    }))
  }

  // 更新卡牌
  const handleUpdateCard = (type: string, index: number, card: unknown) => {
    setCurrentPackage(prev => ({
      ...prev,
      [type]: prev[type]?.map((c, i) => i === index ? card : c) || [],
      isModified: true
    }))
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
        <form onChange={handleFormChange}>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="metadata" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                基础信息
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

            {/* 职业卡牌选项卡 */}
            <TabsContent value="profession">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">职业卡牌</h3>
                    <p className="text-sm text-muted-foreground">
                      已创建 {currentPackage.profession?.length || 0} 张职业卡牌
                    </p>
                  </div>
                  <Button onClick={() => handleAddCard('profession')} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    添加职业
                  </Button>
                </div>
                
                {currentPackage.profession?.map((card, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{card.名称 || '未命名职业'}</h4>
                        <p className="text-sm text-muted-foreground">
                          ID: {card.id}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewCard(card, 'profession')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCard('profession', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <ProfessionCardForm
                      card={card}
                      onSave={(updatedCard) => handleUpdateCard('profession', index, updatedCard)}
                      onPreview={(previewCard) => handlePreviewCard(previewCard, 'profession')}
                    />
                  </div>
                ))}
                
                {(!currentPackage.profession || currentPackage.profession.length === 0) && (
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
                    <h3 className="text-lg font-semibold">血统卡牌</h3>
                    <p className="text-sm text-muted-foreground">
                      已创建 {currentPackage.ancestry?.length || 0} 张血统卡牌
                    </p>
                  </div>
                  <Button onClick={() => handleAddCard('ancestry')} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    添加血统
                  </Button>
                </div>
                
                {currentPackage.ancestry?.map((card, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{card.名称 || '未命名能力'}</h4>
                        <p className="text-sm text-muted-foreground">
                          种族: {card.种族} | 类别: {card.类别}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewCard(card, 'ancestry')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCard('ancestry', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <AncestryCardForm
                      card={card}
                      onSave={(updatedCard) => handleUpdateCard('ancestry', index, updatedCard)}
                      onPreview={(previewCard) => handlePreviewCard(previewCard, 'ancestry')}
                    />
                  </div>
                ))}
                
                {(!currentPackage.ancestry || currentPackage.ancestry.length === 0) && (
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
                    <h3 className="text-lg font-semibold">变体卡牌</h3>
                    <p className="text-sm text-muted-foreground">
                      已创建 {currentPackage.variant?.length || 0} 张变体卡牌
                    </p>
                  </div>
                  <Button onClick={() => handleAddCard('variant')} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    添加变体
                  </Button>
                </div>
                
                {currentPackage.variant?.map((card, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{card.名称 || '未命名物品'}</h4>
                        <p className="text-sm text-muted-foreground">
                          类型: {card.类型} {card.子类别 && `| 子类别: ${card.子类别}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewCard(card, 'variant')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCard('variant', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <VariantCardForm
                      card={card}
                      onSave={(updatedCard) => handleUpdateCard('variant', index, updatedCard)}
                      onPreview={(previewCard) => handlePreviewCard(previewCard, 'variant')}
                    />
                  </div>
                ))}
                
                {(!currentPackage.variant || currentPackage.variant.length === 0) && (
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
    </div>
  )
}