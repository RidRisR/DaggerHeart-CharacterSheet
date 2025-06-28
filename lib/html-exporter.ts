/**
 * HTML导出器 - 从打印预览页面提取HTML并导出
 * 
 * 功能：
 * 1. 直接从现有的打印预览页面提取HTML
 * 2. 获取所有相关的CSS样式
 * 3. 生成完整的自包含HTML文件
 */

import { SheetData } from './sheet-data'
import { CardType, getStandardCardsByTypeAsync } from '@/card'
import { StandardCard } from '@/card/card-types'

interface HTMLExportOptions {
  includeStyles?: boolean
  compressHTML?: boolean
  filename?: string
}

/**
 * 获取卡牌类别信息
 */
async function getCardClass(cardId: string | undefined, cardType: CardType): Promise<string> {
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

/**
 * 生成HTML文档标题
 */
async function generateDocumentTitle(formData: SheetData): Promise<string> {
  const name = formData.name || '()'
  const ancestry1Class = await getCardClass(formData.ancestry1Ref?.id, CardType.Ancestry)
  const professionClass = await getCardClass(formData.professionRef?.id, CardType.Profession)
  const ancestry2Class = await getCardClass(formData.ancestry2Ref?.id, CardType.Ancestry)
  const communityClass = await getCardClass(formData.communityRef?.id, CardType.Community)
  const level = formData.level || '()'

  return `${name}-${professionClass}-${ancestry1Class}-${ancestry2Class}-${communityClass}-LV${level}`
}

/**
 * 提取页面的CSS样式
 */
function extractPageStyles(): string {
  const allStyles: string[] = []

  // 获取所有样式表
  for (const stylesheet of document.styleSheets) {
    try {
      let cssText = ''

      // 处理内联样式表和外部样式表
      if (stylesheet.cssRules) {
        for (const rule of stylesheet.cssRules) {
          cssText += rule.cssText + '\n'
        }
      }

      if (cssText) {
        allStyles.push(cssText)
      }
    } catch (error) {
      // 某些跨域样式表可能无法访问，忽略错误
      console.warn('无法访问样式表:', error)
    }
  }

  // 获取内联样式
  const styleElements = document.querySelectorAll('style')
  styleElements.forEach(style => {
    if (style.textContent) {
      allStyles.push(style.textContent)
    }
  })

  return allStyles.join('\n')
}

/**
 * 清理和处理提取的HTML内容
 */
function cleanupExtractedHTML(htmlContent: string): string {
  // 移除不需要的元素和属性
  let cleaned = htmlContent
    // 移除data-*属性，但保留data-text, data-max-font, data-min-font（用于字体调整）
    .replace(/\s*data-(?!text|max-font|min-font)[^=]*="[^"]*"/g, '')
    // 移除React相关的属性
    .replace(/\s*data-react[^=]*="[^"]*"/g, '')
    // 移除事件处理器属性
    .replace(/\s*on[a-z]+="[^"]*"/g, '')
    // 移除空的class属性
    .replace(/\s*class=""\s*/g, ' ')
    // 移除多余的空白
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')

  return cleaned
}

/**
 * 处理和转换HTML内容，使其更适合独立使用
 */
function transformHTMLContent(htmlContent: string): string {
  let transformed = htmlContent

  // 1. 将选择类按钮转换为输入框
  // 匹配包含"选择"文本的按钮
  const selectButtonPatterns = [
    /(选择武器|选择护甲|选择职业|选择子职业|选择血统|选择社群)/g
  ]

  // 转换选择按钮为输入框
  transformed = transformed.replace(
    /<button([^>]*?)>([^<]*?(?:选择武器|选择护甲|选择职业|选择子职业|选择血统|选择社群)[^<]*?)<\/button>/g,
    (match, attributes, content) => {
      // 提取class属性
      const classMatch = attributes.match(/class="([^"]*?)"/);
      const classStr = classMatch ? classMatch[1] : '';

      // 如果内容只是"选择XX"，则显示为空值，否则保留当前值
      const isPlaceholder = /^选择(武器|护甲|职业|子职业|血统|社群)$/.test(content.trim());
      const value = isPlaceholder ? '' : content.trim();
      const placeholder = content.trim();

      return `<input type="text" value="${value}" placeholder="${placeholder}" class="${classStr} converted-from-button" />`;
    }
  );

  // 2. 确保checkbox保持功能性
  // 移除checkbox的disabled属性，保持onclick功能
  transformed = transformed.replace(
    /<input([^>]*?)type=["']checkbox["']([^>]*?)>/g,
    (match, before, after) => {
      // 移除disabled属性
      let attributes = (before + after).replace(/\s*disabled\s*=?\s*["']?[^"'\s]*["']?\s*/g, '');
      return `<input${attributes} type="checkbox">`;
    }
  );

  // 3. 处理radio按钮，保持功能性
  transformed = transformed.replace(
    /<input([^>]*?)type=["']radio["']([^>]*?)>/g,
    (match, before, after) => {
      let attributes = (before + after).replace(/\s*disabled\s*=?\s*["']?\s*/g, '');
      return `<input${attributes} type="radio">`;
    }
  );

  // 4. 为自定义checkbox div元素添加点击切换功能
  // 处理不同类型的自定义checkbox：

  // 4a. 处理标准的w-3 h-3类型的checkbox（第一页和第三页的renderBox）
  transformed = transformed.replace(
    /<div([^>]*?w-3\s+h-3[^>]*?cursor-pointer[^>]*?)>([^<]*?)<\/div>/g,
    (match, attributes, content) => {
      const divId = `checkbox_${Math.random().toString(36).substr(2, 9)}`;
      return `<div id="${divId}" ${attributes} onclick="toggleCustomCheckbox('${divId}')">${content}</div>`;
    }
  );

  // 4b. 处理训练选项中的w-[1em] h-[1em]类型的checkbox
  transformed = transformed.replace(
    /<span([^>]*?w-\[1em\]\s+h-\[1em\][^>]*?cursor-pointer[^>]*?)>/g,
    (match, attributes) => {
      const spanId = `checkbox_${Math.random().toString(36).substr(2, 9)}`;
      return `<span id="${spanId}" ${attributes} onclick="toggleCustomCheckbox('${spanId}')">`;
    }
  );

  // 4c. 处理其他可能的自定义checkbox（包含cursor-pointer且用于切换背景色的div/span）
  transformed = transformed.replace(
    /<(div|span)([^>]*?cursor-pointer[^>]*?)>([^<]*?)<\/\1>/g,
    (match, tagName, attributes, content) => {
      // 检查是否是用作checkbox的元素（包含bg-gray-800或bg-white切换的样式）
      if ((attributes.includes('bg-gray-800') || attributes.includes('bg-white')) &&
        (attributes.includes('border') || attributes.includes('checkbox'))) {
        const elemId = `checkbox_${Math.random().toString(36).substr(2, 9)}`;
        return `<${tagName} id="${elemId}" ${attributes} onclick="toggleCustomCheckbox('${elemId}')">${content}</${tagName}>`;
      }
      return match;
    }
  );

  return transformed;
}

/**
 * 从打印预览页面提取HTML内容
 */
function extractPrintPreviewHTML(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log('[HTML Extract] 查找打印预览容器...')

      // 查找打印预览容器
      const printContainer = document.querySelector('.print-all-pages')

      if (!printContainer) {
        throw new Error('未找到打印预览容器，请先进入打印预览模式')
      }

      console.log('[HTML Extract] 找到打印预览容器，开始提取...')

      // 克隆容器以避免影响原页面
      const clonedContainer = printContainer.cloneNode(true) as HTMLElement

      // 移除控制按钮（打印预览控制按钮）
      const controlButtons = clonedContainer.querySelectorAll('.fixed.top-4.left-4')
      controlButtons.forEach(btn => btn.remove())

      // 保持表单元素的交互性            // 移除所有input/textarea的readonly属性，让用户可以编辑
            const allInputs = clonedContainer.querySelectorAll('input, textarea')
            allInputs.forEach(input => {
                // 对于text类型的input，移除readonly
                if (input.getAttribute('type') === 'text' || input.getAttribute('type') === 'number' || input.tagName === 'TEXTAREA') {
                    input.removeAttribute('readonly')
                }
                // 对于checkbox和radio，确保它们可以交互
                if (input.getAttribute('type') === 'checkbox' || input.getAttribute('type') === 'radio') {
                    input.removeAttribute('disabled')
                }

              // 保留所有现有的样式和属性，包括字体调整相关的CSS变量
              const styleAttr = input.getAttribute('style')
              if (styleAttr && styleAttr.includes('--print-font-size')) {
                console.log('[HTML Extract] 保留字体调整CSS变量:', styleAttr)
              }
            })

      // 处理按钮：非选择类按钮保持原样，选择类按钮将被转换
      const allButtons = clonedContainer.querySelectorAll('button')
      allButtons.forEach(btn => {
        // 移除事件监听器相关的属性
        btn.removeAttribute('onclick')

        // 对于非选择类按钮，移除disabled属性
        const buttonText = btn.textContent?.trim() || '';
        if (!/选择(武器|护甲|职业|子职业|血统|社群)/.test(buttonText)) {
          btn.removeAttribute('disabled')
        }
      })

      // 获取HTML并进行转换
      let extractedHTML = cleanupExtractedHTML(clonedContainer.outerHTML)

      // 应用内容转换
      extractedHTML = transformHTMLContent(extractedHTML)

      console.log('[HTML Extract] HTML提取和转换完成')
      resolve(extractedHTML)

    } catch (error) {
      console.error('[HTML Extract] 提取失败:', error)
      reject(error)
    }
  })
}

/**
 * 生成完整的HTML文档
 */
async function generateFullHTML(formData: SheetData, options: HTMLExportOptions = {}): Promise<string> {
  try {
    const title = await generateDocumentTitle(formData)

    // 从打印预览页面提取HTML内容
    const extractedHTML = await extractPrintPreviewHTML()

    // 提取页面样式
    const styles = options.includeStyles !== false ? extractPageStyles() : ''

    const html = `<!DOCTYPE html>
<html lang="zh-CN" data-version="1.0" data-exporter="daggerheart-character-sheet">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Daggerheart Character Sheet Exporter v1.0">
  <title>${title}</title>
  <style>
    /* 重置样式 */
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* 页面样式 */
    .print-all-pages .page-one,
    .print-all-pages .page-two,
    .print-all-pages .page-three,
    .print-all-pages .page-four {
      display: block;
      padding: 0;
      min-height: auto;
    }
    
    /* 提取的原始样式 */
    ${styles}
    
    /* 自动调整字体大小支持 - 在所有场景下生效 */
    .auto-resize-font {
      font-size: var(--print-font-size, 14px) !important;
    }
    
    /* 确保所有有 data-min-font 属性的元素使用计算的字体大小 */
    input[data-min-font] {
      font-size: var(--print-font-size, 14px) !important;
    }
    
    textarea[data-min-font] {
      font-size: var(--print-font-size, 14px) !important;
    }
    
    /* 为所有可能的字体调整元素添加样式 */
    [style*="--print-font-size"] {
      font-size: var(--print-font-size, 14px) !important;
    }
    
    /* 转换后元素的特殊样式 */
    .converted-from-button {
      /* 让转换后的输入框看起来像原来的按钮 */
      background-color: white;
      border: 1px solid #ccc;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: inherit;
      font-size: inherit;
      cursor: text;
      width: 100%;
    }
    
    .converted-from-button:focus {
      outline: 2px solid #007cba;
      border-color: #007cba;
    }
    
    .converted-from-button::placeholder {
      color: #999;
      font-style: italic;
    }
    
    /* 确保checkbox和radio按钮可以正常交互 */
    input[type="checkbox"], input[type="radio"] {
      cursor: pointer;
      pointer-events: auto;
    }
    
    /* 改善复选框的视觉效果 */
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #333;
    }
    
    input[type="radio"] {
      width: 18px;
      height: 18px;
      accent-color: #333;
    }
    
    /* 确保表单元素在打印时保持可见 */
    @media print {
      input, textarea, button, select {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .converted-from-button {
        border: 1px solid #333 !important;
        background: white !important;
      }
      
      /* 打印时也使用自动调整的字体大小 */
      .auto-resize-font {
        font-size: var(--print-font-size, 14px) !important;
      }
      
      input[data-min-font] {
        font-size: var(--print-font-size, 14px) !important;
      }
      
      textarea[data-min-font] {
        font-size: var(--print-font-size, 14px) !important;
      }
      
      /* 打印时隐藏不需要的元素 */
      .no-print {
        display: none !important;
      }
    }
    
    /* 额外的打印优化 */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      @page {
        size: A4;
        margin: 0;
        scale: 0.9;
      }
    }
    
    /* 隐藏不需要的元素 */
    .fixed {
      display: none !important;
    }
    
    .print\\:hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  ${extractedHTML}
  
  <!-- 自定义checkbox切换功能 -->
  <script>
  // 自定义checkbox切换功能
  function toggleCustomCheckbox(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const className = element.className;
    
    // 切换背景色类
    if (className.includes('bg-gray-800')) {
      // 当前是选中状态，切换为未选中
      element.className = className.replace('bg-gray-800', 'bg-white');
      // 如果有aria-checked属性，也要更新
      if (element.hasAttribute('aria-checked')) {
        element.setAttribute('aria-checked', 'false');
      }
      if (element.hasAttribute('aria-pressed')) {
        element.setAttribute('aria-pressed', 'false');
      }
    } else if (className.includes('bg-white')) {
      // 当前是未选中状态，切换为选中
      element.className = className.replace('bg-white', 'bg-gray-800');
      // 如果有aria-checked属性，也要更新
      if (element.hasAttribute('aria-checked')) {
        element.setAttribute('aria-checked', 'true');
      }
      if (element.hasAttribute('aria-pressed')) {
        element.setAttribute('aria-pressed', 'true');
      }
    } else {
      // 处理没有明确bg-white/bg-gray-800的情况
      // 检查是否已经包含选中状态的指示
      if (className.includes('border-gray-800') || className.includes('border-2')) {
        // 假设这是一个未选中的checkbox，将其标记为选中
        element.className = className + ' bg-gray-800';
        if (element.hasAttribute('aria-checked')) {
          element.setAttribute('aria-checked', 'true');
        }
        if (element.hasAttribute('aria-pressed')) {
          element.setAttribute('aria-pressed', 'true');
        }
      }
    }
    
    // 触发视觉反馈
    element.style.transition = 'all 0.1s ease';
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 100);
  }
  
  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', function() {
    console.log('角色卡HTML已加载，checkbox功能已启用');
    
    // 确保所有自定义checkbox都有正确的cursor样式
    const checkboxes = document.querySelectorAll('[onclick*="toggleCustomCheckbox"]');
    checkboxes.forEach(checkbox => {
      if (!checkbox.style.cursor) {
        checkbox.style.cursor = 'pointer';
      }
    });
  });
  </script>
  
  <!-- 角色数据（嵌入式JSON） -->
  <script>
    // 角色数据（只读）
    window.characterData = ${JSON.stringify(formData, null, 2)};
    
    // 打印功能
    function printCharacterSheet() {
      window.print();
    }
    
    // 页面加载完成后的初始化
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Daggerheart 角色卡已加载');
      console.log('角色名称:', window.characterData.name || '未命名');
      console.log('等级:', window.characterData.level || 1);
      
      // 添加按钮组容器
      const buttonGroup = document.createElement('div');
      buttonGroup.style.cssText = 'position: fixed; top: 15px; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden;';
      buttonGroup.className = 'no-print';
      
      // 添加打印按钮
      const printButton = document.createElement('button');
      printButton.textContent = '🖨️ 打印角色卡';
      printButton.style.cssText = 'padding: 12px 20px; background: #007cba; color: white; border: none; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s ease;';
      printButton.onmouseover = function() { this.style.backgroundColor = '#005a8b'; };
      printButton.onmouseout = function() { this.style.backgroundColor = '#007cba'; };
      printButton.onclick = printCharacterSheet;
      
      // 添加收起按钮
      const hideButton = document.createElement('button');
      hideButton.textContent = '×';
      hideButton.style.cssText = 'padding: 12px 10px; background: #f8f9fa; color: #6c757d; border: none; border-left: 1px solid #dee2e6; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.2s ease;';
      hideButton.title = '隐藏按钮';
      hideButton.onmouseover = function() { 
        this.style.backgroundColor = '#e9ecef'; 
        this.style.color = '#495057';
      };
      hideButton.onmouseout = function() { 
        this.style.backgroundColor = '#f8f9fa'; 
        this.style.color = '#6c757d';
      };
      hideButton.onclick = function() {
        buttonGroup.style.opacity = '0';
        buttonGroup.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => {
          buttonGroup.style.display = 'none';
        }, 200);
      };
      
      buttonGroup.appendChild(printButton);
      buttonGroup.appendChild(hideButton);
      document.body.appendChild(buttonGroup);
    });
  </script>
  
  <!-- 版权信息 -->
  <div class="no-print" style="position: fixed; bottom: 10px; left: 10px; font-size: 10px; color: #666; pointer-events: auto; z-index: 1000; line-height: 1.4;">
    <div>本页面生成自 <a href="https://ridrisr.github.io/DaggerHeart-CharacterSheet" target="_blank" style="color: #007cba; text-decoration: underline;">https://ridrisr.github.io/DaggerHeart-CharacterSheet</a></div>
    <div>仅用于展示和分享，所有修改都不会被保存</div>
  </div>
</body>
</html>`

    return options.compressHTML ? compressHTML(html) : html

  } catch (error) {
    console.error('[HTML Generate] 生成失败:', error)
    throw new Error(`HTML生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 压缩HTML（移除多余空白）
 */
function compressHTML(html: string): string {
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/^\s+|\s+$/g, '')
}

/**
 * 生成文件名
 */
async function generateFileName(formData: SheetData, options: HTMLExportOptions = {}): Promise<string> {
  if (options.filename) {
    return options.filename.endsWith('.html') ? options.filename : `${options.filename}.html`
  }

  const title = await generateDocumentTitle(formData)
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  return `${title}-${timestamp}.html`
}

/**
 * 导出为HTML文件
 */
export async function exportToHTML(formData: SheetData, options: HTMLExportOptions = {}): Promise<void> {
  try {
    console.log('[HTML Export] Starting export...')

    // 检查是否在打印预览模式
    if (!document.querySelector('.print-all-pages')) {
      throw new Error('请先进入打印预览模式再导出HTML。点击"打印预览"按钮后重试。')
    }

    // 生成HTML内容
    const html = await generateFullHTML(formData, options)
    const filename = await generateFileName(formData, options)

    // 创建下载链接
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // 触发下载
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 清理URL对象
    URL.revokeObjectURL(url)

    console.log(`[HTML Export] Export completed: ${filename}`)
  } catch (error) {
    console.error('[HTML Export] Export failed:', error)
    throw new Error(`HTML导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 预览HTML内容（在新窗口中打开）
 */
export async function previewHTML(formData: SheetData, options: HTMLExportOptions = {}): Promise<void> {
  try {
    console.log('[HTML Preview] Starting preview...')

    // 检查是否在打印预览模式
    if (!document.querySelector('.print-all-pages')) {
      throw new Error('请先进入打印预览模式再预览HTML。点击"打印预览"按钮后重试。')
    }

    const html = await generateFullHTML(formData, options)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // 在新窗口中打开预览
    const previewWindow = window.open(url, '_blank', 'width=1200,height=800')

    if (!previewWindow) {
      throw new Error('无法打开预览窗口，请检查浏览器的弹窗拦截设置')
    }

    // 当预览窗口关闭时清理URL对象
    const checkClosed = setInterval(() => {
      if (previewWindow.closed) {
        URL.revokeObjectURL(url)
        clearInterval(checkClosed)
        console.log('[HTML Preview] Preview window closed, URL cleaned up')
      }
    }, 1000)

    console.log('[HTML Preview] Preview opened in new window')
  } catch (error) {
    console.error('[HTML Preview] Preview failed:', error)
    throw new Error(`HTML预览失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 获取HTML内容（不触发下载）
 */
export async function getHTMLContent(formData: SheetData, options: HTMLExportOptions = {}): Promise<string> {
  return await generateFullHTML(formData, options)
}

// 默认导出选项
export const defaultExportOptions: HTMLExportOptions = {
  includeStyles: true,
  compressHTML: false,
  filename: undefined
}
