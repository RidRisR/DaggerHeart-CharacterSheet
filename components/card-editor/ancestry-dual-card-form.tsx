'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { KeywordCombobox } from '@/components/card-editor/keyword-combobox'
import { Card } from '@/components/ui/card'
import MarkdownEditor from '@/components/card-editor/markdown-editor'
import { generateSmartCardId } from '@/app/card-editor/utils/id-generator'
import type { AncestryCard } from '@/card/ancestry-card/convert'
import type { CardPackageState } from '@/app/card-editor/types'
import { RefreshCw, Edit2, RotateCcw, Eye } from 'lucide-react'

interface AncestryCardPair {
  种族: string
  简介: string
  card1: {
    id: string
    名称: string
    效果: string
    imageUrl?: string
  }
  card2: {
    id: string
    名称: string
    效果: string
    imageUrl?: string
  }
}

interface AncestryDualCardFormProps {
  card1: AncestryCard | null
  card2: AncestryCard | null
  onSave: (card1: AncestryCard, card2: AncestryCard) => void
  onCancel?: () => void
  onPreview?: (card: AncestryCard, category: 1 | 2) => void
  onChange?: (card1: AncestryCard, card2: AncestryCard) => void
  keywordLists?: CardPackageState['customFieldDefinitions']
  onAddKeyword?: (category: string, keyword: string) => void
  packageInfo?: { name: string; author: string }
  packageData?: CardPackageState
}

