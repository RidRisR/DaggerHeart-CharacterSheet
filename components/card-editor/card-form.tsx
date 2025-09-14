'use client'

import React, { useEffect, useRef } from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
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
import { CardIdEditor } from './card-id-editor'
import type { ProfessionCard } from '@/card/profession-card/convert'
import type { CommunityCard } from '@/card/community-card/convert'
import type { RawVariantCard } from '@/card/variant-card/convert'
import type { DomainCard } from '@/card/domain-card/convert'

import { useCardEditorStore } from '@/app/card-editor/store/card-editor-store'
import { CardType } from '@/app/card-editor/types'

// 通用卡牌编辑器属性
interface BaseCardFormProps<T> {
  card: T
  cardIndex: number
  cardType: CardType
  keywordLists?: {
    professions?: string[]
    ancestries?: string[]
    communities?: string[]
    domains?: string[]
    variants?: string[]
  }
  onAddKeyword?: (category: string, keyword: string) => void
}

// 职业卡牌编辑器
export function ProfessionCardForm({
  card,
  cardIndex,
  cardType,
  keywordLists,
  onAddKeyword
}: BaseCardFormProps<ProfessionCard>) {
  const { updateCard, packageData } = useCardEditorStore()

  const form = useForm<ProfessionCard>({
    defaultValues: card
  })
  const isResetting = useRef(false)

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    isResetting.current = true
    form.reset(card)
    setTimeout(() => {
      isResetting.current = false
    }, 0)
  }, [card])

  // 监听表单变化并实时保存到store
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!isResetting.current) {
        updateCard(cardType, cardIndex, value)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, cardType, cardIndex, updateCard])

  // 手动保存函数（用于特定场景）
  const handleFieldBlur = () => {
    const currentData = form.getValues()
    updateCard(cardType, cardIndex, currentData)
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
          <CardIdEditor
            card={card}
            cardType={cardType}
            cardIndex={cardIndex}
            packageName={packageData.name || '新建卡包'}
            author={packageData.author || '作者'}
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

export function CommunityCardForm({
  card,
  cardIndex,
  cardType,
  keywordLists,
  onAddKeyword
}: BaseCardFormProps<CommunityCard>) {
  const { updateCard, packageData } = useCardEditorStore()

  const form = useForm<CommunityCard>({
    defaultValues: card
  })
  const isResetting = useRef(false)

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    isResetting.current = true
    form.reset(card)
    setTimeout(() => {
      isResetting.current = false
    }, 0)
  }, [card])

  // 监听表单变化并实时保存到store
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!isResetting.current) {
        updateCard(cardType, cardIndex, value)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, cardType, cardIndex, updateCard])

  // 手动保存函数（用于特定场景）
  const handleFieldBlur = () => {
    const currentData = form.getValues()
    updateCard(cardType, cardIndex, currentData)
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
                <FormLabel>社群名称 *</FormLabel>
                <FormControl>
                  <KeywordCombobox
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={handleFieldBlur}
                    keywords={keywordLists?.communities || []}
                    onAddKeyword={(keyword) => onAddKeyword?.('communities', keyword)}
                    placeholder="输入或选择社群"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="特性"
            render={({ field }) => (
              <FormItem>
                <FormLabel>社群特性 *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="社群的核心特性"
                    onBlur={handleFieldBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<CardIdEditor
            card={card}
            cardType={cardType}
            cardIndex={cardIndex}
            packageName={packageData.name || '新建卡包'}
            author={packageData.author || '作者'}
          />
        </div>

        <FormField
          control={form.control}
          name="简介"
          render={({ field }) => (
            <FormItem>
              <FormLabel>简介</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="社群的简要介绍"
                  onBlur={handleFieldBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="描述"
          render={({ field }) => (
            <FormItem>
              <FormLabel>详细描述 *</FormLabel>
              <FormControl>
                <MarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={handleFieldBlur}
                  placeholder="社群的详细描述，支持Markdown格式"
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

export function VariantCardForm({
  card,
  cardIndex,
  cardType,
  keywordLists,
  onAddKeyword
}: BaseCardFormProps<RawVariantCard>) {
  const { updateCard, packageData } = useCardEditorStore()

  const form = useForm<RawVariantCard>({
    defaultValues: card
  })
  const isResetting = useRef(false)

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    isResetting.current = true
    form.reset(card)
    setTimeout(() => {
      isResetting.current = false
    }, 0)
  }, [card])

  // 监听表单变化并实时保存到store
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!isResetting.current) {
        updateCard(cardType, cardIndex, value)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, cardType, cardIndex, updateCard])

  // 手动保存函数（用于特定场景）
  const handleFieldBlur = () => {
    const currentData = form.getValues()
    updateCard(cardType, cardIndex, currentData)
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
                <FormLabel>变体名称 *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="输入变体卡名称"
                    onBlur={handleFieldBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="类型"
            render={({ field }) => (
              <FormItem>
                <FormLabel>变体类型 *</FormLabel>
                <FormControl>
                  <KeywordCombobox
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={handleFieldBlur}
                    keywords={keywordLists?.variants || []}
                    onAddKeyword={(keyword) => onAddKeyword?.('variants', keyword)}
                    placeholder="例如：食物、人物、装备"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<CardIdEditor
            card={card}
            cardType={cardType}
            cardIndex={cardIndex}
            packageName={packageData.name || '新建卡包'}
            author={packageData.author || '作者'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="子类别"
            render={({ field }) => (
              <FormItem>
                <FormLabel>子类别（可选）</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="例如：饮料、盟友、武器"
                    onBlur={handleFieldBlur}
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
                <FormLabel>等级（可选）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="例如：1"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? undefined : parseInt(value) || 0)
                    }}
                    onBlur={handleFieldBlur}
                  />
                </FormControl>
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
                  placeholder="卡牌的详细效果描述，支持Markdown格式"
                  height={200}
                />
              </FormControl>
              <div className="text-sm text-muted-foreground">
                支持Markdown格式，可以使用 *__关键词__* 来标记重要信息
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 简略信息区域 */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-medium">简略信息（卡牌选择时显示）</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="简略信息.item1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>简略信息 1</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="第一行简略信息"
                      onBlur={handleFieldBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="简略信息.item2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>简略信息 2</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="第二行简略信息"
                      onBlur={handleFieldBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="简略信息.item3"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>简略信息 3</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="第三行简略信息"
                      onBlur={handleFieldBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            这些信息会在角色选择卡牌时显示在卡牌预览中，帮助玩家快速了解卡牌特性
          </div>
        </div>
      </div>
    </Form>
  )
}

export function DomainCardForm({
  card,
  cardIndex,
  cardType,
  keywordLists,
  onAddKeyword
}: BaseCardFormProps<DomainCard>) {
  const { updateCard, packageData } = useCardEditorStore()

  const form = useForm<DomainCard>({
    defaultValues: card
  })
  const isResetting = useRef(false)

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    isResetting.current = true
    form.reset(card)
    setTimeout(() => {
      isResetting.current = false
    }, 0)
  }, [card])

  // 监听表单变化并实时保存到store
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!isResetting.current) {
        updateCard(cardType, cardIndex, value)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, cardType, cardIndex, updateCard])

  // 手动保存函数（用于特定场景）
  const handleFieldBlur = () => {
    const currentData = form.getValues()
    updateCard(cardType, cardIndex, currentData)
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
                <FormLabel>法术名称 *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="输入法术名称"
                    onBlur={handleFieldBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="领域"
            render={({ field }) => (
              <FormItem>
                <FormLabel>法术领域 *</FormLabel>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<CardIdEditor
            card={card}
            cardType={cardType}
            cardIndex={cardIndex}
            packageName={packageData.name || '新建卡包'}
            author={packageData.author || '作者'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="等级"
            render={({ field }) => (
              <FormItem>
                <FormLabel>法术等级 *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="例如：1"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? '' : parseInt(value) || 0)
                    }}
                    onBlur={handleFieldBlur}
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
                <FormLabel>施法属性 *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="例如：知识"
                    onBlur={handleFieldBlur}
                  />
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
                <FormLabel>回想值 *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="例如：2"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? '' : parseInt(value) || 0)
                    }}
                    onBlur={handleFieldBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="描述"
          render={({ field }) => (
            <FormItem>
              <FormLabel>法术描述 *</FormLabel>
              <FormControl>
                <MarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={handleFieldBlur}
                  placeholder="法术的详细效果描述，支持Markdown格式"
                  height={200}
                />
              </FormControl>
              <div className="text-sm text-muted-foreground">
                支持Markdown格式，可以使用 *__关键词__* 来标记重要信息
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
}