'use client'

import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import { cn } from '@/lib/utils'

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

// 简化的Markdown编辑器，只有编辑模式
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
      preview="edit"
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