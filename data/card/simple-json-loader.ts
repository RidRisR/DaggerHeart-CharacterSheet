/**
 * Simple JSON Card Data Loader
 * 简单的同步JSON卡牌数据加载器 - 只在初始化时加载一次
 */

import { CardType } from './card-types';

export interface CardMetadata {
  version: string;
  lastUpdated: string;
  generatedBy: string;
  totalCards: number;
  typeDistribution: Record<string, number>;
  description: string;
}

export interface CardDataFile {
  type: string;
  version: string;
  lastUpdated: string;
  count: number;
  cards: any[];
}

/**
 * Simple JSON Card Data Loader
 * 在服务器环境下同步加载，在浏览器环境下使用预加载的数据
 */
export class SimpleJSONCardLoader {
  private static instance: SimpleJSONCardLoader;
  private cardData: Map<CardType, any[]> = new Map();
  private metadata: CardMetadata | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): SimpleJSONCardLoader {
    if (!SimpleJSONCardLoader.instance) {
      SimpleJSONCardLoader.instance = new SimpleJSONCardLoader();
    }
    return SimpleJSONCardLoader.instance;
  }

  /**
   * 初始化加载所有卡牌数据
   * 异步加载所有JSON文件
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[SimpleJSONCardLoader] Initializing card data...');

    try {
      // 并行加载元数据和所有卡牌类型
      const types = Object.values(CardType);
      const promises = [
        this.loadMetadata(),
        ...types.map(type => this.loadCardDataForType(type))
      ];

      await Promise.all(promises);

      this.initialized = true;
      console.log(`[SimpleJSONCardLoader] Initialized successfully with ${this.getTotalCards()} cards`);
    } catch (error) {
      console.error('[SimpleJSONCardLoader] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 获取指定类型的卡牌数据
   */
  getCardData(type: CardType): any[] {
    if (!this.initialized) {
      throw new Error('SimpleJSONCardLoader not initialized. Call initialize() first.');
    }
    return this.cardData.get(type) || [];
  }

  /**
   * 获取元数据
   */
  getMetadata(): CardMetadata | null {
    return this.metadata;
  }

  /**
   * 获取所有已加载的卡牌类型
   */
  getLoadedTypes(): CardType[] {
    return Array.from(this.cardData.keys());
  }

  /**
   * 获取总卡牌数
   */
  getTotalCards(): number {
    return Array.from(this.cardData.values()).reduce((sum, cards) => sum + cards.length, 0);
  }

  /**
   * 获取加载状态
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 加载指定类型的卡牌数据
   */
  private async loadCardDataForType(type: CardType): Promise<void> {
    try {
      const fileName = this.getFileNameForType(type);
      const data = await this.loadJSONFile(`/card-data/${fileName}`);
      
      if (data && data.cards && Array.isArray(data.cards)) {
        this.cardData.set(type, data.cards);
        console.log(`[SimpleJSONCardLoader] Loaded ${data.cards.length} ${type} cards`);
      } else {
        console.warn(`[SimpleJSONCardLoader] Invalid data structure in ${fileName}`);
        this.cardData.set(type, []);
      }
    } catch (error) {
      console.error(`[SimpleJSONCardLoader] Failed to load ${type} cards:`, error);
      this.cardData.set(type, []);
    }
  }

  /**
   * 加载元数据
   */
  private async loadMetadata(): Promise<void> {
    try {
      const metadata = await this.loadJSONFile('/card-data/metadata.json');
      if (metadata) {
        this.metadata = metadata;
        console.log(`[SimpleJSONCardLoader] Loaded metadata: ${metadata.totalCards} total cards`);
      }
    } catch (error) {
      console.error(`[SimpleJSONCardLoader] Failed to load metadata:`, error);
    }
  }

  /**
   * 使用fetch加载JSON文件 (纯浏览器环境)
   */
  private async loadJSONFile(path: string): Promise<any> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to load ${path}:`, error);
      throw error;
    }
  }

  /**
   * 获取卡牌类型对应的文件名
   */
  private getFileNameForType(type: CardType): string {
    const typeFileMap: Record<CardType, string> = {
      [CardType.Profession]: 'profession-cards.json',
      [CardType.Ancestry]: 'ancestry-cards.json',
      [CardType.Community]: 'community-cards.json',
      [CardType.Domain]: 'domain-cards.json',
      [CardType.Subclass]: 'subclass-cards.json',
    };

    return typeFileMap[type] || `${type}-cards.json`;
  }
}

// 导出单例实例
export const simpleJsonCardLoader = SimpleJSONCardLoader.getInstance();
