"use client";

import { useEffect, useState } from 'react';

export default function LocalStorageTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function runLocalStorageTest() {
      const results: string[] = [];
      
      try {
        // 基本检测
        results.push(`环境检测: ${typeof window !== 'undefined' ? '客户端' : '服务端'}`);
        results.push(`localStorage可用: ${typeof localStorage !== 'undefined'}`);
        
        if (typeof localStorage !== 'undefined') {
          // 测试写入和读取
          const testKey = 'test_key_12345';
          const testValue = JSON.stringify({ test: true, timestamp: Date.now() });
          
          localStorage.setItem(testKey, testValue);
          const retrieved = localStorage.getItem(testKey);
          const isSuccess = retrieved === testValue;
          
          results.push(`写入/读取测试: ${isSuccess ? '成功' : '失败'}`);
          
          // 清理测试数据
          localStorage.removeItem(testKey);
          
          // 检查现有的卡牌相关存储
          const indexKey = 'daggerheart_custom_cards_index';
          const existingIndex = localStorage.getItem(indexKey);
          
          results.push(`现有索引: ${existingIndex ? '存在' : '不存在'}`);
          
          if (existingIndex) {
            try {
              const parsed = JSON.parse(existingIndex);
              results.push(`索引内容: ${JSON.stringify(parsed, null, 2)}`);
            } catch (e) {
              results.push(`索引解析失败: ${e}`);
            }
          }
          
          // 列出所有相关的存储键
          const cardKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('daggerheart_')) {
              cardKeys.push(key);
            }
          }
          
          results.push(`相关存储键 (${cardKeys.length}): ${cardKeys.join(', ')}`);
        }
        
      } catch (error) {
        results.push(`测试错误: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      setTestResults(results);
      setLoading(false);
    }

    // 延迟执行确保在客户端
    setTimeout(runLocalStorageTest, 100);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">LocalStorage 测试</h1>
      
      {loading ? (
        <p>测试中...</p>
      ) : (
        <div className="space-y-2">
          {testResults.map((result, index) => (
            <div key={index} className="p-2 bg-gray-100 rounded font-mono text-sm">
              {result}
            </div>
          ))}
          
          <div className="mt-4">
            <button 
              onClick={() => {
                if (typeof localStorage !== 'undefined') {
                  // 清除所有卡牌相关数据
                  const keysToRemove = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('daggerheart_')) {
                      keysToRemove.push(key);
                    }
                  }
                  
                  keysToRemove.forEach(key => localStorage.removeItem(key));
                  
                  alert(`已清除 ${keysToRemove.length} 个相关存储项`);
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              清除所有卡牌存储
            </button>
            
            <button 
              onClick={() => window.location.reload()} 
              className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              刷新页面
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
