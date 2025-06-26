# PDF导出样式切换功能说明

## 功能概述

我们为项目添加了PDF导出时的样式切换功能，解决了使用 html2canvas + jsPDF 方式导出PDF时无法应用原有打印样式的问题。

## 实现原理

### 1. 样式切换机制
- 在PDF导出开始前，为 `document.body` 添加 `.pdf-exporting` CSS类
- 在PDF导出完成（成功或失败）后，移除 `.pdf-exporting` CSS类
- 通过CSS选择器 `.pdf-exporting` 来模拟原本 `@media print` 下的所有样式

### 2. 修改的文件

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

#### `/app/globals.css`
添加了完整的 `.pdf-exporting` 样式规则，包括：
- 页面布局和尺寸设置
- 元素显示/隐藏控制
- 表单元素样式
- 背景色和文字颜色
- 字体大小调整
- 分页和边距设置

## 使用效果

### 原有问题
- html2canvas 只渲染屏幕上可见的内容，不会应用 `@media print` 样式
- 原本的"仅打印显示/隐藏"效果失效
- A4页面尺寸、边距、分页等打印特性无法正确应用

### 解决后效果
- PDF导出时会临时应用"打印样式"
- 所有原本的打印效果都能正确体现在导出的PDF中
- 导出完成后页面恢复正常显示状态

## 样式映射示例

| 原打印样式 | PDF导出样式 |
|-----------|------------|
| `@media print { .print-hidden { display: none; } }` | `.pdf-exporting .print-hidden { display: none !important; }` |
| `@media print { .print-only { display: block; } }` | `.pdf-exporting .print-only { display: block !important; }` |
| `@media print { .a4-page { width: 210mm; } }` | `.pdf-exporting .a4-page { width: 210mm !important; }` |

## 调试建议

如果需要调试PDF导出效果：

1. 在浏览器控制台手动添加类：
   ```javascript
   document.body.classList.add('pdf-exporting')
   ```

2. 观察页面效果是否符合预期

3. 手动移除类恢复正常：
   ```javascript
   document.body.classList.remove('pdf-exporting')
   ```

## 扩展使用

如果需要添加新的PDF导出专用样式，只需在 `/app/globals.css` 中添加：

```css
.pdf-exporting .your-element {
    /* 你的PDF导出专用样式 */
}
```

这样就能确保该样式只在PDF导出时生效，而不影响正常的页面显示。
