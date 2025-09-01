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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import MarkdownEditor, { SimpleMarkdownEditor } from './markdown-editor'
import { KeywordCombobox } from './keyword-combobox'
import type { ProfessionCard } from '@/card/profession-card/convert'
import type { AncestryCard } from '@/card/ancestry-card/convert'
import type { CommunityCard } from '@/card/community-card/convert'
import type { RawVariantCard } from '@/card/variant-card/convert'
import type { SubClassCard } from '@/card/subclass-card/convert'
import type { DomainCard } from '@/card/domain-card/convert'
import { ATTRIBUTE_CLASS_NAMES, SUBCLASS_LEVEL_NAMES } from '@/card/card-types'
import { generateSmartCardId } from '@/app/card-editor/utils/id-generator'

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

        // 只在ID实际需要更新时才设置，避免无限循环
        if (form.getValues('id') !== newId) {
          form.setValue('id', newId, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
        }
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form, autoGenerateId, packageInfo, packageData])

  // 初始化时如果没有ID或ID为默认值，则自动生成
  useEffect(() => {
    const currentId = form.getValues('id')
    const currentName = form.getValues('名称')
    
    if (autoGenerateId && currentName && (!currentId || currentId.includes('新职业'))) {
      const packageName = packageInfo?.name || '新建卡包'
      const author = packageInfo?.author || '作者'
      const newId = generateSmartCardId(packageName, author, 'profession', currentName, packageData)
      
      // 只在ID实际需要更新时才设置，避免无限循环
      if (currentId !== newId) {
        form.setValue('id', newId)
      }
    }
  }, [form, autoGenerateId, packageInfo, packageData])

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
                      <KeywordCombobox
                        value={field.value || ''}
                        onChange={field.onChange}
                        keywords={keywordLists?.professions || []}
                        onAddKeyword={(keyword) => onAddKeyword?.('professions', keyword)}
                        placeholder="输入或选择职业"
                      />
                    </FormControl>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="领域1"
            render={({ field }) => (
              <FormItem>
                    <FormLabel>领域1 *</FormLabel>
                    <FormControl>
                  <KeywordCombobox
                    value={field.value || ''}
                    onChange={field.onChange}
                    keywords={keywordLists?.domains || []}
                    onAddKeyword={(keyword) => onAddKeyword?.('domains', keyword)}
                    placeholder="输入或选择领域"
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
                      <KeywordCombobox
                        value={field.value || ''}
                        onChange={field.onChange}
                        keywords={keywordLists?.domains || []}
                        onAddKeyword={(keyword) => onAddKeyword?.('domains', keyword)}
                        placeholder="输入或选择领域"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
        </div>

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
              <div className="text-sm text-muted-foreground">
                    支持Markdown格式，可以使用 *__特性名__* 来标记特性标题
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

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

        // 只在ID实际需要更新时才设置，避免无限循环
        if (form.getValues('id') !== newId) {
          form.setValue('id', newId, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
        }
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form, autoGenerateId, packageInfo, packageData])

  // 初始化时如果没有ID或ID为默认值，则自动生成
  useEffect(() => {
    const currentId = form.getValues('id')
    const currentName = form.getValues('名称')
    
    if (autoGenerateId && currentName && (!currentId || currentId.includes('新能力'))) {
      const packageName = packageInfo?.name || '新建卡包'
      const author = packageInfo?.author || '作者'
      const newId = generateSmartCardId(packageName, author, 'ancestry', currentName, packageData)
      
      // 只在ID实际需要更新时才设置，避免无限循环
      if (currentId !== newId) {
        form.setValue('id', newId)
      }
    }
  }, [form, autoGenerateId, packageInfo, packageData])

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
        {/* 第一行：卡牌名称 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="名称"
            render={({ field }) => (
              <FormItem>
                <FormLabel>卡牌名称 *</FormLabel>
                <FormControl>
                  <Input placeholder="例如：星光血脉" {...field} />
                </FormControl>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 第二行：种族和类别 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="种族"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>种族 *</FormLabel>
                    <FormControl>
                      <KeywordCombobox
                        value={field.value || ''}
                        onChange={field.onChange}
                        keywords={keywordLists?.ancestries || []}
                        onAddKeyword={(keyword) => onAddKeyword?.('ancestries', keyword)}
                        placeholder="输入或选择种族"
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
                    <Select 
                      value={field.value?.toString() || ''} 
                      onValueChange={(value) => {
                        const numValue = parseInt(value)
                        if (!isNaN(numValue) && numValue !== field.value) {
                          field.onChange(numValue)
                        }
                      }}
                    >
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

        {/* 第三行：能力效果 */}
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
                  <div className="text-sm text-muted-foreground">
                    支持Markdown格式，可以使用 *__能力名__* 来标记能力标题
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

        {/* 第四行：种族简介 */}
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
                      placeholder="种族的风味描述。"
                      height={100}
                    />
                  </FormControl>
                  <div className="text-sm text-muted-foreground">
                    该种族的风味描述
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
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
  
  // 规范化卡牌数据，确保简略信息字段结构完整
  const normalizeCard = (cardData: RawVariantCard): RawVariantCard => {
    const normalized = { ...cardData }
    
    // 确保简略信息字段存在且结构完整
    if (!normalized.简略信息 || typeof normalized.简略信息 !== 'object') {
      normalized.简略信息 = {
        item1: '',
        item2: '',
        item3: '',
        item4: ''
      }
    } else {
      normalized.简略信息 = {
        item1: normalized.简略信息.item1 || '',
        item2: normalized.简略信息.item2 || '',
        item3: normalized.简略信息.item3 || '',
        item4: normalized.简略信息.item4 || ''
      }
    }
    
    // 确保等级字段不为undefined
    if (normalized.等级 === undefined) {
      normalized.等级 = ''
    }
    
    return normalized
  }
  
  const normalizedCard = normalizeCard(card)
  
  const form = useForm<RawVariantCard>({
    defaultValues: normalizedCard
  })

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    const normalized = normalizeCard(card)
    form.reset(normalized)
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

        // 只在ID实际需要更新时才设置，避免无限循环
        if (form.getValues('id') !== newId) {
          form.setValue('id', newId, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
        }
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form, autoGenerateId, packageInfo, packageData])

  // 初始化时如果没有ID或ID为默认值，则自动生成
  useEffect(() => {
    const currentId = form.getValues('id')
    const currentName = form.getValues('名称')
    
    if (autoGenerateId && currentName && (!currentId || currentId.includes('新物品'))) {
      const packageName = packageInfo?.name || '新建卡包'
      const author = packageInfo?.author || '作者'
      const newId = generateSmartCardId(packageName, author, 'variant', currentName, packageData)
      
      // 只在ID实际需要更新时才设置，避免无限循环
      if (currentId !== newId) {
        form.setValue('id', newId)
      }
    }
  }, [form, autoGenerateId, packageInfo, packageData])

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
        {/* 第一行：名称 */}
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
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
        </div>

        {/* 第二行：卡牌类型 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="类型"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>卡牌类型 *</FormLabel>
                    <FormControl>
                      <KeywordCombobox
                        value={field.value || ''}
                        onChange={field.onChange}
                        keywords={keywordLists?.variants || []}
                        onAddKeyword={(keyword) => onAddKeyword?.('variants', keyword)}
                        placeholder="输入或选择卡牌类型"
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      从预定义列表中选择或添加新的变体类型
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

        {/* 第三行：简略信息 */}
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

        {/* 第四行：卡牌效果 */}
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
                  <div className="text-sm text-muted-foreground">
                    支持Markdown格式，可以使用 *__效果名__* 来标记效果标题
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

        {/* 第五行：子类别和等级 */}
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
                <div className="text-sm text-muted-foreground">选填字段</div>
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
                <div className="text-sm text-muted-foreground">选填字段</div>
                <FormMessage />
              </FormItem>
            )}
          />
            </div>
          </div>
        </Form>
  )
}

