"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    migrateToMultiCharacterStorage,
    loadCharacterList,
    saveCharacterById,
    loadCharacterById,
    generateCharacterId,
    createNewCharacter,
    safeCleanupForTesting,
    getAllCharacterStorageKeys
} from '@/lib/multi-character-storage'

export default function MigrationTestPage() {
    const [testResults, setTestResults] = useState<string[]>([])
    const [isRunning, setIsRunning] = useState(false)

    const log = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'
        setTestResults(prev => [...prev, `[${timestamp}] ${prefix} ${message}`])
    }

    const clearResults = () => {
        setTestResults([])
    }

    const testMigration = async () => {
        setIsRunning(true)
        clearResults()

        try {
            log('开始多角色存储系统迁移测试')

            // 1. 安全清理：只清理角色系统相关数据
            safeCleanupForTesting()
            log('安全清理测试数据完成（不影响其他应用数据）')

            // 2. 设置模拟的旧数据
            const mockLegacyData = {
                name: "测试角色",
                level: "5",
                profession: "战士",
                cards: []
            }
            const mockLegacyFocusedCards = ["card1", "card2", "card3"]

            localStorage.setItem("charactersheet_data", JSON.stringify(mockLegacyData))
            localStorage.setItem("focused_card_ids", JSON.stringify(mockLegacyFocusedCards))
            localStorage.setItem("persistentFormData", "旧的持久数据")
            log('设置旧数据完成')

            // 3. 执行迁移
            migrateToMultiCharacterStorage()
            log('数据迁移执行完成', 'success')

            // 4. 验证迁移结果
            const characterList = loadCharacterList()
            log(`角色列表加载完成，共 ${characterList.characters.length} 个角色`)

            if (characterList.characters.length !== 1) {
                log('错误：应该有1个角色', 'error')
                return
            }

            const characterId = characterList.characters[0].id
            const characterData = loadCharacterById(characterId)
            log(`角色数据加载完成：${characterData?.name}`)

            // 5. 验证数据完整性
            if (characterData?.name !== "测试角色") {
                log(`错误：角色名不匹配，期望"测试角色"，实际"${characterData?.name}"`, 'error')
                return
            }

            if (!Array.isArray(characterData?.focused_card_ids) ||
                characterData.focused_card_ids.length !== 3) {
                log(`错误：聚焦卡牌数据不匹配，期望3个，实际${characterData?.focused_card_ids?.length || 0}个`, 'error')
                return
            }

            // 6. 验证旧数据已清理
            const cleanupTests = [
                { key: "charactersheet_data", name: "旧角色数据" },
                { key: "focused_card_ids", name: "旧聚焦卡牌" },
                { key: "persistentFormData", name: "持久表单数据" }
            ]

            for (const test of cleanupTests) {
                if (localStorage.getItem(test.key) !== null) {
                    log(`错误：${test.name}未清理`, 'error')
                    return
                }
            }

            log('旧数据清理验证通过', 'success')

            // 7. 测试重复迁移
            log('开始重复迁移测试')
            const beforeList = loadCharacterList()
            migrateToMultiCharacterStorage() // 应该跳过
            const afterList = loadCharacterList()

            if (JSON.stringify(beforeList) === JSON.stringify(afterList)) {
                log('重复迁移测试通过：正确跳过已迁移的数据', 'success')
            } else {
                log('重复迁移测试失败：不应该重复迁移', 'error')
                return
            }

            log('🎉 所有测试通过！迁移功能正常工作', 'success')

        } catch (error) {
            log(`测试失败：${error instanceof Error ? error.message : '未知错误'}`, 'error')
        } finally {
            setIsRunning(false)
        }
    }

    const testNewCharacterCreation = async () => {
        setIsRunning(true)
        clearResults()

        try {
            log('开始新角色创建测试')

            // 创建新角色
            const newCharacter = createNewCharacter("测试新角色")
            const characterId = generateCharacterId()

            // 保存角色
            saveCharacterById(characterId, newCharacter)
            log('新角色创建并保存完成')

            // 验证加载
            const loadedCharacter = loadCharacterById(characterId)
            if (loadedCharacter?.name === "测试新角色") {
                log('新角色加载验证通过', 'success')
            } else {
                log('新角色加载验证失败', 'error')
            }

            // 验证focused_card_ids字段
            if (Array.isArray(loadedCharacter?.focused_card_ids)) {
                log('focused_card_ids字段验证通过', 'success')
            } else {
                log('focused_card_ids字段验证失败', 'error')
            }

        } catch (error) {
            log(`新角色创建测试失败：${error instanceof Error ? error.message : '未知错误'}`, 'error')
        } finally {
            setIsRunning(false)
        }
    }

    const showCurrentStorage = () => {
        clearResults()
        log('当前 localStorage 内容:')

        const allKeys = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key) allKeys.push(key)
        }

        if (allKeys.length === 0) {
            log('localStorage 为空')
            return
        }

        // 显示角色系统相关的键
        const characterKeys = getAllCharacterStorageKeys()
        if (characterKeys.length > 0) {
            log('📋 角色系统相关数据:')
            characterKeys.forEach(key => {
                const value = localStorage.getItem(key)
                const preview = value ? value.substring(0, 100) : ''
                log(`  🎯 ${key}: ${preview}${value && value.length > 100 ? '...' : ''}`)
            })
        }

        // 显示其他键（不属于角色系统）
        const otherKeys = allKeys.filter(key => !characterKeys.includes(key))
        if (otherKeys.length > 0) {
            log('📋 其他应用数据 (不会被清理):')
            otherKeys.forEach(key => {
                const value = localStorage.getItem(key)
                const preview = value ? value.substring(0, 50) : ''
                log(`  🔒 ${key}: ${preview}${value && value.length > 50 ? '...' : ''}`)
            })
        }

        log(`总计: ${allKeys.length} 个键 (${characterKeys.length} 个角色相关, ${otherKeys.length} 个其他)`)
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>多角色存储系统测试工具</CardTitle>
                    <CardDescription>
                        测试数据迁移功能和多角色存储系统的各项功能
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={testMigration}
                            disabled={isRunning}
                            variant="default"
                        >
                            {isRunning ? '运行中...' : '测试数据迁移'}
                        </Button>

                        <Button
                            onClick={testNewCharacterCreation}
                            disabled={isRunning}
                            variant="outline"
                        >
                            {isRunning ? '运行中...' : '测试新角色创建'}
                        </Button>

                        <Button
                            onClick={showCurrentStorage}
                            disabled={isRunning}
                            variant="secondary"
                        >
                            显示当前存储
                        </Button>

                        <Button
                            onClick={clearResults}
                            disabled={isRunning}
                            variant="ghost"
                        >
                            清除结果
                        </Button>                            <Button
                                onClick={() => {
                                    safeCleanupForTesting()
                                    log('角色相关数据已清空（其他应用数据保留）', 'info')
                                }}
                                disabled={isRunning}
                                variant="destructive"
                                size="sm"
                            >
                                清空角色数据
                            </Button>
                    </div>

                    <div className="border rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">测试结果</h3>
                            <Badge variant="outline">{testResults.length} 条记录</Badge>
                        </div>

                        {testResults.length === 0 ? (
                            <p className="text-gray-500 italic">点击测试按钮开始...</p>
                        ) : (
                            <div className="space-y-1 font-mono text-sm">
                                {testResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className={`${result.includes('✅') ? 'text-green-600' :
                                                result.includes('❌') ? 'text-red-600' :
                                                    'text-gray-700'
                                            }`}
                                    >
                                        {result}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
