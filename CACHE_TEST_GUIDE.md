# 缓存性能测试脚本使用指南

## 概述

这里提供了两个测试脚本来验证 DaggerHeart 卡牌系统的缓存优化效果：

1. `test-cache-performance.js` - 原始测试脚本（需要修改后使用）
2. `cache-test-browser.js` - 浏览器控制台专用测试脚本（推荐）

## 方法 1：浏览器控制台测试（推荐）

### 步骤 1：启动应用
```bash
cd /Users/ris/Desktop/DaggerHeart-CharacterSheet
npm run dev
```

### 步骤 2：打开浏览器
访问应用地址（通常是 `http://localhost:3000` 或 `http://localhost:3001`）

### 步骤 3：打开开发者工具
- 按 `F12` 键
- 或右键页面选择"检查"
- 或使用 `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

### 步骤 4：加载测试脚本
在控制台中复制粘贴 `cache-test-browser.js` 的完整内容

### 步骤 5：运行测试
```javascript
// 运行完整缓存测试
runCacheTest()

// 或者测试现有批次的缓存性能
testExistingBatches()
```

## 方法 2：修改现有测试脚本

如果你想使用 `test-cache-performance.js`，需要先修改它：

### 修改步骤
1. 将脚本转换为浏览器可用版本
2. 移除 Node.js 特定的代码
3. 添加浏览器环境检查

### 使用方法
```javascript
// 在浏览器控制台中运行
testCachePerformance()
```

## 测试内容

### 完整缓存测试 (`runCacheTest`)

测试以下场景：
1. **批次保存** - 保存一个测试批次
2. **首次加载** - 应该访问 localStorage
3. **重复加载** - 应该命中内存缓存
4. **不存在批次** - 测试 null 值缓存
5. **性能对比** - 显示加载时间对比

### 现有批次测试 (`testExistingBatches`)

测试你已导入的批次：
1. **列出所有批次**
2. **性能对比** - 首次 vs 缓存加载
3. **加速比计算** - 显示性能提升倍数

## 预期结果

### 成功的缓存优化应该显示：

1. **日志减少**：
   ```
   [CardStorage] 加载批次 XXX  // 只在首次加载时出现
   [CardStorage] 批次 XXX 命中内存缓存  // 后续加载显示
   ```

2. **性能提升**：
   ```
   首次加载: 5.23ms
   缓存加载: 0.12ms
   加速比: 43.6x
   ```

3. **localStorage 访问减少**：
   - 每个批次的 localStorage.getItem 只调用一次
   - 后续访问直接从内存缓存返回

## 故障排除

### 找不到 CustomCardStorage
```javascript
// 检查是否在正确页面
console.log(window.location.href)

// 检查模块是否加载
console.log(Object.keys(window))

// 尝试手动导入（如果支持）
import('./card/card-storage.js').then(module => {
  console.log(module.CustomCardStorage)
})
```

### 没有现有批次进行测试
1. 访问 `/card-import-test` 页面
2. 导入一些示例卡牌包
3. 然后再运行测试

### 缓存没有生效
1. 检查是否启用了调试模式：
   ```javascript
   // 在控制台中检查
   console.log('DEBUG_CARD_STORAGE 应该是 false')
   ```

2. 手动清理缓存重新测试：
   ```javascript
   CustomCardStorage.clearBatchCache()
   ```

## 性能指标

### 期望的改进：

- **localStorage 访问次数**：减少 60-80%
- **加载速度**：提升 10-50 倍（取决于批次大小）
- **日志输出**：减少 70-90%
- **内存使用**：轻微增加（缓存数据）

### 测试建议：

1. **先测试小批次**：验证基本功能
2. **再测试大批次**：验证性能提升
3. **测试多次操作**：验证缓存一致性
4. **测试错误场景**：验证错误处理

## 注意事项

1. **内存使用**：缓存会占用一些内存，这是正常的
2. **数据一致性**：批次更新时缓存会自动清理
3. **浏览器兼容性**：现代浏览器都支持这些 API
4. **生产环境**：这些测试仅用于开发验证

## 示例输出

成功的测试应该显示类似以下输出：

```
🧪 DaggerHeart 卡牌缓存性能测试

✅ 找到 CustomCardStorage，开始测试...

📊 开始缓存性能测试...

🧹 已清理现有缓存

1️⃣ 保存测试批次...
   ✅ 批次保存成功

2️⃣ 测试批次加载（观察日志输出）...
   第1次加载（应该访问 localStorage）:
   ✅ 成功
   第2次加载（应该命中缓存）:
   ✅ 成功
   第3次加载（应该命中缓存）:
   ✅ 成功

3️⃣ 测试不存在的批次加载...
   第1次加载不存在的批次:
   ✅ 正确返回 null
   第2次加载不存在的批次（应该命中缓存）:
   ✅ 正确返回 null

4️⃣ 清理测试数据...
   ✅ 测试批次已删除

🎉 缓存性能测试完成！
```
