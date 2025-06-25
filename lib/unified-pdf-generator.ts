// 为每个页面创建独立的Canvas渲染上下文
async function createPageCanvas(
    pageElement: HTMLElement, 
    scale: number, 
    html2canvas: any
): Promise<HTMLCanvasElement> {
    // 创建一个独立的渲染容器
    const tempContainer = document.createElement('div')
    tempContainer.style.cssText = `
        position: absolute;
        top: -10000px;
        left: -10000px;
        width: 210mm;
        height: 297mm;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: -1;
        background: white;
        overflow: hidden;
    `

    // 克隆页面元素到临时容器
    const clonedElement = pageElement.cloneNode(true) as HTMLElement
    clonedElement.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        position: relative !important;
        top: 0 !important;
        left: 0 !important;
        transform: none !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
    `

    tempContainer.appendChild(clonedElement)
    document.body.appendChild(tempContainer)

    try {
        // 等待一个渲染周期，确保样式生效
        await new Promise(resolve => requestAnimationFrame(resolve))

        // 使用html2canvas捕获临时容器
        const canvas = await html2canvas(tempContainer, {
            scale: scale,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            width: Math.round(210 * 3.779527559), // 210mm转px (96DPI)
            height: Math.round(297 * 3.779527559), // 297mm转px (96DPI)
            scrollX: 0,
            scrollY: 0,
            windowWidth: Math.round(210 * 3.779527559),
            windowHeight: Math.round(297 * 3.779527559),
            logging: false
        })

        return canvas
    } finally {
        // 清理临时容器
        document.body.removeChild(tempContainer)
    }
}

// 智能等待函数 - 检测元素渲染完成
async function waitForElementReady(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
        let lastContentLength = 0
        let stableCount = 0
        const requiredStableCount = 3 // 需要连续3次检查都稳定

        const checkStability = () => {
            const currentContentLength = element.innerText.length + element.children.length

            if (currentContentLength === lastContentLength) {
                stableCount++
                if (stableCount >= requiredStableCount) {
                    resolve()
                    return
                }
            } else {
                stableCount = 0
                lastContentLength = currentContentLength
            }

            requestAnimationFrame(checkStability)
        }

        // 开始检查
        requestAnimationFrame(checkStability)

        // 最大等待时间500ms，避免无限等待
        setTimeout(resolve, 500)
    })
}

// 等待所有页面准备就绪
async function waitForPagesReady(elements: NodeListOf<Element>): Promise<void> {
    console.log('等待所有页面渲染完成...')

    // 等待一个渲染周期，确保React组件都已挂载
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => requestAnimationFrame(resolve))

    // 快速检查所有页面是否有基本内容
    const checks = Array.from(elements).map(async (element, index) => {
        const htmlElement = element as HTMLElement
        let attempts = 0
        const maxAttempts = 20 // 最多检查2秒 (20 * 100ms)

        while (attempts < maxAttempts) {
            if (htmlElement.children.length > 0 && htmlElement.innerText.length > 50) {
                console.log(`页面 ${index + 1} 内容准备就绪`)
                break
            }
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++
        }

        if (attempts >= maxAttempts) {
            console.warn(`页面 ${index + 1} 渲染可能不完整`)
        }
    })

    await Promise.all(checks)
    console.log('所有页面基本内容检查完成')
}

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

        // 查找可打印的页面元素，尝试多种选择器
        let printElements = document.querySelectorAll('.a4-page')

        // 如果没找到 .a4-page，尝试查找打印模式下的页面容器
        if (printElements.length === 0) {
            printElements = document.querySelectorAll('.page-one, .page-two, .page-three, .page-four')
        }

        // 如果还没找到，尝试查找任何包含角色卡内容的容器
        if (printElements.length === 0) {
            printElements = document.querySelectorAll('[class*="page-"]')
        }

        if (printElements.length === 0) {
            throw new Error('未找到可打印内容，请确保页面已完全加载')
        }

        console.log(`找到 ${printElements.length} 个可打印页面元素`)

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

        // 采用新的策略：为每个页面创建独立的渲染上下文
        for (let i = 0; i < printElements.length; i++) {
            if (i > 0) pdf.addPage()

            updateProgress(`正在处理第 ${i + 1}/${printElements.length} 页...`)
            
            const element = printElements[i] as HTMLElement
            console.log(`处理第 ${i + 1} 页，元素尺寸:`, element.offsetWidth, 'x', element.offsetHeight)
            console.log(`第 ${i + 1} 页内容预览:`, element.innerText.substring(0, 200) + '...')
            console.log(`第 ${i + 1} 页子元素数量:`, element.children.length)
            
            // 检查元素是否有内容
            if (element.offsetWidth === 0 || element.offsetHeight === 0) {
                console.warn(`第 ${i + 1} 页元素没有可见内容`)
            }

            // 创建独立的渲染容器，确保页面内容可见
            const canvas = await createPageCanvas(element, options.scale, html2canvas)
            
            console.log(`第 ${i + 1} 页Canvas尺寸: ${canvas.width} x ${canvas.height}`)

            const imgData = canvas.toDataURL('image/png', options.quality)
            console.log(`第 ${i + 1} 页图片数据长度: ${imgData.length}`)
            
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
