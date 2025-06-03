/**
 * Variant Card Type Registry
 * 变体卡牌类型注册表 - 管理用户自定义的卡牌类型定义
 */

export interface VariantTypeDefinition {
  /** 类型唯一标识符 */
  id: string;
  /** 类型显示名称 */
  name: string;
  /** 类型描述 */
  description?: string;
  /** 允许的子类别列表 */
  subclasses: string[];
  /** 是否支持等级字段 */
  supportsLevel?: boolean;
  /** 自定义字段定义 */
  customFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select';
    options?: string[]; // for select type
    required?: boolean;
  }>;
}

/**
 * 变体类型注册表
 * 单例模式管理所有变体卡牌类型定义
 */
export class VariantTypeRegistry {
  private static instance: VariantTypeRegistry;
  private typeDefinitions: Map<string, VariantTypeDefinition> = new Map();

  private constructor() {
    // 私有构造函数，确保单例
  }

  static getInstance(): VariantTypeRegistry {
    if (!VariantTypeRegistry.instance) {
      VariantTypeRegistry.instance = new VariantTypeRegistry();
    }
    return VariantTypeRegistry.instance;
  }

  /**
   * 注册变体类型定义
   */
  registerType(definition: VariantTypeDefinition): void {
    if (!definition.id || !definition.name) {
      throw new Error('变体类型定义必须包含id和name字段');
    }
    
    if (this.typeDefinitions.has(definition.id)) {
      console.warn(`变体类型 ${definition.id} 已存在，将被覆盖`);
    }
    
    this.typeDefinitions.set(definition.id, definition);
    console.log(`注册变体类型: ${definition.id} (${definition.name})`);
  }

  /**
   * 获取变体类型定义
   */
  getType(id: string): VariantTypeDefinition | undefined {
    return this.typeDefinitions.get(id);
  }

  /**
   * 验证子类别是否有效
   */
  validateSubclass(typeId: string, subclass: string): boolean {
    const type = this.getType(typeId);
    if (!type) return false;
    
    // 如果没有定义子类别列表，则允许任何子类别
    if (!type.subclasses || type.subclasses.length === 0) {
      return true;
    }
    
    return type.subclasses.includes(subclass);
  }

  /**
   * 获取所有注册的类型
   */
  getAllTypes(): VariantTypeDefinition[] {
    return Array.from(this.typeDefinitions.values());
  }

  /**
   * 获取指定类型的所有子类别
   */
  getSubclasses(typeId: string): string[] {
    const type = this.getType(typeId);
    return type ? type.subclasses : [];
  }

  /**
   * 检查类型是否存在
   */
  hasType(typeId: string): boolean {
    return this.typeDefinitions.has(typeId);
  }

  /**
   * 批量注册类型定义
   */
  registerTypes(definitions: VariantTypeDefinition[]): void {
    definitions.forEach(def => this.registerType(def));
  }

  /**
   * 清空所有类型定义（主要用于测试或重新加载）
   */
  clear(): void {
    this.typeDefinitions.clear();
    console.log('已清空所有变体类型定义');
  }

  /**
   * 获取类型统计信息
   */
  getStats(): {
    totalTypes: number;
    typesWithSubclasses: number;
    typesWithCustomFields: number;
  } {
    const types = this.getAllTypes();
    return {
      totalTypes: types.length,
      typesWithSubclasses: types.filter(t => t.subclasses && t.subclasses.length > 0).length,
      typesWithCustomFields: types.filter(t => t.customFields && t.customFields.length > 0).length
    };
  }
}