// 社群卡牌编辑器
export function CommunityCardForm({
  card,
  onSave,
  onCancel,
  onChange,
  keywordLists,
  onAddKeyword,
  packageInfo,
  packageData
}: BaseCardFormProps<CommunityCard>) {
  const [isEditingId, setIsEditingId] = useState(false)
  const [autoGenerateId, setAutoGenerateId] = useState(true)

  const form = useForm<CommunityCard>({
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
      onChange(value as CommunityCard)
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
        const newId = generateSmartCardId(packageName, author, 'community', value.名称, packageData)

        // 只在ID实际需要更新时才设置，避免无限循环
        if (form.getValues('id') !== newId) {
          form.setValue('id', newId, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [form, autoGenerateId, packageInfo, packageData])

  // 初始化时如果没有ID或ID为默认值，则自动生成
  useEffect(() => {
    const currentId = form.getValues('id')
    const currentName = form.getValues('名称')

    if (autoGenerateId && currentName && (!currentId || currentId.includes('新社群'))) {
      const packageName = packageInfo?.name || '新建卡包'
      const author = packageInfo?.author || '作者'
      const newId = generateSmartCardId(packageName, author, 'community', currentName, packageData)
      
      // 只在ID实际需要更新时才设置，避免无限循环
      if (currentId !== newId) {
        form.setValue('id', newId)
      }
    }
  }, [form, autoGenerateId, packageInfo, packageData])

  // 处理字段失焦事件
  const handleFieldBlur = () => {
    const currentValues = form.getValues()
    onChange?.(currentValues as CommunityCard)
  }

  // 手动生成ID
  const generateId = () => {
    const currentValues = form.getValues()
    const packageName = packageInfo?.name || '新建卡包'
    const author = packageInfo?.author || '作者'
    const cardName = currentValues.名称 || '卡牌名'

    const newId = generateCardId(packageName, author, 'community', cardName)
    form.setValue('id', newId)
  }

  return (
    <Form {...form}>
      <div className="space-y-4">
        {/* 第一行：社群名称 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="名称"
            render={({ field }) => (
              <FormItem>
                <FormLabel>社群名称 *</FormLabel>
                <FormControl>
                  <KeywordCombobox
                    value={field.value || ''}
                    onChange={field.onChange}
                    keywords={keywordLists?.communities || []}
                    onAddKeyword={(keyword) => onAddKeyword?.('communities', keyword)}
                    placeholder="输入或选择社群"
                  />
                </FormControl>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                            placeholder="例如：pack-author-comm-星辰学院"
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
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 第二行：社群能力 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="特性"
            render={({ field }) => (
              <FormItem>
                <FormLabel>社群能力 *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="请输入社群的核心能力"
                    {...field}
                    onBlur={handleFieldBlur}
                  />
                </FormControl>
                <div className="text-sm text-muted-foreground">
                  描述社群提供的核心能力和优势
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 第三行：社群描述 */}
        <FormField
          control={form.control}
          name="描述"
          render={({ field }) => (
            <FormItem>
              <FormLabel>社群描述 *</FormLabel>
              <FormControl>
                <MarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={handleFieldBlur}
                  placeholder="详细描述社群带来的能力和关系，支持Markdown"
                  height={200}
                />
              </FormControl>
              <div className="text-sm text-muted-foreground">
                支持Markdown格式，可以使用 *__特性名__* 来标记特性标题
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 第四行：社群简介 */}
        <FormField
          control={form.control}
          name="简介"
          render={({ field }) => (
            <FormItem>
              <FormLabel>社群简介 *</FormLabel>
              <FormControl>
                <Input
                  placeholder="请输入社群的背景和风味描述"
                  {...field}
                  onBlur={handleFieldBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
}

// 子职业卡牌编辑器
export function SubclassCardForm({
  card,
  onSave,
  onCancel,
  onChange,
  keywordLists,
  onAddKeyword,
  packageInfo,
  packageData
}: BaseCardFormProps<SubClassCard>) {
  const [isEditingId, setIsEditingId] = useState(false)
  const [autoGenerateId, setAutoGenerateId] = useState(true)

  const form = useForm<SubClassCard>({
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
      onChange(value as SubClassCard)
    })

    return () => subscription.unsubscribe()
  }, [form, onChange])

  // 监听名称字段变化，自动更新ID和子职业字段
  useEffect(() => {
    if (!autoGenerateId) return

    const subscription = form.watch((value, { name }) => {
      if (name === '名称' && value.名称) {
        const packageName = packageInfo?.name || '新建卡包'
        const author = packageInfo?.author || '作者'
        const newId = generateSmartCardId(packageName, author, 'subclass', value.名称, packageData)

        // 只在ID实际需要更新时才设置，避免无限循环
        if (form.getValues('id') !== newId) {
          form.setValue('id', newId, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
        }

        // 自动推断子职业字段：从名称中移除等级后缀
        const currentLevel = form.getValues('等级')
        if (currentLevel && value.名称.endsWith(currentLevel)) {
          const subclassName = value.名称.slice(0, -currentLevel.length).trim()
          if (form.getValues('子职业') !== subclassName) {
            form.setValue('子职业', subclassName, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
          }
        }
      }

      // 监听等级变化，同步更新名称和子职业
      if (name === '等级' && value.等级) {
        const currentName = form.getValues('名称')
        const currentSubclass = form.getValues('子职业')

        // 如果有子职业名称，自动构建完整名称
        if (currentSubclass && !currentName.endsWith(value.等级)) {
          const newName = `${currentSubclass}${value.等级}`
          form.setValue('名称', newName, { shouldValidate: false, shouldDirty: false, shouldTouch: false })

          // 同步更新ID
          const packageName = packageInfo?.name || '新建卡包'
          const author = packageInfo?.author || '作者'
          const newId = generateSmartCardId(packageName, author, 'subclass', newName, packageData)
          if (form.getValues('id') !== newId) {
            form.setValue('id', newId, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
          }
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [form, autoGenerateId, packageInfo, packageData])

  // 初始化时如果没有ID或ID为默认值，则自动生成
  useEffect(() => {
    const currentId = form.getValues('id')
    const currentName = form.getValues('名称')

    if (autoGenerateId && currentName && (!currentId || currentId.includes('新子职业'))) {
      const packageName = packageInfo?.name || '新建卡包'
      const author = packageInfo?.author || '作者'
      const newId = generateSmartCardId(packageName, author, 'subclass', currentName, packageData)

      // 只在ID实际需要更新时才设置，避免无限循环
      if (currentId !== newId) {
        form.setValue('id', newId)
      }
    }
  }, [form, autoGenerateId, packageInfo, packageData])

  // 处理字段失焦事件
  const handleFieldBlur = () => {
    const currentValues = form.getValues()
    onChange?.(currentValues as SubClassCard)
  }

  // 手动生成ID
  const generateId = () => {
    const currentValues = form.getValues()
    const packageName = packageInfo?.name || '新建卡包'
    const author = packageInfo?.author || '作者'
    const cardName = currentValues.名称 || '卡牌名'

    const newId = generateCardId(packageName, author, 'subclass', cardName)
    form.setValue('id', newId)
  }

  return (
    <Form {...form}>
      <div className="space-y-4">
        {/* 第一行：子职业名称 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="名称"
            render={({ field }) => (
              <FormItem>
                <FormLabel>子职业名称 *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例如：预言师基石"
                    {...field}
                    onBlur={handleFieldBlur}
                  />
                </FormControl>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                            placeholder="例如：pack-author-subc-预言师基石"
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
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 第二行：主职业、等级、施法属性 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="主职"
            render={({ field }) => (
              <FormItem>
                <FormLabel>主职业 *</FormLabel>
                <FormControl>
                  <KeywordCombobox
                    value={field.value || ''}
                    onChange={field.onChange}
                    keywords={keywordLists?.professions || []}
                    onAddKeyword={(keyword) => onAddKeyword?.('professions', keyword)}
                    placeholder="选择主职业"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="等级"
            render={({ field }) => (
              <FormItem>
                <FormLabel>等级 *</FormLabel>
                <Select
                  value={field.value || ''}
                  onValueChange={(value) => {
                    if (value !== field.value) {
                      field.onChange(value)
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择等级" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUBCLASS_LEVEL_NAMES.filter(level => level !== '未知').map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="施法"
            render={({ field }) => (
              <FormItem>
                <FormLabel>施法属性 *</FormLabel>
                <Select
                  value={field.value || ''}
                  onValueChange={(value) => {
                    if (value !== field.value) {
                      field.onChange(value)
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择施法属性" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ATTRIBUTE_CLASS_NAMES.map((attribute) => (
                      <SelectItem key={attribute} value={attribute}>
                        {attribute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 第四行：子职业描述 */}
        <FormField
          control={form.control}
          name="描述"
          render={({ field }) => (
            <FormItem>
              <FormLabel>子职业描述 *</FormLabel>
              <FormControl>
                <MarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={handleFieldBlur}
                  placeholder="详细描述子职业带来的能力和特性，支持Markdown"
                  height={200}
                />
              </FormControl>
              <div className="text-sm text-muted-foreground">
                支持Markdown格式，可以使用 *__特性名__* 来标记特性标题
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
}

// 领域卡牌编辑表单
export function DomainCardForm({
  card,
  onSave,
  onCancel,
  onPreview,
  onChange,
  keywordLists = {},
  onAddKeyword,
  packageInfo
}: BaseCardFormProps<DomainCard>) {
  const form = useForm<DomainCard>({
    defaultValues: card,
  })

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    form.reset(card)
  }, [card, form])

  // 监听表单变化
  useEffect(() => {
    const subscription = form.watch((values) => {
      const currentValues = values as DomainCard
      if (onChange) {
        onChange(currentValues)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, onChange])

  // 智能ID生成和名称处理
  useEffect(() => {
    const cardName = form.getValues('名称')
    if (!cardName || !packageInfo) return

    const packageName = packageInfo.name
    const author = packageInfo.author
    const newId = generateCardId(packageName, author, 'domain', cardName)

    if (form.getValues('id') !== newId) {
      form.setValue('id', newId, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
    }
  }, [form.watch('名称'), packageInfo, form])

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

  // 获取可用的领域选项
  const domainOptions = keywordLists.domains || []

  return (
    <Form {...form}>
      <div className="space-y-4">
        {/* 第一行：名称 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="名称"
            render={({ field }) => (
              <FormItem>
                <FormLabel>名称 *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="输入领域卡牌名称" onBlur={handleFieldBlur} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 第二行：领域 + 属性 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="领域"
            render={({ field }) => (
              <FormItem>
                <FormLabel>领域 *</FormLabel>
                <FormControl>
                  <KeywordCombobox
                    value={field.value || ''}
                    onChange={(value) => {
                      field.onChange(value)
                      handleAutoSave()
                    }}
                    keywords={domainOptions}
                    placeholder="选择或创建领域"
                    onAddKeyword={(keyword) => onAddKeyword?.('domains', keyword)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="属性"
            render={({ field }) => (
              <FormItem>
                <FormLabel>属性 *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="能力/法术..." onBlur={handleFieldBlur} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 第三行：等级 + 回想 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="等级"
            render={({ field }) => (
              <FormItem>
                <FormLabel>等级 *</FormLabel>
                <FormControl>
                  <Select
                    value={field.value?.toString() || ''}
                    onValueChange={(value) => {
                      if (field.value?.toString() !== value) {
                        field.onChange(parseInt(value))
                        handleAutoSave()
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择等级" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                        <SelectItem key={level} value={level.toString()}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="回想"
            render={({ field }) => (
              <FormItem>
                <FormLabel>回想 *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    {...field}
                    value={field.value?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '') {
                        field.onChange(0)
                      } else {
                        const num = parseInt(value)
                        if (!isNaN(num)) {
                          field.onChange(num)
                        }
                      }
                    }}
                    onBlur={handleFieldBlur}
                    placeholder="输入回想值"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 描述 - 占满一行 */}
        <FormField
          control={form.control}
          name="描述"
          render={({ field }) => (
            <FormItem>
              <FormLabel>描述</FormLabel>
              <FormControl>
                <SimpleMarkdownEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={handleFieldBlur}
                  placeholder="输入领域卡牌描述"
                />
              </FormControl>
              <div className="text-sm text-muted-foreground">
                支持 Markdown 语法，可使用 **粗体**、*斜体*、`代码` 等格式
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
}