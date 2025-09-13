'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

// 通用卡牌编辑器属性
interface BaseCardFormProps<T> {
  card: T
  onSave: (card: T) => void
  onCancel?: () => void
  onPreview?: (card: T) => void
  onChange?: (card: T) => void
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
  packageData?: any
}

// 职业卡牌编辑器
export function ProfessionCardForm({
  card,
  onSave,
  onChange,
  keywordLists,
  onAddKeyword
}: BaseCardFormProps<ProfessionCard>) {

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

  // 自动保存函数
  const handleAutoSave = () => {
    const currentData = form.getValues()
    onSave(currentData)
  }

  // 添加表单字段失去焦点时自动保存
  const handleFieldBlur = () => {
    handleAutoSave()
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
                    onBlur={handleFieldBlur}
                    keywords={keywordLists?.professions || []}
                    onAddKeyword={(keyword) => onAddKeyword?.('professions', keyword)}
                    placeholder="输入或选择职业"
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
            name="领域1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>领域1 *</FormLabel>
                <FormControl>
                  <KeywordCombobox
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={handleFieldBlur}
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
                    onBlur={handleFieldBlur}
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
                    placeholder="例如：6"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? '' : parseInt(value) || 0)
                    }}
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
                    placeholder="例如：11"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? '' : parseInt(value) || 0)
                    }}
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

        {/* 职业简介 - 非必填 */}
        <FormField
          control={form.control}
          name="简介"
          render={({ field }) => (
            <FormItem>
              <FormLabel>职业简介</FormLabel>
              <FormControl>
                <Input
                  placeholder="请输入职业的背景和风味描述"
                  {...field}
                  value={field.value || ''}
                  onBlur={handleFieldBlur}
                />
              </FormControl>
              <div className="text-sm text-muted-foreground">
                只用于建卡指引，不会出现在卡牌上
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 卡图链接 */}
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>卡图链接</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''}
                  placeholder="输入图片URL（可选）"
                  onBlur={handleFieldBlur}
                  type="url"
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

// 其他表单组件占位符，暂时使用简化版本
export function AncestryCardForm(props: BaseCardFormProps<AncestryCard>) {
  return <div>AncestryCardForm - 待实现</div>
}

export function CommunityCardForm(props: BaseCardFormProps<CommunityCard>) {
  return <div>CommunityCardForm - 待实现</div>
}

export function VariantCardForm(props: BaseCardFormProps<RawVariantCard>) {
  return <div>VariantCardForm - 待实现</div>
}

export function SubclassCardForm(props: BaseCardFormProps<SubClassCard>) {
  return <div>SubclassCardForm - 待实现</div>
}

export function DomainCardForm(props: BaseCardFormProps<DomainCard>) {
  return <div>DomainCardForm - 待实现</div>
}