"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import type { StandardCard } from "@/data/card/card-types"

interface UnifiedCardDisplayProps {
  card: StandardCard
  onClick?: () => void
  showPreview?: boolean
  isSpecialCard?: boolean
}

export function UnifiedCardDisplay({
  card,
  onClick,
  showPreview = false,
  isSpecialCard = false,
}: UnifiedCardDisplayProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isSelected, setIsSelected] = useState(isSpecialCard)
  const [isAltPressed, setIsAltPressed] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // 记录卡牌属性
  useEffect(() => {
    // 只有当卡牌有名称或类型时才记录日志
    if (card?.name || (card?.type && card.type !== "unknown")) {
      console.log("[UnifiedCardDisplay] 卡牌属性:", {
        id: card?.id,
        name: card?.name,
        type: card?.type,
        class: card?.class,
        primaryAttribute: card?.primaryAttribute,
        secondaryAttribute: card?.secondaryAttribute,
        level: card?.level,
      })
    }
  }, [card])

  // 特殊卡片始终保持选中状态
  useEffect(() => {
    if (isSpecialCard) {
      setIsSelected(true)
    }
  }, [isSpecialCard])

  // 监听Alt键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setIsAltPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setIsAltPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  if (!card) {
    console.warn("[UnifiedCardDisplay] 无效卡牌")
    return <div className="border rounded-md p-2 text-center text-gray-500">无效卡牌</div>
  }

  // 获取卡牌名称，优先使用标准字段，然后尝试中文字段
  const cardName = card.name || card.attributes?.名称 || "未命名卡牌"

  // 获取卡牌描述，优先使用标准字段，然后尝试中文字段
  const cardDescription = card.description || card.attributes?.描述 || card.attributes?.效果 || "无描述"

  // 获取卡牌等级，优先使用标准字段，然后尝试中文字段
  const cardLevel = card.level || card.attributes?.等级 || ""

  // 获取卡牌类别，优先使用标准字段，然后尝试中文字段
  const cardClass = card.class || card.attributes?.主职业 || ""

  // 获取卡牌主属性，优先使用标准字段，然后尝试中文字段
  const cardPrimaryAttribute = card.primaryAttribute || card.attributes?.子职业 || ""

  // 获取卡牌次属性，优先使用标准字段，然后尝试中文字段
  const cardSecondaryAttribute = card.secondaryAttribute || card.attributes?.回想 || ""

  // 根据卡牌类型确定边框颜色
  const getBorderColor = () => {
    if (isSpecialCard) return "border-yellow-400"
    const typeKey = card.type.replace(/卡$/, "")
    return `border-${getCardTypeColor(typeKey)}`
  }

  // 获取卡牌类型颜色
  function getCardTypeColor(typeId: string): string {
    const typeColorMap: Record<string, string> = {
      attack: "red-500",
      defense: "blue-500",
      profession: "yellow-500",
      ancestry: "green-500",
      community: "teal-500",
      subclass: "purple-500",
      domain: "pink-500", // 添加领域卡牌颜色
    }
    return typeColorMap[typeId] || "gray-500"
  }

  // 获取卡牌类型名称
  function getCardTypeName(type: string): string {
    const typeNameMap: Record<string, string> = {
      attack: "攻击",
      defense: "防御",
      profession: "职业",
      ancestry: "血统",
      community: "社区",
      subclass: "子职业",
      domain: "领域", // 添加领域卡牌名称
    }
    const baseType = type.replace(/卡$/, "")
    return typeNameMap[baseType] || type
  }

  // 处理卡牌右键点击
  const handleCardRightClick = (e: React.MouseEvent) => {
    e.preventDefault() // 阻止默认右键菜单
    if (!isSpecialCard) {
      setIsSelected(!isSelected)
    }
  }

  // 计算悬浮窗位置
  const getPreviewPosition = () => {
    if (!cardRef.current) return {}

    const rect = cardRef.current.getBoundingClientRect()
    const isRightSide = rect.left > window.innerWidth / 2

    return {
      position: "fixed",
      top: `${rect.top}px`,
      left: isRightSide ? "auto" : `${rect.right + 10}px`,
      right: isRightSide ? `${window.innerWidth - rect.left + 10}px` : "auto",
      maxHeight: "80vh",
      overflowY: "auto",
      zIndex: 1000,
    }
  }

  // 简洁展示模式 - 用于角色卡第二页
  if (showPreview) {
    console.log("[UnifiedCardDisplay] 渲染简洁模式卡牌:", {
      name: cardName,
      class: cardClass,
      primaryAttribute: cardPrimaryAttribute,
      secondaryAttribute: cardSecondaryAttribute,
      level: cardLevel,
    })

    return (
      <div
        ref={cardRef}
        className={`rounded-md p-1 cursor-pointer hover:border-gray-500 transition-colors ${getBorderColor()} h-16 ${
          isSelected ? "border-3" : "border"
        }`}
        onClick={onClick} // 左键点击执行传入的onClick函数
        onContextMenu={handleCardRightClick} // 右键点击切换选中状态
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setIsAltPressed(false) // 确保Alt状态也被重置
        }}
      >
        {/* 卡牌标题 */}
        <div className="text-sm font-medium">{cardName}</div>

        {/* 分隔线 */}
        <div className="h-px bg-gray-300 w-full my-0.5"></div>

        {/* 卡牌底部信息 */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span className="truncate max-w-[25%]">{cardClass || "——"}</span>
          <span className="truncate max-w-[25%]">{cardPrimaryAttribute || "——"}</span>
          <span className="truncate max-w-[25%]">{cardSecondaryAttribute || "——"}</span>
          <span>{cardLevel || "——"}</span>
        </div>

        {/* 卡牌类型标签 */}
        <div className="absolute -top-4 left-0 right-0 text-center">
          <span
            className={`text-[10px] font-medium px-1 py-0 rounded-t-sm border border-b-0 ${
              isSpecialCard
                ? "bg-yellow-100 border-yellow-300"
                : card.type.includes("ancestry")
                  ? "bg-green-100 border-green-300"
                  : card.type.includes("attack")
                    ? "bg-red-100 border-red-300"
                    : card.type.includes("defense")
                      ? "bg-blue-100 border-blue-300"
                      : card.type.includes("community")
                        ? "bg-teal-100 border-teal-300"
                        : card.type.includes("profession")
                          ? "bg-yellow-100 border-yellow-300"
                          : card.type.includes("subclass")
                            ? "bg-purple-100 border-purple-300"
                            : card.type.includes("domain")
                              ? "bg-pink-100 border-pink-300" // 添加领域卡牌样式
                              : "bg-gray-100 border-gray-300"
            }`}
          >
            {isSpecialCard ? "特殊卡" : getCardTypeName(card.type)}
          </span>
        </div>

        {/* 悬停预览 */}
        {isHovered && (
          <div
            className="absolute bg-white border border-gray-300 rounded-md shadow-lg"
            style={{
              ...getPreviewPosition(),
              width: isAltPressed ? "400px" : "280px",
            }}
          >
            {/* 卡牌图片 */}
            <div className={isAltPressed ? "w-full" : "w-3/4 mx-auto"}>
              <div className="aspect-[816/1110] w-full overflow-hidden">
                <img
                  src={card.imageUrl || `/placeholder.svg?height=1110&width=816&query=fantasy card ${cardName}`}
                  alt={cardName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* 卡牌描述 */}
            {!isAltPressed && cardDescription && (
              <div className="p-2 border-t">
                <p className="text-xs text-gray-700">{cardDescription}</p>
              </div>
            )}

            {/* ALT键提示 */}
            <div className="text-[10px] text-gray-400 text-center p-1 bg-gray-50">
              {isAltPressed ? "松开ALT键返回正常视图" : "按住ALT键查看大图"}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 详细显示模式 - 用于卡牌详情
  console.log("[UnifiedCardDisplay] 渲染详细模式卡牌:", {
    name: cardName,
    class: cardClass,
    primaryAttribute: cardPrimaryAttribute,
    secondaryAttribute: cardSecondaryAttribute,
    level: cardLevel,
  })

  return (
    <div className={`border-2 rounded-lg overflow-hidden shadow-md ${getBorderColor()}`}>
      {/* 卡牌头部 */}
      <div className="bg-gray-100 p-2 border-b">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm">{cardName}</h3>
          <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full">{getCardTypeName(card.type)}</span>
        </div>
      </div>

      {/* 卡牌图片 */}
      <div className="aspect-[816/1110] w-full overflow-hidden">
        <img
          src={card.imageUrl || `/placeholder.svg?height=1110&width=816&query=fantasy card ${cardName}`}
          alt={cardName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 卡牌属性 */}
      <div className="p-2 border-t border-b">
        <div className="grid grid-cols-1 gap-2 text-xs">
          {cardPrimaryAttribute && <div className="p-1 bg-gray-50 rounded">{cardPrimaryAttribute}</div>}
          {cardSecondaryAttribute && <div className="p-1 bg-gray-50 rounded">{cardSecondaryAttribute}</div>}
          {cardLevel && <div className="p-1 bg-gray-50 rounded">等级: {cardLevel}</div>}
          {cardClass && <div className="p-1 bg-gray-50 rounded">类别: {cardClass}</div>}
          {card.additionalInfo && <div className="p-1 bg-gray-50 rounded">{card.additionalInfo}</div>}
        </div>
      </div>

      {/* 卡牌描述 */}
      <div className="p-2 max-h-40 overflow-y-auto">
        <p className="text-xs whitespace-pre-line">{cardDescription}</p>
      </div>

      {/* 卡牌ID */}
      <div className="bg-gray-100 p-1 text-center">
        <span className="text-[9px] text-gray-500">ID: {card.id || "无ID"}</span>
      </div>
    </div>
  )
}
