import { useCallback } from 'react'
import { getStandardCardById } from '@/card'
import { exportToHTML } from '@/lib/html-exporter'
import { exportCharacterData } from '@/lib/storage'
import type { SheetData } from '@/lib/sheet-data'

interface UseExportHandlersProps {
  formData: SheetData
  allImagesLoaded: boolean
  setIsPrintingAll: (value: boolean) => void
}

export function useExportHandlers({ 
  formData, 
  allImagesLoaded, 
  setIsPrintingAll 
}: UseExportHandlersProps) {

  // 等待图片加载完成和页面渲染的通用函数
  const waitForImagesLoaded = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      console.log('[ExportHandlers] 开始等待图片加载...')
      
      // 添加初始延迟，确保组件有时间注册图片
      setTimeout(() => {
        console.log('[ExportHandlers] 初始延迟结束，开始检查图片加载状态')
        
        if (allImagesLoaded) {
          // 图片已经加载完成，等待300ms让页面完全渲染
          console.log('[ExportHandlers] 图片已加载完成，等待渲染完成')
          setTimeout(resolve, 300)
          return
        }

        // 检查图片加载状态的间隔检查
        const startTime = Date.now()
        const checkInterval = setInterval(() => {
          const elapsedTime = Date.now() - startTime

          if (allImagesLoaded) {
            // 图片加载完成，等待300ms后resolve
            clearInterval(checkInterval)
            console.log('[ExportHandlers] 图片加载完成，等待最终渲染')
            setTimeout(resolve, 300)
          } else if (elapsedTime > 5000) {
            // 增加超时时间到5秒，给图片更多加载时间
            clearInterval(checkInterval)
            console.log('[ExportHandlers] 图片加载超时（5秒），继续执行操作')
            resolve()
          } else {
            // 每隔一段时间输出当前状态
            if (elapsedTime % 1000 < 100) {
              console.log(`[ExportHandlers] 等待图片加载中... (${Math.floor(elapsedTime/1000)}s)`)
            }
          }
        }, 100)
      }, 200) // 初始延迟200ms，给组件注册时间
    })
  }, [allImagesLoaded])

  // 打印所有页面
  const handlePrintAll = useCallback(async () => {
    const getCardClass = (cardId: string | undefined): string => {
      if (!cardId) return '()';
      try {
        const card = getStandardCardById(cardId);
        return card && card.class ? String(card.class) : '()';
      } catch (error) {
        console.error('Error getting card class:', error);
        return '()';
      }
    };

    const name = formData.name || '()';
    const level = formData.level || '()';

    // 同步获取所有卡片类名
    const ancestry1Class = getCardClass(formData.ancestry1Ref?.id);
    const professionClass = getCardClass(formData.professionRef?.id);
    const ancestry2Class = getCardClass(formData.ancestry2Ref?.id);
    const communityClass = getCardClass(formData.communityRef?.id);

    const title = `${name}-${professionClass}-${ancestry1Class}-${ancestry2Class}-${communityClass}-LV${level}`;
    console.log('[ExportHandlers] 设置页面标题:', title);
    document.title = title;
    setIsPrintingAll(true);
    
    // 等待React完成渲染，让打印组件有时间注册图片
    await new Promise(resolve => {
      // 使用 setTimeout 确保在下一个事件循环中执行
      setTimeout(resolve, 100);
    });
  }, [formData, setIsPrintingAll])

  // HTML导出功能
  const handleExportHTML = useCallback(async () => {
    try {
      console.log('[ExportHandlers] 开始HTML导出，正在等待图片加载并转换为Base64...')
      await exportToHTML(formData)
      console.log('[ExportHandlers] HTML导出完成')
    } catch (error) {
      console.error('[ExportHandlers] HTML导出失败:', error)
      alert('HTML导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }, [formData])

  // JSON导出功能
  const handleExportJSON = useCallback(() => {
    try {
      exportCharacterData(formData)
      console.log('[ExportHandlers] JSON导出完成')
    } catch (error) {
      console.error('[ExportHandlers] JSON导出失败:', error)
      alert('JSON导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }, [formData])

  // 快速导出功能 - 通过切换到预览页面实现
  const handleQuickExportPDF = useCallback(async () => {
    try {
      console.log('[ExportHandlers] 快速PDF导出 - 进入预览页面')
      // 设置标题并切换到预览模式
      await handlePrintAll()
      // 等待图片加载完成后自动触发打印
      await waitForImagesLoaded()
      
      // 额外的安全检查：确保所有图片元素都已经在DOM中
      console.log('[ExportHandlers] 进行最终的DOM检查...')
      await new Promise(resolve => {
        setTimeout(() => {
          const images = document.querySelectorAll('img')
          let loadedCount = 0
          let totalCount = images.length
          
          console.log(`[ExportHandlers] 检查到 ${totalCount} 张图片`)
          
          if (totalCount === 0) {
            console.log('[ExportHandlers] 没有图片需要加载，直接继续')
            resolve(void 0)
            return
          }
          
          images.forEach((img, index) => {
            if (img.complete && img.naturalWidth > 0) {
              loadedCount++
              console.log(`[ExportHandlers] 图片 ${index + 1} 已加载完成`)
            } else {
              console.log(`[ExportHandlers] 图片 ${index + 1} 未完成加载，但继续执行`)
            }
          })
          
          console.log(`[ExportHandlers] DOM检查完成，${loadedCount}/${totalCount} 张图片已加载`)
          resolve(void 0)
        }, 100)
      })
      
      // 给浏览器额外时间确保渲染完成
      console.log('[ExportHandlers] 等待最终渲染完成...')
      await new Promise(resolve => setTimeout(resolve, 200))
      
      console.log('[ExportHandlers] 触发打印')
      window.print()
      
      // 打印完成后自动返回主页面
      setTimeout(() => {
        setIsPrintingAll(false)
        document.title = "Character Sheet" // 重置标题
      }, 300)
    } catch (error) {
      console.error('[ExportHandlers] 快速PDF导出失败:', error)
      alert('PDF导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
      // 出错时也要返回主页面
      setIsPrintingAll(false)
      document.title = "Character Sheet"
    }
  }, [handlePrintAll, waitForImagesLoaded, setIsPrintingAll])

  const handleQuickExportHTML = useCallback(async () => {
    try {
      console.log('[ExportHandlers] 快速HTML导出 - 进入预览页面')
      // 进入预览页面
      await handlePrintAll()
      // 等待图片加载完成后调用HTML导出并返回
      await waitForImagesLoaded()
      await handleExportHTML()
      setIsPrintingAll(false) // 返回主页面
      document.title = "Character Sheet" // 重置标题
    } catch (error) {
      console.error('[ExportHandlers] 快速HTML导出失败:', error)
      alert('HTML导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }, [handlePrintAll, waitForImagesLoaded, handleExportHTML, setIsPrintingAll])

  const handleQuickExportJSON = useCallback(async () => {
    try {
      console.log('[ExportHandlers] 快速JSON导出 - 进入预览页面')
      // 进入预览页面
      await handlePrintAll()
      // 等待图片加载完成后调用JSON导出并返回
      await waitForImagesLoaded()
      handleExportJSON()
      setIsPrintingAll(false) // 返回主页面
      document.title = "Character Sheet" // 重置标题
    } catch (error) {
      console.error('[ExportHandlers] 快速JSON导出失败:', error)
      alert('JSON导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }, [handlePrintAll, waitForImagesLoaded, handleExportJSON, setIsPrintingAll])

  return {
    // 导出函数
    handlePrintAll,
    handleExportHTML,
    handleExportJSON,
    handleQuickExportPDF,
    handleQuickExportHTML,
    handleQuickExportJSON,
    waitForImagesLoaded,
  }
}