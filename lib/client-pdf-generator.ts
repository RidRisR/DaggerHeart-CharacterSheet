import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export interface PDFGenerationOptions {
    quality: 'vector' | 'raster-hd' | 'raster-standard'
    dpi: number
    scale: number
}

export async function generateHighQualityPDF(options: PDFGenerationOptions): Promise<void> {
    // 添加PDF导出专用样式类
    document.body.classList.add('pdf-exporting')

    try {
        // 简短等待确保样式应用
        await new Promise(resolve => setTimeout(resolve, 50))

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

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: options.quality !== 'raster-hd' // 高清模式不压缩
        })

        for (let i = 0; i < printElements.length; i++) {
            if (i > 0) pdf.addPage()

            const element = printElements[i] as HTMLElement

            if (options.quality === 'vector') {
                // 尝试保持矢量特性（实验性）
                await renderVectorContent(pdf, element, options)
            } else {
                // 高清栅格化
                await renderRasterContent(pdf, element, options)
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
    options: PDFGenerationOptions
): Promise<void> {
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
        foreignObjectRendering: true, // 更好的文本渲染
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
            // 确保克隆文档的body也有pdf-exporting类
            clonedDoc.body.classList.add('pdf-exporting')
            
            // 直接移除所有输入框的placeholder属性 - 最直接的方法
            clonedDoc.querySelectorAll('input, textarea').forEach((element) => {
                const input = element as HTMLInputElement | HTMLTextAreaElement
                if (input.hasAttribute('placeholder')) {
                    input.removeAttribute('placeholder')
                }
                // 对于数字输入框，如果没有值就设为透明
                if (input.type === 'number' && !input.value.trim()) {
                    (input as HTMLElement).style.color = 'transparent'
                }
            })
            
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
            })
        }
    } catch (error) {
        console.warn('Vector rendering failed, falling back to raster:', error)
        await renderRasterContent(pdf, element, {
            quality: 'raster-hd',
            dpi: 300,
            scale: 2
        })
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
