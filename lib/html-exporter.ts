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
import { UnifiedProgressModalManager } from '@/components/ui/unified-progress-modal'
import { embeddedStyles, hasEmbeddedStyles, getStylesInfo } from './embedded-styles'

// 扩展Window接口以支持gc函数
declare global {
  interface Window {
    gc?: () => void
  }
  
  interface Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }
}

interface HTMLExportOptions {
  includeStyles?: boolean
  compressHTML?: boolean
  filename?: string
}

/**
 * 获取卡牌类别信息（本地环境安全版本）
 */
async function getCardClass(cardId: string | undefined, cardType: CardType): Promise<string> {
  if (!cardId) return '()'

  try {
    const cardsOfType: StandardCard[] = await getStandardCardsByTypeAsync(cardType)
    const card = cardsOfType.find((c: StandardCard) => c.id === cardId)
    return card && card.class ? String(card.class) : '()'
  } catch (error) {
    console.error('Error getting card class:', error)

    // 在本地环境下，可能无法访问卡牌数据，返回ID作为后备
    if (isLocalFileEnvironment()) {
      console.warn(`本地环境下无法获取卡牌数据，使用ID作为后备: ${cardId}`)
      return cardId.substring(0, 8) + '...' // 返回截断的ID
    }

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
 * 检测是否在本地文件环境运行
 */
function isLocalFileEnvironment(): boolean {
  return window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

/**
 * 提取页面样式
 */
function extractPageStyles(): string {
  const isLocal = isLocalFileEnvironment()
  
  // 优先使用嵌入的样式
  if (hasEmbeddedStyles()) {
    const stylesInfo = getStylesInfo()
    console.log(`[HTML导出] 使用嵌入的CSS样式 (${stylesInfo.sizeKB} KB)`)
    return embeddedStyles
  }
  
  // 如果没有嵌入样式，尝试从页面提取（作为后备方案）
  console.warn('[HTML导出] 未找到嵌入的CSS样式，尝试从页面提取...')
  const allStyles: string[] = []

  // 获取所有样式表
  for (const stylesheet of document.styleSheets) {
    try {
      let cssText = ''

      if (stylesheet.cssRules) {
        for (const rule of stylesheet.cssRules) {
          cssText += rule.cssText + '\n'
        }
      } else if (isLocal && stylesheet.href) {
        console.warn(`本地环境无法访问外部样式表: ${stylesheet.href}`)
      }

      if (cssText) {
        allStyles.push(cssText)
      }
    } catch (error) {
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

  // 如果没有提取到任何样式，提供基础样式作为后备
  if (allStyles.length === 0) {
    console.warn('未能提取到任何CSS样式，将使用基础后备样式')
    return getBasicFallbackStyles()
  }

  return allStyles.join('\n')
}

/**
 * 基础后备样式
 */
function getBasicFallbackStyles(): string {
  return `
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .print-all-pages { max-width: 210mm; margin: 0 auto; }
    input, textarea { border: 1px solid #ccc; padding: 4px; }
    input[type="checkbox"] { width: 16px; height: 16px; }
    button { padding: 8px 12px; border: 1px solid #ccc; background: #f5f5f5; cursor: pointer; }
    .page-one, .page-two, .page-three, .page-four, .page-adventure-notes { page-break-after: always; }
  `
}

/**
 * 清理提取的HTML内容
 */
function cleanupExtractedHTML(htmlContent: string): string {
  return htmlContent
    // 移除data属性（保留字体调整相关的）
    .replace(/\s*data-(?!text|max-font|min-font)[^=]*="[^"]*"/g, '')
    // 移除React和Next.js相关属性
    .replace(/\s*data-react[^=]*="[^"]*"/g, '')
    .replace(/\s*on[a-z]+="[^"]*"/g, '')
    // 移除脚本和无用标签
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<div[^>]*id="__next"[^>]*>[\s\S]*?<\/div>/gi, '')
    // 移除localStorage相关引用
    .replace(/localStorage[^;]*;?/gi, '')
    .replace(/window\.localStorage[^;]*;?/gi, '')
    .replace(/window\.(characterList|sheetData|focusedCards|characterData)\s*=[\s\S]*?[;}]/gi, '')
    // 移除React相关代码
    .replace(/useState\([^)]*\)/gi, '')
    .replace(/useEffect\([^)]*\)/gi, '')
    .replace(/<!--[\s\S]*?localStorage[\s\S]*?-->/gi, '')
    // 清理空白
    .replace(/\s*class=""\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
}

/**
 * 转换按钮为输入框
 */
function transformSelectButtons(html: string): string {
  return html.replace(
    /<button([^>]*?)>([^<]*?(?:选择武器|选择护甲|选择职业|选择子职业|选择血统|选择社群)[^<]*?)<\/button>/g,
    (match, attributes, content) => {
      const classMatch = attributes.match(/class="([^"]*?)"/);
      const classStr = classMatch ? classMatch[1] : '';
      const isPlaceholder = /^选择(武器|护甲|职业|子职业|血统|社群)$/.test(content.trim());
      const value = isPlaceholder ? '' : content.trim();
      const placeholder = content.trim();
      return `<input type="text" value="${value}" placeholder="${placeholder}" class="${classStr} converted-from-button" />`;
    }
  );
}

/**
 * 启用表单元素
 */
function enableFormElements(html: string): string {
  return html
    // 启用checkbox
    .replace(
      /<input([^>]*?)type=["']checkbox["']([^>]*?)>/g,
      (match, before, after) => {
        const attributes = (before + after).replace(/\s*disabled\s*=?\s*["']?[^"'\s]*["']?\s*/g, '');
        return `<input${attributes} type="checkbox">`;
      }
    )
    // 启用radio按钮
    .replace(
      /<input([^>]*?)type=["']radio["']([^>]*?)>/g,
      (match, before, after) => {
        const attributes = (before + after).replace(/\s*disabled\s*=?\s*["']?\s*/g, '');
        return `<input${attributes} type="radio">`;
      }
    );
}

/**
 * 添加自定义checkbox交互
 */
function addCustomCheckboxInteraction(html: string): string {
  let transformed = html;

  // 标准checkbox (w-3 h-3)
  transformed = transformed.replace(
    /<div([^>]*?w-3\s+h-3[^>]*?cursor-pointer[^>]*?)>([^<]*?)<\/div>/g,
    (match, attributes, content) => {
      const divId = `checkbox_${Math.random().toString(36).substr(2, 9)}`;
      return `<div id="${divId}" ${attributes} onclick="toggleCustomCheckbox('${divId}')">${content}</div>`;
    }
  );

  // 训练选项checkbox (w-[1em] h-[1em])
  transformed = transformed.replace(
    /<span([^>]*?w-\[1em\]\s+h-\[1em\][^>]*?cursor-pointer[^>]*?)>/g,
    (match, attributes) => {
      const spanId = `checkbox_${Math.random().toString(36).substr(2, 9)}`;
      return `<span id="${spanId}" ${attributes} onclick="toggleCustomCheckbox('${spanId}')">`;
    }
  );

  // 通用checkbox (带背景色切换的元素)
  transformed = transformed.replace(
    /<(div|span)([^>]*?cursor-pointer[^>]*?)>([^<]*?)<\/\1>/g,
    (match, tagName, attributes, content) => {
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
 * 添加希望点交互
 */
function addHopePointInteraction(html: string): string {
  let transformed = html;

  // 匹配希望点容器
  const hopePatterns = [
    /<div([^>]*?key="hope-\d+"[^>]*?className="relative"[^>]*?)>/g,
    /<div([^>]*?className="relative"[^>]*?key="hope-\d+"[^>]*?)>/g
  ];

  hopePatterns.forEach(pattern => {
    transformed = transformed.replace(pattern, (match, attributes) => {
      const divId = `hope_${Math.random().toString(36).substr(2, 9)}`;
      const cleanedAttributes = attributes.replace(/onClick[^=]*?(?:handleCheckboxChange\([^)]*\)[^"]*?"|[^"]*?")/g, '');
      return `<div id="${divId}" ${cleanedAttributes} onclick="toggleHopePoint('${divId}')">`;
    });
  });

  // 通用希望点处理
  transformed = transformed.replace(
    /<div([^>]*?)>\s*<div[^>]*?w-5[^>]*?h-5[^>]*?border-2[^>]*?border-gray-800[^>]*?transform[^>]*?rotate-45[^>]*?>/g,
    (match, attributes) => {
      if (!attributes.includes('onclick') && !attributes.includes('id=')) {
        const divId = `hope_${Math.random().toString(36).substr(2, 9)}`;
        const cleanedAttributes = attributes.replace(/onClick[^=]*="[^"]*"/g, '');
        return match.replace(`<div${attributes}>`, `<div id="${divId}" ${cleanedAttributes} onclick="toggleHopePoint('${divId}')">`);
      }
      return match;
    }
  );

  return transformed;
}

/**
 * 转换HTML内容以支持独立使用
 */
function transformHTMLContent(htmlContent: string): string {
  let transformed = htmlContent;

  // 按步骤转换
  transformed = transformSelectButtons(transformed);
  transformed = enableFormElements(transformed);
  transformed = addCustomCheckboxInteraction(transformed);
  transformed = addHopePointInteraction(transformed);

  // 最后清理React onClick属性
  transformed = transformed.replace(/onClick[^=]*="[^"]*"/g, '');

  return transformed;
}

/**
 * Canvas资源管理器
 */
class CanvasManager {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  create(): HTMLCanvasElement {
    this.cleanup()
    
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    
    if (!this.ctx) {
      throw new Error('无法创建Canvas上下文')
    }
    
    return this.canvas
  }

  drawImage(img: HTMLImageElement): string {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas未初始化')
    }

    // 设置canvas尺寸
    this.canvas.width = img.naturalWidth
    this.canvas.height = img.naturalHeight
    
    // 清空canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // 绘制图片
    this.ctx.drawImage(img, 0, 0)
    
    // 转换为Base64
    let dataURL: string
    try {
      dataURL = this.canvas.toDataURL('image/webp', 0.8)
      // 检查是否真的支持WebP
      if (!dataURL.startsWith('data:image/webp')) {
        dataURL = this.canvas.toDataURL('image/png', 0.8)
      }
    } catch (e) {
      dataURL = this.canvas.toDataURL('image/png', 0.8)
    }
    
    return dataURL
  }

  cleanup(): void {
    if (this.canvas) {
      // 清空canvas内容释放内存
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      }
      
      // 重置尺寸为1x1以释放GPU内存
      this.canvas.width = 1
      this.canvas.height = 1
    }
    
    this.canvas = null
    this.ctx = null
  }
}

/**
 * 将图片转换为Base64（优化版）
 */
function imageToBase64(img: HTMLImageElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvasManager = new CanvasManager()
    
    try {
      canvasManager.create()
      const dataURL = canvasManager.drawImage(img)
      resolve(dataURL)
    } catch (error) {
      reject(error)
    } finally {
      // 确保Canvas资源被清理
      canvasManager.cleanup()
    }
  })
}

/**
 * 进度回调接口
 */
interface ProgressCallback {
  (current: number, total: number, message: string): void
}

/**
 * 导出状态管理
 */
class ExportStateManager {
  private static instance: ExportStateManager
  private isExporting: boolean = false
  private currentProgressModal: UnifiedProgressModalManager | null = null
  private exportTimeout: NodeJS.Timeout | null = null

  static getInstance(): ExportStateManager {
    if (!ExportStateManager.instance) {
      ExportStateManager.instance = new ExportStateManager()
    }
    return ExportStateManager.instance
  }

  startExport(): boolean {
    if (this.isExporting) {
      console.warn('[导出状态] 导出正在进行中，忽略重复请求')
      return false
    }
    this.isExporting = true
    console.log('[导出状态] 开始导出')
    return true
  }

  finishExport(): void {
    this.isExporting = false
    this.clearTimeout()
    this.closeProgressModal()
    
    // 强制垃圾回收（如果可能）以防止内存泄漏
    if (window.gc && performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024) // MB
      if (memoryUsage > 500) { // 如果内存使用超过500MB
        console.log('[导出状态] 内存使用较高，尝试垃圾回收')
        window.gc()
      }
    }
    
    console.log('[导出状态] 导出完成')
  }

  setProgressModal(modal: UnifiedProgressModalManager): void {
    this.currentProgressModal = modal
  }

  closeProgressModal(): void {
    if (this.currentProgressModal) {
      try {
        this.currentProgressModal.close()
      } catch (error) {
        console.warn('[导出状态] 关闭进度条时出错:', error)
      }
      this.currentProgressModal = null
    }
  }

  setTimeout(callback: () => void, delay: number): void {
    this.clearTimeout()
    this.exportTimeout = setTimeout(() => {
      console.warn('[导出状态] 导出超时')
      this.finishExport()
      callback()
    }, delay)
  }

  clearTimeout(): void {
    if (this.exportTimeout) {
      clearTimeout(this.exportTimeout)
      this.exportTimeout = null
    }
  }

  isCurrentlyExporting(): boolean {
    return this.isExporting
  }
}

const exportStateManager = ExportStateManager.getInstance()


/**
 * 收集并转换所有图片为Base64
 */
async function convertImagesToBase64(onProgress?: ProgressCallback): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()
  const images = Array.from(document.querySelectorAll('.print-all-pages img')) as HTMLImageElement[]
  
  console.log(`[HTML导出] 开始转换 ${images.length} 张图片为Base64...`)
  onProgress?.(0, images.length, '开始转换图片...')
  
  let processed = 0
  for (const img of images) {
    try {
      // 简单的内存检查
      if (performance.memory && performance.memory.usedJSHeapSize > 1.5 * 1024 * 1024 * 1024) { // 1.5GB
        console.warn('[HTML导出] 内存使用过高，强制垃圾回收')
        // 触发垃圾回收（如果可能）
        if (window.gc) {
          window.gc()
        }
      }

      if (img.complete && img.naturalWidth > 0 && img.src) {
        const fileName = img.src.split('/').pop() || '未知图片'
        onProgress?.(processed, images.length, `正在转换: ${fileName}`)
        
        const base64 = await imageToBase64(img)
        imageMap.set(img.src, base64)
        processed++
        
        console.log(`[HTML导出] 已转换图片 ${processed}/${images.length}: ${fileName}`)
        onProgress?.(processed, images.length, `已完成: ${fileName}`)
        
        // 短暂延迟让用户看到进度更新，同时让浏览器有机会进行垃圾回收
        await new Promise(resolve => setTimeout(resolve, 50))
      } else {
        console.warn(`[HTML导出] 跳过未加载的图片: ${img.src}`)
        processed++
        onProgress?.(processed, images.length, `跳过未加载的图片`)
      }
    } catch (error) {
      console.error(`[HTML导出] 转换图片失败: ${img.src}`, error)
      processed++
      onProgress?.(processed, images.length, `转换失败: ${img.src.split('/').pop()}`)
      
      // 如果是内存相关错误，建议用户刷新页面
      if (error instanceof Error && error.message.includes('memory')) {
        console.error('[HTML导出] 检测到内存相关错误，建议刷新页面后重试')
        throw new Error('内存不足，请刷新页面后重试')
      }
    }
  }
  
  console.log(`[HTML导出] 图片转换完成，成功转换 ${imageMap.size}/${images.length} 张图片`)
  onProgress?.(images.length, images.length, '图片转换完成')
  return imageMap
}

/**
 * 等待所有图片加载完成
 */
function waitForImagesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    console.log('[HTML导出] 等待图片加载完成...')
    
    let checkCount = 0
    const maxChecks = 100 // 最多等待10秒 (100 * 100ms)
    
    const checkPrintContext = () => {
      checkCount++
      
      const printContextElement = document.querySelector('[data-print-context]')
      if (printContextElement) {
        const allImagesLoaded = printContextElement.getAttribute('data-all-images-loaded') === 'true'
        if (allImagesLoaded) {
          console.log('[HTML导出] 所有图片已加载完成')
          resolve()
          return
        }
      }
      
      // 如果没有打印上下文，检查所有图片是否自然加载完成
      const images = Array.from(document.querySelectorAll('.print-all-pages img'))
      if (images.length === 0) {
        console.log('[HTML导出] 没有找到图片，继续导出')
        resolve()
        return
      }
      
      const loadedImages = images.filter(img => {
        const image = img as HTMLImageElement
        return image.complete && image.naturalWidth > 0
      })
      
      console.log(`[HTML导出] 图片加载进度: ${loadedImages.length}/${images.length}`)
      
      if (loadedImages.length === images.length) {
        console.log('[HTML导出] 所有图片已加载完成')
        resolve()
      } else if (checkCount >= maxChecks) {
        console.warn('[HTML导出] 等待图片加载超时，继续导出')
        resolve()
      } else {
        setTimeout(checkPrintContext, 100)
      }
    }
    
    checkPrintContext()
  })
}

