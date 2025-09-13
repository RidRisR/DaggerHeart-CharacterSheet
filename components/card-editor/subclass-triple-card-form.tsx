'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { KeywordCombobox } from '@/components/card-editor/keyword-combobox'
import { Card } from '@/components/ui/card'
import MarkdownEditor from '@/components/card-editor/markdown-editor'
import type { SubclassCard } from '@/card/subclass-card/convert'
import type { CardPackageState } from '@/app/card-editor/types'
import { SUBCLASS_LEVEL_NAMES, ATTRIBUTE_CLASS_NAMES } from '@/card/card-types'
import { useCardEditorStore } from '@/app/card-editor/store/card-editor-store'

interface SubclassCardTriple {
  主职: string
  子职业: string
  施法: string
  基石: {
    名称: string
    描述: string
    imageUrl?: string
  }
  专精: {
    名称: string
    描述: string
    imageUrl?: string
  }
  大师: {
    名称: string
    描述: string
    imageUrl?: string
  }
}

interface SubclassTripleCardFormProps {
  card1: SubclassCard | null // 基石
  card2: SubclassCard | null // 专精
  card3: SubclassCard | null // 大师
  cardIndex1: number
  cardIndex2: number
  cardIndex3: number
  keywordLists?: CardPackageState['customFieldDefinitions']
  onAddKeyword?: (category: string, keyword: string) => void
}

export function SubclassTripleCardForm({
  card1,
  card2,
  card3,
  cardIndex1,
  cardIndex2,
  cardIndex3,
  keywordLists,
  onAddKeyword
}: SubclassTripleCardFormProps) {
  const { updateCard } = useCardEditorStore()

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
        名称: card1?.名称 || '',
        描述: card1?.描述 || '',
        imageUrl: card1?.imageUrl || ''
      },
      专精: {
        名称: card2?.名称 || '',
        描述: card2?.描述 || '',
        imageUrl: card2?.imageUrl || ''
      },
      大师: {
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

  // 监听表单变化并实时保存到store
  useEffect(() => {
    const subscription = form.watch((value) => {
      const formData = value as SubclassCardTriple

      // 更新基石卡
      if (card1 || formData.基石.名称 || formData.基石.描述) {
        const subclassCard1: SubclassCard = {
          id: card1?.id || '', // ID由store自动管理
          名称: formData.基石.名称 || '',
          描述: formData.基石.描述 || '',
          主职: formData.主职 || '',
          子职业: formData.子职业 || '',
          等级: '基石',
          施法: formData.施法 || '不可施法',
          imageUrl: formData.基石.imageUrl || ''
        }
        updateCard('subclass', cardIndex1, subclassCard1)
      }

      // 更新专精卡
      if (card2 || formData.专精.名称 || formData.专精.描述) {
        const subclassCard2: SubclassCard = {
          id: card2?.id || '', // ID由store自动管理
          名称: formData.专精.名称 || '',
          描述: formData.专精.描述 || '',
          主职: formData.主职 || '',
          子职业: formData.子职业 || '',
          等级: '专精',
          施法: formData.施法 || '不可施法',
          imageUrl: formData.专精.imageUrl || ''
        }
        updateCard('subclass', cardIndex2, subclassCard2)
      }

      // 更新大师卡
      if (card3 || formData.大师.名称 || formData.大师.描述) {
        const subclassCard3: SubclassCard = {
          id: card3?.id || '', // ID由store自动管理
          名称: formData.大师.名称 || '',
          描述: formData.大师.描述 || '',
          主职: formData.主职 || '',
          子职业: formData.子职业 || '',
          等级: '大师',
          施法: formData.施法 || '不可施法',
          imageUrl: formData.大师.imageUrl || ''
        }
        updateCard('subclass', cardIndex3, subclassCard3)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, cardIndex1, cardIndex2, cardIndex3, updateCard, card1, card2, card3])

  // 手动保存函数（用于特定场景）
  const handleFieldBlur = () => {
    const currentData = form.getValues()

    // 保存基石卡
    if (card1 || currentData.基石.名称 || currentData.基石.描述) {
      const subclassCard1: SubclassCard = {
        id: card1?.id || '',
        名称: currentData.基石.名称 || '',
        描述: currentData.基石.描述 || '',
        主职: currentData.主职 || '',
        子职业: currentData.子职业 || '',
        等级: '基石',
        施法: currentData.施法 || '不可施法',
        imageUrl: currentData.基石.imageUrl || ''
      }
      updateCard('subclass', cardIndex1, subclassCard1)
    }

    // 保存专精卡
    if (card2 || currentData.专精.名称 || currentData.专精.描述) {
      const subclassCard2: SubclassCard = {
        id: card2?.id || '',
        名称: currentData.专精.名称 || '',
        描述: currentData.专精.描述 || '',
        主职: currentData.主职 || '',
        子职业: currentData.子职业 || '',
        等级: '专精',
        施法: currentData.施法 || '不可施法',
        imageUrl: currentData.专精.imageUrl || ''
      }
      updateCard('subclass', cardIndex2, subclassCard2)
    }

    // 保存大师卡
    if (card3 || currentData.大师.名称 || currentData.大师.描述) {
      const subclassCard3: SubclassCard = {
        id: card3?.id || '',
        名称: currentData.大师.名称 || '',
        描述: currentData.大师.描述 || '',
        主职: currentData.主职 || '',
        子职业: currentData.子职业 || '',
        等级: '大师',
        施法: currentData.施法 || '不可施法',
        imageUrl: currentData.大师.imageUrl || ''
      }
      updateCard('subclass', cardIndex3, subclassCard3)
    }
  }

  // 为每个等级渲染卡片编辑区域
  const renderLevelCard = (
    level: '基石' | '专精' | '大师',
    fieldPrefix: '基石' | '专精' | '大师',
    colorScheme: { bg: string; border: string; text: string }
  ) => (
    <Card className={`p-4 ${colorScheme.bg} ${colorScheme.border}`}>
      <h3 className={`text-sm font-semibold ${colorScheme.text} mb-3`}>{level}等级</h3>
      <div className="space-y-4">
        {/* 名称 */}
        <FormField
          control={form.control}
          name={`${fieldPrefix}.名称` as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>名称 *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onBlur={handleFieldBlur}
                  placeholder={`输入${level}卡牌名称`}
                />
              </FormControl>
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
                  onChange={field.onChange}
                  onBlur={handleFieldBlur}
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
      <div className="space-y-4">
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
                      onChange={field.onChange}
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
          { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900' }
        )}

        {renderLevelCard(
          '专精',
          '专精',
          { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' }
        )}

        {renderLevelCard(
          '大师',
          '大师',
          { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' }
        )}

        {/* 提示信息 */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>提示：</strong>子职业必须包含三个等级的卡片（基石、专精、大师）。
            它们共享相同的主职、子职业和施法属性，但有不同的能力描述。卡牌ID将自动生成。
          </p>
        </div>
      </div>
    </Form>
  )
}