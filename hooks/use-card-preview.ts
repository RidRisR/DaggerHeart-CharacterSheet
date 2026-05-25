import { useState, useCallback, type CSSProperties } from 'react'
import type { StandardCard } from '@/card/card-types'
import type { SheetCardReference } from '@/lib/sheet-data'

export interface FloatingPreviewSize {
    width: number
    height: number
}

export const CARD_PREVIEW_SIZES = {
    image: { width: 520, height: 450 },
    text: { width: 300, height: 400 },
} as const satisfies Record<string, FloatingPreviewSize>

export const getCardPreviewSize = (isTextMode: boolean): FloatingPreviewSize => {
    return isTextMode ? CARD_PREVIEW_SIZES.text : CARD_PREVIEW_SIZES.image
}

interface CalculateFloatingPreviewPositionOptions {
    triggerRect: DOMRect
    previewSize: FloatingPreviewSize
    viewportSize?: {
        width: number
        height: number
    }
    gap?: number
}

export function calculateFloatingPreviewPosition({
    triggerRect,
    previewSize,
    viewportSize,
    gap = 10,
}: CalculateFloatingPreviewPositionOptions): CSSProperties {
    const viewportWidth = viewportSize?.width ?? window.innerWidth
    const viewportHeight = viewportSize?.height ?? window.innerHeight

    const spaceLeft = triggerRect.left
    const spaceRight = viewportWidth - triggerRect.right
    const spaceTop = triggerRect.top
    const spaceBottom = viewportHeight - triggerRect.bottom

    const position: CSSProperties = {
        position: 'fixed',
        zIndex: 9999,
        maxHeight: '80vh',
        overflowY: 'auto',
    }

    const getVerticalPositionForHorizontal = (): number => {
        let idealTop = triggerRect.top - (previewSize.height - triggerRect.height) / 2

        if (idealTop + previewSize.height > viewportHeight - gap) {
            idealTop = viewportHeight - previewSize.height - gap
        }

        return Math.max(gap, idealTop)
    }

    const getHorizontalPositionForVertical = (): number => {
        const idealLeft = triggerRect.left - (previewSize.width - triggerRect.width) / 2
        return Math.max(gap, Math.min(viewportWidth - previewSize.width - gap, idealLeft))
    }

    if (spaceRight >= previewSize.width + gap) {
        position.left = `${triggerRect.right + gap}px`
        position.top = `${getVerticalPositionForHorizontal()}px`
    } else if (spaceLeft >= previewSize.width + gap) {
        position.right = `${viewportWidth - triggerRect.left + gap}px`
        position.top = `${getVerticalPositionForHorizontal()}px`
    } else if (spaceTop >= previewSize.height + gap) {
        position.bottom = `${viewportHeight - triggerRect.top + gap}px`
        position.left = `${getHorizontalPositionForVertical()}px`
    } else if (spaceBottom >= previewSize.height + gap) {
        position.top = `${triggerRect.bottom + gap}px`
        position.left = `${getHorizontalPositionForVertical()}px`
    } else {
        const maxSpace = Math.max(spaceLeft, spaceRight, spaceTop, spaceBottom)

        if (maxSpace === spaceRight) {
            position.left = `${triggerRect.right + gap}px`
            position.top = `${getVerticalPositionForHorizontal()}px`
        } else if (maxSpace === spaceLeft) {
            position.right = `${viewportWidth - triggerRect.left + gap}px`
            position.top = `${getVerticalPositionForHorizontal()}px`
        } else if (maxSpace === spaceTop) {
            position.bottom = `${viewportHeight - triggerRect.top + gap}px`
            position.left = `${getHorizontalPositionForVertical()}px`
        } else {
            position.top = `${triggerRect.bottom + gap}px`
            position.left = `${getHorizontalPositionForVertical()}px`
        }
    }

    return position
}

export interface UseCardPreviewOptions {
    cards: StandardCard[]
    previewSize?: FloatingPreviewSize
}

export function useCardPreview({ cards, previewSize = CARD_PREVIEW_SIZES.image }: UseCardPreviewOptions) {
    const [hoveredCard, setHoveredCard] = useState<StandardCard | null>(null)
    const [previewPosition, setPreviewPosition] = useState<CSSProperties>({})

    // 查找卡牌的函数
    const findCardByReference = useCallback((ref: SheetCardReference | undefined): StandardCard | null => {
        if (!ref?.id) return null
        const card = cards.find(c => c.id === ref.id)
        // formData.cards 中存储的已经是 StandardCard，无需再次转换
        return card || null
    }, [cards])

    // 获取预览位置的函数
    const calculatePreviewPosition = useCallback((element: HTMLElement): CSSProperties => {
        const rect = element.getBoundingClientRect()
        return calculateFloatingPreviewPosition({
            triggerRect: rect,
            previewSize,
        })
    }, [previewSize])

    // 处理鼠标进入
    const handleMouseEnter = useCallback((ref: SheetCardReference | undefined, element: HTMLElement) => {
        const card = findCardByReference(ref)
        if (card) {
            setHoveredCard(card)
            setPreviewPosition(calculatePreviewPosition(element))
        }
    }, [findCardByReference, calculatePreviewPosition])

    // 处理鼠标离开
    const handleMouseLeave = useCallback(() => {
        setHoveredCard(null)
        setPreviewPosition({})
    }, [])

    return {
        hoveredCard,
        previewPosition,
        handleMouseEnter,
        handleMouseLeave,
        findCardByReference,
    }
}
