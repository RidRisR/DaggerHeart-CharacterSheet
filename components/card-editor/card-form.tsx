'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, RefreshCw, Edit2, RotateCcw } from 'lucide-react'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import MarkdownEditor, { SimpleMarkdownEditor } from './markdown-editor'
import { KeywordSelectField } from './keyword-select-field'
import type { ProfessionCard } from '@/card/profession-card/convert'
import type { AncestryCard } from '@/card/ancestry-card/convert'
import type { RawVariantCard } from '@/card/variant-card/convert'
import { generateSmartCardId, generateCardId as generateBasicCardId } from '@/app/card-editor/utils/id-generator'

// 通用卡牌编辑器属性
interface BaseCardFormProps<T> {
  card: T
  onSave: (card: T) => void
  onCancel?: () => void
  onPreview?: (card: T) => void
  onChange?: (card: T) => void  // 新增：实时变化回调
  customFields?: string[]
  keywordLists?: {
    professions?: string[]
    ancestries?: string[]
    communities?: string[]
    domains?: string[]
    variants?: string[]
  }
  onAddKeyword?: (category: string, keyword: string) => void
  packageInfo?: {
    name: string
    author: string
  }
  packageData?: any // 完整的包数据，用于ID去重检查
}

// 生成ID的工具函数
function generateCardId(packageName: string, author: string, cardType: string, cardName: string): string {
  // 类型缩写映射
  const typeAbbreviation = {
    'profession': 'prof',
    'ancestry': 'ance', 
    'community': 'comm',
    'subclass': 'subc',
    'domain': 'doma',
    'variant': 'vari'
  } as const

  const typeCode = typeAbbreviation[cardType as keyof typeof typeAbbreviation] || cardType
  return `${packageName}-${author}-${typeCode}-${cardName}`
}

