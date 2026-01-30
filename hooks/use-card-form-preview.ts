import { useMemo, useState, useEffect } from 'react'
import type { ExtendedStandardCard } from '@/card/card-types'
import { CardSource } from '@/card/card-types'
import type { CustomCardFormValues } from '@/lib/sheet-custom-card-types'

/**
 * 自定义 Hook 用于管理自定义卡牌表单的实时预览状态
 *
 * @param formValues - 表单值对象
 * @param cardId - 卡牌 ID
 * @param tags - 简略信息标签数组
 * @returns 预览卡牌对象和动画状态
 */
export function useCardFormPreview(
  formValues: CustomCardFormValues,
  cardId: string,
  tags: string[] = []
) {
  const [isAnimating, setIsAnimating] = useState(false)

  // 从表单值构建预览卡牌对象
  const previewCard = useMemo((): ExtendedStandardCard => {
    return {
      standarized: true,
      id: cardId,
      name: formValues.name || "未命名卡牌",
      type: "variant",
      class: "",
      description: formValues.description || "在左侧输入描述...",
      imageUrl: formValues.imageUrl || "",
      hasLocalImage: false,
      cardSelectDisplay: {
        item1: tags[0] || "",
        item2: tags[1] || "",
        item3: tags[2] || "",
        item4: "",
      },
      variantSpecial: {
        realType: formValues.realType || "自定义",
        subCategory: "",
      },
      source: CardSource.ADHOC,
      batchId: undefined,
      batchName: undefined,
    }
  }, [formValues, cardId, tags])

  // 当预览卡牌内容变化时触发脉动动画
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 300)
    return () => clearTimeout(timer)
  }, [previewCard])

  return { previewCard, isAnimating }
}
