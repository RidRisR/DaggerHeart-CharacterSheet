'use client'

import { useEffect } from 'react'
import { useUnifiedCardStore } from '@/card/stores/unified-card-store'

/**
 * 卡牌系统初始化组件
 * 在客户端挂载后初始化卡牌系统
 */
export function CardSystemInitializer() {
    const initializeSystem = useUnifiedCardStore(state => state.initializeSystem)
    const initialized = useUnifiedCardStore(state => state.initialized)
    const loading = useUnifiedCardStore(state => state.loading)

    useEffect(() => {
        let isMounted = true

        const initializeCardSystem = async () => {
            // 检查是否在客户端环境
            if (typeof window === 'undefined') {
                console.log('[CardSystemInitializer] 跳过服务端初始化')
                return
            }

            // 如果已经初始化或正在加载，跳过
            if (initialized || loading) {
                console.log('[CardSystemInitializer] 卡牌系统已初始化或正在初始化中')
                return
            }

            try {
                console.log('[CardSystemInitializer] 开始初始化卡牌系统...')
                if (!isMounted) return

                const result = await initializeSystem()
                
                if (result.initialized) {
                    console.log('[CardSystemInitializer] 卡牌系统初始化完成')
                    
                    // 暴露到全局 window 对象供调试使用
                    if (typeof window !== 'undefined') {
                        (window as any).unifiedCardStore = useUnifiedCardStore.getState();
                        console.log('[CardSystemInitializer] 已将统一卡牌Store暴露到全局对象');
                    }
                } else {
                    console.error('[CardSystemInitializer] 卡牌系统初始化失败')
                }
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
    }, [initializeSystem, initialized, loading])

    return null // 不渲染任何内容
}
