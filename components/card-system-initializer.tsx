'use client'

import { useEffect } from 'react'
import { customCardManager } from '@/card'
import { StorageMigration, type MigrationResult } from '@/card/storage-migration'
import { UnifiedCardStorage } from '@/card/unified-storage'

/**
 * 卡牌系统初始化组件
 * 在客户端挂载后初始化卡牌系统，包含存储迁移功能
 */
export function CardSystemInitializer() {
    useEffect(() => {
        let isMounted = true

        const initializeCardSystem = async () => {
            try {
                console.log('[CardSystemInitializer] 开始初始化卡牌系统...')
                if (!isMounted) return

                // 第一步：强制检查并执行存储迁移
                console.log('[CardSystemInitializer] 强制检查存储架构迁移...')
                
                // 在强制模式下，即使已经迁移过也要重新验证
                const hasValidMigration = StorageMigration.validateMigration()
                const needsMigration = StorageMigration.needsMigration()
                
                console.log('[CardSystemInitializer] 迁移状态检查:', {
                    hasValidMigration,
                    needsMigration,
                    forcingUnifiedStorage: true
                })
                
                let migrationResult: MigrationResult | null = null
                if (needsMigration || !hasValidMigration) {
                    console.log('[CardSystemInitializer] 执行存储迁移（强制模式）...')
                    migrationResult = await StorageMigration.migrate()
                    
                    if (!migrationResult.success) {
                        throw new Error(`存储迁移失败: ${migrationResult.errors.join(', ')}`)
                    }
                    
                    console.log('[CardSystemInitializer] 存储迁移完成:', {
                        migratedBatches: migrationResult.migratedBatches,
                        removedKeys: migrationResult.removedKeys.length,
                        timeTaken: `${migrationResult.migrationTime}ms`
                    })
                } else {
                    console.log('[CardSystemInitializer] 迁移验证通过，强制使用统一存储')
                }

                // 第二步：初始化新的统一存储系统
                console.log('[CardSystemInitializer] 初始化统一存储系统...')
                const unifiedStorage = UnifiedCardStorage.getInstance()
                await unifiedStorage.initialize()

                // 第三步：初始化传统卡牌管理器（保持向后兼容）
                console.log('[CardSystemInitializer] 初始化卡牌管理器...')
                await customCardManager.ensureInitialized()

                // 第四步：验证数据完整性
                console.log('[CardSystemInitializer] 验证数据完整性...')
                const integrityResult = await unifiedStorage.validateIntegrity()
                if (!integrityResult.isValid) {
                    console.warn('[CardSystemInitializer] 数据完整性警告:', integrityResult.issues)
                    if (integrityResult.issues.length > 0) {
                        console.warn('[CardSystemInitializer] 完整性问题详情:', {
                            missingBatches: integrityResult.missingBatches,
                            orphanedData: integrityResult.orphanedData
                        })
                    }
                }

                // 验证迁移结果（如果执行了迁移）
                if (migrationResult) {
                    const isValid = StorageMigration.validateMigration()
                    if (!isValid) {
                        throw new Error('迁移后验证失败')
                    }
                }

                console.log('[CardSystemInitializer] 卡牌系统初始化完成')
            } catch (error) {
                console.error('[CardSystemInitializer] 卡牌系统初始化失败:', error)
                // 按要求：不降级，直接抛出错误
                throw error
            }
        }

        initializeCardSystem()

        return () => {
            isMounted = false
        }
    }, [])

    return null // 不渲染任何内容
}
