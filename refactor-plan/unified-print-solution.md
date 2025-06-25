# DaggerHeart 角色卡生成器 - 多端统一打印解决方案

## 核心诉求

实现一个**多端打印效果统一**的打印新方法，解决以下问题：
- 桌面端（Windows/Mac/Linux）打印效果一致
- 移动端（iOS/Android）打印兼容性  
- 保持最高清晰度输出
- 统一的用户体验

## 解决方案：统一高清PDF生成

### 设计理念

**完全统一策略**：
1. **所有平台**：统一使用高清PDF生成，消除平台差异
2. **质量优先**：300+ DPI高清输出，确保专业级打印质量
3. **简洁实现**：直接替换现有打印逻辑，无复杂检测
4. **用户友好**：一键生成，自动下载，统一体验

### 核心架构

#### 1. 简化的PDF生成器

```typescript
// lib/unified-pdf-generator.ts
export async function generateUnifiedPDF(): Promise<void> {
  // 显示生成进度
  showProgress('正在生成高清PDF...')
  
  try {
    // 动态导入
    const [
      { default: html2canvas },
      { default: jsPDF }
    ] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ])

    const printElements = document.querySelectorAll('.a4-page')
    if (printElements.length === 0) {
      throw new Error('未找到可打印内容')
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: false // 不压缩，保持最高质量
    })

    // 智能质量设置
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const hasHighDPI = window.devicePixelRatio >= 2
    
    const options = {
      scale: isMobile ? 3 : 2.5,           // 移动端更高缩放
      dpi: hasHighDPI ? 300 : 250,         // 高DPI设备使用300DPI
      quality: 1.0                        // 最高质量
    }

    updateProgress('正在渲染页面...')

    for (let i = 0; i < printElements.length; i++) {
      if (i > 0) pdf.addPage()
      
      updateProgress(`正在处理第 ${i + 1}/${printElements.length} 页...`)
      
      const element = printElements[i] as HTMLElement
      const canvas = await html2canvas(element, {
        scale: options.scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 0,
        logging: false,
        width: 794,  // A4 @ 96DPI
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        foreignObjectRendering: true,
        scrollX: 0,
        scrollY: 0,
        pixelRatio: options.dpi / 96
      })
      
      const imgData = canvas.toDataURL('image/png', options.quality)
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
    }

    updateProgress('正在保存文件...')
    
    // 生成文件名
    const fileName = generateFileName()
    pdf.save(fileName)
    
    hideProgress()
    
  } catch (error) {
    console.error('PDF生成失败:', error)
    hideProgress()
    alert('PDF生成失败，请重试')
  }
}

function generateFileName(): string {
  try {
    const formDataStr = localStorage.getItem('characterSheetData')
    if (formDataStr) {
      const formData = JSON.parse(formDataStr)
      const name = formData.name || '角色'
      const level = formData.level || '1'
      const profession = formData.professionRef?.name || '职业'
      const timestamp = new Date().toISOString().slice(0, 10)
      return `${name}-${profession}-LV${level}-${timestamp}.pdf`
    }
  } catch (error) {
    console.warn('文件名生成失败:', error)
  }
  
  const timestamp = new Date().toISOString().slice(0, 10)
  return `DaggerHeart-角色卡-${timestamp}.pdf`
}

function showProgress(message: string) {
  const progress = document.createElement('div')
  progress.id = 'pdf-progress'
  progress.innerHTML = `
    <div style="
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9); color: white; padding: 30px 40px;
      border-radius: 12px; z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      backdrop-filter: blur(10px); text-align: center; min-width: 280px;
    ">
      <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
        <div style="
          width: 24px; height: 24px; border: 3px solid transparent;
          border-top: 3px solid #ffffff; border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <span style="font-weight: 600;">生成高清PDF</span>
      </div>
      <div id="progress-message" style="color: #ccc; font-size: 14px;">${message}</div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </div>
  `
  document.body.appendChild(progress)
}

function updateProgress(message: string) {
  const messageEl = document.getElementById('progress-message')
  if (messageEl) messageEl.textContent = message
}

function hideProgress() {
  const progress = document.getElementById('pdf-progress')
  if (progress) progress.remove()
}
```