/**
 * 替换HTML中的图片为Base64
 */
function replaceImagesWithBase64(html: string, imageMap: Map<string, string>): string {
  let updatedHTML = html
  let replacedCount = 0
  
  // 替换所有img标签的src属性
  imageMap.forEach((base64Data, originalSrc) => {
    // 使用字符串替换而不是正则表达式，避免"Regular expression too large"错误
    const variants = [
      `src="${originalSrc}"`,
      `src='${originalSrc}'`,
    ]
    
    // 尝试相对路径版本
    try {
      const urlPath = new URL(originalSrc, window.location.href).pathname
      if (urlPath !== originalSrc) {
        variants.push(`src="${urlPath}"`, `src='${urlPath}'`)
      }
    } catch (error) {
      // 静默处理URL解析错误
    }
    
    // 尝试只匹配文件名
    const fileName = originalSrc.split('/').pop()
    if (fileName) {
      // 使用indexOf来查找包含文件名的src属性
      let searchIndex = 0
      while (searchIndex < updatedHTML.length) {
        const srcIndex = updatedHTML.indexOf(`src=`, searchIndex)
        if (srcIndex === -1) break
        
        const quoteIndex = srcIndex + 4
        const quote = updatedHTML.charAt(quoteIndex)
        if (quote === '"' || quote === "'") {
          const endQuoteIndex = updatedHTML.indexOf(quote, quoteIndex + 1)
          if (endQuoteIndex !== -1) {
            const srcValue = updatedHTML.substring(quoteIndex + 1, endQuoteIndex)
            if (srcValue.endsWith('/' + fileName)) {
              updatedHTML = updatedHTML.substring(0, quoteIndex + 1) + 
                          base64Data + 
                          updatedHTML.substring(endQuoteIndex)
              replacedCount++
              searchIndex = quoteIndex + base64Data.length + 1
              continue
            }
          }
        }
        searchIndex = srcIndex + 4
      }
    }
    
    // 使用简单的字符串替换
    variants.forEach(variant => {
      const replacement = `src="${base64Data}"`
      if (updatedHTML.includes(variant)) {
        updatedHTML = updatedHTML.replace(variant, replacement)
        replacedCount++
      }
    })
  })
  
  // 记录替换结果
  console.log(`[HTML导出] 图片替换完成，共替换 ${replacedCount} 次`)
  
  return updatedHTML
}

