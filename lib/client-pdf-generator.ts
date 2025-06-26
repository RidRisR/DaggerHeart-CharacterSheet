import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export interface PDFGenerationOptions {
    quality: 'vector' | 'raster-hd' | 'raster-standard'
    dpi: number
    scale: number
}

export async function generateHighQualityPDF(options: PDFGenerationOptions): Promise<void> {
    // 检测是否为移动设备
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768 ||
        'ontouchstart' in window

    // 添加PDF导出专用样式类
    document.body.classList.add('pdf-exporting')

    try {
        // 移动端需要稍长的等待时间确保样式应用
        await new Promise(resolve => setTimeout(resolve, isMobile ? 100 : 50))

        // 动态导入以减少打包体积
        const [
            { default: html2canvas },
            { default: jsPDF }
        ] = await Promise.all([
            import('html2canvas'),
            import('jspdf')
        ])

        // 类型声明
        type Html2Canvas = typeof html2canvas
        type JsPDF = InstanceType<typeof jsPDF>

        const printElements = document.querySelectorAll('.a4-page')
        if (printElements.length === 0) {
            throw new Error('No printable content found')
        }

        // 预处理：一次性移除所有placeholder，避免在每个onclone中重复处理
        const originalPlaceholders = new Map<Element, string>()
        if (!isMobile) {
            document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(element => {
                const input = element as HTMLInputElement | HTMLTextAreaElement
                originalPlaceholders.set(element, input.placeholder)
                input.removeAttribute('placeholder')
            })
        }

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: options.quality !== 'raster-hd' // 高清模式不压缩
        })

        try {
            if (isMobile || printElements.length === 1) {
                // 移动端或单页：串行处理
                for (let i = 0; i < printElements.length; i++) {
                    if (i > 0) pdf.addPage()
                    const element = printElements[i] as HTMLElement

                    if (isMobile && printElements.length > 1) {
                        console.log(`处理第 ${i + 1}/${printElements.length} 页...`)
                    }

                    await processElement(pdf, element, options, isMobile)

                    if (isMobile && i < printElements.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 10))
                    }
                }
            } else {
                // 桌面端多页：并行生成Canvas，串行添加到PDF
                console.log(`桌面端并行处理 ${printElements.length} 页...`)
                
                const canvasPromises = Array.from(printElements).map((element, index) => 
                    generateCanvasForElement(element as HTMLElement, options, index)
                )
                
                const canvases = await Promise.all(canvasPromises)
                
                // 串行添加到PDF以保证页面顺序
                canvases.forEach((canvas: HTMLCanvasElement, i: number) => {
                    if (i > 0) pdf.addPage()
                    addCanvasToPDF(pdf, canvas, options)
                    // 立即清理canvas
                    canvas.width = 0
                    canvas.height = 0
                })
            }
        } finally {
            // 恢复placeholder
            if (!isMobile) {
                originalPlaceholders.forEach((placeholder, element) => {
                    (element as HTMLInputElement | HTMLTextAreaElement).placeholder = placeholder
                })
            }
        }

        // 生成有意义的文件名
        const fileName = generatePrintableName()
        pdf.save(fileName)
    } finally {
        // 无论成功或失败，都要移除PDF导出样式类
        document.body.classList.remove('pdf-exporting')
    }
}

async function renderRasterContent(
    pdf: jsPDF,
    element: HTMLElement,
    options: PDFGenerationOptions,
    isMobile: boolean = false
): Promise<void> {
    const canvas = await html2canvas(element, {
        scale: options.scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: isMobile ? 1000 : 0, // 移动端增加超时时间
        logging: false,
        width: 794,  // A4 @ 96DPI
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        foreignObjectRendering: true, // 保持高质量文本渲染
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
            // 确保克隆文档的body也有pdf-exporting类
            clonedDoc.body.classList.add('pdf-exporting')
            
            // 批量处理输入框，移动端减少DOM操作频率
            const inputs = clonedDoc.querySelectorAll('input, textarea')
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i] as HTMLInputElement | HTMLTextAreaElement
                if (input.hasAttribute('placeholder')) {
                    input.removeAttribute('placeholder')
                }
                // 对于数字输入框，如果没有值就设为透明
                if (input.type === 'number' && !input.value.trim()) {
                    (input as HTMLElement).style.color = 'transparent'
                }
            }
            
            // 添加PDF导出样式到克隆文档
            const style = clonedDoc.createElement('style')
            style.textContent = `
                .pdf-exporting input::placeholder,
                .pdf-exporting textarea::placeholder {
                    color: transparent !important;
                }
                
                .pdf-exporting input[type="number"] {
                    color: transparent !important;
                }
                
                .pdf-exporting .print-placeholder-cleared {
                    color: transparent !important;
                }
            `
            clonedDoc.head.appendChild(style)
        }
        // 移除了 pixelRatio 属性，因为它不在 html2canvas 的类型定义中
    })

    // 使用最高质量的图像格式
    const quality = options.quality === 'raster-hd' ? 1.0 : 0.92
    const format = options.quality === 'raster-hd' ? 'PNG' : 'JPEG'
    const imgData = canvas.toDataURL(`image/${format.toLowerCase()}`, quality)

    pdf.addImage(imgData, format, 0, 0, 210, 297, undefined, 'FAST')

    // 移动端立即清理canvas以释放内存
    if (isMobile) {
        canvas.width = 0
        canvas.height = 0
    }
}