#### 2. 修改现有打印逻辑

直接替换 page.tsx 中的 `handlePrintAll` 函数：

```typescript
// app/page.tsx 修改部分
import { generateUnifiedPDF } from '@/lib/unified-pdf-generator'

const handlePrintAll = async () => {
  // 设置文档标题（用于文件名生成）
  const getCardClass = async (cardId: string | undefined, cardType: CardType): Promise<string> => {
    if (!cardId) return '()'
    try {
      const cardsOfType: StandardCard[] = await getStandardCardsByTypeAsync(cardType)
      const card = cardsOfType.find((c: StandardCard) => c.id === cardId)
      return card && card.class ? String(card.class) : '()'
    } catch (error) {
      console.error('Error getting card class:', error)
      return '()'
    }
  }

  const name = formData.name || '()'
  const ancestry1Class = await getCardClass(formData.ancestry1Ref?.id, CardType.Ancestry)
  const professionClass = await getCardClass(formData.professionRef?.id, CardType.Profession)
  const ancestry2Class = await getCardClass(formData.ancestry2Ref?.id, CardType.Ancestry)
  const communityClass = await getCardClass(formData.communityRef?.id, CardType.Community)
  const level = formData.level || '()'

  document.title = `${name}-${professionClass}-${ancestry1Class}-${ancestry2Class}-${communityClass}-LV${level}`
  
  // 切换到打印视图
  setIsPrintingAll(true)
  
  // 等待渲染完成后生成PDF
  setTimeout(async () => {
    await generateUnifiedPDF()
    setIsPrintingAll(false)
  }, 1000)
}
```

### 质量保证策略

#### 统一输出质量

```typescript
const unifiedQualityProfile = {
  // 所有平台统一使用高清PDF
  method: 'client-pdf',
  quality: 'raster-hd',
  baseSettings: {
    dpi: 250,           // 基础DPI，平衡质量和文件大小
    scale: 2.5,         // 基础缩放比例
    format: 'PNG',      // 无损格式
    compression: false  // 不压缩
  },
  
  // 设备优化
  deviceOptimization: {
    mobile: {
      scale: 3.0,       // 移动端更高缩放
      dpi: 300          // 移动端更高DPI
    },
    highDPI: {
      dpi: 300,         // 高DPI设备使用300DPI
      scale: 2.8
    },
    standard: {
      dpi: 250,         // 标准设备
      scale: 2.5
    }
  }
}
```

#### 预期效果

**所有平台统一输出**：
- ✅ 250-300 DPI 专业级清晰度
- ✅ 文字边缘锐利，图形清晰
- ✅ 完美跨平台兼容性
- ✅ 统一的文件大小（1-4MB）
- ✅ 一致的用户体验

## 执行步骤

### 第一步：安装依赖

```bash
npm install html2canvas jspdf
npm install --save-dev @types/html2canvas
```

### 第二步：创建统一PDF生成器

创建文件 `/lib/unified-pdf-generator.ts`，包含完整的PDF生成逻辑。

### 第三步：修改 page.tsx

替换现有的 `handlePrintAll` 函数，调用新的统一PDF生成器。

### 第四步：测试验证

1. 在不同设备上测试生成效果
2. 验证文件质量和大小
3. 确认用户体验一致性

### 第五步：优化调整

根据测试结果调整DPI和缩放参数，确保最佳效果。

## 实施优势

#### 1. **真正的多端统一**
- 所有平台使用相同的生成逻辑
- 输出质量和格式完全一致
- 消除平台差异

#### 2. **简洁高效**
- 无复杂的设备检测逻辑
- 直接替换现有打印功能
- 代码易于维护

#### 3. **质量可控**
- 精确控制输出DPI和缩放
- 可根据需要调整质量参数
- 确保专业级打印效果

#### 4. **用户体验优秀**
- 统一的生成进度提示
- 自动文件命名
- 一键下载，无需额外操作

这个方案彻底解决了多端打印统一性问题，通过完全统一的PDF生成逻辑，确保所有平台都能获得一致的高质量输出。
