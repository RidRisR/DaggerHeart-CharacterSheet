'use client'

import React from 'react'
import MDEditor, { commands } from '@uiw/react-md-editor'
import { cn } from '@/lib/utils'

// 创建自定义的加粗+斜体命令
const boldItalicCommand = {
  name: "bold-italic",
  keyCommand: "bold-italic",
  buttonProps: { 
    "aria-label": "Add bold italic text", 
    title: "Bold Italic (***text***)" 
  },
  icon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 4H9a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3z" />
      <path d="M14 6v14" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
    </svg>
  ),
  execute: (state: any, api: any) => {
    const modifyText = `***${state.selectedText || 'Bold Italic Text'}***`;
    api.replaceSelection(modifyText);
  },
}

// 创建自定义的特殊标记命令 (*__文本__*)
const specialMarkCommand = {
  name: "special-mark",
  keyCommand: "special-mark",
  buttonProps: {
    "aria-label": "Add special marked text",
    title: "Special Mark (*__text__*)"
  },
  icon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L8 22" />
      <path d="M16 2L12 22" />
      <path d="M3.5 12h17" />
      <path d="M6 7h12" />
      <path d="M6 17h12" />
    </svg>
  ),
  execute: (state: any, api: any) => {
    const modifyText = `*__${state.selectedText || '标题'}__*`;
    api.replaceSelection(modifyText);
  },
}

// 简化的工具栏命令配置
const simplifiedCommands = [
  commands.bold,           // 加粗
  commands.italic,         // 斜体
  specialMarkCommand,      // 特殊标记 (*__文本__*)
  commands.unorderedListCommand,  // 无序列表
]

interface MarkdownEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  height?: number
  hideToolbar?: boolean
  preview?: 'live' | 'edit' | 'preview'
  colorMode?: 'light' | 'dark'
}

export default function MarkdownEditor({
  value = '',
  onChange,
  placeholder = '请输入内容...',
  className,
  height = 200,
  hideToolbar = false,
  preview = 'live',
  colorMode = 'light'
}: MarkdownEditorProps) {
  const handleChange = (val?: string) => {
    onChange?.(val || '')
  }

  return (
    <div 
      className={cn('w-full', className)}
      data-color-mode={colorMode}
    >
      <MDEditor
        value={value}
        onChange={handleChange}
        preview={preview}
        hideToolbar={hideToolbar}
        height={height}
        data-color-mode={colorMode}
        commands={simplifiedCommands}
        textareaProps={{
          placeholder,
          style: {
            fontSize: '14px',
            lineHeight: '1.5',
            fontFamily: 'inherit'
          }
        }}
        previewOptions={{
          style: {
            fontSize: '14px',
            lineHeight: '1.5'
          }
        }}
      />
    </div>
  )
}

// 简化的Markdown编辑器，左右两栏模式
export function SimpleMarkdownEditor({
  value = '',
  onChange,
  placeholder = '请输入内容...',
  className,
  height = 120
}: Omit<MarkdownEditorProps, 'preview' | 'hideToolbar'>) {
  return (
    <MarkdownEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      height={height}
      preview="live"
      hideToolbar={false}
    />
  )
}

// 只读的Markdown渲染器
export function MarkdownRenderer({
  value = '',
  className
}: {
  value?: string
  className?: string
}) {
  return (
    <MarkdownEditor
      value={value}
      className={className}
      preview="preview"
      hideToolbar={true}
      height={200}
    />
  )
}