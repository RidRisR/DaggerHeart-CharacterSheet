/**
 * 文件处理器测试
 *
 * 测试file-processor.ts的所有功能
 */

import { describe, it, expect } from 'vitest'
import { FileProcessor } from '@/app/card-editor/services/file-processor'

describe('FileProcessor', () => {
  const processor = new FileProcessor()

  describe('extractText', () => {
    it('应该成功提取.txt文件内容', async () => {
      const content = '测试文本内容\n第二行'
      const file = new File([content], 'test.txt', { type: 'text/plain' })

      const result = await processor.extractText(file)

      expect(result).toBe(content)
    })

    it('应该成功提取.md文件内容', async () => {
      const content = '# 标题\n\n测试内容'
      const file = new File([content], 'test.md', { type: 'text/markdown' })

      const result = await processor.extractText(file)

      expect(result).toBe(content)
    })

    it('应该拒绝不支持的文件类型', async () => {
      const file = new File(['data'], 'test.pdf', { type: 'application/pdf' })

      await expect(processor.extractText(file)).rejects.toThrow('不支持的文件格式')
    })

    it('应该拒绝空文件', async () => {
      const file = new File([''], 'empty.txt', { type: 'text/plain' })

      await expect(processor.extractText(file)).rejects.toThrow('文件内容为空')
    })

    it('应该拒绝只包含空白的文件', async () => {
      const file = new File(['   \n\n   '], 'whitespace.txt', { type: 'text/plain' })

      await expect(processor.extractText(file)).rejects.toThrow('文件内容为空')
    })

    it('应该正确处理包含中文的文件', async () => {
      const content = '这是中文测试内容\n包含特殊字符：★○●◎'
      const file = new File([content], 'chinese.txt', { type: 'text/plain' })

      const result = await processor.extractText(file)

      expect(result).toBe(content)
    })
  })

  describe('isSupported', () => {
    it('应该识别支持的.txt文件', () => {
      expect(processor.isSupported('test.txt')).toBe(true)
    })

    it('应该识别支持的.md文件', () => {
      expect(processor.isSupported('test.md')).toBe(true)
    })

    it('应该拒绝不支持的.pdf文件', () => {
      expect(processor.isSupported('test.pdf')).toBe(false)
    })

    it('应该拒绝不支持的.docx文件', () => {
      expect(processor.isSupported('test.docx')).toBe(false)
    })

    it('应该正确处理大写扩展名', () => {
      expect(processor.isSupported('test.TXT')).toBe(true)
      expect(processor.isSupported('test.MD')).toBe(true)
    })

    it('应该正确处理无扩展名的文件', () => {
      expect(processor.isSupported('noextension')).toBe(false)
    })
  })

  describe('formatFileSize', () => {
    it('应该正确格式化字节', () => {
      expect(processor.formatFileSize(100)).toBe('100 B')
      expect(processor.formatFileSize(500)).toBe('500 B')
    })

    it('应该正确格式化KB', () => {
      expect(processor.formatFileSize(1024)).toBe('1.0 KB')
      expect(processor.formatFileSize(2048)).toBe('2.0 KB')
      expect(processor.formatFileSize(1536)).toBe('1.5 KB')
    })

    it('应该正确格式化MB', () => {
      expect(processor.formatFileSize(1048576)).toBe('1.0 MB')
      expect(processor.formatFileSize(5242880)).toBe('5.0 MB')
      expect(processor.formatFileSize(1572864)).toBe('1.5 MB')
    })

    it('应该处理0字节', () => {
      expect(processor.formatFileSize(0)).toBe('0 B')
    })
  })

  describe('supportedTypes', () => {
    it('应该列出支持的文件类型', () => {
      expect(processor.supportedTypes).toContain('.txt')
      expect(processor.supportedTypes).toContain('.md')
      expect(processor.supportedTypes).toHaveLength(2)
    })
  })
})
