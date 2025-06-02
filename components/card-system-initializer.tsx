'use client'

import { useEffect } from 'react'
import { BuiltinCardManager, customCardManager } from '@/data/card'

/**
 * 卡牌系统初始化组件
 * 在客户端挂载后初始化卡牌系统
 */
export function CardSystemInitializer() {
    useEffect(() => {
        let isMounted = true

        const initializeCardSystem = async () => {
            try {
                console.log('[CardSystemInitializer] 开始初始化卡牌系统...')
                const builtinCardManager = BuiltinCardManager.getInstance();

                // 等待一个微任务，确保所有转换器都已注册
                await new Promise(resolve => setTimeout(resolve, 0))

                if (!isMounted) return

                await customCardManager.ensureInitialized()
                console.log('[CardSystemInitializer] 卡牌系统初始化完成')
            } catch (error) {
                console.error('[CardSystemInitializer] 卡牌系统初始化失败:', error)
            }
        }

        initializeCardSystem()

        return () => {
            isMounted = false
        }
    }, [])

    return null // 不渲染任何内容
}
