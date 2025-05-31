/**
 * Simple Card Manager
 * 简化的卡牌管理器 - 使用同步JSON加载器
 */

import { CardType, StandardCard } from './card-types';
import { simpleJsonCardLoader } from './simple-json-loader';

// Import the specific card types and converters from their respective modules
import type { ProfessionCard } from './profession-card/convert';
import type { AncestryCard } from './ancestry-card/convert';
import type { CommunityCard } from './community-card/convert';
import type { DomainCard } from './domain-card/convert';
import type { SubClassCard } from './subclass-card/convert';

import { professionCardConverter } from './profession-card/convert';
import { ancestryCardConverter } from './ancestry-card/convert';
import { communityCardConverter } from './community-card/convert';
import { domainCardConverter } from './domain-card/convert';
import { subclassCardConverter } from './subclass-card/convert';

/**
 * Simple Card Manager
 * 使用单例模式管理所有卡牌数据
 */
export class SimpleCardManager {
  private static instance: SimpleCardManager;
  private initialized = false;

  private constructor() {}

  static getInstance(): SimpleCardManager {
    if (!SimpleCardManager.instance) {
      SimpleCardManager.instance = new SimpleCardManager();
    }
    return SimpleCardManager.instance;
  }

  /**
   * 初始化卡牌管理器
   * 异步初始化以支持网络加载
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[SimpleCardManager] Initializing...');
    await simpleJsonCardLoader.initialize();
    this.initialized = true;
    console.log('[SimpleCardManager] Initialized successfully');
  }

  /**
   * 获取所有职业卡牌
   */
  getProfessionCards(): ProfessionCard[] {
    this.ensureInitialized();
    const rawData = simpleJsonCardLoader.getCardData(CardType.Profession);
    return rawData as ProfessionCard[];
  }

  /**
   * 获取所有血统卡牌
   */
  getAncestryCards(): AncestryCard[] {
    this.ensureInitialized();
    const rawData = simpleJsonCardLoader.getCardData(CardType.Ancestry);
    return rawData as AncestryCard[];
  }

  /**
   * 获取所有社区卡牌
   */
  getCommunityCards(): CommunityCard[] {
    this.ensureInitialized();
    const rawData = simpleJsonCardLoader.getCardData(CardType.Community);
    return rawData as CommunityCard[];
  }

  /**
   * 获取所有领域卡牌
   */
  getDomainCards(): DomainCard[] {
    this.ensureInitialized();
    const rawData = simpleJsonCardLoader.getCardData(CardType.Domain);
    return rawData as DomainCard[];
  }

  /**
   * 获取所有子职业卡牌
   */
  getSubclassCards(): SubClassCard[] {
    this.ensureInitialized();
    const rawData = simpleJsonCardLoader.getCardData(CardType.Subclass);
    return rawData as SubClassCard[];
  }

  /**
   * 根据ID获取特定职业卡牌
   */
  getProfessionCard(id: string): ProfessionCard | undefined {
    return this.getProfessionCards().find(card => card.id === id);
  }

  /**
   * 根据ID获取特定血统卡牌
   */
  getAncestryCard(id: string): AncestryCard | undefined {
    return this.getAncestryCards().find(card => card.id === id);
  }

  /**
   * 根据ID获取特定社区卡牌
   */
  getCommunityCard(id: string): CommunityCard | undefined {
    return this.getCommunityCards().find(card => card.ID === id);
  }

  /**
   * 根据ID获取特定领域卡牌
   */
  getDomainCard(id: string): DomainCard | undefined {
    return this.getDomainCards().find(card => card.ID === id);
  }

  /**
   * 根据ID获取特定子职业卡牌
   */
  getSubclassCard(id: string): SubClassCard | undefined {
    return this.getSubclassCards().find(card => card.id === id);
  }

  /**
   * 获取所有卡牌总数
   */
  getTotalCardsCount(): number {
    this.ensureInitialized();
    return simpleJsonCardLoader.getTotalCards();
  }

  /**
   * 获取指定类型的卡牌数量
   */
  getCardsCountByType(type: CardType): number {
    this.ensureInitialized();
    return simpleJsonCardLoader.getCardData(type).length;
  }

  /**
   * 获取所有加载的卡牌类型
   */
  getLoadedTypes(): CardType[] {
    this.ensureInitialized();
    return simpleJsonCardLoader.getLoadedTypes();
  }

  /**
   * 获取卡牌数据元信息
   */
  getMetadata() {
    this.ensureInitialized();
    return simpleJsonCardLoader.getMetadata();
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 确保管理器已初始化
   * 在异步环境下，如果还没初始化则抛出错误
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SimpleCardManager not initialized. Call initialize() first.');
    }
  }

    /**
     * 安全检查是否初始化（不抛出错误）
     */
    private safeCheckInitialized(): boolean {
        return this.initialized;
    }
}

// 导出单例实例
export const simpleCardManager = SimpleCardManager.getInstance();