/**
 * 从打印预览页面提取HTML内容
 */
function extractPrintPreviewHTML(onProgress?: ProgressCallback): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const printContainer = document.querySelector('.print-all-pages')
      if (!printContainer) {
        throw new Error('未找到打印预览容器，请先进入打印预览模式')
      }

      // 等待所有图片加载完成
      await waitForImagesLoaded()

      // 转换所有图片为Base64
      const imageMap = await convertImagesToBase64(onProgress)

      // 克隆容器以避免影响原页面
      const clonedContainer = printContainer.cloneNode(true) as HTMLElement

      // 清理不需要的元素
      const elementsToRemove = [
        '.fixed.top-4.left-4', // 控制按钮
        'script', // 脚本标签
        '[style*="display: none"]', '.hidden', // 隐藏元素
        '[data-reactroot]', '[data-react-helmet]', // React元素
        '#__next', '#__NEXT_DATA__', // Next.js元素
        'noscript' // noscript标签
      ]

      elementsToRemove.forEach(selector => {
        clonedContainer.querySelectorAll(selector).forEach(elem => elem.remove())
      })

      // 启用表单元素
      const allInputs = clonedContainer.querySelectorAll('input, textarea')
      allInputs.forEach(input => {
        const type = input.getAttribute('type')
        if (type === 'text' || type === 'number' || input.tagName === 'TEXTAREA') {
          input.removeAttribute('readonly')
        }
        if (type === 'checkbox' || type === 'radio') {
          input.removeAttribute('disabled')
        }
      })

      // 处理按钮
      const allButtons = clonedContainer.querySelectorAll('button')
      allButtons.forEach(btn => {
        btn.removeAttribute('onclick')
        const buttonText = btn.textContent?.trim() || ''
        if (!/选择(武器|护甲|职业|子职业|血统|社群)/.test(buttonText)) {
          btn.removeAttribute('disabled')
        }
      })

      // 处理cost内容替换 - 将动态cost内容替换为静态内容
      const costContainers = clonedContainer.querySelectorAll('.export-cost-container')
      costContainers.forEach(container => {
        const staticContent = container.getAttribute('data-static-cost')
        if (staticContent) {
          container.innerHTML = staticContent
          console.log(`[HTML导出] 替换cost内容: ${staticContent}`)
        }
      })

      // 转换HTML内容
      let extractedHTML = cleanupExtractedHTML(clonedContainer.outerHTML)
      extractedHTML = transformHTMLContent(extractedHTML)
      
      // 替换图片为Base64
      extractedHTML = replaceImagesWithBase64(extractedHTML, imageMap)

      resolve(extractedHTML)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 生成完整的HTML文档
 */
