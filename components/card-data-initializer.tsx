'use client';

import { useEffect } from 'react';
import { initializeCards } from '@/data/card';

/**
 * Card Data Initializer Component
 * 卡牌数据初始化组件 - 在应用启动时自动初始化卡牌数据
 */
export default function CardDataInitializer() {
  useEffect(() => {
    // 只在客户端初始化
    if (typeof window !== 'undefined') {
      const initAsync = async () => {
        try {
          console.log('[CardDataInitializer] Starting card data initialization...');
          await initializeCards();
          console.log('[CardDataInitializer] Card data initialized successfully');
        } catch (error) {
          console.error('[CardDataInitializer] Failed to initialize card data:', error);
        }
      };
      
      initAsync();
    }
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
