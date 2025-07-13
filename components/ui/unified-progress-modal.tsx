"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

/**
 * 进度条模式
 */
export enum ProgressMode {
  LOADING = 'loading',    // 等待模式：旋转加载器
  PROGRESS = 'progress'   // 进度模式：进度条 + 百分比
}

/**
 * 进度条配置接口
 */
interface ProgressConfig {
  title: string
  message: string
  mode: ProgressMode
  current?: number
  total?: number
  showCancel?: boolean
  onCancel?: () => void
}

/**
 * 统一进度条管理器
 */
class UnifiedProgressModalManager {
  private modal: HTMLElement | null = null
  private progressBar: HTMLElement | null = null
  private progressText: HTMLElement | null = null
  private statusMessage: HTMLElement | null = null
  private titleElement: HTMLElement | null = null
  private loadingSpinner: HTMLElement | null = null
  private isDestroyed: boolean = false
  private currentMode: ProgressMode = ProgressMode.LOADING
  private autoCloseTimer: NodeJS.Timeout | null = null

  /**
   * 显示进度条
   */
  show(config: ProgressConfig): void {
    // 如果已有进度条，先清理
    if (this.modal) {
      this.destroy()
    }

    this.isDestroyed = false
    this.currentMode = config.mode

    try {
      this.createModal(config)
      this.updateContent(config)
    } catch (error) {
      // 如果创建失败，确保清理资源
      this.destroy()
      throw error
    }
  }

  /**
   * 显示等待模式
   */
  showLoading(title: string, message: string, showCancel?: boolean, onCancel?: () => void): void {
    this.show({
      title,
      message,
      mode: ProgressMode.LOADING,
      showCancel,
      onCancel
    })

    // 设置自动关闭定时器（10分钟）
    this.setAutoCloseTimer(10 * 60 * 1000)
  }

  /**
   * 显示进度模式
   */
  showProgress(title: string, current: number, total: number, message: string): void {
    this.show({
      title,
      message,
      mode: ProgressMode.PROGRESS,
      current,
      total
    })

    // 设置自动关闭定时器（10分钟）
    this.setAutoCloseTimer(10 * 60 * 1000)
  }

  /**
   * 更新进度
   */
  updateProgress(current: number, total: number, message: string): void {
    if (this.isDestroyed || this.currentMode !== ProgressMode.PROGRESS) {
      return
    }

    this.updateContent({
      title: this.titleElement?.textContent || '',
      message,
      mode: ProgressMode.PROGRESS,
      current,
      total
    })
  }

  /**
   * 更新等待消息
   */
  updateLoading(message: string): void {
    if (this.isDestroyed || this.currentMode !== ProgressMode.LOADING) {
      return
    }

    if (this.statusMessage) {
      this.statusMessage.textContent = message
    }
  }

  /**
   * 检查是否显示中
   */
  isVisible(): boolean {
    return !this.isDestroyed && this.modal !== null
  }

  /**
   * 关闭进度条
   */
  close(): void {
    this.clearAutoCloseTimer()
    this.destroy()
  }

  /**
   * 创建模态框
   */
  private createModal(config: ProgressConfig): void {
    // 创建模态框
    this.modal = document.createElement('div')
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
      animation: fadeIn 0.2s ease-out;
    `

    // 创建内容框
    const contentBox = document.createElement('div')
    contentBox.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      min-width: 400px;
      max-width: 500px;
      position: relative;
    `

    // 标题
    this.titleElement = document.createElement('h3')
    this.titleElement.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
      text-align: center;
    `

    // 等待模式：旋转加载器
    this.loadingSpinner = document.createElement('div')
    this.loadingSpinner.style.cssText = `
      width: 40px;
      height: 40px;
      border: 4px solid #f0f0f0;
      border-top: 4px solid #007cba;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 20px auto;
      display: ${config.mode === ProgressMode.LOADING ? 'block' : 'none'};
    `

    // 进度模式：进度条容器
    const progressContainer = document.createElement('div')
    progressContainer.style.cssText = `
      background: #f0f0f0;
      border-radius: 8px;
      height: 8px;
      margin: 16px 0;
      overflow: hidden;
      display: ${config.mode === ProgressMode.PROGRESS ? 'block' : 'none'};
    `

    // 进度条
    this.progressBar = document.createElement('div')
    this.progressBar.style.cssText = `
      background: linear-gradient(90deg, #007cba, #005a8b);
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
      border-radius: 8px;
    `

    // 进度文本
    this.progressText = document.createElement('div')
    this.progressText.style.cssText = `
      display: ${config.mode === ProgressMode.PROGRESS ? 'flex' : 'none'};
      justify-content: space-between;
      font-size: 14px;
      color: #666;
      margin: 8px 0;
    `
    this.progressText.innerHTML = '<span id="progress-message">准备中...</span><span id="progress-percent">0%</span>'

    // 状态消息
    this.statusMessage = document.createElement('div')
    this.statusMessage.style.cssText = `
      font-size: 12px;
      color: #888;
      text-align: center;
      margin-top: 12px;
      min-height: 20px;
    `

    // 取消按钮
    if (config.showCancel && config.onCancel) {
      const cancelButton = document.createElement('button')
      cancelButton.textContent = '取消'
      cancelButton.style.cssText = `
        position: absolute;
        top: 12px;
        right: 16px;
        background: none;
        border: none;
        font-size: 18px;
        color: #999;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      `
      cancelButton.onmouseover = () => { cancelButton.style.backgroundColor = '#f0f0f0' }
      cancelButton.onmouseout = () => { cancelButton.style.backgroundColor = 'transparent' }
      cancelButton.onclick = config.onCancel
      contentBox.appendChild(cancelButton)
    }

    // 组装DOM
    progressContainer.appendChild(this.progressBar)
    contentBox.appendChild(this.titleElement)
    contentBox.appendChild(this.loadingSpinner)
    contentBox.appendChild(this.progressText)
    contentBox.appendChild(progressContainer)
    contentBox.appendChild(this.statusMessage)
    this.modal.appendChild(contentBox)

    // 添加CSS动画（检查是否已存在以避免重复）
    if (!document.getElementById('unified-progress-modal-styles')) {
      const style = document.createElement('style')
      style.id = 'unified-progress-modal-styles'
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
      document.head.appendChild(style)
    }

    // 安全地添加到DOM
    try {
      document.body.appendChild(this.modal)
      console.log('[统一进度条] 进度条创建成功')
    } catch (error) {
      console.error('[统一进度条] 创建进度条失败:', error)
      this.cleanup()
      throw error
    }
  }

