"use client"

import React from "react"

interface AddCardPlaceholderProps {
  onClick: () => void
  disabled?: boolean
  isMobile?: boolean
}

export function AddCardPlaceholder({ onClick, disabled = false, isMobile = false }: AddCardPlaceholderProps) {
  return (
    // 外层容器 - 匹配 CardDrawer 中的包装
    <div className="flex-shrink-0 w-72">
      {/* 卡牌本体 - 完全匹配 SimpleImageCard 的结构 */}
      <div
        onClick={disabled ? undefined : onClick}
        className={`
          group relative flex w-full max-w-sm flex-col overflow-hidden rounded-xl shadow-md
          transition-all duration-300 ease-in-out hover:shadow-xl
          ${disabled
            ? 'bg-gray-100 border-2 border-dashed border-gray-300 cursor-not-allowed opacity-50'
            : 'bg-white border-2 border-dashed border-gray-400 cursor-pointer hover:border-blue-500 hover:scale-105'
          }
        `}
      >
        {/* Image Container - 匹配标准卡牌的图片区域 */}
        <div className="relative w-full aspect-[1.4] overflow-hidden flex items-center justify-center border-b-2 border-dashed border-gray-300">
          {/* Plus Icon */}
          <div className={`
            rounded-full border-2 flex items-center justify-center
            transition-colors duration-200
            ${isMobile ? 'w-20 h-20' : 'w-16 h-16'}
            ${disabled
              ? 'border-gray-400 text-gray-400'
              : 'border-gray-500 text-gray-500'
            }
          `}>
            <span className={`font-bold ${isMobile ? 'text-5xl' : 'text-4xl'}`}>+</span>
          </div>
        </div>

        {/* Tags Area - 匹配标准卡牌的标签区域，即使为空也保持相同高度 */}
        <div className="p-3">
          <div className="h-6"></div>
        </div>
      </div>
    </div>
  )
}
