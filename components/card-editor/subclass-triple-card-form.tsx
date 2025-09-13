'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { KeywordCombobox } from '@/components/card-editor/keyword-combobox'
import { Card } from '@/components/ui/card'
import MarkdownEditor from '@/components/card-editor/markdown-editor'
import { generateSmartCardId } from '@/app/card-editor/utils/id-generator'
import type { SubclassCard } from '@/card/subclass-card/convert'
import type { CardPackageState } from '@/app/card-editor/types'
import { RefreshCw, Edit2, RotateCcw, Eye } from 'lucide-react'
import { SUBCLASS_LEVEL_NAMES, ATTRIBUTE_CLASS_NAMES } from '@/card/card-types'

interface SubclassCardTriple {
  主职: string
  子职业: string
  施法: string
  基石: {
    id: string
    名称: string
    描述: string
    imageUrl?: string
  }
  专精: {
    id: string
    名称: string
    描述: string
    imageUrl?: string
  }
  大师: {
    id: string
    名称: string
    描述: string
    imageUrl?: string
  }
}

interface SubclassTripleCardFormProps {
  card1: SubclassCard | null // 基石
  card2: SubclassCard | null // 专精
  card3: SubclassCard | null // 大师
  onSave: (card1: SubclassCard, card2: SubclassCard, card3: SubclassCard) => void
  onCancel?: () => void
  onPreview?: (card: SubclassCard, level: '基石' | '专精' | '大师') => void
  onChange?: (card1: SubclassCard, card2: SubclassCard, card3: SubclassCard) => void
  keywordLists?: CardPackageState['customFieldDefinitions']
  onAddKeyword?: (category: string, keyword: string) => void
  packageInfo?: { name: string; author: string }
  packageData?: CardPackageState
}