  /**
   * 更新内容
   */
  private updateContent(config: ProgressConfig): void {
    if (this.isDestroyed) return

    try {
      // 更新标题
      if (this.titleElement) {
        this.titleElement.textContent = config.title
      }

      // 更新状态消息
      if (this.statusMessage) {
        this.statusMessage.textContent = config.message
      }

      // 根据模式更新内容
      if (config.mode === ProgressMode.PROGRESS && config.current !== undefined && config.total !== undefined) {
        const percent = config.total > 0 ? Math.round((config.current / config.total) * 100) : 0
        
        if (this.progressBar) {
          this.progressBar.style.width = `${percent}%`
        }
        
        if (this.progressText) {
          const messageEl = this.progressText.querySelector('#progress-message')
          const percentEl = this.progressText.querySelector('#progress-percent')
          
          if (messageEl) {
            messageEl.textContent = `${config.current}/${config.total} 张图片`
          }
          if (percentEl) {
            percentEl.textContent = `${percent}%`
          }
        }
      }
    } catch (error) {
      console.warn('[统一进度条] 更新内容时出错:', error)
    }
  }

  /**
   * 设置自动关闭定时器
   */
  private setAutoCloseTimer(delay: number): void {
    this.clearAutoCloseTimer()
    this.autoCloseTimer = setTimeout(() => {
      console.warn('[统一进度条] 进度条超时，自动关闭')
      this.close()
    }, delay)
  }

  /**
   * 清除自动关闭定时器
   */
  private clearAutoCloseTimer(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer)
      this.autoCloseTimer = null
    }
  }

  /**
   * 销毁进度条
   */
  private destroy(): void {
    if (this.isDestroyed) return

    this.isDestroyed = true
    this.clearAutoCloseTimer()
    this.cleanup()
    console.log('[统一进度条] 进度条已销毁')
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    try {
      if (this.modal && document.body.contains(this.modal)) {
        document.body.removeChild(this.modal)
      }
    } catch (error) {
      console.warn('[统一进度条] 清理DOM时出错:', error)
    }

    // 清理引用
    this.modal = null
    this.progressBar = null
    this.progressText = null
    this.statusMessage = null
    this.titleElement = null
    this.loadingSpinner = null

    // 清理定时器
    this.clearAutoCloseTimer()
  }
}

/**
 * 进度条上下文
 */
interface ProgressModalContextType {
  showLoading: (title: string, message: string, showCancel?: boolean, onCancel?: () => void) => void
  showProgress: (title: string, current: number, total: number, message: string) => void
  updateProgress: (current: number, total: number, message: string) => void
  updateLoading: (message: string) => void
  close: () => void
  isVisible: () => boolean
}

const ProgressModalContext = createContext<ProgressModalContextType | undefined>(undefined)

/**
 * 进度条提供者
 */
interface ProgressModalProviderProps {
  children: ReactNode
}

export function ProgressModalProvider({ children }: ProgressModalProviderProps) {
  const [manager] = useState(() => new UnifiedProgressModalManager())

  // 组件卸载时清理进度条
  useEffect(() => {
    return () => {
      if (manager.isVisible()) {
        manager.close()
      }
    }
  }, [manager])

  // 页面卸载时也清理进度条（防止用户刷新页面时资源泄露）
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (manager.isVisible()) {
        manager.close()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [manager])

  const contextValue: ProgressModalContextType = {
    showLoading: useCallback((title, message, showCancel, onCancel) => {
      manager.showLoading(title, message, showCancel, onCancel)
    }, [manager]),

    showProgress: useCallback((title, current, total, message) => {
      manager.showProgress(title, current, total, message)
    }, [manager]),

    updateProgress: useCallback((current, total, message) => {
      manager.updateProgress(current, total, message)
    }, [manager]),

    updateLoading: useCallback((message) => {
      manager.updateLoading(message)
    }, [manager]),

    close: useCallback(() => {
      manager.close()
    }, [manager]),

    isVisible: useCallback(() => {
      return manager.isVisible()
    }, [manager])
  }

  return (
    <ProgressModalContext.Provider value={contextValue}>
      {children}
    </ProgressModalContext.Provider>
  )
}

/**
 * 使用进度条Hook
 */
export function useProgressModal(): ProgressModalContextType {
  const context = useContext(ProgressModalContext)
  if (context === undefined) {
    throw new Error('useProgressModal must be used within a ProgressModalProvider')
  }
  return context
}

/**
 * 导出管理器类（用于非React环境）
 */
export { UnifiedProgressModalManager }