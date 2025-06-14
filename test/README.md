# 多角色存储系统测试指南

## 🛡️ 安全性改进

### ⚠️ 重要安全修复
之前版本的测试脚本使用了 `localStorage.clear()` 这个**危险操作**，会删除所有localStorage数据，包括其他应用的数据。

**新版本已修复**：
- ✅ 只清理角色系统相关的数据
- ✅ 保留其他应用的localStorage数据
- ✅ 提供详细的清理日志

### 📋 会被清理的数据
角色系统相关键（可以安全清理）：
- `charactersheet_data` (旧版角色数据)
- `focused_card_ids` (旧版聚焦卡牌)
- `persistentFormData` (旧版持久数据)
- `dh_character_list` (新版角色列表)
- `dh_active_character_id` (新版活动角色ID)
- `dh_character_*` (新版角色数据文件)

### 🔒 会被保留的数据
其他应用的localStorage数据将被完全保留。

## 🧪 测试方式

### 方式1: 专用测试页面（推荐）

1. **访问测试页面**:
   ```
   http://localhost:3000/test-migration
   ```

2. **测试功能**:
   - **测试数据迁移**: 完整的从旧版到新版的迁移测试
   - **测试新角色创建**: 验证新角色创建功能
   - **显示当前存储**: 查看localStorage内容（分类显示）
   - **清除结果**: 清空测试日志
   - **清空角色数据**: 安全清理角色系统数据

3. **查看结果**: 实时查看详细的测试日志，绿色✅表示成功，红色❌表示失败

### 方式2: 浏览器控制台

1. **打开应用**: `http://localhost:3000`
2. **打开开发者工具**: 按F12
3. **复制脚本**: 将以下文件内容复制到控制台
   ```
   test/browser-migration-test.js
   ```
4. **运行测试**:
   ```javascript
   testMigration()           // 完整迁移测试
   testBasicFunctionality()  // 基础功能和查看存储
   safeCleanup()            // 安全清理角色数据
   ```

## 🔍 测试内容

### 数据迁移测试
- ✅ 读取旧版单角色数据
- ✅ 读取旧版全局聚焦卡牌ID
- ✅ 转换为新版多角色结构
- ✅ 验证数据完整性
- ✅ 清理旧版localStorage键
- ✅ 测试重复迁移防护

### 新角色创建测试
- ✅ 创建新的空白角色
- ✅ 验证`focused_card_ids`字段
- ✅ 验证数据保存和加载

### 存储查看功能
- 📋 分类显示localStorage内容
- 🎯 角色系统相关数据
- 🔒 其他应用数据（不会被清理）

## 🚨 故障排除

### 如果测试失败
1. **检查控制台错误**: 查看浏览器控制台的详细错误信息
2. **验证模块导入**: 确保在正确的应用页面运行测试
3. **检查数据格式**: 验证localStorage中的数据是否格式正确

### 如果迁移失败
系统采用**快速失败原则**：
- 🚫 不会尝试回滚到旧状态
- 📝 提供清晰的错误信息
- 💡 建议解决方案

## 📊 测试结果示例

```
[10:30:15] ℹ️ 开始多角色存储系统迁移测试
[10:30:15] ℹ️ 安全清理测试数据完成（不影响其他应用数据）
[10:30:15] ℹ️ 设置旧数据完成
[10:30:15] ✅ 数据迁移执行完成
[10:30:15] ℹ️ 角色列表加载完成，共 1 个角色
[10:30:15] ℹ️ 角色数据加载完成：测试角色
[10:30:15] ✅ 旧数据清理验证通过
[10:30:15] ℹ️ 开始重复迁移测试
[10:30:15] ✅ 重复迁移测试通过：正确跳过已迁移的数据
[10:30:15] ✅ 🎉 所有测试通过！迁移功能正常工作
```

## 🔧 技术细节

### 存储键映射
| 旧版键 | 新版键 | 说明 |
|--------|--------|------|
| `charactersheet_data` | `dh_character_{uuid}` | 单角色 → 多角色数据 |
| `focused_card_ids` | 合并到角色数据的`focused_card_ids`字段 | 全局 → 角色独立 |
| `persistentFormData` | 删除 | 不再使用 |
| - | `dh_character_list` | 新增：角色元数据列表 |
| - | `dh_active_character_id` | 新增：当前活动角色ID |

### 数据结构
```typescript
// 角色元数据
interface CharacterMetadata {
  id: string
  name: string
  customName: string
  lastModified: string
  createdAt: string
  order: number
}

// 角色列表
interface CharacterList {
  characters: CharacterMetadata[]
  activeCharacterId: string | null
  lastUpdated: string
}
```

## ✅ 验收标准

- ✅ 旧数据能无损迁移到新结构
- ✅ 聚焦卡牌状态正确迁移到角色独立
- ✅ 旧localStorage键被正确清理
- ✅ 重复迁移被正确跳过
- ✅ 新角色创建功能正常
- ✅ 不影响其他应用的localStorage数据
