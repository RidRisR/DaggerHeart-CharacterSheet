# Daggerheart 角色卡 - HTML 导入功能

## 功能概述

我们为项目添加了从HTML文件导入角色数据的功能，这是一个安全、可靠的数据交换方案。

## 实现方案

### 1. 安全的数据读取方式

我们采用了正则表达式解析的方式，而不是DOM解析或JavaScript执行：

- ✅ **纯文本解析**：只读取HTML文件的文本内容
- ✅ **正则表达式提取**：使用正则表达式匹配JSON数据
- ✅ **无脚本执行**：不会执行HTML中的任何JavaScript代码
- ✅ **无DOM解析**：避免了DOM解析可能带来的安全风险

### 2. 数据完整性验证

- **统一验证系统**：创建了通用的数据验证模块，JSON和HTML导入共享相同的验证逻辑
- **格式验证**：检查文件是否是有效的JSON或我们导出的Daggerheart HTML文件
- **结构验证**：验证角色数据的基本结构和必需字段
- **类型验证**：确保数组字段是数组、卡牌对象有正确的结构
- **兼容性检查**：检测版本兼容性并提供警告信息
- **数据清理**：自动清理和标准化数据格式

### 3. 用户体验

- **简化流程**：直接选择HTML文件，无需额外的预览步骤
- **一致体验**：与JSON导入保持相同的交互方式
- **即时反馈**：成功导入时显示成功提示，失败时显示错误信息
- **无干扰**：成功时不显示多余的信息，保持界面简洁

## 技术实现

### 核心文件

1. **`lib/character-data-validator.ts`** - 通用数据验证模块
   - `validateAndProcessCharacterData()` - 通用验证和处理函数
   - `validateJSONCharacterData()` - JSON数据验证
   - `validateSheetData()` - 数据结构验证
   - `cleanAndNormalizeData()` - 数据清理和标准化
   - `validateCompatibility()` - 兼容性检查

2. **`lib/html-importer.ts`** - HTML导入核心逻辑
   - `extractCharacterDataFromHTML()` - 从HTML内容提取数据
   - `importCharacterFromHTMLFile()` - 从文件导入数据
   - 使用通用验证器进行数据处理

2. **`components/modals/character-management-modal.tsx`** - 集成统一验证
   - JSON导入使用通用验证器
   - HTML导入使用通用验证器
   - 统一的错误处理和警告显示
   - 与原有功能保持一致的用户体验

3. **`lib/html-exporter.ts`** - 增强的HTML导出
   - 添加了版本标识和元数据
   - 确保导出的HTML包含完整的角色数据

### 安全特性

```typescript
// 通用验证器 - 统一的数据验证逻辑
export function validateAndProcessCharacterData(rawData: any, source: 'json' | 'html' = 'json'): ValidationResult {
  // 1. 基本类型检查
  if (!rawData || typeof rawData !== 'object') {
    return { valid: false, error: '数据格式无效', warnings: [] }
  }

  // 2. 结构验证
  if (!validateSheetData(rawData)) {
    return { valid: false, error: '数据结构验证失败', warnings: [] }
  }

  // 3. 数据清理和标准化
  const cleanedData = cleanAndNormalizeData(rawData)

  // 4. 兼容性检查
  const compatibility = validateCompatibility(cleanedData)

  return {
    valid: true,
    data: cleanedData,
    warnings: compatibility.warnings
  }
}

// JSON导入验证
export function validateJSONCharacterData(jsonString: string): ValidationResult {
  try {
    const rawData = JSON.parse(jsonString)
    return validateAndProcessCharacterData(rawData, 'json')
  } catch (parseError) {
    return { valid: false, error: 'JSON解析失败', warnings: [] }
  }
}

// HTML导入验证 - 使用正则表达式安全提取
const CHARACTER_DATA_REGEX = /window\.characterData\s*=\s*({[\s\S]*?});/
const match = htmlContent.match(CHARACTER_DATA_REGEX)
const characterData = JSON.parse(match[1])
const validation = validateAndProcessCharacterData(characterData, 'html')
```

## 使用方法

### 导出HTML

1. 进入"打印预览"模式
2. 点击"导出为HTML"按钮
3. 保存HTML文件

### 从HTML导入

1. 打开"存档管理"
2. 点击"从HTML导入"按钮  
3. 选择HTML文件
4. 导入成功会显示提示，失败会显示错误信息