// 职业卡牌编辑器
export function ProfessionCardForm({ 
  card, 
  onSave, 
  onCancel, 
  onPreview,
  onChange, 
  keywordLists, 
  onAddKeyword,
  packageInfo,
  packageData
}: BaseCardFormProps<ProfessionCard>) {
  const [isEditingId, setIsEditingId] = useState(false)
  const [autoGenerateId, setAutoGenerateId] = useState(true)
  
  const form = useForm<ProfessionCard>({
    defaultValues: card
  })

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    form.reset(card)
  }, [card, form])

  // 监听表单变化并触发onChange回调
  useEffect(() => {
    if (!onChange) return
    
    const subscription = form.watch((value) => {
      onChange(value as ProfessionCard)
    })
    
    return () => subscription.unsubscribe()
  }, [form, onChange])

  // 监听名称字段变化，自动更新ID
  useEffect(() => {
    if (!autoGenerateId) return
    
    const subscription = form.watch((value, { name }) => {
      if (name === '名称' && value.名称) {
        const packageName = packageInfo?.name || '新建卡包'
        const author = packageInfo?.author || '作者'
        const newId = generateSmartCardId(packageName, author, 'profession', value.名称, packageData)
        form.setValue('id', newId)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form, autoGenerateId, packageInfo])

  // 初始化时如果没有ID或ID为默认值，则自动生成
  useEffect(() => {
    const currentId = form.getValues('id')
    const currentName = form.getValues('名称')
    
    if (autoGenerateId && currentName && (!currentId || currentId.includes('新职业'))) {
      const packageName = packageInfo?.name || '新建卡包'
      const author = packageInfo?.author || '作者'
      const newId = generateSmartCardId(packageName, author, 'profession', currentName, packageData)
      form.setValue('id', newId)
    }
  }, [form, autoGenerateId, packageInfo])

  // 添加表单字段失去焦点时自动保存
  const handleFieldBlur = () => {
    // 使用 setTimeout 确保字段值已经更新
    setTimeout(() => {
      handleAutoSave()
    }, 100)
  }

  const handleSubmit = (data: ProfessionCard) => {
    onSave(data)
  }

  // 自动保存函数
  const handleAutoSave = () => {
    const currentData = form.getValues()
    onSave(currentData)
  }

  // 手动生成ID
  const generateId = () => {
    const currentValues = form.getValues()
    const packageName = packageInfo?.name || '新建卡包'
    const author = packageInfo?.author || '作者'
    const cardName = currentValues.名称 || '卡牌名'
    
    const newId = generateCardId(packageName, author, 'profession', cardName)
    form.setValue('id', newId)
  }

  return (
        <Form {...form}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="名称"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>职业名称 *</FormLabel>
                    <FormControl>
                      <KeywordSelectField
                        value={field.value || ''}
                        onChange={field.onChange}
                        keywords={keywordLists?.professions || []}
                        onAddKeyword={(keyword) => onAddKeyword?.('professions', keyword)}
                        placeholder="选择或添加职业"
                      />
                    </FormControl>
                    <FormDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">ID:</span>
                        {!isEditingId ? (
                          <span className="text-xs font-mono text-muted-foreground">
                            {form.watch('id') || '未设置'}
                          </span>
                        ) : (
                          <FormField
                            control={form.control}
                            name="id"
                            render={({ field }) => (
                              <Input 
                                className="h-6 text-xs font-mono px-2 py-0 w-48"
                                placeholder="例如：pack-author-prof-职业名" 
                                {...field} 
                                onBlur={() => {
                                  setIsEditingId(false)
                                  handleFieldBlur()
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    setIsEditingId(false)
                                    handleFieldBlur()
                                  }
                                }}
                                autoFocus
                              />
                            )}
                          />
                        )}
                        {autoGenerateId && (
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px]">
                            自动
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateId}
                          className="h-6 w-6 p-0"
                          title="重新生成ID"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingId(true)}
                          className="h-6 w-6 p-0"
                          title="编辑ID"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAutoGenerateId(!autoGenerateId)}
                          className="h-6 w-6 p-0"
                          title={autoGenerateId ? "关闭自动生成" : "开启自动生成"}
                        >
                          <RotateCcw className={`h-3 w-3 ${autoGenerateId ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </Button>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="简介"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>职业简介 *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="请输入职业的背景和风味描述" 
                      {...field} 
                      onBlur={handleFieldBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="领域1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>领域1 *</FormLabel>
                    <FormControl>
                      <KeywordSelectField
                        value={field.value || ''}
                        onChange={field.onChange}
                        keywords={keywordLists?.domains || []}
                        onAddKeyword={(keyword) => onAddKeyword?.('domains', keyword)}
                        placeholder="选择或添加领域"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="领域2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>领域2 *</FormLabel>
                    <FormControl>
                      <KeywordSelectField
                        value={field.value || ''}
                        onChange={field.onChange}
                        keywords={keywordLists?.domains || []}
                        onAddKeyword={(keyword) => onAddKeyword?.('domains', keyword)}
                        placeholder="选择或添加领域"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="起始生命"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>起始生命 *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="例如：11"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="起始闪避"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>起始闪避 *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="例如：9"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="起始物品"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>起始物品 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：星图卷轴、观星镜、预言水晶" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="希望特性"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>希望特性 *</FormLabel>
                  <FormControl>
                    <SimpleMarkdownEditor
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={handleFieldBlur}
                      placeholder="描述希望点的使用效果"
                      height={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="职业特性"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>职业特性 *</FormLabel>
                  <FormControl>
                    <MarkdownEditor
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={handleFieldBlur}
                      placeholder="核心职业能力，支持Markdown格式"
                      height={200}
                    />
                  </FormControl>
                  <FormDescription>
                    支持Markdown格式，可以使用 *__特性名__* 来标记特性标题
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  取消
                </Button>
              )}
            </div>
          </div>
        </Form>
  )
}

// 血统卡牌编辑器
export function AncestryCardForm({ 
  card, 
  onSave, 
  onCancel, 
  onPreview,
  onChange, 
  keywordLists, 
  onAddKeyword,
  packageInfo,
  packageData
}: BaseCardFormProps<AncestryCard>) {
  const [isEditingId, setIsEditingId] = useState(false)
  const [autoGenerateId, setAutoGenerateId] = useState(true)
  
  const form = useForm<AncestryCard>({
    defaultValues: card
  })

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    form.reset(card)
  }, [card, form])

  // 监听表单变化并触发onChange回调
  useEffect(() => {
    if (!onChange) return
    
    const subscription = form.watch((value) => {
      onChange(value as AncestryCard)
    })
    
    return () => subscription.unsubscribe()
  }, [form, onChange])

  // 监听名称字段变化，自动更新ID
  useEffect(() => {
    if (!autoGenerateId) return
    
    const subscription = form.watch((value, { name }) => {
      if (name === '名称' && value.名称) {
        const packageName = packageInfo?.name || '新建卡包'
        const author = packageInfo?.author || '作者'
        const newId = generateSmartCardId(packageName, author, 'ancestry', value.名称, packageData)
        form.setValue('id', newId)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form, autoGenerateId, packageInfo])

  // 初始化时如果没有ID或ID为默认值，则自动生成
  useEffect(() => {
    const currentId = form.getValues('id')
    const currentName = form.getValues('名称')
    
    if (autoGenerateId && currentName && (!currentId || currentId.includes('新能力'))) {
      const packageName = packageInfo?.name || '新建卡包'
      const author = packageInfo?.author || '作者'
      const newId = generateSmartCardId(packageName, author, 'ancestry', currentName, packageData)
      form.setValue('id', newId)
    }
  }, [form, autoGenerateId, packageInfo])

  const handleSubmit = (data: AncestryCard) => {
    onSave(data)
  }

  // 自动保存函数
  const handleAutoSave = () => {
    const currentData = form.getValues()
    onSave(currentData)
  }

  // 添加表单字段失去焦点时自动保存
  const handleFieldBlur = () => {
    // 使用 setTimeout 确保字段值已经更新
    setTimeout(() => {
      handleAutoSave()
    }, 100)
  }

  // 手动生成ID
  const generateId = () => {
    const currentValues = form.getValues()
    const packageName = packageInfo?.name || '新建卡包'
    const author = packageInfo?.author || '作者'
    const cardName = currentValues.名称 || '卡牌名'
    
    const newId = generateCardId(packageName, author, 'ancestry', cardName)
    form.setValue('id', newId)
  }

  return (
        <Form {...form}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="名称"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>能力名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：星光血脉" {...field} />
                    </FormControl>
                    <FormDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">ID:</span>
                        {!isEditingId ? (
                          <span className="text-xs font-mono text-muted-foreground">
                            {form.watch('id') || '未设置'}
                          </span>
                        ) : (
                          <FormField
                            control={form.control}
                            name="id"
                            render={({ field }) => (
                              <Input 
                                className="h-6 text-xs font-mono px-2 py-0 w-48"
                                placeholder="例如：pack-author-ance-星光血脉" 
                                {...field} 
                                onBlur={() => {
                                  setIsEditingId(false)
                                  handleFieldBlur()
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    setIsEditingId(false)
                                    handleFieldBlur()
                                  }
                                }}
                                autoFocus
                              />
                            )}
                          />
                        )}
                        {autoGenerateId && (
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px]">
                            自动
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateId}
                          className="h-6 w-6 p-0"
                          title="重新生成ID"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingId(true)}
                          className="h-6 w-6 p-0"
                          title="编辑ID"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAutoGenerateId(!autoGenerateId)}
                          className="h-6 w-6 p-0"
                          title={autoGenerateId ? "关闭自动生成" : "开启自动生成"}
                        >
                          <RotateCcw className={`h-3 w-3 ${autoGenerateId ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </Button>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="种族"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>种族 *</FormLabel>
                    <FormControl>
                      <KeywordSelectField
                        value={field.value || ''}
                        onChange={field.onChange}
                        keywords={keywordLists?.ancestries || []}
                        onAddKeyword={(keyword) => onAddKeyword?.('ancestries', keyword)}
                        placeholder="选择或添加种族"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="类别"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>类别 *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择类别" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">类别 1</SelectItem>
                        <SelectItem value="2">类别 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="简介"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>种族简介 *</FormLabel>
                  <FormControl>
                    <SimpleMarkdownEditor
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={handleFieldBlur}
                      placeholder="种族的风味描述。同一种族的两张卡，此字段必须完全相同"
                      height={100}
                    />
                  </FormControl>
                  <FormDescription>
                    同一种族的两张卡，此字段必须完全相同
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="效果"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>能力效果 *</FormLabel>
                  <FormControl>
                    <MarkdownEditor
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={handleFieldBlur}
                      placeholder="该项能力的具体效果，支持Markdown"
                      height={200}
                    />
                  </FormControl>
                  <FormDescription>
                    支持Markdown格式，可以使用 *__能力名__* 来标记能力标题
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  取消
                </Button>
              )}
            </div>
          </div>
        </Form>
  )
}

