'use client'

import { useEffect, useState } from 'react';

export default function TestDataLoader() {
  const [stats, setStats] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>('初始化中...');

  useEffect(() => {
    let mounted = true;

    const checkDataStatus = async () => {
      try {
        // 检查是否在浏览器环境
        if (typeof window === 'undefined') {
          setLoadingStatus('仅在浏览器环境中运行');
          return;
        }

        // 动态导入以避免SSR问题
        const { simpleCardManager } = await import('@/data/card/simple-card-manager');

        // 确保初始化
        setLoadingStatus('等待初始化完成...');
        await simpleCardManager.initialize();

        if (!mounted) return;

        setLoadingStatus('获取数据统计...');

        // 获取统计信息
        const professionCards = simpleCardManager.getProfessionCards();
        const ancestryCards = simpleCardManager.getAncestryCards();
        const communityCards = simpleCardManager.getCommunityCards();
        const subclassCards = simpleCardManager.getSubclassCards();
        const domainCards = simpleCardManager.getDomainCards();
        
        const typeStats = {
          profession: professionCards.length,
          ancestry: ancestryCards.length,
          community: communityCards.length,
          subclass: subclassCards.length,
          domain: domainCards.length,
        };

        const totalCards = Object.values(typeStats).reduce((sum, count) => sum + count, 0);

        const statsData = {
          totalCards,
          typeStats,
          isInitialized: true,
          metadata: simpleCardManager.getMetadata()
        };

        setStats(statsData);
        setLoadingStatus('加载完成');
      } catch (error) {
        console.error('测试数据加载失败:', error);
        setLoadingStatus(`加载失败: ${error}`);
      }
    };

    checkDataStatus();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">JSON卡牌数据加载测试</h1>
      
      <div className="mb-4">
        <p className="text-lg">状态: <span className="font-mono">{loadingStatus}</span></p>
      </div>

      {stats && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">总体统计</h2>
            <p>总卡牌数: {stats.totalCards}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">按类型统计</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>职业卡 (Profession): {stats.typeStats.profession}</li>
              <li>血统卡 (Ancestry): {stats.typeStats.ancestry}</li>
              <li>社区卡 (Community): {stats.typeStats.community}</li>
              <li>子类卡 (Subclass): {stats.typeStats.subclass}</li>
              <li>领域卡 (Domain): {stats.typeStats.domain}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