export function AncestryDualCardForm({
  card1,
  card2,
  onSave,
  onCancel,
  onPreview,
  onChange,
  keywordLists,
  onAddKeyword,
  packageInfo,
  packageData
}: AncestryDualCardFormProps) {
  const [isEditingId1, setIsEditingId1] = useState(false)
  const [isEditingId2, setIsEditingId2] = useState(false)
  const [autoGenerateId, setAutoGenerateId] = useState(true)

  // 初始化表单数据
  const getInitialValues = (): AncestryCardPair => {
    if (card1 && card2) {
      // 两张卡都存在，使用现有数据
      return {
        种族: card1.种族 || card2.种族 || '',
        简介: card1.简介 || card2.简介 || '',
        card1: {
          id: card1.id || '',
          名称: card1.名称 || '',
          效果: card1.效果 || '',
          imageUrl: card1.imageUrl || ''
        },
        card2: {
          id: card2.id || '',
          名称: card2.名称 || '',
          效果: card2.效果 || '',
          imageUrl: card2.imageUrl || ''
        }
      }
    } else if (card1) {
      // 只有类别1存在，自动创建类别2
      return {
        种族: card1.种族 || '',
        简介: card1.简介 || '',
        card1: {
          id: card1.id || '',
          名称: card1.名称 || '',
          效果: card1.效果 || '',
          imageUrl: card1.imageUrl || ''
        },
        card2: {
          id: '',
          名称: '',
          效果: '',
          imageUrl: ''
        }
      }
    } else if (card2) {
      // 只有类别2存在，自动创建类别1
      return {
        种族: card2.种族 || '',
        简介: card2.简介 || '',
        card1: {
          id: '',
          名称: '',
          效果: '',
          imageUrl: ''
        },
        card2: {
          id: card2.id || '',
          名称: card2.名称 || '',
          效果: card2.效果 || '',
          imageUrl: card2.imageUrl || ''
        }
      }
    } else {
      // 创建新的配对
      return {
        种族: '',
        简介: '',
        card1: { id: '', 名称: '', 效果: '', imageUrl: '' },
        card2: { id: '', 名称: '', 效果: '', imageUrl: '' }
      }
    }
  }

  const form = useForm<AncestryCardPair>({
    defaultValues: getInitialValues()
  })

  // 当输入的卡片数据变化时重置表单
  useEffect(() => {
    form.reset(getInitialValues())
  }, [card1, card2])

  // 生成ID的辅助函数
  const generateId = (cardName: string, category: 1 | 2) => {
    if (!packageInfo) return ''
    return generateSmartCardId(
      packageInfo.name,
      packageInfo.author,
      'ancestry',
      `${cardName}-类别${category}`,
      packageData
    )
  }

  // 监听表单变化
  useEffect(() => {
    if (!onChange) return

    const subscription = form.watch((value) => {
      const formData = value as AncestryCardPair
      const ancestryCard1: AncestryCard = {
        id: formData.card1.id,
        名称: formData.card1.名称,
        种族: formData.种族,
        简介: formData.简介,
        效果: formData.card1.效果,
        类别: 1,
        imageUrl: formData.card1.imageUrl
      }
      const ancestryCard2: AncestryCard = {
        id: formData.card2.id,
        名称: formData.card2.名称,
        种族: formData.种族,
        简介: formData.简介,
        效果: formData.card2.效果,
        类别: 2,
        imageUrl: formData.card2.imageUrl
      }
      onChange(ancestryCard1, ancestryCard2)
    })

    return () => subscription.unsubscribe()
  }, [form, onChange])

  // 自动生成ID
  useEffect(() => {
    if (!autoGenerateId || !packageInfo) return

    const subscription = form.watch((value, { name }) => {
      const formData = value as AncestryCardPair
      
      // 监听卡片1名称变化
      if (name === 'card1.名称' && formData.card1.名称) {
        const newId = generateId(formData.card1.名称, 1)
        if (form.getValues('card1.id') !== newId) {
          form.setValue('card1.id', newId, { shouldValidate: false })
        }
      }
      
      // 监听卡片2名称变化
      if (name === 'card2.名称' && formData.card2.名称) {
        const newId = generateId(formData.card2.名称, 2)
        if (form.getValues('card2.id') !== newId) {
          form.setValue('card2.id', newId, { shouldValidate: false })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [form, autoGenerateId, packageInfo])

  const handleSubmit = (data: AncestryCardPair) => {
    const ancestryCard1: AncestryCard = {
      id: data.card1.id,
      名称: data.card1.名称,
      种族: data.种族,
      简介: data.简介,
      效果: data.card1.效果,
      类别: 1,
      imageUrl: data.card1.imageUrl
    }
    const ancestryCard2: AncestryCard = {
      id: data.card2.id,
      名称: data.card2.名称,
      种族: data.种族,
      简介: data.简介,
      效果: data.card2.效果,
      类别: 2,
      imageUrl: data.card2.imageUrl
    }
    onSave(ancestryCard1, ancestryCard2)
  }

  const handleFieldBlur = () => {
    form.handleSubmit(handleSubmit)()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* 共享字段区域 */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="text-sm font-semibold mb-3 text-blue-900">共享字段（两张卡通用）</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="种族"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>种族 *</FormLabel>
                    <FormControl>
                      <KeywordCombobox
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value)
                          handleFieldBlur()
                        }}
                        keywords={Array.isArray(keywordLists?.ancestries) ? keywordLists.ancestries : []}
                        onAddKeyword={(keyword) => onAddKeyword?.('ancestries', keyword)}
                        placeholder="输入或选择种族"
                      />
                    </FormControl>
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
                  <FormLabel>简介 *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      onBlur={handleFieldBlur}
                      placeholder="输入种族简介"
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* 类别1卡片 */}
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-green-900">类别一卡片</h3>
            {onPreview && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const formData = form.getValues()
                  const card: AncestryCard = {
                    id: formData.card1.id,
                    名称: formData.card1.名称,
                    种族: formData.种族,
                    简介: formData.简介,
                    效果: formData.card1.效果,
                    类别: 1,
                    imageUrl: formData.card1.imageUrl
                  }
                  onPreview(card, 1)
                }}
                className="h-7"
              >
                <Eye className="h-3 w-3 mr-1" />
                预览
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            {/* 类别1 ID管理 */}
            <FormField
              control={form.control}
              name="card1.id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">卡牌ID</FormLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {!isEditingId1 ? (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 overflow-x-auto">
                          {field.value || '自动生成'}
                        </code>
                      ) : (
                        <FormControl>
                          <Input
                            className="h-7 text-xs font-mono"
                            {...field}
                            onBlur={() => {
                              setIsEditingId1(false)
                              handleFieldBlur()
                            }}
                            autoFocus
                          />
                        </FormControl>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (packageInfo) {
                            const name = form.getValues('card1.名称')
                            form.setValue('card1.id', generateId(name, 1))
                          }
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingId1(true)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="card1.名称"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称 *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onBlur={handleFieldBlur}
                        placeholder="输入能力名称"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="card1.效果"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>效果 *</FormLabel>
                  <FormControl>
                    <MarkdownEditor
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                        handleFieldBlur()
                      }}
                      placeholder="输入能力效果（支持Markdown）"
                      height={150}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="card1.imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>图片URL（可选）</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      onBlur={handleFieldBlur}
                      placeholder="输入图片URL"
                      type="url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* 类别2卡片 */}
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-purple-900">类别二卡片</h3>
            {onPreview && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const formData = form.getValues()
                  const card: AncestryCard = {
                    id: formData.card2.id,
                    名称: formData.card2.名称,
                    种族: formData.种族,
                    简介: formData.简介,
                    效果: formData.card2.效果,
                    类别: 2,
                    imageUrl: formData.card2.imageUrl
                  }
                  onPreview(card, 2)
                }}
                className="h-7"
              >
                <Eye className="h-3 w-3 mr-1" />
                预览
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            {/* 类别2 ID管理 */}
            <FormField
              control={form.control}
              name="card2.id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">卡牌ID</FormLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {!isEditingId2 ? (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 overflow-x-auto">
                          {field.value || '自动生成'}
                        </code>
                      ) : (
                        <FormControl>
                          <Input
                            className="h-7 text-xs font-mono"
                            {...field}
                            onBlur={() => {
                              setIsEditingId2(false)
                              handleFieldBlur()
                            }}
                            autoFocus
                          />
                        </FormControl>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (packageInfo) {
                            const name = form.getValues('card2.名称')
                            form.setValue('card2.id', generateId(name, 2))
                          }
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingId2(true)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="card2.名称"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称 *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onBlur={handleFieldBlur}
                        placeholder="输入能力名称"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="card2.效果"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>效果 *</FormLabel>
                  <FormControl>
                    <MarkdownEditor
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                        handleFieldBlur()
                      }}
                      placeholder="输入能力效果（支持Markdown）"
                      height={150}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="card2.imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>图片URL（可选）</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      onBlur={handleFieldBlur}
                      placeholder="输入图片URL"
                      type="url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* 自动生成ID开关 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <RotateCcw className={`h-4 w-4 ${autoGenerateId ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="text-sm">自动生成ID</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant={autoGenerateId ? 'default' : 'outline'}
            onClick={() => setAutoGenerateId(!autoGenerateId)}
          >
            {autoGenerateId ? '已启用' : '已禁用'}
          </Button>
        </div>

        {/* 提示信息 */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>提示：</strong>种族卡必须成对创建。每个种族需要两张卡片（类别一和类别二），
            它们共享相同的种族和简介，但有不同的名称和效果。
          </p>
        </div>
      </form>
    </Form>
  )
}