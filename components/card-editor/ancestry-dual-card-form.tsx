'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { KeywordCombobox } from '@/components/card-editor/keyword-combobox'
import { Card } from '@/components/ui/card'
import MarkdownEditor from '@/components/card-editor/markdown-editor'
import { CompactCardIdEditor } from '@/components/card-editor/compact-card-id-editor'
import type { AncestryCard } from '@/card/ancestry-card/convert'
import type { CardPackageState } from '@/app/card-editor/types'
import { useCardEditorStore } from '@/app/card-editor/store/card-editor-store'
import { CardType } from '@/app/card-editor/types'

interface AncestryCardPair {
  种族: string
  简介: string
  card1: {
    名称: string
    效果: string
    imageUrl?: string
  }
  card2: {
    名称: string
    效果: string
    imageUrl?: string
  }
}

interface AncestryDualCardFormProps {
  card1: AncestryCard | null
  card2: AncestryCard | null
  cardIndex1: number
  cardIndex2: number
  keywordLists?: CardPackageState['customFieldDefinitions']
  onAddKeyword?: (category: string, keyword: string) => void
}

export function AncestryDualCardForm({
  card1,
  card2,
  cardIndex1,
  cardIndex2,
  keywordLists,
  onAddKeyword
}: AncestryDualCardFormProps) {
  const { updateCard, packageData } = useCardEditorStore()

  // 初始化表单数据
  const getInitialValues = (): AncestryCardPair => {
    if (card1 && card2) {
      return {
        种族: card1.种族 || card2.种族 || '',
        简介: card1.简介 || card2.简介 || '',
        card1: {
          名称: card1.名称 || '',
          效果: card1.效果 || '',
          imageUrl: card1.imageUrl || ''
        },
        card2: {
          名称: card2.名称 || '',
          效果: card2.效果 || '',
          imageUrl: card2.imageUrl || ''
        }
      }
    } else if (card1) {
      return {
        种族: card1.种族 || '',
        简介: card1.简介 || '',
        card1: {
          名称: card1.名称 || '',
          效果: card1.效果 || '',
          imageUrl: card1.imageUrl || ''
        },
        card2: {
          名称: '',
          效果: '',
          imageUrl: ''
        }
      }
    } else if (card2) {
      return {
        种族: card2.种族 || '',
        简介: card2.简介 || '',
        card1: {
          名称: '',
          效果: '',
          imageUrl: ''
        },
        card2: {
          名称: card2.名称 || '',
          效果: card2.效果 || '',
          imageUrl: card2.imageUrl || ''
        }
      }
    } else {
      return {
        种族: '',
        简介: '',
        card1: { 名称: '', 效果: '', imageUrl: '' },
        card2: { 名称: '', 效果: '', imageUrl: '' }
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

  // 监听表单变化并实时保存到store
  useEffect(() => {
    const subscription = form.watch((value) => {
      const formData = value as AncestryCardPair

      // 更新卡片1
      if (card1 || formData.card1.名称 || formData.card1.效果) {
        const ancestryCard1: AncestryCard = {
          id: card1?.id || '', // ID由store自动管理
          名称: formData.card1.名称 || '',
          种族: formData.种族 || '',
          简介: formData.简介 || '',
          效果: formData.card1.效果 || '',
          类别: 1,
          imageUrl: formData.card1.imageUrl || ''
        }
        updateCard('ancestry', cardIndex1, ancestryCard1)
      }

      // 更新卡片2
      if (card2 || formData.card2.名称 || formData.card2.效果) {
        const ancestryCard2: AncestryCard = {
          id: card2?.id || '', // ID由store自动管理
          名称: formData.card2.名称 || '',
          种族: formData.种族 || '',
          简介: formData.简介 || '',
          效果: formData.card2.效果 || '',
          类别: 2,
          imageUrl: formData.card2.imageUrl || ''
        }
        updateCard('ancestry', cardIndex2, ancestryCard2)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, cardIndex1, cardIndex2, updateCard, card1, card2])

  // 手动保存函数（用于特定场景）
  const handleFieldBlur = () => {
    const currentData = form.getValues()

    // 保存卡片1
    if (card1 || currentData.card1.名称 || currentData.card1.效果) {
      const ancestryCard1: AncestryCard = {
        id: card1?.id || '',
        名称: currentData.card1.名称 || '',
        种族: currentData.种族 || '',
        简介: currentData.简介 || '',
        效果: currentData.card1.效果 || '',
        类别: 1,
        imageUrl: currentData.card1.imageUrl || ''
      }
      updateCard('ancestry', cardIndex1, ancestryCard1)
    }

    // 保存卡片2
    if (card2 || currentData.card2.名称 || currentData.card2.效果) {
      const ancestryCard2: AncestryCard = {
        id: card2?.id || '',
        名称: currentData.card2.名称 || '',
        种族: currentData.种族 || '',
        简介: currentData.简介 || '',
        效果: currentData.card2.效果 || '',
        类别: 2,
        imageUrl: currentData.card2.imageUrl || ''
      }
      updateCard('ancestry', cardIndex2, ancestryCard2)
    }
  }

  return (
    <Form {...form}>
      <div className="space-y-4">
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
                        onChange={field.onChange}
                        onBlur={handleFieldBlur}
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
          <h3 className="text-sm font-semibold text-green-900 mb-3">类别一卡片</h3>
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
                    {card1 && (
                      <CompactCardIdEditor
                        card={card1}
                        cardType="ancestry"
                        cardIndex={cardIndex1}
                        packageName={packageData.name || '新建卡包'}
                        author={packageData.author || '作者'}
                      />
                    )}
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
                      onChange={field.onChange}
                      onBlur={handleFieldBlur}
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
          <h3 className="text-sm font-semibold text-purple-900 mb-3">类别二卡片</h3>
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
                    {card2 && (
                      <CompactCardIdEditor
                        card={card2}
                        cardType="ancestry"
                        cardIndex={cardIndex2}
                        packageName={packageData.name || '新建卡包'}
                        author={packageData.author || '作者'}
                      />
                    )}
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
                      onChange={field.onChange}
                      onBlur={handleFieldBlur}
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

        {/* 提示信息 */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>提示：</strong>种族卡必须成对创建。每个种族需要两张卡片（类别一和类别二），
            它们共享相同的种族和简介，但有不同的名称和效果。卡牌ID将自动生成。
          </p>
        </div>
      </div>
    </Form>
  )
}