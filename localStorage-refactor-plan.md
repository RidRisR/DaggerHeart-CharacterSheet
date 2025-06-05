# localStorage 重构计划 - 进度跟踪

## 项目概述
重构DaggerHeart Character Sheet的localStorage存储架构，从分散的多键存储模式优化为统一的批次数据存储模式。

## 重构目标
1. **数据整合**：将同批次相关数据合并到单一localStorage键中
2. **减少键增长**：避免随批次增加而无限制创建新键
3. **简化操作**：减少单次逻辑操作所需的localStorage读写次数
4. **提升一致性**：确保相关数据的一致性和完整性
5. **向后兼容**：支持老版本数据的无缝迁移

## 总体架构设计

### 新存储键结构
```
DHCS_INDEX_V2          - 简化的批次索引和元数据
DHCS_CONFIG_V2         - 全局配置（保持独立）
DHCS_BATCH_${batchId}  - 统一的批次数据（包含cards、customFields、variantTypes）
```

### 核心数据结构
```typescript
interface UnifiedBatchData {
  metadata: BatchMetadata;
  cards: CustomCard[];
  customFields: Record<string, string[]>;
  variantTypes: Record<string, any>;
  enabled: boolean;
  statistics: BatchStatistics;
}
```

## 实施步骤与进度

### ✅ 已完成的步骤

#### 1. 数据结构设计 (100%)
- [x] 定义新的存储键常量 (`storage-migration.ts`)
- [x] 设计统一批次数据结构 (`UnifiedBatchData`)
- [x] 设计简化索引结构 (`SimplifiedIndex`)
- [x] 定义迁移相关的类型定义

#### 2. 统一存储管理器 (100%)
- [x] 创建 `UnifiedCardStorage` 类 (`unified-storage.ts`)
- [x] 实现批次数据的CRUD操作
- [x] 实现内存缓存机制
- [x] 实现数据聚合功能（customFields, variantTypes）
- [x] 实现存储统计和完整性验证
- [x] 添加详细的调试日志

#### 3. 迁移逻辑框架 (100%)
- [x] 设计迁移策略和检测逻辑 (`storage-migration.ts`)
- [x] 实现老版本数据检测功能
- [x] 实现数据迁移转换逻辑
- [x] 实现迁移后的清理逻辑

### 🔄 进行中的步骤

#### 4. 存储安全化 (✅ 已完成)
- [x] **已完成**：创建安全存储工具 (`storage-utils.ts`)
- [x] 实现 `safeJsonParse`, `safeGetItem`, `safeSetItem`, `safeRemoveItem` 函数
- [x] 更新 `CustomCardStorage` 类使用安全存储函数
- [x] 修复所有直接 localStorage 调用，防止 "Unexpected end of JSON input" 错误
- [x] 更新测试页面的异步方法调用链

#### 5. 兼容性适配器开发 (90% 完成)
- [x] **已完成**：创建 `StorageAdapter` 兼容性层 (`storage-adapter.ts`)
- [x] 实现所有 CustomCardStorage 方法的适配
- [x] 保持现有API接口不变
- [x] 添加完整的错误处理和日志记录
- [x] **问题发现**：StorageAdapter 默认 `useUnifiedStorage = false`，仍使用旧存储

#### 6. CustomCardManager 集成 (85% 完成)
- [x] **已大部分完成**：替换 `CustomCardManager` 中的 `CustomCardStorage.` 调用
- [x] 更新 `importCards` 方法为异步并使用 `await storageAdapter.`
- [x] 更新 `validateVariantTypeUniqueness` 方法为异步
- [x] 更新 `reloadCustomCards` 和相关方法为异步
- [x] 更新 `_seedOrUpdateBuiltinCards` 和 `importBuiltinCards` 方法
- [x] 更新 `removeBatch` 方法为异步
- [ ] **待完成**：系统仍从旧存储结构读取数据

### ⏳ 待完成的步骤

#### 7. **关键问题**：存储迁移执行 (🚨 当前阻塞)
- [ ] **问题描述**：系统仍在使用旧存储结构，StorageAdapter 的 `useUnifiedStorage = false`
- [ ] **根本原因**：`StorageMigration.validateMigration()` 返回 `false`，迁移未执行
- [ ] **现象**：清空 localStorage 后重新加载仍显示原版本数据（来自内置JSON文件）
- [ ] **解决方案**：需要执行数据迁移并切换到新存储结构

#### 8. 系统初始化集成 (待开始)
- [ ] **下一步**：集成到现有的 `components/card-system-initializer.tsx`
- [ ] 在现有初始化组件中添加存储迁移检查
- [ ] 确保迁移过程不影响用户体验
- [ ] 添加迁移进度反馈和错误处理