// 变体卡牌编辑器
export function VariantCardForm({ 
  card, 
  onSave, 
  onCancel, 
  onPreview,
  onChange, 
  keywordLists, 
  onAddKeyword,
  packageInfo,
  packageData
}: BaseCardFormProps<RawVariantCard>) {
  const [isEditingId, setIsEditingId] = useState(false)
  const [autoGenerateId, setAutoGenerateId] = useState(true)
  
  const form = useForm<RawVariantCard>({
    defaultValues: card
  })

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    form.reset(card)
  }, [card, form])

  // 监听表单变化并触发onChange回调
  useEffect(() => {
    if (!onChange) return
    
    const subscription = form.watch((value) => {
      onChange(value as RawVariantCard)
    })
    
    return () => subscription.unsubscribe()
  }, [form, onChange])

  // 监听名称字段变化，自动更新ID
  useEffect(() => {
    if (!autoGenerateId) return
    
    const subscription = form.watch((value, { name }) => {
      if (name === '名称' && value.名称) {
        const packageName = packageInfo?.name || '新建卡包'
        const author = packageInfo?.author || '作者'
        const newId = generateSmartCardId(packageName, author, 'variant', value.名称, packageData)
        form.setValue('id', newId)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form, autoGenerateId, packageInfo])

  // 初始化时如果没有ID或ID为默认值，则自动生成
  useEffect(() => {
    const currentId = form.getValues('id')
    const currentName = form.getValues('名称')
    
    if (autoGenerateId && currentName && (!currentId || currentId.includes('新物品'))) {
      const packageName = packageInfo?.name || '新建卡包'
      const author = packageInfo?.author || '作者'
      const newId = generateSmartCardId(packageName, author, 'variant', currentName, packageData)
      form.setValue('id', newId)
    }
  }, [form, autoGenerateId, packageInfo])

  const handleSubmit = (data: RawVariantCard) => {
    onSave(data)
  }

  // 自动保存函数
  const handleAutoSave = () => {
    const currentData = form.getValues()
    onSave(currentData)
  }

  // 添加表单字段失去焦点时自动保存
  const handleFieldBlur = () => {
    // 使用 setTimeout 确保字段值已经更新
    setTimeout(() => {
      handleAutoSave()
    }, 100)
  }

  // 手动生成ID
  const generateId = () => {
    const currentValues = form.getValues()
    const packageName = packageInfo?.name || '新建卡包'
    const author = packageInfo?.author || '作者'
    const cardName = currentValues.名称 || '卡牌名'
    
    const newId = generateCardId(packageName, author, 'variant', cardName)
    form.setValue('id', newId)
  }

  return (
        <Form {...form}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="名称"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>卡牌名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：星辰王冠" {...field} />
                    </FormControl>
                    <FormDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">ID:</span>
                        {!isEditingId ? (
                          <span className="text-xs font-mono text-muted-foreground">
                            {form.watch('id') || '未设置'}
                          </span>
                        ) : (
                          <FormField
                            control={form.control}
                            name="id"
                            render={({ field }) => (
                              <Input 
                                className="h-6 text-xs font-mono px-2 py-0 w-48"
                                placeholder="例如：pack-author-vari-星辰王冠" 
                                {...field} 
                                onBlur={() => {
                                  setIsEditingId(false)
                                  handleFieldBlur()
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    setIsEditingId(false)
                                    handleFieldBlur()
                                  }
                                }}
                                autoFocus
                              />
                            )}
                          />
                        )}
                        {autoGenerateId && (
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px]">
                            自动
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateId}
                          className="h-6 w-6 p-0"
                          title="重新生成ID"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingId(true)}
                          className="h-6 w-6 p-0"
                          title="编辑ID"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAutoGenerateId(!autoGenerateId)}
                          className="h-6 w-6 p-0"
                          title={autoGenerateId ? "关闭自动生成" : "开启自动生成"}
                        >
                          <RotateCcw className={`h-3 w-3 ${autoGenerateId ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </Button>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="类型"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>卡牌类型 *</FormLabel>
                    <FormControl>
                      <KeywordSelectField
                        value={field.value || ''}
                        onChange={field.onChange}
                        keywords={keywordLists?.variants || []}
                        onAddKeyword={(keyword) => onAddKeyword?.('variants', keyword)}
                        placeholder="选择或添加卡牌类型"
                      />
                    </FormControl>
                    <FormDescription>
                      从预定义列表中选择或添加新的变体类型
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="子类别"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>子类别</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：饰品、武器（可选）" {...field} />
                    </FormControl>
                    <FormDescription>选填字段</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="等级"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>等级</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="例如：8（可选）"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>选填字段</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="效果"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>卡牌效果 *</FormLabel>
                  <FormControl>
                    <MarkdownEditor
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={handleFieldBlur}
                      placeholder="卡牌效果的详细描述，支持Markdown"
                      height={200}
                    />
                  </FormControl>
                  <FormDescription>
                    支持Markdown格式，可以使用 *__效果名__* 来标记效果标题
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 简略信息编辑 */}
            <div className="space-y-2">
              <Label>简略信息（选填）</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="简略信息.item1"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="信息1" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="简略信息.item2"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="信息2" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="简略信息.item3"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="信息3" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                用于快速预览的键值对信息，最多3个条目
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  取消
                </Button>
              )}
            </div>
          </div>
        </Form>
  )
}