async function generateFullHTML(formData: SheetData, options: HTMLExportOptions = {}, onProgress?: ProgressCallback): Promise<string> {
  try {
    const title = await generateDocumentTitle(formData)
    const extractedHTML = await extractPrintPreviewHTML(onProgress)
    const styles = options.includeStyles !== false ? extractPageStyles() : ''

    const html = `<!DOCTYPE html>
<html lang="zh-CN" data-version="1.0" data-exporter="daggerheart-character-sheet">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Daggerheart Character Sheet Exporter v1.0">
  <meta name="description" content="纯净的角色卡导出版本，仅包含当前角色数据">
  <title>${title}</title>
  <style>
    ${generateInlineCSS(styles)}
  </style>
</head>
<body>
  ${extractedHTML}
  
  <script>
    ${generateStorageDisableScript()}
    ${generateCheckboxScript()}
    ${generateInitScript(formData)}
  </script>
  
  <div class="no-print" style="position: fixed; bottom: 10px; left: 10px; font-size: 12px; color: #999; pointer-events: auto; z-index: 1000; line-height: 1.4;">
    <div>页面生成自 <a href="https://ridrisr.github.io/DaggerHeart-CharacterSheet" target="_blank" style="color: #007cba; text-decoration: underline;">https://ridrisr.github.io/DaggerHeart-CharacterSheet</a></div>
    <div>仅用于展示和分享，没有任何数据绑定，所有修改都不会被保存</div>
  </div>
</body>
</html>`

    return options.compressHTML ? compressHTML(html) : html
  } catch (error) {
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
  return `${title}.html`
}

/**
 * 导出为HTML文件
 */
export async function exportToHTML(formData: SheetData, options: HTMLExportOptions = {}): Promise<void> {
  // 检查是否已有导出在进行
  if (!exportStateManager.startExport()) {
    alert('导出正在进行中，请稍候...')
    return
  }

  let progressModal: UnifiedProgressModalManager | null = null
  
  try {
    if (!document.querySelector('.print-all-pages')) {
      throw new Error('请先进入打印预览模式再导出HTML。点击"打印预览"按钮后重试。')
    }

    // 简单的内存检查
    if (performance.memory && performance.memory.usedJSHeapSize > 1024 * 1024 * 1024) { // 1GB
      console.warn('[HTML导出] 当前内存使用较高，可能影响导出性能')
    }

    // 先检查有多少图片需要转换
    const images = Array.from(document.querySelectorAll('.print-all-pages img')) as HTMLImageElement[]
    const imageCount = images.length
    
    console.log(`[HTML导出] 准备转换 ${imageCount} 张图片`)
    
    // 创建统一进度条并初始化
    progressModal = new UnifiedProgressModalManager()
    exportStateManager.setProgressModal(progressModal)
    
    progressModal.showProgress('正在导出HTML文件', 0, imageCount, '正在准备导出...')
    
    // 设置超时机制（5分钟）
    exportStateManager.setTimeout(() => {
      throw new Error('导出超时，请重试')
    }, 5 * 60 * 1000)
    
    // 等待一下让进度条显示
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const html = await generateFullHTML(formData, options, (current, total, message) => {
      if (progressModal) {
        progressModal.updateProgress(current, total, message)
      }
    })
    const filename = await generateFileName(formData, options)
    
    if (progressModal) {
      progressModal.updateProgress(imageCount, imageCount, '正在生成文件...')
    }
    
    // 短暂延迟让用户看到100%完成
    await new Promise(resolve => setTimeout(resolve, 500))

    // 检查文件大小并给出警告
    const fileSizeBytes = new Blob([html]).size
    const fileSizeMB = Math.round(fileSizeBytes / 1024 / 1024 * 100) / 100
    
    console.log(`[HTML导出] 生成的HTML文件大小: ${fileSizeMB}MB`)
    
    if (fileSizeMB > 10) {
      // 暂时关闭进度条显示警告
      exportStateManager.closeProgressModal()
      
      const shouldContinue = confirm(
        `警告：生成的HTML文件大小为 ${fileSizeMB}MB，可能过大。\n\n` +
        '这主要是由于内嵌了大量图片。文件过大可能导致：\n' +
        '• 下载时间较长\n' +
        '• 浏览器打开缓慢\n' +
        '• 某些设备无法正常加载\n\n' +
        '是否继续导出？'
      )
      
      if (!shouldContinue) {
        console.log('[HTML导出] 用户取消导出')
        return
      }
    }

    // 创建并触发下载
    let blobUrl: string | null = null
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = blobUrl
      link.download = filename
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log(`[HTML导出] 导出完成: ${filename} (${fileSizeMB}MB)`)
    } finally {
      // 确保Blob URL被释放
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
    
  } catch (error) {
    console.error('[HTML导出] 导出过程中出错:', error)
    const errorMessage = `HTML导出失败: ${error instanceof Error ? error.message : '未知错误'}`
    throw new Error(errorMessage)
  } finally {
    // 确保所有资源都被清理
    exportStateManager.finishExport()
  }
}

/**
 * 预览HTML内容
 */
export async function previewHTML(formData: SheetData, options: HTMLExportOptions = {}): Promise<void> {
  try {
    if (!document.querySelector('.print-all-pages')) {
      throw new Error('请先进入打印预览模式再预览HTML。点击"打印预览"按钮后重试。')
    }

    const html = await generateFullHTML(formData, options)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const previewWindow = window.open(url, '_blank', 'width=1200,height=800')
    if (!previewWindow) {
      throw new Error('无法打开预览窗口，请检查浏览器的弹窗拦截设置')
    }

    // 清理URL对象
    const checkClosed = setInterval(() => {
      if (previewWindow.closed) {
        URL.revokeObjectURL(url)
        clearInterval(checkClosed)
      }
    }, 1000)
  } catch (error) {
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

/**
 * 生成内联CSS样式
 */
function generateInlineCSS(extractedStyles: string): string {
  return `
    /* 重置样式 */
    * { box-sizing: border-box; }
    
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
    .print-all-pages .page-four,
    .print-all-pages .page-adventure-notes {
      display: block;
      padding: 0;
      min-height: auto;
    }
    
    /* 提取的原始样式 */
    ${extractedStyles}

    /* 补充缺失的CSS规则 */
    .grid-cols-10 {
      grid-template-columns: repeat(10, minmax(0, 1fr));
    }
    .grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .grid-cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .grid-cols-\\[auto_1fr\\] {
      grid-template-columns: auto 1fr;
    }
    .col-span-3 {
      grid-column: span 3 / span 3;
    }
    .col-span-4 {
      grid-column: span 4 / span 4;
    }
    .gap-x-4 {
      column-gap: 1rem;
    }
    .gap-x-2 {
      column-gap: 0.5rem;
    }
    .gap-y-2 {
      row-gap: 0.5rem;
    }
    .gap-y-3 {
      row-gap: 0.75rem;
    }

    /* 字体大小自动调整 */
    .auto-resize-font,
    input[data-min-font],
    textarea[data-min-font],
    [style*="--print-font-size"] {
      font-size: var(--print-font-size, 14px) !important;
    }

    /* 转换后元素样式 */
    .converted-from-button {
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

    /* 表单元素样式 */
    input[type="checkbox"], input[type="radio"] {
      cursor: pointer;
      pointer-events: auto;
      width: 18px;
      height: 18px;
      accent-color: #333;
    }

    /* 打印样式 */
    @media print {
      input, textarea, button, select {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .converted-from-button {
        border: 1px solid #333 !important;
        background: white !important;
      }

      .auto-resize-font,
      input[data-min-font],
      textarea[data-min-font] {
        font-size: var(--print-font-size, 14px) !important;
      }

      .card-description {
        font-size: 7.5pt !important;
      }

      .print-all-pages .page-one,
      .print-all-pages .page-two,
      .print-all-pages .page-three,
      .print-all-pages .page-four,
      .print-all-pages .page-five,
      .print-all-pages .page-adventure-notes {
        display: block;
        padding: 0;
        min-height: auto;
      }

      .a4-page {
        width: 210mm;
      }

      .no-print { display: none !important; }

      body { margin: 0; padding: 0; }

      @page {
        size: A4;
        margin: 5mm 5mm 2mm 5mm;
        scale: 0.9;
      }
    }

    /* 隐藏不需要的元素 */
    .fixed,
    .print\\:hidden {
      display: none !important;
    }
  `
}

/**
 * 生成checkbox交互脚本
 */
function generateCheckboxScript(): string {
  return `
    function toggleCustomCheckbox(elementId) {
      const element = document.getElementById(elementId);
      if (!element) return;
      
      const className = element.className;
      
      if (className.includes('bg-gray-800')) {
        element.className = className.replace('bg-gray-800', 'bg-white');
        element.setAttribute('aria-checked', 'false');
        element.setAttribute('aria-pressed', 'false');
      } else if (className.includes('bg-white')) {
        element.className = className.replace('bg-white', 'bg-gray-800');
        element.setAttribute('aria-checked', 'true');
        element.setAttribute('aria-pressed', 'true');
      } else if (className.includes('border-gray-800') || className.includes('border-2')) {
        element.className = className + ' bg-gray-800';
        element.setAttribute('aria-checked', 'true');
        element.setAttribute('aria-pressed', 'true');
      }

      // 视觉反馈
      element.style.transition = 'all 0.1s ease';
      element.style.transform = 'scale(0.95)';
      setTimeout(() => { element.style.transform = 'scale(1)'; }, 100);
    }

    function toggleHopePoint(elementId) {
      const container = document.getElementById(elementId);
      if (!container) return;

      const innerDiamond = container.querySelector('.absolute');

      if (innerDiamond) {
        innerDiamond.remove();
      } else {
        const outerDiamond = container.querySelector('.w-5');
        if (outerDiamond) {
          const innerContainer = document.createElement('div');
          innerContainer.className = 'absolute inset-0 flex items-center justify-center';

          const innerDiamond = document.createElement('div');
          innerDiamond.className = 'w-3 h-3 bg-gray-800 transform rotate-45';

          innerContainer.appendChild(innerDiamond);
          container.appendChild(innerContainer);
        }
      }

      // 视觉反馈
      container.style.transition = 'all 0.1s ease';
      container.style.transform = 'scale(0.95)';
      setTimeout(() => { container.style.transform = 'scale(1)'; }, 100);
    }
  `
}

/**
 * 生成存储禁用脚本
 */
function generateStorageDisableScript(): string {
  return `
    (function() {
      if (typeof Storage !== 'undefined') {
        try {
          Object.defineProperty(window, 'localStorage', {
            value: {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
              clear: () => {},
              key: () => null,
              length: 0
            },
            writable: false,
            configurable: false
          });
          Object.defineProperty(window, 'sessionStorage', {
            value: {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
              clear: () => {},
              key: () => null,
              length: 0
            },
            writable: false,
            configurable: false
          });
        } catch (e) {
          console.log('Storage已禁用');
        }
      }
    })();
  `
}

/**
 * 生成初始化脚本
 */
function generateInitScript(formData: SheetData): string {
  return `
    window.characterData = ${JSON.stringify(formData, null, 2)};
    
    function printCharacterSheet() {
      window.print();
    }
    
    document.addEventListener('DOMContentLoaded', function() {
      // 确保checkbox有正确的cursor样式
      document.querySelectorAll('[onclick*="toggleCustomCheckbox"], [onclick*="toggleHopePoint"]')
        .forEach(elem => {
          if (!elem.style.cursor) elem.style.cursor = 'pointer';
        });
      
      // 添加打印按钮
      const buttonGroup = document.createElement('div');
      buttonGroup.style.cssText = 'position: fixed; top: 15px; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden;';
      buttonGroup.className = 'no-print';
      
      const printButton = document.createElement('button');
      printButton.textContent = '导出PDF';
      printButton.style.cssText = 'padding: 12px 20px; background: #007cba; color: white; border: none; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s ease;';
      printButton.onmouseover = function() { this.style.backgroundColor = '#005a8b'; };
      printButton.onmouseout = function() { this.style.backgroundColor = '#007cba'; };
      printButton.onclick = printCharacterSheet;
      
      const hideButton = document.createElement('button');
      hideButton.textContent = '×';
      hideButton.style.cssText = 'padding: 12px 10px; background: #f8f9fa; color: #6c757d; border: none; border-left: 1px solid #dee2e6; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.2s ease;';
      hideButton.title = '隐藏按钮';
      hideButton.onmouseover = function() { this.style.backgroundColor = '#e9ecef'; this.style.color = '#495057'; };
      hideButton.onmouseout = function() { this.style.backgroundColor = '#f8f9fa'; this.style.color = '#6c757d'; };
      hideButton.onclick = function() {
        buttonGroup.style.opacity = '0';
        buttonGroup.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => { buttonGroup.style.display = 'none'; }, 200);
      };
      
      buttonGroup.appendChild(printButton);
      buttonGroup.appendChild(hideButton);
      document.body.appendChild(buttonGroup);
    });
  `
}
