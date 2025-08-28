'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Eye } from 'lucide-react'
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

// 通用卡牌编辑器属性
interface BaseCardFormProps<T> {
  card: T
  onSave: (card: T) => void
  onCancel?: () => void
  onPreview?: (card: T) => void
  customFields?: string[]
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
  onSave, 
  onCancel, 
  onPreview, 
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

  const handleSubmit = (data: ProfessionCard) => {
    onSave(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          职业卡牌编辑
          <div className="flex gap-2">
            {onPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPreview(form.getValues())}
              >
                <Eye className="h-4 w-4 mr-1" />
                预览
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              form="profession-form"
            >
              <Save className="h-4 w-4 mr-1" />
              保存
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="profession-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID *</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：pack-author-prof-职业名" {...field} />
                    </FormControl>
                    <FormDescription>
                      格式：包名-作者-prof-职业标识
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
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// 血统卡牌编辑器
export function AncestryCardForm({ 
  card, 
  onSave, 
  onCancel, 
  onPreview, 
  keywordLists, 
  onAddKeyword 
}: BaseCardFormProps<AncestryCard>) {
  const form = useForm<AncestryCard>({
    defaultValues: card
  })

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    form.reset(card)
  }, [card, form])

  const handleSubmit = (data: AncestryCard) => {
    onSave(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          血统卡牌编辑
          <div className="flex gap-2">
            {onPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPreview(form.getValues())}
              >
                <Eye className="h-4 w-4 mr-1" />
                预览
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              form="ancestry-form"
            >
              <Save className="h-4 w-4 mr-1" />
              保存
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          每个种族必须有且仅有两张血统卡牌（类别1和类别2）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="ancestry-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID *</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：pack-author-ance-星光血脉" {...field} />
                  </FormControl>
                  <FormDescription>
                    格式：包名-作者-ance-能力标识
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// 变体卡牌编辑器
export function VariantCardForm({ 
  card, 
  onSave, 
  onCancel, 
  onPreview, 
  keywordLists, 
  onAddKeyword 
}: BaseCardFormProps<RawVariantCard>) {
  const form = useForm<RawVariantCard>({
    defaultValues: card
  })

  // 当卡牌数据变化时重置表单
  useEffect(() => {
    form.reset(card)
  }, [card, form])

  const handleSubmit = (data: RawVariantCard) => {
    onSave(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          变体卡牌编辑
          <div className="flex gap-2">
            {onPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPreview(form.getValues())}
              >
                <Eye className="h-4 w-4 mr-1" />
                预览
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              form="variant-form"
            >
              <Save className="h-4 w-4 mr-1" />
              保存
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          变体卡牌可以是任意类型的扩展内容，如物品、NPC、法术书等
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="variant-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID *</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：pack-author-vari-星辰王冠" {...field} />
                  </FormControl>
                  <FormDescription>
                    格式：包名-作者-vari-卡牌标识
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
                  <FormLabel>卡牌效果 *</FormLabel>
                  <FormControl>
                    <MarkdownEditor
                      value={field.value}
                      onChange={field.onChange}
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
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}