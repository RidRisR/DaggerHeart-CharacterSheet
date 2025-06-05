'use client'

import { useEffect } from 'react'
import { CustomCardStorage } from '@/card/card-storage'

export default function CacheTestPage() {
  useEffect(() => {
    // 将 CustomCardStorage 暴露到全局作用域
    if (typeof window !== 'undefined') {
      (window as any).CustomCardStorage = CustomCardStorage
      console.log('✅ CustomCardStorage 已暴露到全局作用域')
      console.log('现在可以在浏览器控制台中使用 window.CustomCardStorage')
      
      // 运行快速缓存测试
      runCacheTest()
    }
  }, [])

  const runCacheTest = async () => {
    console.log('\n🧪 开始运行缓存性能测试...')
    
    try {
      // 清除缓存以开始测试
      CustomCardStorage.clearBatchCache()
      
      // 创建测试数据
      const testBatchData = {
        metadata: {
          id: 'CACHE_TEST_BATCH',
          fileName: 'cache-test.json',
          importTime: new Date().toISOString(),
          description: '缓存测试批次'
        },
        cards: [
          {
            id: 'test-card-1',
            name: '测试卡牌1',
            type: 'profession' as const,
            level: 1,
            description: '这是一个测试卡牌',
            source: 'cache-test'
          }
        ],
        customFieldDefinitions: {},
        variantTypes: {}
      }

      console.log('📝 保存测试批次数据...')
      CustomCardStorage.saveBatch('CACHE_TEST_BATCH', testBatchData)

      // 第一次加载（应该从 localStorage 加载）
      console.log('⏱️ 第一次加载（从 localStorage）...')
      const start1 = performance.now()
      const batch1 = CustomCardStorage.loadBatch('CACHE_TEST_BATCH')
      const time1 = performance.now() - start1
      console.log(`✅ 第一次加载完成，用时: ${time1.toFixed(3)}ms`)

      // 第二次加载（应该从缓存加载，更快）
      console.log('⏱️ 第二次加载（从内存缓存）...')
      const start2 = performance.now()
      const batch2 = CustomCardStorage.loadBatch('CACHE_TEST_BATCH')
      const time2 = performance.now() - start2
      console.log(`✅ 第二次加载完成，用时: ${time2.toFixed(3)}ms`)

      // 第三次加载（应该仍然从缓存加载）  
      console.log('⏱️ 第三次加载（从内存缓存）...')
      const start3 = performance.now()
      const batch3 = CustomCardStorage.loadBatch('CACHE_TEST_BATCH')
      const time3 = performance.now() - start3
      console.log(`✅ 第三次加载完成，用时: ${time3.toFixed(3)}ms`)

      // 性能提升计算
      const improvement = ((time1 - time2) / time1 * 100).toFixed(1)
      console.log(`\n📊 性能提升: ${improvement}% (从 ${time1.toFixed(3)}ms 到 ${time2.toFixed(3)}ms)`)

      // 验证数据一致性
      const dataConsistent = JSON.stringify(batch1) === JSON.stringify(batch2) && 
                             JSON.stringify(batch2) === JSON.stringify(batch3)
      console.log(`🔍 数据一致性检查: ${dataConsistent ? '✅ 通过' : '❌ 失败'}`)

      // 测试不存在的批次（应该被缓存为 null）
      console.log('\n🧪 测试不存在的批次缓存...')
      const startNull1 = performance.now()
      const batchNull1 = CustomCardStorage.loadBatch('NON_EXISTENT_BATCH')
      const timeNull1 = performance.now() - startNull1
      console.log(`⏱️ 第一次加载不存在批次，用时: ${timeNull1.toFixed(3)}ms`)

      const startNull2 = performance.now()
      const batchNull2 = CustomCardStorage.loadBatch('NON_EXISTENT_BATCH')
      const timeNull2 = performance.now() - startNull2
      console.log(`⏱️ 第二次加载不存在批次，用时: ${timeNull2.toFixed(3)}ms`)

      const nullImprovment = ((timeNull1 - timeNull2) / timeNull1 * 100).toFixed(1)
      console.log(`📊 不存在批次性能提升: ${nullImprovment}%`)

      console.log('\n🎉 缓存测试完成！')
      console.log('✨ 你现在可以在浏览器控制台中使用以下命令:')
      console.log('   - window.CustomCardStorage.loadBatch("CACHE_TEST_BATCH")')
      console.log('   - window.CustomCardStorage.clearBatchCache()')
      console.log('   - 等等...')

    } catch (error) {
      console.error('❌ 缓存测试失败:', error)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">缓存性能测试</h1>
      
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">测试状态</h2>
        <p className="mb-2">✅ CustomCardStorage 已暴露到全局作用域</p>
        <p className="mb-2">✅ 自动缓存测试已运行</p>
        <p className="mb-2">🔍 检查浏览器控制台查看详细结果</p>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">如何使用</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>打开浏览器开发者工具 (F12)</li>
          <li>切换到 Console 标签页</li>
          <li>使用 <code className="bg-gray-200 px-2 py-1 rounded">window.CustomCardStorage</code> 访问存储类</li>
          <li>运行你自己的测试命令</li>
        </ol>
      </div>

      <div className="bg-green-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">可用命令示例</h2>
        <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`// 加载批次数据
window.CustomCardStorage.loadBatch('CACHE_TEST_BATCH')

// 清除缓存
window.CustomCardStorage.clearBatchCache()

// 获取索引
window.CustomCardStorage.getIndex()

// 保存新批次
window.CustomCardStorage.saveBatch('MY_BATCH', {
  meta: { id: 'MY_BATCH', fileName: 'test.json', importTime: new Date().toISOString() },
  cards: [],
  customFields: {},
  variantTypes: {}
})`}
        </pre>
      </div>
    </div>
  )
}
