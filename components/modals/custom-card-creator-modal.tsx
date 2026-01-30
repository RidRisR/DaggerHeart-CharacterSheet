"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Reorder } from "framer-motion"
import { BaseCardModal } from "./base/BaseCardModal"
import { ModalHeader } from "./base/ModalHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { CardSource, ExtendedStandardCard } from "@/card/card-types"
import { generateSheetCustomCardId } from "@/lib/sheet-custom-card-utils"
import {
  customCardFormSchema,
  type CustomCardFormValues,
} from "@/lib/sheet-custom-card-types"
import { useCardFormPreview } from "@/hooks/use-card-form-preview"
import { PreviewPanel } from "./custom-card-creator-modal/PreviewPanel"

interface CustomCardCreatorModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (card: ExtendedStandardCard) => void
  characterId: string
}

export function CustomCardCreatorModal({
  isOpen,
  onClose,
  onCreate,
  characterId,
}: CustomCardCreatorModalProps) {
  const [currentCardId, setCurrentCardId] = useState<string>("")
  const [previewMode, setPreviewMode] = useState<'image' | 'selectable'>('image')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const form = useForm<CustomCardFormValues>({
    resolver: zodResolver(customCardFormSchema),
    defaultValues: {
      name: "",
      realType: "",
      description: "",
      imageUrl: "",
      cardSelectDisplay: {
        item1: "",
        item2: "",
        item3: "",
        item4: "",
      },
    },
  })

  // 监听所有表单字段变化
  const formValues = form.watch()

  // 使用预览 Hook
  const { previewCard, isAnimating } = useCardFormPreview(formValues, currentCardId, tags)

  // 打开模态框时生成新ID
  useEffect(() => {
    if (isOpen) {
      const newId = generateSheetCustomCardId(characterId)
      setCurrentCardId(newId)
      form.reset()
      setTags([])
      setTagInput("")
    }
  }, [isOpen, characterId, form])

  const addTag = () => {
    if (tagInput.trim() && tags.length < 3) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleClose = useCallback(() => {
    // 检测是否有未保存的内容
    const formValues = form.getValues()
    const formHasContent = formValues.name || formValues.realType

    if (formHasContent) {
      if (confirm("关闭将丢失未保存的卡牌，确定要关闭吗？")) {
        form.reset()
        onClose()
      }
    } else {
      onClose()
    }
  }, [form, onClose])

  const onSubmit = (data: CustomCardFormValues) => {
    const card: ExtendedStandardCard = {
      standarized: true,
      id: currentCardId,
      name: data.name,
      type: "variant",
      class: "",
      description: data.description || "",
      imageUrl: data.imageUrl || "",
      hasLocalImage: false,
      cardSelectDisplay: {
        item1: tags[0] || "",
        item2: tags[1] || "",
        item3: tags[2] || "",
        item4: "",
      },
      variantSpecial: {
        realType: data.realType,
        subCategory: "",
      },
      source: CardSource.ADHOC,
      batchId: undefined,
      batchName: undefined,
    }

    onCreate(card)
    form.reset()
    setTags([])
    setTagInput("")
  }

  return (
    <BaseCardModal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      header={
        <ModalHeader
          title="创建自定义卡牌"
          subtitle="快速创建一张变体类型的自定义卡牌"
          onClose={handleClose}
        />
      }
      closeOnEscape={false}
      closeOnOverlayClick={false}
    >
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 左侧编辑区 */}
        <div className="w-full lg:w-2/5 overflow-y-auto bg-white p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>卡牌名称 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="输入卡牌名称"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="realType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>卡牌类型 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例如：武器、技能、物品"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 简略信息 */}
            <div className="space-y-3">
              <FormLabel>简略信息（最多3个）</FormLabel>

                {/* 已添加的标签 */}
                {tags.length > 0 && (
                  <Reorder.Group
                    axis="x"
                    values={tags}
                    onReorder={setTags}
                    className="flex flex-wrap gap-2"
                  >
                    {tags.map((tag, index) => (
                      <Reorder.Item
                        key={tag}
                        value={tag}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm cursor-grab active:cursor-grabbing"
                      >
                        <span className="select-none">{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}

              {/* 添加新标签 */}
              {tags.length < 3 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="输入标签内容"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addTag}
                    variant="outline"
                    disabled={!tagInput.trim()}
                  >
                    添加
                  </Button>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="输入卡牌描述"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>图片 URL（可选）</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.png"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

              {/* 按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  创建卡牌
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* 右侧预览区 */}
        <div className="w-full lg:w-3/5 overflow-y-auto bg-gray-50 p-8 border-l border-gray-200">
          <PreviewPanel
            previewCard={previewCard}
            isAnimating={isAnimating}
            viewMode={previewMode}
            onViewModeChange={setPreviewMode}
          />
        </div>
      </div>
    </BaseCardModal>
  )
}
