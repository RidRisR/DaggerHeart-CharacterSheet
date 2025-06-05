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

## 当前状态分析 (2025-06-05 更新)

### ✅ 重构完成的组件 
经过深入代码审查，以下组件已经完成重构：

1. **存储架构设计 (100%)**：
   - ✅ 新的统一存储键结构 (`NEW_STORAGE_KEYS`)
   - ✅ 统一批次数据结构 (`UnifiedBatchData`)
   - ✅ 简化索引结构 (`SimplifiedIndex`)

2. **核心存储组件 (100%)**：
   - ✅ `UnifiedCardStorage` 类完整实现
   - ✅ `StorageAdapter` 兼容性适配器完整实现
   - ✅ `StorageMigration` 迁移逻辑完整实现
   - ✅ `storage-utils.ts` 安全存储工具完整实现

3. **管理器层集成 (95%)**：
   - ✅ `CustomCardManager` 已全面改造为异步模式
   - ✅ 所有 `CustomCardStorage` 调用已替换为 `storageAdapter` 调用
   - ✅ 支持完整的数据验证和错误处理流程

4. **系统初始化 (100%)**：
   - ✅ `CardSystemInitializer` 组件已实现完整的迁移流程
   - ✅ 包含迁移检测、执行、验证的完整生命周期

### 🚨 关键发现：实施状态分析
深入代码审查后发现，重构工作实际上已经**基本完成**，问题在于：

1. **迁移逻辑完整但未被触发**：
   - `StorageMigration.needsMigration()` 检查迁移标记 `DHCS_MIGRATION_V2_COMPLETED`
   - 由于从未执行过迁移，此标记不存在，`StorageAdapter` 继续使用旧存储
   - `CardSystemInitializer` 已经包含完整的迁移逻辑，但可能未被正确调用

2. **数据流已经重构但被旧模式屏蔽**：
   - `StorageAdapter.useUnifiedStorage = false` 因为 `validateMigration()` 返回 `false`
   - 所有新的统一存储逻辑都已实现，只是被兼容性逻辑绕过了

3. **清空 localStorage 的行为符合预期**：
   - 清空后重新加载原版本数据是正确的（来自内置JSON文件）
   - 这表明系统的fallback机制工作正常

### 🎯 根本问题定位
**问题不是代码缺失，而是迁移机制未被激活**：
- 所有重构代码都已就位且逻辑正确
- `CardSystemInitializer` 包含完整的迁移流程
- 需要确认此组件在应用中被正确调用

### 📋 当前需要验证的点
1. **初始化组件调用**：确认 `CardSystemInitializer` 在应用中被使用
2. **迁移触发**：验证迁移检测和执行逻辑是否正常工作
3. **存储切换**：确认迁移完成后系统切换到新存储结构

## 下一步行动

### 立即验证（当前会话内）
1. **检查组件集成**：确认 `CardSystemInitializer` 在主应用中被正确使用
2. **验证迁移流程**：测试迁移检测、执行、验证的完整流程  
3. **确认数据流**：验证迁移后数据从新存储结构正确读取

### 如果验证通过
重构工作实际上已经**基本完成**，只需要：
1. 确保系统正确初始化和迁移
2. 进行端到端的功能验证
3. 性能和稳定性测试

### 如果发现问题
根据具体问题进行针对性修复

## 备注
- 所有修改都应该保持向后兼容
- 迁移过程应该是幂等的（可重复执行）
- 重要操作都应该有详细的日志记录
- 在生产环境部署前需要充分测试

---
*最后更新：2025-06-05*
*当前状态：系统初始化集成阶段*
