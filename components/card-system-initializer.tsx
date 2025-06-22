'use client'

import { useEffect } from 'react'
import { customCardManager, CustomCardManager } from '@/card'
import { CustomCardStorage } from '@/card/card-storage'

/**
 * 卡牌系统初始化组件
 * 在客户端挂载后初始化卡牌系统
 */
export function CardSystemInitializer() {
    useEffect(() => {
        let isMounted = true

        const initializeCardSystem = async () => {
            // 检查是否在客户端环境
            if (typeof window === 'undefined') {
                console.log('[CardSystemInitializer] 跳过服务端初始化')
                return
            }

            try {
                console.log('[CardSystemInitializer] 开始初始化卡牌系统...')
                if (!isMounted) return

                await customCardManager.ensureInitialized()
                
                // 暴露到全局 window 对象供测试使用
                if (typeof window !== 'undefined') {
                    (window as any).customCardManager = customCardManager;
                    (window as any).CustomCardManager = CustomCardManager;
                    (window as any).CustomCardStorage = CustomCardStorage;
                    console.log('[CardSystemInitializer] 已将卡牌管理器暴露到全局对象');
                }
                
                console.log('[CardSystemInitializer] 卡牌系统初始化完成')
            } catch (error) {
                console.error('[CardSystemInitializer] 卡牌系统初始化失败:', error)
            }
        }

        // 延迟执行，确保页面已经完全挂载
        const timeoutId = setTimeout(() => {
            if (isMounted) {
                initializeCardSystem()
            }
        }, 100) // 延迟100ms执行

        return () => {
            isMounted = false
            clearTimeout(timeoutId)
        }
    }, [])

    return null // 不渲染任何内容
}
