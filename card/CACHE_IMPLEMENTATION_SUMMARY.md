# DaggerHeart 卡牌存储缓存系统实现总结

## 概述

本文档总结了为 DaggerHeart 角色表应用的卡牌存储系统实现的性能缓存层，用于优化聚合方法的调用性能。

## 实现的缓存功能

### 1. 核心缓存类 (`CardStorageCache`)

**文件位置**: `/card/card-storage-cache.ts`

**主要功能**:
- 内存级别的 Map 缓存存储
- 批次状态哈希检测机制，自动识别数据变化
- 可配置的缓存策略（过期时间、清理间隔等）
- 详细的缓存统计和调试功能

**核心方法**:
- `getCachedCustomFieldNames()` - 获取缓存的自定义字段名称
- `setCachedCustomFieldNames(data)` - 设置自定义字段名称缓存
- `getCachedVariantTypes()` - 获取缓存的变体类型定义
- `setCachedVariantTypes(data)` - 设置变体类型定义缓存
- `invalidateAll()` - 清除所有缓存
- `getStats()` - 获取缓存统计信息

### 2. 聚合方法缓存集成

**优化的方法**:

#### `getAggregatedCustomFieldNames()`
- **位置**: `CustomCardStorage.getAggregatedCustomFieldNames()`
- **优化**: 在方法开始时检查缓存，命中则直接返回；未命中时执行原逻辑并缓存结果
- **性能提升**: 避免重复的 localStorage 遍历和 JSON 解析

#### `getAggregatedVariantTypes()`
- **位置**: `CustomCardStorage.getAggregatedVariantTypes()`
- **优化**: 同样的缓存检查和存储逻辑
- **性能提升**: 避免重复的批次数据加载和类型定义合并

### 3. 缓存失效触发点

实现了以下关键操作的自动缓存失效:

#### 在 `CustomCardStorage` 中:
- `saveBatch()` - 批次数据保存时自动清除缓存
- `removeBatch()` - 批次删除时自动清除缓存

#### 在 `CustomCardManager` 中:
- `toggleBatchDisabled()` - 批次启用/禁用状态变更时清除缓存
- `removeBatch()` - 批次删除操作中清除缓存

### 4. 智能缓存失效检测

**批次状态哈希机制**:
- 通过计算所有批次ID和状态的哈希值来检测数据变化
- 在每次缓存读取时自动检查批次状态是否发生变化
- 如果检测到变化，自动失效缓存并重新计算

## 缓存策略设计

### 1. 缓存范围
- **包含**: 基础聚合方法的结果（`getAggregatedCustomFieldNames`, `getAggregatedVariantTypes`）
- **不包含**: 临时定义方法（`WithTemp`方法），因为这些用于验证阶段，包含变化的临时参数

### 2. 失效策略
- **自动失效**: 批次数据变化时自动检测并失效
- **主动失效**: 关键修改操作后立即清除缓存
- **时间失效**: 5分钟过期时间（可配置）

### 3. 内存管理
- 使用 Map 作为缓存存储，自动垃圾回收
- 定期清理过期缓存条目（30秒间隔）
- 支持手动清除所有缓存

## 性能优化效果

### 优化前的问题:
1. **频繁 localStorage 访问**: 每次聚合都需要遍历所有批次的存储键
2. **重复 JSON 解析**: 相同的批次数据被反复解析
3. **重复数据合并**: 聚合逻辑在短时间内重复执行

### 优化后的改进:
1. **缓存命中时**: 直接从内存返回结果，几乎零延迟
2. **智能失效**: 只有数据真正变化时才重新计算
3. **调试友好**: 详细的缓存统计和日志帮助监控性能

## 使用示例

### 基本用法
```typescript
// 获取聚合的自定义字段名称（自动缓存）
const fieldNames = CustomCardStorage.getAggregatedCustomFieldNames();

// 获取聚合的变体类型定义（自动缓存）  
const variantTypes = CustomCardStorage.getAggregatedVariantTypes();
```

### 缓存管理
```typescript
// 手动清除所有缓存
CardStorageCache.invalidateAll();

// 获取缓存统计信息
const stats = CardStorageCache.getStats();
console.log(`缓存命中率: ${stats.hitRate.toFixed(2)}%`);
```

### 配置缓存
```typescript
// 调整缓存配置
CardStorageCache.configure({
    maxAge: 10 * 60 * 1000, // 10分钟过期
    checkInterval: 60 * 1000, // 60秒清理间隔
    enabled: true
});
```

## 文件修改总结

### 新创建的文件:
- `/card/card-storage-cache.ts` - 缓存管理器实现
- `/card/cache-test.ts` - 缓存系统测试工具

### 修改的文件:
- `/card/card-storage.ts` - 在聚合方法中集成缓存，在修改操作中添加失效
- `/card/custom-card-manager.ts` - 在批次管理操作中添加缓存失效

## 测试和验证

### 测试方法:
使用 `/card/cache-test.ts` 中的 `testCacheSystem()` 函数来验证:
1. 缓存基本功能
2. 性能提升效果
3. 失效机制正确性

### 在浏览器中测试:
```javascript
// 在浏览器控制台中运行
testCacheSystem();
```

## 注意事项

1. **避免重复失效**: `updateBatchCustomFields` 和 `updateBatchVariantTypes` 内部调用 `saveBatch`，后者已经会清除缓存，避免了重复调用

2. **临时数据处理**: `WithTemp` 方法不使用缓存，因为它们处理临时验证数据，但内部调用的基础方法仍能受益于缓存

3. **内存使用**: 缓存数据存储在内存中，对于大型数据集需要注意内存使用情况

4. **调试支持**: 通过 `DEBUG_CACHE_ENABLED` 常量可以启用详细的缓存调试日志

## 结论

缓存系统成功实现了对 DaggerHeart 卡牌存储聚合方法的性能优化，通过智能的缓存策略和自动失效机制，在保证数据一致性的同时显著提升了性能。系统设计考虑了实际使用场景，包括临时数据验证、批次管理操作等，是一个完整且健壮的缓存解决方案。
