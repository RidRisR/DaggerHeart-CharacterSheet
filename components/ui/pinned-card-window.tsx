"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ImageCard } from '@/components/ui/image-card'
import { usePinnedCardsStore, type PinnedCard } from '@/lib/pinned-cards-store'

interface PinnedCardWindowProps {
  pinnedCard: PinnedCard;
}

export function PinnedCardWindow({ pinnedCard }: PinnedCardWindowProps) {
  const { unpinCard, updatePosition } = usePinnedCardsStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // 阻止默认行为
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pinnedCard.position.x,
      y: e.clientY - pinnedCard.position.y
    });
    
    // 阻止文本选择
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
  };

  const handleMouseMove = useCallback((e: Event) => {
    if (!isDragging) return;
    
    e.preventDefault(); // 阻止默认行为
    e.stopPropagation(); // 阻止事件传播
    
    const mouseEvent = e as globalThis.MouseEvent;
    const newX = mouseEvent.clientX - dragStart.x;
    const newY = mouseEvent.clientY - dragStart.y;
    
    // 限制在视口内
    const maxX = window.innerWidth - 200; // 200是卡牌宽度
    const maxY = window.innerHeight - 300; // 300是大概的卡牌高度
    
    const clampedPosition = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    };
    
    updatePosition(pinnedCard.id, clampedPosition);
  }, [isDragging, dragStart, pinnedCard.id, updatePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    // 恢复文本选择
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
  }, []);

  useEffect(() => {
    if (isDragging) {
      // 添加全局事件监听器
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      
      // 禁用页面滚动
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // 恢复页面滚动
        document.body.style.overflow = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleClose = () => {
    unpinCard(pinnedCard.id);
  };

  return (
    <>
      {/* 拖拽时的全局覆盖层 */}
      {isDragging && (
        <div 
          className="fixed inset-0 z-[9998] cursor-grabbing"
          style={{ 
            backgroundColor: 'transparent',
            userSelect: 'none',
            pointerEvents: 'auto'
          }}
        />
      )}
      
      <div
        ref={windowRef}
        className="fixed print:hidden"
        style={{
          left: `${pinnedCard.position.x}px`,
          top: `${pinnedCard.position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          zIndex: isDragging ? 9999 : 50, // 拖拽时提升到最高层
          pointerEvents: 'auto' // 确保能接收鼠标事件
        }}
      >
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
        {/* 拖拽标题栏 */}
        <div 
          className="bg-gray-100 px-3 py-2 cursor-grab active:cursor-grabbing flex justify-between items-center"
          onMouseDown={handleMouseDown}
        >
          <span className="text-sm font-medium text-gray-700 truncate">
            {pinnedCard.card.name}
          </span>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 ml-2 hover:bg-gray-200 p-1 rounded"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="text-xs">✕</span>
          </button>
        </div>
        {/* 卡牌内容 */}
        <div className="p-2">
          <ImageCard
            card={pinnedCard.card}
            onClick={() => {}} // 空函数，因为是只读展示
            isSelected={false}
            showSource={false}
          />
        </div>
        </div>
      </div>
    </>
  );
}