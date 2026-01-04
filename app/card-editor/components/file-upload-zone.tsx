'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { FileProcessor } from '../services/file-processor'

interface FileUploadZoneProps {
  value: string
  onChange: (text: string) => void
  maxLength?: number
}

export function FileUploadZone({ value, onChange, maxLength = 50000 }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileProcessor = new FileProcessor()

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setError(null)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    await processFile(files[0])
  }

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setError(null)
    await processFile(files[0])

    // 清空 input，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const processFile = async (file: File) => {
    try {
      const result = await fileProcessor.extractText(file)

      if (!result.success) {
        setError(result.error || '文件处理失败')
        return
      }

      const text = result.text!
      if (text.length > maxLength) {
        setError(`文件过大，最多支持 ${Math.floor(maxLength / 1000)}k 字符，当前 ${Math.floor(text.length / 1000)}k`)
        return
      }

      onChange(text)
    } catch (error) {
      setError(error instanceof Error ? error.message : '文件处理失败')
    }
  }

  const handleBrowse = () => {
    fileInputRef.current?.click()
  }

  const charCount = value.length
  const isNearLimit = charCount > maxLength * 0.8

  return (
    <div className="space-y-4">
      {/* 拖放区域 */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          hover:border-primary/50 hover:bg-muted/50
        `}
      >
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-muted p-3">
            {isDragging ? (
              <Upload className="h-6 w-6 text-primary" />
            ) : (
              <FileText className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">
              拖放文件到此处，或
              <Button
                type="button"
                variant="link"
                className="px-1 h-auto text-sm"
                onClick={handleBrowse}
              >
                浏览文件
              </Button>
            </p>
            <p className="text-xs text-muted-foreground">
              支持 .txt 和 .md 文件，最大 {Math.floor(maxLength / 1000)}k 字符
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 文本输入框 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="text-input">或直接粘贴文本</Label>
          <span
            className={`text-xs ${
              isNearLimit ? 'text-orange-600 font-medium' : 'text-muted-foreground'
            }`}
          >
            {charCount.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
        </div>

        <Textarea
          id="text-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="在此粘贴你撰写的卡牌文本...&#10;&#10;例如：&#10;## 职业卡：剑客&#10;- 简介：以剑术为生的战士&#10;- 领域1：武技&#10;- 领域2：防御"
          className="min-h-[300px] font-mono text-sm"
          maxLength={maxLength}
        />
      </div>
    </div>
  )
}
