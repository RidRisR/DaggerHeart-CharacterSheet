"use client"

import { useEffect, useState } from 'react'
import { CardType } from '@/data/card/card-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import '@/data/card/index' // 保证副作用注册
import { CardManager } from '@/data/card/card-manager'
import { getBuiltinStandardCards } from '@/data/card/builtin-card-data'
import { CustomCardManager } from '@/data/card/custom-card-manager'
import { CustomCardStorage } from '@/data/card/custom-card-storage'
import * as cardIndex from '@/data/card/index'

export default function DebugPage() {
    const [logs, setLogs] = useState<string[]>([])
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString()
        setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    }

    const clearLogs = () => {
        setLogs([])
    }

    const runDiagnostics = () => {
        clearLogs()
        addLog('=== 开始诊断内置卡牌加载问题 ===')

        try {
            // 步骤1: 检查CardManager
            addLog('步骤1: 检查CardManager状态...')
            const cardManager = CardManager.getInstance()
            const registeredTypes = cardManager.getRegisteredTypes()
            addLog(`已注册转换器: ${registeredTypes.join(', ')}`)

            if (registeredTypes.length === 0) {
                addLog('❌ 没有转换器注册！这是主要问题之一')
            } else {
                addLog('✅ 转换器注册正常')
            }

            // 步骤2: 检查内置卡牌转换
            addLog('步骤2: 测试内置卡牌转换...')
            const builtinCards = getBuiltinStandardCards()
            addLog(`内置卡牌转换结果: ${builtinCards.length}张`)

            if (builtinCards.length === 0) {
                addLog('❌ 内置卡牌转换失败！')
            } else {
                addLog('✅ 内置卡牌转换成功')
                // 统计类型
                const typeCount = builtinCards.reduce((acc, card) => {
                    acc[card.type] = (acc[card.type] || 0) + 1
                    return acc
                }, {} as Record<string, number>)
                Object.entries(typeCount).forEach(([type, count]) => {
                    addLog(`  - ${type}: ${count}张`)
                })
            }

            // 步骤3: 检查CustomCardManager初始化
            addLog('步骤3: 检查CustomCardManager状态...')
            const customCardManager = CustomCardManager.getInstance()
            const isInitialized = customCardManager.isSystemInitialized()
            addLog(`CustomCardManager已初始化: ${isInitialized}`)
            if (!isInitialized) {
                addLog('尝试手动初始化...')
                customCardManager.ensureInitialized()
                const newStatus = customCardManager.isSystemInitialized()
                addLog(`初始化后状态: ${newStatus}`)
            }

            // 步骤4: 检查存储系统
            addLog('步骤4: 检查localStorage存储状态...')
            const index = CustomCardStorage.loadIndex()
            addLog(`存储索引中的批次数: ${Object.keys(index.batches).length}`)
            Object.entries(index.batches).forEach(([id, batch]) => {
                addLog(`  批次 ${id}: ${batch.name}, 卡牌: ${batch.cardCount}, 系统批次: ${(batch as any).isSystemBatch || false}`)
            })

            // 步骤4.5: 直接检查 localStorage 批次数据
            addLog('步骤4.5: 直接检查localStorage批次数据...')
            for (const batchId of Object.keys(index.batches)) {
                const key = `daggerheart_custom_cards_batch_${batchId}`
                const rawData = localStorage.getItem(key)
                if (rawData) {
                    try {
                        const batchData = JSON.parse(rawData)
                        addLog(`  - ${key}: 存在，包含 ${batchData.cards?.length || 0} 张卡牌`)
                    } catch (error) {
                        addLog(`  - ${key}: JSON 解析失败`)
                    }
                } else {
                    addLog(`  - ${key}: 不存在`)
                }
            }

            // 步骤4.6: 测试 CustomCardStorage.loadBatch
            addLog('步骤4.6: 测试CustomCardStorage.loadBatch...')
            for (const batchId of Object.keys(index.batches)) {
                const batchData = CustomCardStorage.loadBatch(batchId)
                addLog(`  - loadBatch(${batchId}): ${batchData ? `成功，${batchData.cards?.length || 0} 张卡牌` : '失败'}`)
            }

            // 步骤5: 检查统一系统的卡牌获取
            addLog('步骤5: 测试统一系统卡牌获取...')
            const allCards = customCardManager.getAllCards()
            addLog(`getAllCards()返回: ${allCards.length}张`)
            const cardsBySource = allCards.reduce((acc, card) => {
                const source = card.source || 'unknown'
                acc[source] = (acc[source] || 0) + 1
                return acc
            }, {} as Record<string, number>)
            Object.entries(cardsBySource).forEach(([source, count]) => {
                addLog(`  来源 ${source}: ${count}张`)
            })

            // 步骤6: 检查index.ts的常量
            addLog('步骤6: 检查index.ts导出的常量...')
            addLog(`BUILTIN_STANDARD_CARDS: ${cardIndex.BUILTIN_STANDARD_CARDS.length}张`)
            addLog(`ALL_STANDARD_CARDS: ${cardIndex.ALL_STANDARD_CARDS.length}张`)

            // 步骤7: 检查函数调用
            addLog('步骤7: 测试卡牌获取函数...')
            const allStandardCards = cardIndex.getAllStandardCards()
            addLog(`getAllStandardCards(): ${allStandardCards.length}张`)
            // ...existing code...
            const professionCards = cardIndex.getStandardCardsByType(CardType.Profession)
            addLog(`getStandardCardsByType('profession'): ${professionCards.length}张`)
            const ancestryCards = cardIndex.getStandardCardsByType(CardType.Ancestry)
            addLog(`getStandardCardsByType('ancestry'): ${ancestryCards.length}张`)

            // 步骤8: 验证修复效果
            addLog('步骤8: 验证修复效果...')
            if (allStandardCards.length > 0 && professionCards.length > 0) {
                addLog('✅ 修复成功！卡牌系统正常工作')
            } else {
                addLog('❌ 修复未完全成功，仍有问题')
            }
            // ...existing code...

            addLog('=== 诊断完成 ===')
        } catch (error) {
            addLog(`❌ 诊断过程中发生错误: ${error instanceof Error ? error.message : String(error)}`)
            console.error('诊断错误:', error)
        }
    }

    const forceReseed = () => {
        clearLogs()
        addLog('=== 强制重新种子化内置卡牌 ===')

        try {
            // 清除localStorage中的内置卡牌数据
            addLog('步骤1: 清除现有的localStorage数据...')
            localStorage.removeItem('daggerheart_custom_cards_index')
            localStorage.removeItem('daggerheart_custom_cards_batch_SYSTEM_BUILTIN_CARDS')
            addLog('✅ localStorage数据已清除')

            // 强制重新初始化CustomCardManager
            addLog('步骤2: 强制重新初始化CustomCardManager...')
            const customCardManager = CustomCardManager.getInstance()
            customCardManager.forceReinitialize().then(() => {
                addLog('✅ CustomCardManager强制重新初始化完成')

                // 检查结果
                const allCards = customCardManager.getAllCards()
                addLog(`现在getAllCards()返回: ${allCards.length}张卡牌`)

                if (allCards.length > 0) {
                    addLog('🎉 强制重新种子化成功!')
                } else {
                    addLog('❌ 强制重新种子化失败')
                }
            }).catch(error => {
                addLog(`❌ 强制重新初始化失败: ${error}`)
            })

        } catch (error) {
            addLog(`❌ 强制重新种子化失败: ${error}`)
        }
    }

    const manualReload = () => {
        clearLogs()
        addLog('=== 手动重新加载卡牌数据 ===')

        try {
            const customCardManager = CustomCardManager.getInstance()

            addLog('步骤1: 检查当前状态...')
            const currentCards = customCardManager.getAllCards()
            addLog(`当前卡牌数量: ${currentCards.length}`)

            addLog('步骤2: 重新初始化CustomCardManager...')
            customCardManager.forceReinitialize().then(() => {
                addLog('✅ 重新初始化完成')

                // 检查新的结果
                const newCards = customCardManager.getAllCards()
                addLog(`重新加载后卡牌数量: ${newCards.length}`)

                // 详细统计
                const cardsByType = new Map<string, number>()
                newCards.forEach(card => {
                    cardsByType.set(card.type, (cardsByType.get(card.type) || 0) + 1)
                })

                addLog('=== 按类型统计 ===')
                cardsByType.forEach((count, type) => {
                    addLog(`${type}: ${count}张`)
                })

                if (newCards.length > 0) {
                    addLog('🎉 手动重新加载成功!')
                } else {
                    addLog('❌ 手动重新加载后仍然没有卡牌')
                }
            }).catch(error => {
                addLog(`❌ 重新初始化失败: ${error}`)
            })

        } catch (error) {
            addLog(`❌ 手动重新加载失败: ${error}`)
        }
    }

    if (!isClient) {
        return <div>加载中...</div>
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">内置卡牌加载问题诊断</h1>
                <p className="text-muted-foreground">
                    诊断内置卡牌无法正确加载的问题
                </p>
            </div>

            <div className="flex gap-4 mb-6 flex-wrap">
                <Button onClick={runDiagnostics}>
                    开始诊断
                </Button>
                <Button variant="destructive" onClick={forceReseed}>
                    强制重新种子化
                </Button>
                <Button variant="secondary" onClick={manualReload}>
                    手动重新加载
                </Button>
                <Button variant="outline" onClick={clearLogs}>
                    清空日志
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                    返回主页
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>诊断日志</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                        {logs.length === 0 ? (
                            <div className="text-gray-500">点击"开始诊断"运行测试...</div>
                        ) : (
                            logs.map((log, index) => (
                                <div key={index} className="mb-1">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
