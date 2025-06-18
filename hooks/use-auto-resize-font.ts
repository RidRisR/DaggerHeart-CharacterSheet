import { useEffect, useState, useRef, useCallback } from 'react'

interface UseAutoResizeFontProps {
    maxFontSize?: number
    minFontSize?: number
    enableTooltip?: boolean
    tooltipDelay?: number
}

export function useAutoResizeFont({
    maxFontSize = 14,
    minFontSize = 10,
    enableTooltip = true,
    tooltipDelay = 300
}: UseAutoResizeFontProps = {}) {
    const [textOverflows, setTextOverflows] = useState<{ [key: string]: boolean }>({})
    const [activeTooltip, setActiveTooltip] = useState<{ id: string; text: string; x: number; y: number } | null>(null)
    const elementsRef = useRef<{ [key: string]: HTMLInputElement }>({})
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Tooltip 渲染
    useEffect(() => {
        if (!activeTooltip || !enableTooltip) return

        const tooltipElement = document.createElement('div')
        tooltipElement.id = 'auto-resize-tooltip'
        tooltipElement.style.cssText = `
            position: fixed;
            z-index: 9999;
            background-color: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            max-width: 300px;
            word-break: break-word;
            white-space: normal;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `
        tooltipElement.textContent = activeTooltip.text

        document.body.appendChild(tooltipElement)

        // 计算位置，避免超出屏幕
        const rect = tooltipElement.getBoundingClientRect()
        let left = activeTooltip.x + 10
        let top = activeTooltip.y - rect.height - 10

        if (left + rect.width > window.innerWidth) {
            left = activeTooltip.x - rect.width - 10
        }
        if (top < 0) {
            top = activeTooltip.y + 20
        }

        tooltipElement.style.left = `${Math.max(10, left)}px`
        tooltipElement.style.top = `${Math.max(10, top)}px`

        return () => {
            if (document.body.contains(tooltipElement)) {
                document.body.removeChild(tooltipElement)
            }
        }
    }, [activeTooltip, enableTooltip])

    // 检查文本是否溢出
    const checkTextOverflow = useCallback((element: HTMLInputElement, text: string, id: string) => {
        if (!element || !text || text.trim() === '') {
            setTextOverflows(prev => ({ ...prev, [id]: false }))
            return false
        }

        const tempSpan = document.createElement('span')
        const computedStyle = window.getComputedStyle(element)

        tempSpan.style.cssText = `
            position: absolute;
            left: -9999px;
            top: -9999px;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            font-weight: ${computedStyle.fontWeight};
            white-space: nowrap;
            visibility: hidden;
        `
        tempSpan.textContent = text

        document.body.appendChild(tempSpan)

        const textWidth = tempSpan.offsetWidth
        const availableWidth = element.offsetWidth - 20 // 减去 padding
        const isOverflowing = textWidth > availableWidth

        document.body.removeChild(tempSpan)

        setTextOverflows(prev => ({ ...prev, [id]: isOverflowing }))
        return isOverflowing
    }, [])

    // 计算打印时需要的字体大小
    const calculatePrintFontSize = useCallback((element: HTMLInputElement, text: string) => {
        if (!element || !text || text.trim() === '') {
            return maxFontSize
        }

        const tempSpan = document.createElement('span')
        const computedStyle = window.getComputedStyle(element)

        tempSpan.style.cssText = `
            position: absolute;
            left: -9999px;
            top: -9999px;
            font-family: ${computedStyle.fontFamily};
            font-weight: ${computedStyle.fontWeight};
            white-space: nowrap;
            visibility: hidden;
        `

        document.body.appendChild(tempSpan)

        const availableWidth = element.offsetWidth - 20
        let fontSize = maxFontSize

        // 从最大字体开始，逐步减小直到文本能完全显示
        while (fontSize >= minFontSize) {
            tempSpan.style.fontSize = `${fontSize}px`
            tempSpan.textContent = text

            if (tempSpan.offsetWidth <= availableWidth) {
                break
            }
            fontSize--
        }

        document.body.removeChild(tempSpan)
        return fontSize
    }, [maxFontSize, minFontSize])

    const getElementProps = useCallback((text: string, id: string, className?: string) => {
        const isOverflowing = textOverflows[id] && text && text.trim() !== ''
        const shouldShowTooltip = enableTooltip && isOverflowing

        return {
            className: className ? `${className} auto-resize-font` : 'auto-resize-font',
            style: {
                fontSize: `${maxFontSize}px`
            } as React.CSSProperties,
            'data-text': text,
            'data-max-font': maxFontSize,
            'data-min-font': minFontSize,
            onMouseEnter: shouldShowTooltip ? (e: React.MouseEvent<HTMLInputElement>) => {
                if (tooltipTimeoutRef.current) {
                    clearTimeout(tooltipTimeoutRef.current)
                }
                tooltipTimeoutRef.current = setTimeout(() => {
                    setActiveTooltip({
                        id,
                        text,
                        x: e.clientX,
                        y: e.clientY
                    })
                }, tooltipDelay)
            } : undefined,
            onMouseLeave: shouldShowTooltip ? () => {
                if (tooltipTimeoutRef.current) {
                    clearTimeout(tooltipTimeoutRef.current)
                    tooltipTimeoutRef.current = null
                }
                setActiveTooltip(null)
            } : undefined,
            onMouseMove: shouldShowTooltip ? (e: React.MouseEvent<HTMLInputElement>) => {
                if (activeTooltip?.id === id) {
                    setActiveTooltip(prev => prev ? {
                        ...prev,
                        x: e.clientX,
                        y: e.clientY
                    } : null)
                }
            } : undefined,
            ref: (element: HTMLInputElement | null) => {
                if (element) {
                    elementsRef.current[id] = element

                    // 立即检查溢出状态
                    setTimeout(() => {
                        checkTextOverflow(element, text, id)
                    }, 0)

                    // 设置打印时的字体大小作为 CSS 变量
                    const printFontSize = calculatePrintFontSize(element, text)
                    element.style.setProperty('--print-font-size', `${printFontSize}px`)
                } else {
                    delete elementsRef.current[id]
                }
            }
        }
    }, [textOverflows, enableTooltip, tooltipDelay, activeTooltip, checkTextOverflow, calculatePrintFontSize, maxFontSize])

    // 清理
    useEffect(() => {
        return () => {
            if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current)
            }
        }
    }, [])

    return { getElementProps }
}
