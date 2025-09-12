"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import ContentEditable from "react-contenteditable"

interface ContentEditableFieldProps {
  name: string
  value: string
  placeholder?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  maxLength?: number
  className?: string
  maxLines?: number
}

export function ContentEditableField({
  name,
  value,
  placeholder = "",
  onChange,
  maxLength,
  className = "",
  maxLines = 2
}: ContentEditableFieldProps) {
  const [html, setHtml] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const contentEditableRef = useRef<HTMLElement>(null!)
  
  useEffect(() => {
    setHtml(value)
  }, [value])
  
  const stripHtml = (html: string): string => {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ""
  }
  
  const handleChange = useCallback((evt: any) => {
    let newHtml = evt.target.value
    
    const plainText = stripHtml(newHtml)
    
    if (maxLength && plainText.length > maxLength) {
      return
    }
    
    setHtml(plainText)
    
    const syntheticEvent = {
      target: {
        name,
        value: plainText
      }
    } as React.ChangeEvent<HTMLInputElement>
    
    onChange(syntheticEvent)
  }, [name, onChange, maxLength])
  
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    
    const text = e.clipboardData.getData('text/plain')
    const selection = window.getSelection()
    
    if (!selection?.rangeCount) return
    
    selection.deleteFromDocument()
    
    const textNode = document.createTextNode(text)
    selection.getRangeAt(0).insertNode(textNode)
    
    selection.collapseToEnd()
    
    if (contentEditableRef.current) {
      const evt = {
        target: {
          value: contentEditableRef.current.innerHTML
        }
      }
      handleChange(evt)
    }
  }, [handleChange])
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // 阻止换行，保持单行文本输入
      e.preventDefault()
    }
  }, [])
  
  const notebookStyles = {
    backgroundImage: `repeating-linear-gradient(
        to bottom,
        transparent 0,
        transparent 24px,
        #9ca3af 24px,
        #9ca3af 25px
      )`,
    lineHeight: '25px',
    padding: '0 3px',
    paddingTop: '0',
    minHeight: maxLines ? `${maxLines * 25}px` : '50px',
    maxHeight: maxLines ? `${maxLines * 25}px` : '50px',
    overflow: 'hidden',
    wordWrap: 'break-word' as const,
    whiteSpace: 'normal' as const,
    backgroundColor: 'transparent',
    backgroundSize: '100% 25px',
    backgroundPosition: '0 0'
  }
  
  // 打印时的样式优化
  const printStyles = `
    @media print {
      .notebook-field {
        background-image: repeating-linear-gradient(
          to bottom,
          transparent 0,
          transparent 24px,
          #9ca3af 24px,
          #9ca3af 25px
        ) !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
        overflow: visible !important;
        outline: 0 !important;
        border: 0 !important;
        border-width: 0 !important;
        border-top: 0 !important;
        border-bottom: 0 !important;
        border-left: 0 !important;
        border-right: 0 !important;
        border-color: transparent !important;
        border-style: none !important;
        box-shadow: none !important;
        margin-top: 0 !important;
        padding-top: 0 !important;
        border-radius: 0 !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        background-clip: padding-box !important;
        background-color: transparent !important;
        text-shadow: none !important;
        -webkit-box-shadow: none !important;
        -moz-box-shadow: none !important;
      }
      .notebook-field * {
        outline: none !important;
        border: none !important;
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        -moz-box-shadow: none !important;
      }
    }
  `
  
  const combinedClassName = `
    ${className} 
    ${isFocused ? 'outline outline-2 outline-blue-500' : 'outline-none'}
    cursor-text 
    hover:bg-gray-50 
    transition-colors 
    text-sm 
    block 
    w-full
    ${!value && !isFocused ? 'text-gray-400' : 'text-gray-800'}
    notebook-field
  `.trim()
  
  return (
    <div className="relative">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <ContentEditable
        innerRef={contentEditableRef}
        html={isFocused || value ? html : `<span style="color: #9ca3af">${placeholder}</span>`}
        disabled={false}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setIsFocused(true)
          if (!value && contentEditableRef.current) {
            contentEditableRef.current.innerHTML = ''
          }
        }}
        onBlur={() => setIsFocused(false)}
        tagName="div"
        className={combinedClassName}
        style={notebookStyles}
      />
      {isFocused && maxLength && (
        <div className="absolute -bottom-5 right-0 text-xs text-gray-500">
          {stripHtml(html).length}/{maxLength}
        </div>
      )}
    </div>
  )
}