## 优势

### 对比其他方案

| 方案 | 安全性 | 实现复杂度 | 数据完整性 | 用户体验 |
|------|--------|------------|------------|----------|
| **HTML导入** | ✅ 高 | ✅ 中等 | ✅ 完整 | ✅ 优秀 |
| DOM解析 | ❌ 低 | ✅ 简单 | ✅ 完整 | ✅ 良好 |
| 执行JS | ❌ 极低 | ❌ 复杂 | ✅ 完整 | ❌ 差 |
| JSON导入 | ✅ 高 | ✅ 简单 | ✅ 完整 | ❌ 一般 |

### 核心优点

1. **数据完整性**：HTML文件包含了所有角色数据，包括卡牌、装备、属性等
2. **可视化验证**：HTML文件本身就是可视化的角色卡，用户可以直观验证
3. **自包含性**：单个HTML文件包含所有必要信息，便于分享和备份
4. **安全性**：不执行任何脚本，只进行文本解析
5. **向后兼容**：支持版本检测和兼容性验证

## 未来扩展

1. **批量导入**：支持同时导入多个HTML文件
2. **增量更新**：支持部分数据更新而不覆盖全部
3. **数据对比**：导入前显示与当前数据的差异
4. **自动备份**：导入前自动备份当前数据

## 🔧 重构改进 (2025年6月28日)

### 统一验证系统

今天我们对导入功能进行了重要的重构和改进：

#### 📦 新增通用验证模块

创建了 `lib/character-data-validator.ts` 作为统一的数据验证系统：

- ✅ **统一逻辑**：JSON和HTML导入现在使用相同的验证逻辑
- ✅ **增强验证**：JSON导入现在也有完整的数据验证流程
- ✅ **警告系统**：两种导入方式都会显示数据完整性警告
- ✅ **代码复用**：消除了重复的验证代码

#### 🔄 改进的用户体验

**JSON导入现在包含：**
- 数据结构验证
- 必需字段检查  
- 兼容性警告
- 详细的错误信息

**HTML导入现在包含：**
- 与JSON导入一致的验证流程
- 警告信息显示
- 更好的错误处理

#### 💡 技术优势

1. **一致性**：两种导入方式现在有完全一致的验证标准
2. **可维护性**：验证逻辑集中在一个模块中，便于维护和更新
3. **可扩展性**：未来添加新的导入格式可以复用相同的验证逻辑
4. **安全性**：所有导入数据都经过严格的验证和清理

## 🎯 导出功能重构 (2025年6月28日)

### 导出JSON功能迁移

完成了"导出JSON"功能从角色管理模态框到打印预览界面的迁移：

#### 📍 功能位置调整

**之前：** 位于角色管理模态框的当前存档信息区域
**现在：** 位于打印预览界面的控制按钮区域

#### 🎨 界面优化

**打印预览控制按钮现在包含：**
- 返回 (灰色)
- 打印/保存PDF (蓝色)  
- 导出HTML (绿色)
- **导出JSON (橙色)** ← 新增
- HTML预览 (紫色)

#### 💻 技术实现

```typescript
// 在 app/page.tsx 中新增
const handleExportJSON = () => {
  try {
    exportCharacterData(formData)
    console.log('[App] JSON导出完成')
  } catch (error) {
    console.error('[App] JSON导出失败:', error)
    alert('JSON导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}
```

#### 🔧 文件修改

1. **`app/page.tsx`**
   - 新增 `handleExportJSON` 函数
   - 在打印预览控制按钮区域添加"导出JSON"按钮
   - 使用橙色主题以区分其他功能

2. **`components/modals/character-management-modal.tsx`** 
   - 移除"导出JSON"按钮及相关逻辑
   - 移除 `handleExport` 函数
   - 清理不再需要的导入

#### 🎯 用户体验改进

**优点：**
- ✅ **逻辑一致**：导出功能统一在打印预览界面
- ✅ **操作流程**：用户在准备打印/分享时可以同时导出各种格式
- ✅ **功能聚合**：所有导出相关功能集中在一个地方
- ✅ **界面清爽**：角色管理模态框专注于存档管理

**使用场景：**
1. 用户进入打印预览模式查看完整角色卡
2. 在同一界面选择需要的导出格式：PDF、HTML或JSON
3. 一站式完成所有导出需求

