/**
 * 文件处理器
 *
 * 从上传的文件中提取纯文本内容
 */

/**
 * 文件处理器
 */
export class FileProcessor {
  /** 支持的文件类型 */
  readonly supportedTypes = ['.txt', '.md']

  /**
   * 从文件提取文本
   */
  async extractText(file: File): Promise<string> {
    const ext = this.getExtension(file.name)

    // 检查文件类型
    if (!['txt', 'md'].includes(ext)) {
      throw new Error(`不支持的文件格式: ${ext}。支持的格式: ${this.supportedTypes.join(', ')}`)
    }

    try {
      // 读取文本内容
      const text = await file.text()

      // 基本验证
      if (!text || text.trim().length === 0) {
        throw new Error('文件内容为空')
      }

      return text
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`读取文件失败: ${error.message}`)
      }
      throw new Error('读取文件失败: 未知错误')
    }
  }

  /**
   * 获取文件扩展名
   */
  private getExtension(filename: string): string {
    const parts = filename.split('.')
    if (parts.length < 2) {
      return ''
    }
    return parts[parts.length - 1].toLowerCase()
  }

  /**
   * 验证文件类型
   */
  isSupported(filename: string): boolean {
    const ext = this.getExtension(filename)
    return ['txt', 'md'].includes(ext)
  }

  /**
   * 获取文件大小的可读格式
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
  }
}