#### 9. 现有代码全面适配 (待开始)
- [ ] 检查并更新所有直接使用localStorage的地方
- [ ] 更新 `hooks/use-cards.ts` 的数据获取逻辑
- [ ] 确保所有异步方法调用正确await

#### 10. API接口保持兼容 (待开始)
- [ ] 确保现有组件的调用接口不变
- [ ] 提供过渡期的兼容性适配器（如需要）
- [ ] 更新类型定义以支持新结构

#### 11. 测试和验证 (待开始)
- [ ] 创建单元测试覆盖新存储逻辑
- [ ] 测试数据迁移的各种场景
- [ ] 性能测试（内存使用、读写速度）
- [ ] 边界情况测试（大数据量、损坏数据等）

#### 12. 文档和清理 (待开始)
- [ ] 更新用户文档和开发文档
- [ ] 清理废弃的代码和注释
- [ ] 添加新功能的使用示例

## 技术实现细节

### 迁移策略
1. **渐进式迁移**：系统启动时自动检测和执行迁移
2. **数据备份**：迁移前自动备份原有数据
3. **静默处理**：迁移过程对用户透明，仅记录日志
4. **失败回滚**：迁移失败时保持原有数据不变

### 性能优化
1. **内存缓存**：常用批次数据缓存到内存
2. **懒加载**：按需加载批次数据
3. **异步操作**：非关键统计更新异步执行
4. **批量操作**：减少localStorage的频繁读写

### 错误处理
1. **优雅降级**：新功能失败时回退到原有逻辑
2. **详细日志**：记录所有关键操作和错误信息
3. **数据验证**：读取时验证数据完整性
4. **用户反馈**：适当时机向用户报告问题

## 风险评估和缓解

### 主要风险
1. **数据丢失**：迁移过程中可能的数据损坏
   - 缓解：预先备份，分步迁移，验证完整性
2. **性能影响**：大量数据迁移可能影响启动速度
   - 缓解：后台异步迁移，进度反馈
3. **兼容性问题**：新旧代码混用可能导致冲突
   - 缓解：保持API兼容，渐进式替换

### 回滚计划
如果重构出现严重问题，可以：
1. 禁用新存储逻辑，回退到原有实现
2. 从备份数据恢复用户数据
3. 记录问题详情，制定修复计划

## 当前状态分析 (2025-06-05)

### 🚨 关键问题发现
经过深入调试，发现了阻塞重构进展的核心问题：

1. **数据流问题**：
   - `CustomCardManager` 的 `getAllCards()` 返回 `this.customCards`
   - `this.customCards` 通过 `reloadCustomCards()` 从 `storageAdapter` 加载
   - `storageAdapter` 仍在使用旧的存储结构 (`useUnifiedStorage = false`)

2. **迁移未执行**：
   - `StorageAdapter.initialize()` 调用 `StorageMigration.validateMigration()` 
   - 该方法返回 `false`，因为还没有迁移标记
   - 导致系统继续使用旧的 `CustomCardStorage`

3. **用户观察现象**：
   - 清空 localStorage 后刷新页面
   - 系统重新加载的仍是"原版本数据"
   - 实际是从内置JSON文件加载，而非新的统一存储

### 🎯 问题根源
**缺少迁移触发机制**：重构了存储层但没有执行实际的数据迁移，系统仍在旧存储结构上运行。

### 📋 解决方案
需要立即执行以下步骤：
1. **完善迁移逻辑**：确保 `StorageMigration.executeMigration()` 正常工作
2. **触发迁移**：在系统初始化时自动执行迁移
3. **切换存储**：迁移完成后让 `StorageAdapter` 使用新的统一存储
4. **验证数据流**：确保数据从新存储结构正确读取

## 下一步行动

### 立即执行 (当前会话内)
1. **检查并完善迁移逻辑**：确保 `StorageMigration` 可以正确执行
2. **集成迁移到初始化**：在 `card-system-initializer.tsx` 中触发迁移
3. **测试迁移流程**：验证从旧存储到新存储的完整迁移

### 短期目标（本次会话内）
1. 完成 `CustomCardManager` 的所有 `CustomCardStorage` 调用替换
2. 进行基础功能测试
3. 检查异步方法调用链的完整性

### 中期目标（下次会话）
1. 集成到系统初始化组件
2. 测试完整的数据迁移流程
3. 性能验证和优化

## 备注
- 所有修改都应该保持向后兼容
- 迁移过程应该是幂等的（可重复执行）
- 重要操作都应该有详细的日志记录
- 在生产环境部署前需要充分测试

---
*最后更新：2025-06-05*
*当前状态：系统初始化集成阶段*