## 🚀 HTML导入新建存档功能 (2025年6月28日)

### 功能概述

在存档管理页面新增了"从HTML新建存档"功能，允许用户导入HTML文件的同时创建新的存档，提供更灵活的数据导入方式。

### 📍 功能特性

**智能存档命名：**
- 自动从导入的角色数据中提取角色名称
- 生成默认存档名格式：`{角色名称} (导入)`
- 用户可以自定义存档名称

**完整导入流程：**
1. 用户点击"从HTML新建存档"按钮
2. 选择HTML文件进行导入
3. 系统验证文件并提取角色数据
4. 提示用户输入存档名称（预填充智能建议）
5. 创建新存档并导入数据
6. 自动切换到新创建的存档

### 🎨 界面设计

**新建存档区域现在包含：**
- "新建存档" 按钮（原有功能）
- **"从HTML新建存档" 按钮** ← 新增
  - 蓝色边框outline样式
  - 下载图标，突出导入特性
  - 显示当前存档数量限制

### 💻 技术实现

```typescript
const handleHTMLImportAndCreate = () => {
  // 1. 文件选择和验证
  // 2. 从角色数据提取智能命名建议
  // 3. 用户确认存档名称
  // 4. 创建新存档
  // 5. 导入数据到新存档
  // 6. 自动切换到新存档
}
```

### 🔧 安全性和验证

- **复用现有验证逻辑**：使用相同的HTML导入验证系统
- **存档数量检查**：遵循MAX_CHARACTERS限制
- **错误处理**：完整的错误提示和回滚机制
- **数据完整性**：确保导入数据的完整性和一致性

### 🎯 用户价值

**便捷性：**
- ✅ **一键操作**：导入文件的同时创建存档
- ✅ **智能命名**：自动提取角色名称作为存档名
- ✅ **无缝切换**：导入成功后自动切换到新存档

**使用场景：**
1. **分享角色**：接收朋友分享的角色HTML文件
2. **备份恢复**：从HTML备份文件恢复角色到新存档
3. **角色收集**：收集多个不同来源的角色数据
4. **实验测试**：导入示例角色进行功能测试

## 🎨 打印预览界面优化 (2025年6月28日)

### 按钮样式和布局重构

对打印预览界面的控制按钮进行了全面的样式和布局优化：

#### 📍 位置调整

**之前：** 固定在屏幕左上角 (`fixed top-4 left-4`)
**现在：** 固定在屏幕右下角 (`fixed bottom-4 right-4`)

#### 🔄 布局变更

**之前：** 水平排列 (`flex gap-2`)
**现在：** 垂直排列 (`flex flex-col gap-2`)

#### 🎨 按钮顺序和样式

**新的按钮布局（从上到下）：**
1. **导出为PDF** - 黑色背景 (`bg-black hover:bg-gray-800`)
2. **导出为HTML** - 黑色背景 (`bg-black hover:bg-gray-800`)  
3. **导出为JSON** - 黑色背景 (`bg-black hover:bg-gray-800`)
4. **返回** - 红色背景 (`bg-red-600 hover:bg-red-700`)

#### 💻 技术改进

```typescript
// 新的按钮容器样式
<div className="fixed bottom-4 right-4 z-50 print:hidden">
  <div className="flex flex-col gap-2">
    {/* 统一的黑色样式 */}
    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 whitespace-nowrap"
    
    {/* 返回按钮特殊的红色样式 */}
    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 whitespace-nowrap"
  </div>
</div>
```

#### 🔧 功能优化

**移除功能：**
- ❌ 移除了"HTML预览"按钮（简化功能）

**保留核心功能：**
- ✅ 导出为PDF（打印功能）
- ✅ 导出为HTML文件  
- ✅ 导出为JSON文件
- ✅ 返回主界面

#### 🎯 用户体验改进

**视觉优势：**
- ✅ **位置优化**：右下角位置更符合用户习惯
- ✅ **垂直布局**：节省水平空间，避免遮挡内容
- ✅ **统一样式**：黑色主题保持专业感
- ✅ **色彩区分**：红色返回按钮突出退出功能
- ✅ **文本清晰**：`whitespace-nowrap`防止按钮文字换行

**操作体验：**
- 🎯 按钮位置不干扰内容查看
- 🎯 垂直布局更适合移动端操作
- 🎯 色彩编码帮助用户快速识别功能