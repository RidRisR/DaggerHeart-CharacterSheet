# PDF导出样式切换功能说明

## 功能概述

我们为项目添加了PDF导出时的样式切换功能，解决了使用 html2canvas + jsPDF 方式导出PDF时无法应用原有打印样式的问题。

## 实现原理

### 1. 样式切换机制
- 在PDF导出开始前，为 `document.body` 添加 `.pdf-exporting` CSS类
- 在PDF导出完成（成功或失败）后，移除 `.pdf-exporting` CSS类
- 通过CSS选择器 `.pdf-exporting` 来模拟原本 `@media print` 下的所有样式

### 2. 打印助手集成
- 修改了 `print-helper.tsx`，使其不仅监听原生打印事件，还监听PDF导出时的样式类变化
- 通过 `MutationObserver` 监听 `document.body` 的 `class` 属性变化
- 当检测到 `.pdf-exporting` 类被添加时，自动执行打印前处理逻辑
- 当检测到 `.pdf-exporting` 类被移除时，自动执行打印后恢复逻辑

### 3. 修改的文件

#### `/lib/client-pdf-generator.ts`
```typescript
export async function generateHighQualityPDF(options: PDFGenerationOptions): Promise<void> {
    // 添加PDF导出专用样式类
    document.body.classList.add('pdf-exporting')
    
    try {
        // 等待样式应用完成
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // ...原有的PDF生成逻辑...
        
    } finally {
        // 无论成功或失败，都要移除PDF导出样式类
        document.body.classList.remove('pdf-exporting')
    }
}
```

#### `/lib/unified-pdf-generator.ts`
```typescript
export async function generateUnifiedPDF(): Promise<void> {
    // 添加PDF导出专用样式类
    document.body.classList.add('pdf-exporting')
    
    try {
        // 等待样式应用完成
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // ...原有的PDF生成逻辑...
        
    } finally {
        // 无论成功或失败，都要移除PDF导出样式类
        document.body.classList.remove('pdf-exporting')
    }
}
```

#### `/app/print-helper.tsx`
- 添加了 `MutationObserver` 来监听 `.pdf-exporting` 类的变化
- 当PDF导出开始时，自动执行按钮文本处理、表单元素处理等逻辑
- 当PDF导出结束时，自动恢复所有元素的原始状态

#### `/app/globals.css`
添加了完整的 `.pdf-exporting` 样式规则，包括：
- 页面布局和尺寸设置（包含正确的8mm边距）
- 元素显示/隐藏控制
- 表单元素样式
- 按钮占位符文本隐藏
- 背景色和文字颜色
- 字体大小调整
- 分页和边距设置

## 使用效果

### 原有问题
- html2canvas 只渲染屏幕上可见的内容，不会应用 `@media print` 样式
- 原本的"仅打印显示/隐藏"效果失效
- 按钮占位符文本不会自动隐藏
- A4页面尺寸、边距、分页等打印特性无法正确应用

### 解决后效果
- PDF导出时会临时应用"打印样式"
- 所有原本的打印效果都能正确体现在导出的PDF中
- 按钮占位符文本在PDF导出时正确隐藏
- 页面边距恢复为合适的8mm
- 导出完成后页面恢复正常显示状态

## 样式映射示例

| 原打印样式 | PDF导出样式 |
|-----------|------------|
| `@media print { .print-hidden { display: none; } }` | `.pdf-exporting .print-hidden { display: none !important; }` |
| `@media print { .print-only { display: block; } }` | `.pdf-exporting .print-only { display: block !important; }` |
| `@media print { .a4-page { width: 210mm; padding: 0; } }` | `.pdf-exporting .a4-page { width: 210mm !important; padding: 8mm !important; }` |
| `@media print { .print-empty-button { color: transparent; } }` | `.pdf-exporting .print-empty-button { color: transparent !important; }` |

## 按钮处理逻辑

### 占位符按钮
- 检测包含"选择武器"、"选择护甲"等占位符文本的按钮
- 在PDF导出时清空按钮文本，导出后恢复

### 已选择内容的按钮
- 对于已选择内容的按钮，确保文本在PDF中可见
- 特别处理 `header-selection-button` 类的按钮，强制文本为黑色

## 调试建议

如果需要调试PDF导出效果：

1. 在浏览器控制台手动添加类：
   ```javascript
   document.body.classList.add('pdf-exporting')
   ```

2. 观察页面效果是否符合预期（包括按钮文本隐藏、边距等）

3. 手动移除类恢复正常：
   ```javascript
   document.body.classList.remove('pdf-exporting')
   ```

## 自动化流程

整个PDF导出过程现在是完全自动化的：

1. 用户点击"导出PDF"按钮
2. 系统添加 `.pdf-exporting` 类到 body
3. `print-helper.tsx` 自动检测到类变化，执行打印前处理
4. CSS样式自动切换为"打印模式"
5. html2canvas 渲染带有完整打印效果的页面
6. jsPDF 生成高质量PDF文件
7. 系统移除 `.pdf-exporting` 类
8. `print-helper.tsx` 自动恢复所有元素的原始状态
9. 页面恢复正常显示

## 扩展使用

如果需要添加新的PDF导出专用样式，只需在 `/app/globals.css` 中添加：

```css
.pdf-exporting .your-element {
    /* 你的PDF导出专用样式 */
}
```

如果需要添加新的按钮处理逻辑，可以在 `print-helper.tsx` 中的 `handleBeforePrint` 函数里添加相应的处理代码。