async function renderVectorContent(
    pdf: jsPDF,
    element: HTMLElement,
    options: PDFGenerationOptions
): Promise<void> {
    // 矢量渲染（实验性功能）
    // 提取文本和基本图形，直接在PDF中渲染

    try {
        const textElements = element.querySelectorAll('input[type="text"], input[type="number"], textarea, span, div')
        textElements.forEach(el => {
            const rect = el.getBoundingClientRect()
            const text = (el as HTMLInputElement).value || el.textContent || ''
            if (text.trim()) {
                const x = (rect.left / 794) * 210
                const y = (rect.top / 1123) * 297
                pdf.text(text, x, y)
            }
        })

        // 对于复杂布局，回退到栅格化
        const complexElements = element.querySelectorAll('svg, canvas, .complex-layout, img')
        if (complexElements.length > 0) {
            console.log('Complex elements detected, falling back to raster rendering')
            await renderRasterContent(pdf, element, {
                quality: 'raster-hd',
                dpi: 300,
                scale: 2
            }, false) // 明确传递isMobile参数
        }
    } catch (error) {
        console.warn('Vector rendering failed, falling back to raster:', error)
        await renderRasterContent(pdf, element, {
            quality: 'raster-hd',
            dpi: 300,
            scale: 2
        }, false) // 明确传递isMobile参数
    }
}

function generatePrintableName(): string {
    // 从DOM或localStorage获取表单数据用于文件名生成
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
        console.warn('Error generating filename:', error)
    }

    // 默认文件名
    const timestamp = new Date().toISOString().slice(0, 10)
    return `DaggerHeart-角色卡-${timestamp}.pdf`
}

// 辅助函数：处理单个元素
async function processElement(
    pdf: jsPDF,
    element: HTMLElement,
    options: PDFGenerationOptions,
    isMobile: boolean
): Promise<void> {
    if (options.quality === 'vector') {
        await renderVectorContent(pdf, element, options)
    } else {
        await renderRasterContent(pdf, element, options, isMobile)
    }
}

// 辅助函数：为单个元素生成Canvas（用于并行处理）
async function generateCanvasForElement(
    element: HTMLElement,
    options: PDFGenerationOptions,
    index: number
): Promise<HTMLCanvasElement> {
    console.log(`开始处理第 ${index + 1} 页...`)
    
    // 重用已经导入的html2canvas
    const { default: html2canvas } = await import('html2canvas')
    
    return await html2canvas(element, {
        scale: options.scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 0,
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        foreignObjectRendering: true,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
            clonedDoc.body.classList.add('pdf-exporting')
            
            // 简化的onclone处理，因为placeholder已经预处理过了
            const inputs = clonedDoc.querySelectorAll('input[type="number"]')
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i] as HTMLInputElement
                if (!input.value.trim()) {
                    (input as HTMLElement).style.color = 'transparent'
                }
            }
        }
    })
}

// 辅助函数：将Canvas添加到PDF
function addCanvasToPDF(
    pdf: jsPDF,
    canvas: HTMLCanvasElement,
    options: PDFGenerationOptions
): void {
    const quality = options.quality === 'raster-hd' ? 1.0 : 0.92
    const format = options.quality === 'raster-hd' ? 'PNG' : 'JPEG'
    const imgData = canvas.toDataURL(`image/${format.toLowerCase()}`, quality)
    pdf.addImage(imgData, format, 0, 0, 210, 297, undefined, 'FAST')
}
