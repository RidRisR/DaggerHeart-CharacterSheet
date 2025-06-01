"use client";

import { useEffect, useState } from 'react';
import { CardManager } from '@/data/card/card-manager';
import { CustomCardManager } from '@/data/card/custom-card-manager';
import { getBuiltinStandardCards } from '@/data/card/builtin-card-data';

export default function SimpleTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    async function runDetailedTest() {
      addLog('=== 开始详细调试测试 ===');
      
      try {
        // 步骤1: 测试CardManager基础功能
        addLog('步骤1: 获取CardManager实例...');
        const cardManager = CardManager.getInstance();
        addLog('✅ CardManager获取成功');
        
        // 步骤2: 检查初始转换器状态
        addLog('步骤2: 检查初始转换器状态...');
        let registeredTypes = cardManager.getRegisteredTypes();
        addLog(`初始已注册转换器数量: ${registeredTypes.length}`);
        addLog(`初始已注册转换器: [${registeredTypes.join(', ')}]`);
        
        // 步骤3: 等待转换器注册
        addLog('步骤3: 等待转换器注册...');
        for (let i = 0; i < 50; i++) { // 最多等待5秒
          await new Promise(resolve => setTimeout(resolve, 100));
          registeredTypes = cardManager.getRegisteredTypes();
          if (registeredTypes.length >= 5) {
            addLog(`✅ 转换器注册完成 (${i * 100}ms后): [${registeredTypes.join(', ')}]`);
            break;
          }
          if (i % 10 === 0) {
            addLog(`等待中... 当前注册数量: ${registeredTypes.length}`);
          }
        }
        
        if (registeredTypes.length < 5) {
          addLog(`❌ 转换器注册不完整，仅有: [${registeredTypes.join(', ')}]`);
        }
        
        // 步骤4: 测试内置卡牌转换
        addLog('步骤4: 测试内置卡牌转换...');
        try {
          const builtinCards = getBuiltinStandardCards();
          addLog(`✅ 内置卡牌转换成功，数量: ${builtinCards.length}`);
          
          // 统计各类型卡牌数量
          const cardTypeCount = builtinCards.reduce((acc, card) => {
            acc[card.type] = (acc[card.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          Object.entries(cardTypeCount).forEach(([type, count]) => {
            addLog(`  - ${type}: ${count}张`);
          });
          
        } catch (error) {
          addLog(`❌ 内置卡牌转换失败: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // 步骤5: 测试CustomCardManager初始化
        addLog('步骤5: 测试CustomCardManager...');
        const customCardManager = CustomCardManager.getInstance();
        addLog('✅ CustomCardManager获取成功');
        
        const isInitialized = customCardManager.isSystemInitialized();
        addLog(`初始化状态: ${isInitialized}`);
        
        if (!isInitialized) {
          addLog('开始手动初始化...');
          await customCardManager.ensureInitialized();
          addLog('✅ 手动初始化完成');
        }
        
        // 步骤6: 检查存储状态
        addLog('步骤6: 检查存储状态...');
        const batches = customCardManager.getAllBatches();
        addLog(`总批次数: ${batches.length}`);
        
        batches.forEach((batch, index) => {
          addLog(`批次${index + 1}: ${batch.name} | 卡牌: ${batch.cardCount} | 系统: ${batch.isSystemBatch || false} | 版本: ${batch.version || 'N/A'}`);
        });
        
        // 步骤7: 获取所有卡牌
        addLog('步骤7: 获取所有卡牌...');
        const allCards = customCardManager.getAllCards();
        addLog(`总卡牌数: ${allCards.length}`);
        
        const builtinCards = allCards.filter(card => card.source === 'builtin');
        const customCards = allCards.filter(card => card.source === 'custom');
        addLog(`内置卡牌: ${builtinCards.length}, 自定义卡牌: ${customCards.length}`);
        
        addLog('=== 测试完成 ===');
        
      } catch (error) {
        addLog(`❌ 严重错误: ${error instanceof Error ? error.message : String(error)}`);
        console.error('详细错误信息:', error);
      } finally {
        setLoading(false);
      }
    }

    runDetailedTest();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">详细调试测试</h1>
      
      {loading && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-800">🔍 测试进行中，请查看日志...</p>
        </div>
      )}
      
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">测试日志 ({logs.length} 条):</h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded max-h-96 overflow-y-auto font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-500">{String(index + 1).padStart(3, '0')}:</span> {log}
            </div>
          ))}
        </div>
      </div>
      
      {!loading && (
        <div className="mt-4">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重新运行测试
          </button>
        </div>
      )}
    </div>
  );
}