export function SubclassTripleCardForm({
  card1,
  card2,
  card3,
  onSave,
  onCancel,
  onPreview,
  onChange,
  keywordLists,
  onAddKeyword,
  packageInfo,
  packageData
}: SubclassTripleCardFormProps) {
  const [isEditingId1, setIsEditingId1] = useState(false)
  const [isEditingId2, setIsEditingId2] = useState(false)
  const [isEditingId3, setIsEditingId3] = useState(false)
  const [isEditingName1, setIsEditingName1] = useState(false)
  const [isEditingName2, setIsEditingName2] = useState(false)
  const [isEditingName3, setIsEditingName3] = useState(false)
  const [autoGenerateId, setAutoGenerateId] = useState(true)

  // 初始化表单数据
  const getInitialValues = (): SubclassCardTriple => {
    // 获取共享字段（优先从已存在的卡片中获取）
    const 主职 = card1?.主职 || card2?.主职 || card3?.主职 || ''
    const 子职业 = card1?.子职业 || card2?.子职业 || card3?.子职业 || ''
    const 施法 = card1?.施法 || card2?.施法 || card3?.施法 || '不可施法'

    return {
      主职,
      子职业,
      施法,
      基石: {
        id: card1?.id || '',
        名称: card1?.名称 || '',
        描述: card1?.描述 || '',
        imageUrl: card1?.imageUrl || ''
      },
      专精: {
        id: card2?.id || '',
        名称: card2?.名称 || '',
        描述: card2?.描述 || '',
        imageUrl: card2?.imageUrl || ''
      },
      大师: {
        id: card3?.id || '',
        名称: card3?.名称 || '',
        描述: card3?.描述 || '',
        imageUrl: card3?.imageUrl || ''
      }
    }
  }

  const form = useForm<SubclassCardTriple>({
    defaultValues: getInitialValues()
  })

  // 当输入的卡片数据变化时重置表单
  useEffect(() => {
    form.reset(getInitialValues())
  }, [card1, card2, card3])

  // 生成ID的辅助函数
  const generateId = (subclassName: string, level: '基石' | '专精' | '大师') => {
    if (!packageInfo) return ''
    return generateSmartCardId(
      packageInfo.name,
      packageInfo.author,
      'subclass',
      `${subclassName}${level}`,
      packageData
    )
  }

  // 监听表单变化
  useEffect(() => {
    if (!onChange) return

    const subscription = form.watch((value) => {
      const formData = value as SubclassCardTriple
      const card1: SubclassCard = {
        id: formData.基石.id,
        名称: formData.基石.名称,
        描述: formData.基石.描述,
        主职: formData.主职,
        子职业: formData.子职业,
        等级: '基石',
        施法: formData.施法,
        imageUrl: formData.基石.imageUrl
      }
      const card2: SubclassCard = {
        id: formData.专精.id,
        名称: formData.专精.名称,
        描述: formData.专精.描述,
        主职: formData.主职,
        子职业: formData.子职业,
        等级: '专精',
        施法: formData.施法,
        imageUrl: formData.专精.imageUrl
      }
      const card3: SubclassCard = {
        id: formData.大师.id,
        名称: formData.大师.名称,
        描述: formData.大师.描述,
        主职: formData.主职,
        子职业: formData.子职业,
        等级: '大师',
        施法: formData.施法,
        imageUrl: formData.大师.imageUrl
      }
      onChange(card1, card2, card3)
    })

    return () => subscription.unsubscribe()
  }, [form, onChange])

  // 自动生成ID和名称
  useEffect(() => {
    if (!autoGenerateId || !packageInfo) return

    const subscription = form.watch((value, { name }) => {
      const formData = value as SubclassCardTriple
      
      // 监听子职业名称变化，自动更新三张卡的名称和ID
      if (name === '子职业' && formData.子职业) {
        // 更新基石卡
        const name1 = `${formData.子职业}基石`
        if (form.getValues('基石.名称') !== name1) {
          form.setValue('基石.名称', name1, { shouldValidate: false })
        }
        const id1 = generateId(formData.子职业, '基石')
        if (form.getValues('基石.id') !== id1) {
          form.setValue('基石.id', id1, { shouldValidate: false })
        }

        // 更新专精卡
        const name2 = `${formData.子职业}专精`
        if (form.getValues('专精.名称') !== name2) {
          form.setValue('专精.名称', name2, { shouldValidate: false })
        }
        const id2 = generateId(formData.子职业, '专精')
        if (form.getValues('专精.id') !== id2) {
          form.setValue('专精.id', id2, { shouldValidate: false })
        }

        // 更新大师卡
        const name3 = `${formData.子职业}大师`
        if (form.getValues('大师.名称') !== name3) {
          form.setValue('大师.名称', name3, { shouldValidate: false })
        }
        const id3 = generateId(formData.子职业, '大师')
        if (form.getValues('大师.id') !== id3) {
          form.setValue('大师.id', id3, { shouldValidate: false })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [form, autoGenerateId, packageInfo])

  const handleSubmit = (data: SubclassCardTriple) => {
    const card1: SubclassCard = {
      id: data.基石.id,
      名称: data.基石.名称,
      描述: data.基石.描述,
      主职: data.主职,
      子职业: data.子职业,
      等级: '基石',
      施法: data.施法,
      imageUrl: data.基石.imageUrl
    }
    const card2: SubclassCard = {
      id: data.专精.id,
      名称: data.专精.名称,
      描述: data.专精.描述,
      主职: data.主职,
      子职业: data.子职业,
      等级: '专精',
      施法: data.施法,
      imageUrl: data.专精.imageUrl
    }
    const card3: SubclassCard = {
      id: data.大师.id,
      名称: data.大师.名称,
      描述: data.大师.描述,
      主职: data.主职,
      子职业: data.子职业,
      等级: '大师',
      施法: data.施法,
      imageUrl: data.大师.imageUrl
    }
    onSave(card1, card2, card3)
  }

  const handleFieldBlur = () => {
    form.handleSubmit(handleSubmit)()
  }

  // 为每个等级渲染卡片编辑区域
  const renderLevelCard = (
    level: '基石' | '专精' | '大师',
    fieldPrefix: '基石' | '专精' | '大师',
    colorScheme: { bg: string; border: string; text: string },
    isEditingId: boolean,
    setIsEditingId: (value: boolean) => void,
    isEditingName: boolean,
    setIsEditingName: (value: boolean) => void
  ) => (
    <Card className={`p-4 ${colorScheme.bg} ${colorScheme.border}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${colorScheme.text}`}>{level}等级</h3>
        {onPreview && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const formData = form.getValues()
              const card: SubclassCard = {
                id: formData[fieldPrefix].id,
                名称: formData[fieldPrefix].名称,
                描述: formData[fieldPrefix].描述,
                主职: formData.主职,
                子职业: formData.子职业,
                等级: level,
                施法: formData.施法,
                imageUrl: formData[fieldPrefix].imageUrl
              }
              onPreview(card, level)
            }}
            className="h-7"
          >
            <Eye className="h-3 w-3 mr-1" />
            预览
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* ID管理 */}
        <FormField
          control={form.control}
          name={`${fieldPrefix}.id` as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">卡牌ID</FormLabel>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  {!isEditingId ? (
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 overflow-x-auto">
                      {field.value || '自动生成'}
                    </code>
                  ) : (
                    <FormControl>
                      <Input
                        className="h-7 text-xs font-mono"
                        {...field}
                        onBlur={() => {
                          setIsEditingId(false)
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
                        const subclass = form.getValues('子职业')
                        form.setValue(`${fieldPrefix}.id` as any, generateId(subclass, level))
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
                    onClick={() => setIsEditingId(true)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </FormItem>
          )}
        />

        {/* 名称 */}
        <FormField
          control={form.control}
          name={`${fieldPrefix}.名称` as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>名称 *</FormLabel>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  {!isEditingName && autoGenerateId ? (
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 overflow-x-auto">
                      {field.value || `${level}卡牌名称`}
                    </code>
                  ) : (
                    <FormControl>
                      <Input
                        {...field}
                        onBlur={() => {
                          setIsEditingName(false)
                          handleFieldBlur()
                        }}
                        placeholder={`${level}卡牌名称`}
                        autoFocus={isEditingName}
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
                        const subclass = form.getValues('子职业')
                        form.setValue(`${fieldPrefix}.名称` as any, `${subclass}${level}`)
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
                    onClick={() => setIsEditingName(true)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {autoGenerateId && !isEditingName && (
                <p className="text-xs text-muted-foreground">名称根据子职业名自动生成，可点击编辑按钮修改</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 描述 */}
        <FormField
          control={form.control}
          name={`${fieldPrefix}.描述` as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>描述 *</FormLabel>
              <FormControl>
                <MarkdownEditor
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value)
                    handleFieldBlur()
                  }}
                  placeholder={`输入${level}等级的能力描述（支持Markdown）`}
                  height={150}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 图片URL */}
        <FormField
          control={form.control}
          name={`${fieldPrefix}.imageUrl` as any}
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
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* 共享字段区域 */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="text-sm font-semibold mb-3 text-blue-900">共享字段（三张卡通用）</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="主职"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>主职 *</FormLabel>
                  <FormControl>
                    <KeywordCombobox
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                        handleFieldBlur()
                      }}
                      onBlur={handleFieldBlur}
                      keywords={Array.isArray(keywordLists?.professions) ? keywordLists.professions : []}
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
              name="子职业"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>子职业 *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onBlur={handleFieldBlur}
                      placeholder="输入子职业名称"
                    />
                  </FormControl>
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
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      handleFieldBlur()
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择施法属性" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ATTRIBUTE_CLASS_NAMES.map(attr => (
                        <SelectItem key={attr} value={attr}>
                          {attr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* 三个等级的卡片 */}
        {renderLevelCard(
          '基石',
          '基石',
          { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900' },
          isEditingId1,
          setIsEditingId1,
          isEditingName1,
          setIsEditingName1
        )}

        {renderLevelCard(
          '专精',
          '专精',
          { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
          isEditingId2,
          setIsEditingId2,
          isEditingName2,
          setIsEditingName2
        )}

        {renderLevelCard(
          '大师',
          '大师',
          { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' },
          isEditingId3,
          setIsEditingId3,
          isEditingName3,
          setIsEditingName3
        )}

        {/* 自动生成ID开关 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <RotateCcw className={`h-4 w-4 ${autoGenerateId ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="text-sm">自动生成名称和ID</span>
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
            <strong>提示：</strong>子职业必须包含三个等级的卡片（基石、专精、大师）。
            它们共享相同的主职、子职业和施法属性，但有不同的能力描述。
          </p>
        </div>
      </form>
    </Form>
  )
}