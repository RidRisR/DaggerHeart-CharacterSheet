"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { BaseCardModal } from "./base/BaseCardModal"
import { ModalHeader } from "./base/ModalHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
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

  // 打开模态框时生成新ID
  useEffect(() => {
    if (isOpen) {
      const newId = generateSheetCustomCardId(characterId)
      setCurrentCardId(newId)
      form.reset()
    }
  }, [isOpen, characterId, form])

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
        item1: data.cardSelectDisplay?.item1 || "",
        item2: data.cardSelectDisplay?.item2 || "",
        item3: data.cardSelectDisplay?.item3 || "",
        item4: data.cardSelectDisplay?.item4 || "",
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
  }

  return (
    <BaseCardModal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
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
      <div className="flex-1 overflow-y-auto p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基础信息 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">基础信息</h3>

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
                    <FormLabel>真实类型 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如：武器、技能、物品、天赋等"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      定义这张卡牌的实际类型
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

            {/* 显示字段 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">显示字段</h3>
              <p className="text-sm text-gray-600">
                这些字段会在卡牌选择预览中显示
              </p>

              <FormField
                control={form.control}
                name="cardSelectDisplay.item1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>显示项 1</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：伤害、范围、消耗等" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cardSelectDisplay.item2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>显示项 2</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：效果、持续时间等" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cardSelectDisplay.item3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>显示项 3</FormLabel>
                    <FormControl>
                      <Input placeholder="其他信息" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cardSelectDisplay.item4"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>显示项 4</FormLabel>
                    <FormControl>
                      <Input placeholder="其他信息" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 图片 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">图片 (可选)</h3>

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>图片 URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/image.png"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      输入在线图片的完整URL地址，建议使用稳定的图床服务
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
    </BaseCardModal>
  )
}
