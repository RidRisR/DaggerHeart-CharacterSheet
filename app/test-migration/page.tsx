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
            log('开始数据迁移场景测试（会清空现有数据！）')
            log('⚠️  警告：此测试会删除当前所有角色数据，仅用于测试迁移逻辑')

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

    const testMigrationProtection = async () => {
        setIsRunning(true)
        clearResults()

        try {
            log('开始迁移保护机制测试')

            // 检查当前是否有角色数据
            const currentList = loadCharacterList()
            if (currentList.characters.length === 0) {
                log('⚠️  没有现有角色数据，无法测试保护机制')
                log('请先创建一些角色，然后再测试此功能')
                return
            }

            log(`当前有 ${currentList.characters.length} 个角色`)
            const beforeCharacters = currentList.characters.map(c => ({ id: c.id, saveName: c.saveName }))
            log('迁移前角色列表：')
            beforeCharacters.forEach(char => log(`  - ${char.saveName} (${char.id})`))

            // 尝试执行迁移（应该被跳过）
            log('尝试执行迁移...')
            migrateToMultiCharacterStorage()

            // 验证数据没有被删除
            const afterList = loadCharacterList()
            const afterCharacters = afterList.characters.map(c => ({ id: c.id, saveName: c.saveName }))

            log(`迁移后有 ${afterList.characters.length} 个角色`)
            log('迁移后角色列表：')
            afterCharacters.forEach(char => log(`  - ${char.saveName} (${char.id})`))

            // 验证角色数量没有变化
            if (beforeCharacters.length !== afterCharacters.length) {
                log(`❌ 角色数量发生变化！之前：${beforeCharacters.length}，之后：${afterCharacters.length}`, 'error')
                return
            }

            // 验证每个角色都还存在
            const missingCharacters = beforeCharacters.filter(
                before => !afterCharacters.some(after => after.id === before.id)
            )

            if (missingCharacters.length > 0) {
                log(`❌ 发现丢失的角色：`, 'error')
                missingCharacters.forEach(char => log(`  - ${char.saveName} (${char.id})`))
                return
            }

            log('✅ 迁移保护机制正常工作：现有数据未被删除', 'success')

        } catch (error) {
            log(`迁移保护测试失败：${error instanceof Error ? error.message : '未知错误'}`, 'error')
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
                    {/* 测试说明 */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-2">测试说明</h3>
                        <div className="text-sm text-blue-800 space-y-1">
                            <p><strong>迁移保护机制测试：</strong>验证已有角色数据时，迁移函数不会删除现有数据（推荐使用）</p>
                            <p><strong>完整迁移测试：</strong>模拟首次安装时的迁移场景，会先清空数据再测试（⚠️ 会删除所有角色！）</p>
                            <p><strong>新角色创建测试：</strong>验证角色创建和数据存储功能</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={testMigrationProtection}
                            disabled={isRunning}
                            variant="default"
                        >
                            {isRunning ? '运行中...' : '测试迁移保护机制'}
                        </Button>

                        <Button
                            onClick={testMigration}
                            disabled={isRunning}
                            variant="outline"
                            className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                            {isRunning ? '运行中...' : '⚠️ 测试完整迁移（会清空数据）'}
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
                        </Button>

                        <Button
                            onClick={() => {
                                if (confirm('确定要清空所有角色数据吗？此操作不可撤销！')) {
                                    safeCleanupForTesting()
                                    log('角色相关数据已清空（其他应用数据保留）', 'info')
                                }
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
